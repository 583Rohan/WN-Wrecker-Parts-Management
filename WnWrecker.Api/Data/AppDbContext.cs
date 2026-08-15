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
    }
}
