namespace WnWrecker.Api.Models
{
    public class Message
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }            // foreign key → which conversation
        public string Sender { get; set; } = "customer";   // "customer", "admin", "bot" or "system"
        public string Text { get; set; } = "";
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public string Kind { get; set; } = "text";         // "text" or "invoice" (an invoice card sent by the admin)
        public int? InvoiceId { get; set; }                // set when Kind == "invoice"
        public Invoice? Invoice { get; set; }

        public Conversation? Conversation { get; set; }     // navigation back to the parent
    }
}
