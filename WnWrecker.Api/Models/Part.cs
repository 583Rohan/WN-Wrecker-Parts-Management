namespace WnWrecker.Api.Models
{
    public class Part
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Make { get; set; } = "";
        public string Model { get; set; } = "";
        public int Year { get; set; }
        public string Condition { get; set; } = "";
        public decimal Price { get; set; }
        public string Status { get; set; } = "In Stock";   // In Stock | Sold | Written off
        public string? Description { get; set; }
        public string? PhotoUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
