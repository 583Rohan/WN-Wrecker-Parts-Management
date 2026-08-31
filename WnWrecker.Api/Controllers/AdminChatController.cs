using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/admin/chats")]      // custom base path, not [controller]
    [Authorize]                     // EVERY endpoint here needs the admin token
    public class AdminChatController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AdminChatController(AppDbContext db) => _db = db;

        private static readonly string[] AllowedStatuses =
            { "New", "In Discussion", "Reserved", "Awaiting Pickup", "Sold", "Closed" };

        public record ReplyRequest(string Text);
        public record StatusRequest(string Status);

        // GET /api/admin/chats  -> every conversation, newest activity first
        [EndpointSummary("List all conversations")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var chats = await _db.Conversations
                .Include(c => c.Messages)
                .Include(c => c.Parts).ThenInclude(cp => cp.Part)
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            return Ok(chats.Select(c => new
            {
                c.Id,
                c.CustomerName,
                c.CustomerContact,
                c.CreatedAt,
                c.LastMessageAt,
                messageCount = c.Messages.Count,
                lastMessage = c.Messages.OrderByDescending(m => m.SentAt)
                                        .Select(m => m.Text).FirstOrDefault(),
                parts = c.Parts.Select(cp => new { cp.PartId, name = cp.Part!.Name, cp.Status })
            }));
        }

        // GET /api/admin/chats/by-part  -> enquiries grouped by product
        [EndpointSummary("Conversations grouped by product")]
        [HttpGet("by-part")]
        public async Task<IActionResult> GetByPart()
        {
            var links = await _db.ConversationParts
                .Include(cp => cp.Part)
                .Include(cp => cp.Conversation)
                .ToListAsync();

            var grouped = links
                .GroupBy(cp => new { cp.PartId, PartName = cp.Part!.Name, cp.Part.Status })
                .Select(g => new
                {
                    g.Key.PartId,
                    partName = g.Key.PartName,
                    partStatus = g.Key.Status,          // In Stock / Sold (inventory)
                    enquiryCount = g.Count(),
                    enquiries = g.Select(cp => new
                    {
                        conversationId = cp.ConversationId,
                        customer = cp.Conversation!.CustomerName,
                        cp.Status,                       // enquiry stage
                        cp.UpdatedAt
                    })
                });

            return Ok(grouped);
        }

        // GET /api/admin/chats/5  -> one conversation with full message history
        [EndpointSummary("Get one conversation")]
        [HttpGet("{conversationId}")]
        public async Task<IActionResult> GetOne(int conversationId)
        {
            var c = await _db.Conversations
                .Include(x => x.Messages)
                .Include(x => x.Parts).ThenInclude(cp => cp.Part)
                .FirstOrDefaultAsync(x => x.Id == conversationId);
            if (c == null) return NotFound();

            return Ok(new
            {
                c.Id,
                c.CustomerName,
                c.CustomerContact,
                c.CreatedAt,
                messages = c.Messages.OrderBy(m => m.SentAt)
                                     .Select(m => new { m.Sender, m.Text, m.SentAt }),
                parts = c.Parts.Select(cp => new { cp.PartId, name = cp.Part!.Name, cp.Status })
            });
        }

        // POST /api/admin/chats/5/messages  -> admin replies
        [EndpointSummary("Reply to a conversation")]
        [HttpPost("{conversationId}/messages")]
        public async Task<IActionResult> Reply(int conversationId, ReplyRequest req)
        {
            var c = await _db.Conversations.FindAsync(conversationId);
            if (c == null) return NotFound();
            if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Reply text is required.");

            _db.Messages.Add(new Message { ConversationId = c.Id, Sender = "admin", Text = req.Text });
            c.LastMessageAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok();
        }

        // PUT /api/admin/chats/5/parts/3/status  -> change one product's enquiry stage
        [EndpointSummary("Update a product's status")]
        [HttpPut("{conversationId}/parts/{partId}/status")]
        public async Task<IActionResult> UpdateStatus(int conversationId, int partId, StatusRequest req)
        {
            if (!AllowedStatuses.Contains(req.Status))
                return BadRequest($"Status must be one of: {string.Join(", ", AllowedStatuses)}");

            var link = await _db.ConversationParts
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.PartId == partId);
            if (link == null) return NotFound();

            link.Status = req.Status;
            link.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { link.PartId, link.Status });
        }
    }
}