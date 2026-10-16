using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;
using WnWrecker.Api.Services;


namespace WnWrecker.Api.Controllers
{
    // Customer-side chat. No login: the browser holds the conversation's secret token for the
    // current session only; the customer can come back later with the short reference code.
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public ChatController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public record StartRequest(string? Name, string? Contact);
        public record RejoinRequest(string Code);
        public record DetailsRequest(string? Name, string? Contact);
        public record SendMessageRequest(string Text);
        public record AttachPartRequest(int PartId);

        private static string? Clean(string? s, int max)
        {
            var t = s?.Trim();
            if (string.IsNullOrEmpty(t)) return null;
            return t.Length > max ? t[..max] : t;
        }

        private Task<Conversation?> Find(Guid token) =>
            _db.Conversations.FirstOrDefaultAsync(c => c.Token == token);

        private Task<Conversation?> FindFull(Guid token) =>
            _db.Conversations
                .Include(c => c.Messages).ThenInclude(m => m.Invoice)
                .Include(c => c.Parts).ThenInclude(cp => cp.Part)
                .AsSplitQuery()
                .FirstOrDefaultAsync(c => c.Token == token);

        // POST /api/chat/start  -> create a conversation, return its token + reference code
        [EndpointSummary("Start a conversation")]
        [HttpPost("start")]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> Start(StartRequest req)
        {
            var convo = new Conversation
            {
                CustomerName = Clean(req.Name, 80),
                CustomerContact = Clean(req.Contact, 120),
                ReferenceCode = await ChatInfo.NewReferenceCode(_db),
            };
            _db.Conversations.Add(convo);
            await _db.SaveChangesAsync();
            return Ok(new { token = convo.Token, reference = convo.ReferenceCode });
        }

        // POST /api/chat/rejoin  -> come back to a chat with its reference code
        [EndpointSummary("Rejoin a conversation with its reference code")]
        [HttpPost("rejoin")]
        [EnableRateLimiting("strict")]
        public async Task<IActionResult> Rejoin(RejoinRequest req)
        {
            var code = ChatInfo.NormalizeCode(req.Code);
            var convo = await _db.Conversations.FirstOrDefaultAsync(c => c.ReferenceCode == code);
            if (convo == null) return NotFound("No chat found with that reference code.");
            return Ok(new { token = convo.Token, reference = convo.ReferenceCode });
        }

        // GET /api/chat/{token}  -> load the whole conversation for the widget
        [EndpointSummary("Get my conversation")]
        [HttpGet("{token:guid}")]
        public async Task<IActionResult> Get(Guid token)
        {
            var convo = await FindFull(token);
            if (convo == null) return NotFound();

            return Ok(new
            {
                token = convo.Token,
                reference = convo.ReferenceCode,
                handedOff = convo.HandedOff,
                closed = convo.Archived,
                closedBy = convo.ClosedBy,
                status = ChatInfo.StatusOf(convo),
                name = convo.CustomerName,
                contact = convo.CustomerContact,
                messages = ChatInfo.OrderedMessages(convo),
                parts = ChatInfo.PartsDto(convo)
            });
        }

