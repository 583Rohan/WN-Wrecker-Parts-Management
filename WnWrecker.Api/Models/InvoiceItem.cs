namespace WnWrecker.Api.Models
{
    public class InvoiceItem
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public int? PartId { get; set; }                    // optional link to a part (snapshot only)
        public string Description { get; set; } = "";
        public int Quantity { get; set; } = 1;
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }

        public Invoice? Invoice { get; set; }
    }
}