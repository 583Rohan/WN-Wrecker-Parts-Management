namespace WnWrecker.Api.Models
{
    public class Conversation
    {
        public int Id { get; set; }                        // internal ID (admin-facing)
        public Guid Token { get; set; } = Guid.NewGuid();  // secret key the customer's browser uses for API calls (kept only for the browser session)
        public string? ReferenceCode { get; set; }         // short code shown to the customer, e.g. WN-7F3K2 — used to rejoin the chat later
        public string? CustomerName { get; set; }          // optional — customer may leave it blank
        public string? CustomerContact { get; set; }       // optional email/phone for follow-up
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

        // a conversation HAS MANY messages and HAS MANY product-links
        public List<Message> Messages { get; set; } = new();
        public List<ConversationPart> Parts { get; set; } = new();
        public bool HandedOff { get; set; } = false;       // a human has taken over -> the bot stays quiet

        // "Archived" = closed (column name kept so the database doesn't need renaming)
        public bool Archived { get; set; } = false;
        public string? ClosedBy { get; set; }              // "customer" or "admin"
        public DateTime? ClosedAt { get; set; }

        public string? TranscriptToken { get; set; }       // random code for the shareable transcript PDF link
    }
}
