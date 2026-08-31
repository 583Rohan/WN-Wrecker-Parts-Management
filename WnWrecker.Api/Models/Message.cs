namespace WnWrecker.Api.Models
{
    public class Message
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }            // foreign key → which conversation
        public string Sender { get; set; } = "customer";   // "customer" or "admin"
        public string Text { get; set; } = "";
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public Conversation? Conversation { get; set; }     // navigation back to the parent
    }
}
