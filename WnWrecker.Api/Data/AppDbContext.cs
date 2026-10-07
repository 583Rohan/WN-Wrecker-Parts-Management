using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Models;


namespace WnWrecker.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Part> Parts => Set<Part>();   // this becomes the "Parts" table

        public DbSet<Conversation> Conversations => Set<Conversation>();
        public DbSet<Message> Messages => Set<Message>();
        public DbSet<ConversationPart> ConversationParts => Set<ConversationPart>();

        public DbSet<Invoice> Invoices => Set<Invoice>();
        public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // fixes the "decimal precision" warning and keeps money accurate
            modelBuilder.Entity<Part>().Property(p => p.Price).HasPrecision(18, 2);

            modelBuilder.Entity<Invoice>(e =>
            {
                e.Property(i => i.Subtotal).HasPrecision(18, 2);
                e.Property(i => i.Gst).HasPrecision(18, 2);
                e.Property(i => i.Total).HasPrecision(18, 2);
            });

            modelBuilder.Entity<InvoiceItem>(e =>
            {
                e.Property(i => i.UnitPrice).HasPrecision(18, 2);
                e.Property(i => i.LineTotal).HasPrecision(18, 2);
            });
        }
    }
}