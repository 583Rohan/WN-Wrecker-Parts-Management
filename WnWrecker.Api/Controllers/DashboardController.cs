using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;
        public DashboardController(AppDbContext db) => _db = db;

        // GET /api/admin/stats  -> numbers + recent activity for the dashboard
        [EndpointSummary("Admin dashboard stats")]
        [HttpGet("stats")]
        public async Task<IActionResult> Stats()
        {
            var parts = await _db.Parts.ToListAsync();
            var inStock = parts.Where(p => p.Status == "In Stock").ToList();

            var totalConversations = await _db.Conversations.CountAsync();
            var activeConversations = await _db.Conversations.CountAsync(c => !c.Archived);
            var needHuman = await _db.Conversations.CountAsync(c => c.HandedOff && !c.Archived);

            var invoiceCount = await _db.Invoices.CountAsync();
            var revenue = await _db.Invoices.SumAsync(i => (decimal?)i.Total) ?? 0m;

            var recentChats = await _db.Conversations
                .OrderByDescending(c => c.LastMessageAt)
                .Take(5)
                .Select(c => new
                {
                    c.Id,
                    customer = c.CustomerName,
                    c.HandedOff,
                    c.Archived,
                    c.LastMessageAt,
                    lastMessage = c.Messages.OrderByDescending(m => m.SentAt).Select(m => m.Text).FirstOrDefault()
                })
                .ToListAsync();

            var recentInvoices = await _db.Invoices
                .OrderByDescending(i => i.CreatedAt)
                .Take(5)
                .Select(i => new { i.Id, i.Number, i.CustomerName, i.Total, i.CreatedAt })
                .ToListAsync();

            return Ok(new
            {
                parts = new
                {
                    total = parts.Count,
                    inStock = inStock.Count,
                    sold = parts.Count(p => p.Status == "Sold"),
                    inventoryValue = inStock.Sum(p => p.Price),
                    makes = parts.Select(p => p.Make.Trim().ToLower()).Where(m => m != "").Distinct().Count()
                },
                chats = new { total = totalConversations, active = activeConversations, needHuman },
                invoices = new { count = invoiceCount, revenue },
                recentChats,
                recentInvoices
            });
        }
    }
}