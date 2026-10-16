namespace WnWrecker.Api.Models
{
    public class ConversationPart
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public int PartId { get; set; }

        public Conversation? Conversation { get; set; }
        public Part? Part { get; set; }
    }
}
