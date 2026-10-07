namespace WnWrecker.Api.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public string Number { get; set; } = "";            // e.g. INV-0001
        public string CustomerName { get; set; } = "";
        public string? CustomerContact { get; set; }        // email or phone
        public string? Notes { get; set; }
        public int? ConversationId { get; set; }            // optional link to a chat enquiry
        public decimal Subtotal { get; set; }
        public decimal Gst { get; set; }                    // 10% GST
        public decimal Total { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<InvoiceItem> Items { get; set; } = new();
    }
}
