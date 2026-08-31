namespace WnWrecker.Api.Models
{
    public class ConversationPart
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }            // foreign key → the conversation
        public int PartId { get; set; }                    // foreign key → the part
        public string Status { get; set; } = "New";        // New / In Discussion / Reserved / Awaiting Pickup / Sold / Closed
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Conversation? Conversation { get; set; }
        public Part? Part { get; set; }
    }
}
