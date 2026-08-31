using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;


namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ChatController(AppDbContext db) => _db = db;

        // small request shapes (like LoginRequest earlier)
        public record StartRequest(string? Name, string? Contact);
        public record SendMessageRequest(string Text);
        public record AttachPartRequest(int PartId);

        // POST /api/chat/start  -> create a conversation, return its token
        [EndpointSummary("Start a conversation")]
        [HttpPost("start")]
        public async Task<IActionResult> Start(StartRequest req)
        {
            var convo = new Conversation { CustomerName = req.Name, CustomerContact = req.Contact };
            _db.Conversations.Add(convo);
            await _db.SaveChangesAsync();
            return Ok(new { token = convo.Token });   // browser stores this token
        }

        // GET /api/chat/{token}  -> load the whole conversation for the widget
        [EndpointSummary("Get my conversation")]
        [HttpGet("{token}")]
        public async Task<IActionResult> Get(Guid token)
        {
            var convo = await _db.Conversations
                .Include(c => c.Messages)                       // pull related messages too
                .Include(c => c.Parts).ThenInclude(cp => cp.Part) // and attached parts + their part row
                .FirstOrDefaultAsync(c => c.Token == token);

            if (convo == null) return NotFound();

            return Ok(new
            {
                token = convo.Token,
                name = convo.CustomerName,
                contact = convo.CustomerContact,
                messages = convo.Messages.OrderBy(m => m.SentAt)
                                         .Select(m => new { m.Sender, m.Text, m.SentAt }),
                parts = convo.Parts.Select(cp => new { cp.PartId, name = cp.Part!.Name, cp.Status })
            });
        }

        // POST /api/chat/{token}/messages  -> customer sends a message
        [EndpointSummary("Send a message")]
        [HttpPost("{token}/messages")]
        public async Task<IActionResult> SendMessage(Guid token, SendMessageRequest req)
        {
            var convo = await _db.Conversations.FirstOrDefaultAsync(c => c.Token == token);
            if (convo == null) return NotFound();
            if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Message text is required.");

            _db.Messages.Add(new Message { ConversationId = convo.Id, Sender = "customer", Text = req.Text });
            convo.LastMessageAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok();
        }

        // POST /api/chat/{token}/parts  -> attach a product to the conversation
        [EndpointSummary("Attach a product")]
        [HttpPost("{token}/parts")]
        public async Task<IActionResult> AttachPart(Guid token, AttachPartRequest req)
        {
            var convo = await _db.Conversations.Include(c => c.Parts)
                                               .FirstOrDefaultAsync(c => c.Token == token);
            if (convo == null) return NotFound();
            if (await _db.Parts.FindAsync(req.PartId) is null) return NotFound("Part not found.");

            if (convo.Parts.Any(cp => cp.PartId == req.PartId))     // no duplicates
                return Ok();

            _db.ConversationParts.Add(new ConversationPart
            {
                ConversationId = convo.Id,
                PartId = req.PartId,
                Status = "New"
            });
            await _db.SaveChangesAsync();
            return Ok();
        }

        // DELETE /api/chat/{token}/parts/{partId}  -> remove a product
        [EndpointSummary("Remove a product")]
        [HttpDelete("{token}/parts/{partId}")]
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
    }
}
