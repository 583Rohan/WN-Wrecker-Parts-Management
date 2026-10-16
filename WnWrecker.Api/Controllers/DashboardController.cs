using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;
using WnWrecker.Api.Services;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;
        public DashboardController(AppDbContext db) => _db = db;

        // GET /api/admin/stats  -> everything the dashboard shows, in one lightweight call
        [EndpointSummary("Admin dashboard stats")]
        [HttpGet("stats")]
        public async Task<IActionResult> Stats()
        {
            var now = DateTime.UtcNow;

            // parts
            var parts = await _db.Parts.AsNoTracking()
                .Select(p => new { p.Status, p.Price, p.Make })
                .ToListAsync();
            var inStock = parts.Where(p => p.Status == "In Stock").ToList();

            // chats (same "needs reply" rule as the Chats page)
            var openChats = await _db.Conversations.AsNoTracking()
                .Where(c => !c.Archived)
                .OrderByDescending(c => c.LastMessageAt)
                .Select(c => new
                {
                    c.Id,
                    c.ReferenceCode,
                    c.CustomerName,
                    c.LastMessageAt,
                    PartCount = c.Parts.Count,
                    LastHumanSender = c.Messages
                        .Where(m => m.Sender == "customer" || m.Sender == "admin")
                        .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
                        .Select(m => m.Sender)
                        .FirstOrDefault(),
                    LastText = c.Messages
                        .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
                        .Select(m => m.Kind == "invoice" ? "Invoice sent" : m.Text)
                        .FirstOrDefault()
                })
                .ToListAsync();

            var needsReply = openChats.Where(c => c.LastHumanSender == null || c.LastHumanSender == "customer").ToList();
            var closedChats = await _db.Conversations.CountAsync(c => c.Archived);

            // invoices
            var invoices = await _db.Invoices.AsNoTracking()
                .Select(i => new { i.Id, i.Number, i.Title, i.CustomerName, i.Total, i.Status, i.CreatedAt, i.PaidAt })
                .ToListAsync();

            var unpaid = invoices.Where(i => i.Status == InvoiceStatus.Unpaid).ToList();
            var paid = invoices.Where(i => i.Status == InvoiceStatus.Paid).ToList();
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var oldestUnpaid = unpaid.OrderBy(i => i.CreatedAt).FirstOrDefault();

            // paid sales for the last 6 months (by the month they were paid)
            var months = Enumerable.Range(0, 6)
                .Select(k => monthStart.AddMonths(-5 + k))
                .Select(m => new
                {
                    month = m.ToString("yyyy-MM"),
                    label = m.ToString("MMM"),
                    total = paid.Where(i => i.PaidAt.HasValue && i.PaidAt.Value >= m && i.PaidAt.Value < m.AddMonths(1)).Sum(i => i.Total),
                    count = paid.Count(i => i.PaidAt.HasValue && i.PaidAt.Value >= m && i.PaidAt.Value < m.AddMonths(1))
                })
                .ToList();

            return Ok(new
            {
                parts = new
                {
                    total = parts.Count,
                    inStock = inStock.Count,
                    sold = parts.Count(p => p.Status == "Sold"),
                    writtenOff = parts.Count(p => p.Status == "Written off"),
                    inventoryValue = inStock.Sum(p => p.Price),
                    makes = inStock.Select(p => p.Make.Trim().ToLower()).Where(m => m != "").Distinct().Count()
                },
                chats = new
                {
                    open = openChats.Count,
                    needsReply = needsReply.Count,
                    waiting = openChats.Count - needsReply.Count,
                    closed = closedChats
                },
                invoices = new
                {
                    total = invoices.Count,
                    unpaidCount = unpaid.Count,
                    outstanding = unpaid.Sum(i => i.Total),
                    oldestUnpaidDays = oldestUnpaid == null ? (int?)null : (int)(now - oldestUnpaid.CreatedAt).TotalDays,
                    oldestUnpaidNumber = oldestUnpaid?.Number,
                    paidCount = paid.Count,
                    collected = paid.Sum(i => i.Total),                              // revenue = paid invoices only
                    collectedThisMonth = paid.Where(i => i.PaidAt >= monthStart).Sum(i => i.Total),
                    paidThisMonth = paid.Count(i => i.PaidAt >= monthStart)
                },
                salesByMonth = months,
                chatsNeedingReply = needsReply.Take(6).Select(c => new
                {
                    c.Id,
                    reference = c.ReferenceCode,
                    c.CustomerName,
                    c.LastMessageAt,
                    lastMessage = c.LastText,
                    parts = c.PartCount
                }),
                recentInvoices = invoices
                    .OrderByDescending(i => i.CreatedAt)
                    .Take(6)
                    .Select(i => new { i.Id, i.Number, i.Title, i.CustomerName, i.Total, i.Status, i.CreatedAt })
            });
        }
    }
}
