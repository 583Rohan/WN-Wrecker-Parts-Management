using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;
using WnWrecker.Api.Services;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/admin/chats")]      // custom base path, not [controller]
    [Authorize]                     // EVERY endpoint here needs the admin token
    public class AdminChatController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AdminChatController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public record ReplyRequest(string Text);
        public record SendInvoiceRequest(int InvoiceId);

        // full graph for ONE chat (split into separate SQL queries so it stays light)
        private IQueryable<Conversation> Full() => _db.Conversations
            .Include(c => c.Messages).ThenInclude(m => m.Invoice)
            .Include(c => c.Parts).ThenInclude(cp => cp.Part)
            .AsSplitQuery();

        // chats made before reference codes existed get one (only touches chats that are missing a code)
        private async Task EnsureCodes()
        {
            var missing = await _db.Conversations.Where(c => c.ReferenceCode == null).ToListAsync();
            foreach (var c in missing)
            {
                c.ReferenceCode = await ChatInfo.NewReferenceCode(_db);
                await _db.SaveChangesAsync();        // save one at a time so codes stay unique
            }
        }

        // GET /api/admin/chats  -> every conversation, newest activity first
        // (lightweight: the database only sends what the list needs, not every message)
        [EndpointSummary("List all conversations")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            await EnsureCodes();

            var rows = await _db.Conversations
                .AsNoTracking()
                .OrderByDescending(c => c.LastMessageAt)
                .Select(c => new
                {
                    c.Id,
                    c.ReferenceCode,
                    c.CustomerName,
                    c.CustomerContact,
                    c.Archived,
                    c.ClosedBy,
                    c.ClosedAt,
                    c.CreatedAt,
                    c.LastMessageAt,
                    MessageCount = c.Messages.Count(m => m.Sender != "system"),
                    Last = c.Messages
                        .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
                        .Select(m => new { m.Text, m.Sender, m.Kind, InvoiceNumber = m.Invoice != null ? m.Invoice.Number : null })
                        .FirstOrDefault(),
                    LastHumanSender = c.Messages
                        .Where(m => m.Sender == "customer" || m.Sender == "admin")
                        .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
                        .Select(m => m.Sender)
                        .FirstOrDefault(),
                    // customer + admin message text, so the admin search can find older messages too
                    Texts = c.Messages
                        .Where(m => m.Sender == "customer" || m.Sender == "admin")
                        .Select(m => m.Text)
                        .ToList(),
                    Parts = c.Parts
                        .Where(cp => cp.Part != null)
                        .Select(cp => new { cp.PartId, cp.Part!.Name, cp.Part.Make, cp.Part.Model, cp.Part.Year, cp.Part.Price, cp.Part.Status })
                        .ToList()
                })
                .AsSplitQuery()
                .ToListAsync();

            return Ok(rows.Select(r =>
            {
                var needsReply = !r.Archived && (r.LastHumanSender == null || r.LastHumanSender == "customer");
                return new
                {
                    r.Id,
                    reference = r.ReferenceCode,
                    r.CustomerName,
                    r.CustomerContact,
                    status = r.Archived ? ChatInfo.StatusClosed : needsReply ? ChatInfo.StatusNeedsReply : ChatInfo.StatusWaiting,
                    needsReply,
                    closed = r.Archived,
                    r.ClosedBy,
                    r.ClosedAt,
                    r.CreatedAt,
                    r.LastMessageAt,
                    messageCount = r.MessageCount,
                    lastMessage = r.Last == null ? null : new
                    {
                        text = r.Last.Kind == "invoice" && r.Last.InvoiceNumber != null ? $"Invoice {r.Last.InvoiceNumber} sent" : r.Last.Text,
                        sender = r.Last.Sender
                    },
                    searchText = string.Join(" ", r.Texts),
                    parts = r.Parts.Select(p => new
                    {
                        p.PartId,
                        name = p.Name,
                        vehicle = $"{p.Make} {p.Model} {p.Year}",
                        price = p.Price,
                        status = p.Status
                    })
                };
            }));
        }

        // GET /api/admin/chats/summary  -> small counts for the nav badge / dashboard
        [EndpointSummary("Chat counts")]
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var open = await _db.Conversations
                .AsNoTracking()
                .Where(c => !c.Archived)
                .Select(c => c.Messages
                    .Where(m => m.Sender == "customer" || m.Sender == "admin")
                    .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
                    .Select(m => m.Sender)
                    .FirstOrDefault())
                .ToListAsync();

            return Ok(new
            {
                needsReply = open.Count(sender => sender == null || sender == "customer"),
                open = open.Count,
                closed = await _db.Conversations.CountAsync(c => c.Archived)
            });
        }

        // GET /api/admin/chats/5  -> one conversation with full message history
        [EndpointSummary("Get one conversation")]
        [HttpGet("{conversationId:int}")]
        public async Task<IActionResult> GetOne(int conversationId)
        {
            var c = await Full().FirstOrDefaultAsync(x => x.Id == conversationId);
            if (c == null) return NotFound();

            var changed = false;
            if (string.IsNullOrEmpty(c.ReferenceCode)) { c.ReferenceCode = await ChatInfo.NewReferenceCode(_db); changed = true; }
            if (string.IsNullOrEmpty(c.TranscriptToken)) { c.TranscriptToken = ChatInfo.NewToken(); changed = true; }
            if (changed) await _db.SaveChangesAsync();

            return Ok(new
            {
                c.Id,
                reference = c.ReferenceCode,
                c.CustomerName,
                c.CustomerContact,
                status = ChatInfo.StatusOf(c),
                needsReply = ChatInfo.NeedsReply(c),
                closed = c.Archived,
                c.ClosedBy,
                c.ClosedAt,
                c.CreatedAt,
                c.HandedOff,
                c.TranscriptToken,
                messages = ChatInfo.OrderedMessages(c),
                parts = ChatInfo.PartsDto(c)
            });
        }

        // POST /api/admin/chats/5/messages  -> admin replies (a human joining stops the bot)
        [EndpointSummary("Reply to a conversation")]
        [HttpPost("{conversationId:int}/messages")]
        public async Task<IActionResult> Reply(int conversationId, ReplyRequest req)
        {
            var c = await _db.Conversations.FindAsync(conversationId);
            if (c == null) return NotFound();
            if (c.Archived) return BadRequest("This chat is closed.");
            if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Reply text is required.");

            _db.Messages.Add(new Message { ConversationId = c.Id, Sender = "admin", Text = req.Text.Trim() });
            c.HandedOff = true;                        // a human has joined -> bot stops
            c.LastMessageAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok();
        }

        // POST /api/admin/chats/5/invoice  -> post an invoice into the chat as a card the customer can open
        [EndpointSummary("Send an invoice into the chat")]
        [HttpPost("{conversationId:int}/invoice")]
        public async Task<IActionResult> SendInvoice(int conversationId, SendInvoiceRequest req)
        {
            var c = await _db.Conversations.FindAsync(conversationId);
            if (c == null) return NotFound();
            if (c.Archived) return BadRequest("This chat is closed.");

            var inv = await _db.Invoices.FindAsync(req.InvoiceId);
            if (inv == null) return NotFound("Invoice not found.");
            if (inv.Status == InvoiceStatus.Void || inv.Status == InvoiceStatus.Refunded)
                return BadRequest($"{inv.Number} is {inv.Status.ToLower()} and can't be sent.");

            inv.ConversationId ??= c.Id;                               // link the invoice to this chat
            if (string.IsNullOrEmpty(inv.PublicToken)) inv.PublicToken = ChatInfo.NewToken();

            _db.Messages.Add(new Message
            {
                ConversationId = c.Id,
                Sender = "admin",
                Kind = "invoice",
                InvoiceId = inv.Id,
                Text = $"Invoice {inv.Number} — ${inv.Total:N2} (incl. GST)"
            });
            c.HandedOff = true;
            c.LastMessageAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok();
        }

        // POST /api/admin/chats/5/close  -> admin closes the chat (it stays readable)
        [EndpointSummary("Close a conversation")]
        [HttpPost("{conversationId:int}/close")]
        public async Task<IActionResult> Close(int conversationId)
        {
            var c = await _db.Conversations.FindAsync(conversationId);
            if (c == null) return NotFound();
            if (!c.Archived)
            {
                ChatInfo.Close(_db, c, "admin");
                await _db.SaveChangesAsync();
            }
            return Ok();
        }

        // POST /api/admin/chats/5/reopen  -> only chats the ADMIN closed can be reopened
        [EndpointSummary("Reopen a conversation")]
        [HttpPost("{conversationId:int}/reopen")]
        public async Task<IActionResult> Reopen(int conversationId)
        {
            var c = await _db.Conversations.FindAsync(conversationId);
            if (c == null) return NotFound();
            if (!c.Archived) return Ok();
            if (c.ClosedBy == "customer") return BadRequest("The customer closed this chat, so it can't be reopened.");

            c.Archived = false;
            c.ClosedBy = null;
            c.ClosedAt = null;
            c.LastMessageAt = DateTime.UtcNow;
            _db.Messages.Add(new Message { ConversationId = c.Id, Sender = "system", Text = "Chat reopened by WN Wrecker." });
            await _db.SaveChangesAsync();
            return Ok();
        }

        // GET /api/admin/chats/5/transcript  -> download the whole chat as a PDF
        [EndpointSummary("Download chat transcript")]
        [HttpGet("{conversationId:int}/transcript")]
        public async Task<IActionResult> Transcript(int conversationId)
        {
            var c = await Full().FirstOrDefaultAsync(x => x.Id == conversationId);
            if (c == null) return NotFound();
            var bytes = ChatTranscriptPdf.Generate(c, _config.GetSection("Business"));
            return File(bytes, "application/pdf", $"Chat-{c.ReferenceCode}.pdf");
        }
    }
}