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

    }
}
