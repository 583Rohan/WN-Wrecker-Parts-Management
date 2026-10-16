namespace WnWrecker.Api.Models
{
    public class ConversationPart
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public int PartId { get; set; }

        // no longer used (chats now show the part's live stock status); dropped with the Postgres migration
        public string Status { get; set; } = "New";
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Conversation? Conversation { get; set; }
        public Part? Part { get; set; }
    }
}
