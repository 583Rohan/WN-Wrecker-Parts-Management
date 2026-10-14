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

                // existing invoices become "Unpaid" when the column is added
                e.Property(i => i.Status).HasMaxLength(20).HasDefaultValue(InvoiceStatus.Unpaid);
                e.Property(i => i.PublicToken).HasMaxLength(64);
                e.HasIndex(i => i.PublicToken);
            });

            modelBuilder.Entity<InvoiceItem>(e =>
            {
                e.Property(i => i.UnitPrice).HasPrecision(18, 2);
                e.Property(i => i.LineTotal).HasPrecision(18, 2);
            });

            modelBuilder.Entity<Conversation>(e =>
            {
                e.Property(c => c.ReferenceCode).HasMaxLength(12);
                e.HasIndex(c => c.ReferenceCode).IsUnique();          // each chat has its own code
                e.Property(c => c.ClosedBy).HasMaxLength(20);
                e.Property(c => c.TranscriptToken).HasMaxLength(64);
                e.HasIndex(c => c.TranscriptToken);
            });

            modelBuilder.Entity<Message>(e =>
            {
                e.Property(m => m.Kind).HasMaxLength(20).HasDefaultValue("text");   // existing messages become "text"
                e.HasOne(m => m.Invoice)
                 .WithMany()
                 .HasForeignKey(m => m.InvoiceId)
                 .OnDelete(DeleteBehavior.NoAction);                  // invoices are never deleted
            });
        }
    }
}
