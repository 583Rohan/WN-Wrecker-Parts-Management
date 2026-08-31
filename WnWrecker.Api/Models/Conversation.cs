namespace WnWrecker.Api.Models
{
    public class Conversation
    {
        public int Id { get; set; }                        // internal ID (admin-facing)
        public Guid Token { get; set; } = Guid.NewGuid();  // the anonymous customer's key (stored in their browser)
        public string? CustomerName { get; set; }          // optional — customer may leave it blank
        public string? CustomerContact { get; set; }       // optional email/phone for follow-up
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

        // a conversation HAS MANY messages and HAS MANY product-links
        public List<Message> Messages { get; set; } = new();
        public List<ConversationPart> Parts { get; set; } = new();
    }
}
