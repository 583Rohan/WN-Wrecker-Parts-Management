namespace WnWrecker.Api.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public string Number { get; set; } = "";            // e.g. INV-0001
        public string? Title { get; set; }                  // optional name, e.g. "Camry front bumper & lights"
        public string CustomerName { get; set; } = "";
        public string? CustomerContact { get; set; }        // email or phone
        public string? Notes { get; set; }
        public int? ConversationId { get; set; }            // optional link to a chat enquiry

        // prices are GST-inclusive: Total = what the customer pays, Gst = Total / 11, Subtotal = Total - Gst
        public decimal Subtotal { get; set; }
        public decimal Gst { get; set; }
        public decimal Total { get; set; }

        // Unpaid -> Paid (parts marked Sold) | Unpaid -> Void | Paid -> Refunded
        public string Status { get; set; } = InvoiceStatus.Unpaid;
        public DateTime? PaidAt { get; set; }
        public DateTime? CancelledAt { get; set; }          // when it was voided or refunded

        // random code used in the public customer link: /api/invoices/p/{PublicToken}/pdf
        public string? PublicToken { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<InvoiceItem> Items { get; set; } = new();
    }

    public static class InvoiceStatus
    {
        public const string Unpaid = "Unpaid";
        public const string Paid = "Paid";
        public const string Void = "Void";
        public const string Refunded = "Refunded";
    }
}