        // POST /api/chat/{token}/messages  -> customer sends a message; the FAQ bot
        // auto-replies (answer / options / handoff) while no human has taken over
        [EndpointSummary("Send a message")]
        [HttpPost("{token:guid}/messages")]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> SendMessage(Guid token, SendMessageRequest req)
        {
            var convo = await Find(token);
            if (convo == null) return NotFound();
            if (convo.Archived) return BadRequest("This chat is closed. Start a new chat to send a message.");
            if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Message text is required.");

            _db.Messages.Add(new Message { ConversationId = convo.Id, Sender = "customer", Text = req.Text.Trim() });

            string[] options = Array.Empty<string>();
            string? botReply = null;

            // the bot only runs while no human has taken over
            if (!convo.HandedOff)
            {
                var result = FaqBot.Evaluate(req.Text);
                botReply = result.Text;
                _db.Messages.Add(new Message { ConversationId = convo.Id, Sender = "bot", Text = result.Text, SentAt = DateTime.UtcNow.AddMilliseconds(5) });
                if (result.Action == BotAction.Handoff) convo.HandedOff = true;
                if (result.Action == BotAction.Options) options = result.Options;
            }

            convo.LastMessageAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { handedOff = convo.HandedOff, options, botReply });
        }

        // POST /api/chat/{token}/details  -> customer adds their name / contact (optional)
        [EndpointSummary("Save my name and contact")]
        [HttpPost("{token:guid}/details")]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> SaveDetails(Guid token, DetailsRequest req)
        {
            var convo = await Find(token);
            if (convo == null) return NotFound();
            convo.CustomerName = Clean(req.Name, 80) ?? convo.CustomerName;
            convo.CustomerContact = Clean(req.Contact, 120) ?? convo.CustomerContact;
            await _db.SaveChangesAsync();
            return Ok();
        }

        // POST /api/chat/{token}/parts  -> attach a product to the conversation
        [EndpointSummary("Attach a product")]
        [HttpPost("{token:guid}/parts")]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> AttachPart(Guid token, AttachPartRequest req)
        {
            var convo = await _db.Conversations.Include(c => c.Parts)
                                               .FirstOrDefaultAsync(c => c.Token == token);
            if (convo == null) return NotFound();
            if (convo.Archived) return BadRequest("This chat is closed.");
            if (await _db.Parts.FindAsync(req.PartId) is null) return NotFound("Part not found.");

            if (convo.Parts.Any(cp => cp.PartId == req.PartId))     // no duplicates
                return Ok();

            _db.ConversationParts.Add(new ConversationPart { ConversationId = convo.Id, PartId = req.PartId });
            await _db.SaveChangesAsync();
            return Ok();
        }

        // DELETE /api/chat/{token}/parts/{partId}  -> remove a product
        [EndpointSummary("Remove a product")]
        [HttpDelete("{token:guid}/parts/{partId}")]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> DetachPart(Guid token, int partId)
        {
            var convo = await _db.Conversations.Include(c => c.Parts)
                                               .FirstOrDefaultAsync(c => c.Token == token);
            if (convo == null) return NotFound();

            var link = convo.Parts.FirstOrDefault(cp => cp.PartId == partId);
            if (link == null) return NotFound();

            _db.ConversationParts.Remove(link);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST /api/chat/{token}/human  -> customer asks for a human; hands off and silences the bot
        [EndpointSummary("Request a human")]
        [HttpPost("{token:guid}/human")]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> RequestHuman(Guid token)
        {
            var convo = await Find(token);
            if (convo == null) return NotFound();
            if (convo.Archived) return BadRequest("This chat is closed.");

            if (!convo.HandedOff)
            {
                convo.HandedOff = true;
                _db.Messages.Add(new Message { ConversationId = convo.Id, Sender = "bot", Text = FaqBot.HumanRequestedMessage });
                convo.LastMessageAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            return Ok();
        }

        // POST /api/chat/{token}/close  -> customer closes the chat for good (it stays readable)
        [EndpointSummary("Close my chat")]
        [HttpPost("{token:guid}/close")]
        [EnableRateLimiting("chat")]
        public async Task<IActionResult> Close(Guid token)
        {
            var convo = await Find(token);
            if (convo == null) return NotFound();
            if (!convo.Archived)
            {
                ChatInfo.Close(_db, convo, "customer");
                await _db.SaveChangesAsync();
            }
            return Ok();
        }

        // GET /api/chat/{token}/transcript  -> customer downloads the whole chat as a PDF
        [EndpointSummary("Download my chat transcript")]
        [HttpGet("{token:guid}/transcript")]
        public async Task<IActionResult> Transcript(Guid token)
        {
            var convo = await FindFull(token);
            if (convo == null) return NotFound();
            var bytes = ChatTranscriptPdf.Generate(convo, _config.GetSection("Business"));
            return File(bytes, "application/pdf", $"Chat-{convo.ReferenceCode}.pdf");
        }

        // GET /api/chat/transcript/{transcriptToken}/pdf  -> shareable transcript link (sent by the admin)
        [EndpointSummary("Shared chat transcript link")]
        [HttpGet("transcript/{transcriptToken}/pdf")]
        public async Task<IActionResult> SharedTranscript(string transcriptToken)
        {
            if (string.IsNullOrWhiteSpace(transcriptToken) || transcriptToken.Length < 20) return NotFound();
            var convo = await _db.Conversations
                .Include(c => c.Messages).ThenInclude(m => m.Invoice)
                .Include(c => c.Parts).ThenInclude(cp => cp.Part)
                .AsSplitQuery()
                .FirstOrDefaultAsync(c => c.TranscriptToken == transcriptToken);
            if (convo == null) return NotFound();

            var bytes = ChatTranscriptPdf.Generate(convo, _config.GetSection("Business"));
            Response.Headers.ContentDisposition = $"inline; filename=\"Chat-{convo.ReferenceCode}.pdf\"";
            return File(bytes, "application/pdf");
        }

        // GET /api/chat/faqs  -> suggested questions shown as chips in the widget
        [EndpointSummary("Get suggested questions")]
        [HttpGet("faqs")]
        public IActionResult GetFaqs() => Ok(FaqBot.SuggestedQuestions);
    }
}