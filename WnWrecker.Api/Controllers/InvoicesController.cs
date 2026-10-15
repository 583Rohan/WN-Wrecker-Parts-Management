using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;
using WnWrecker.Api.Services;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/admin/invoices")]
    [Authorize]
    public class InvoicesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public InvoicesController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public record InvoiceItemRequest(int? PartId, string? Description, int Quantity, decimal? UnitPrice);
        public record CreateInvoiceRequest(
            string CustomerName,
            string? CustomerContact,
            string? Notes,
            int? ConversationId,
            List<InvoiceItemRequest> Items,
            string? Title = null,
            bool ReplaceConflicts = false);      // true = void older unpaid invoices that hold the same parts
        public record RefundRequest(List<int>? RestockPartIds);

        private const string InStock = "In Stock";
        private const string Sold = "Sold";
        private const string WrittenOff = "Written off";   // refunded but not resold (e.g. damaged) — hidden from the shop, not counted as sold

        // ---------------------------------------------------------------- helpers

        private static string NewToken() => Guid.NewGuid().ToString("N");

        // what the frontend receives for one invoice
        private static object ToDto(Invoice i) => new
        {
            i.Id,
            i.Number,
            i.Title,
            i.CustomerName,
            i.CustomerContact,
            i.Notes,
            i.ConversationId,
            i.Subtotal,
            i.Gst,
            i.Total,
            i.Status,
            i.CreatedAt,
            i.PaidAt,
            i.CancelledAt,
            i.PublicToken,
            items = i.Items.OrderBy(it => it.Id).Select(it => new
            {
                it.Id,
                it.PartId,
                it.Description,
                it.Quantity,
                it.UnitPrice,
                it.LineTotal
            })
        };

        // older invoices (made before sharing existed) get a public link code the first time they're loaded
        private async Task EnsureTokens(IEnumerable<Invoice> invoices)
        {
            var changed = false;
            foreach (var inv in invoices.Where(i => string.IsNullOrEmpty(i.PublicToken)))
            {
                inv.PublicToken = NewToken();
                changed = true;
            }
            if (changed) await _db.SaveChangesAsync();
        }

        private static string? CleanTitle(string? title)
        {
            var t = title?.Trim();
            if (string.IsNullOrEmpty(t)) return null;
            return t.Length > 100 ? t[..100] : t;
        }

        private static List<int> PartIdsOf(Invoice inv) =>
            inv.Items.Where(i => i.PartId.HasValue).Select(i => i.PartId!.Value).Distinct().ToList();

        private async Task<Invoice?> Find(int id) =>
            await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);

        // ---------------------------------------------------------------- create

        // POST /api/admin/invoices  -> create an invoice (status Unpaid; parts are NOT marked sold yet)
        [EndpointSummary("Create an invoice")]
        [HttpPost]
        public async Task<IActionResult> Create(CreateInvoiceRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.CustomerName))
                return BadRequest("Customer name is required.");
            if (req.Items == null || req.Items.Count == 0)
                return BadRequest("At least one item is required.");

            var invoice = new Invoice
            {
                CustomerName = req.CustomerName.Trim(),
                Title = CleanTitle(req.Title),
                CustomerContact = string.IsNullOrWhiteSpace(req.CustomerContact) ? null : req.CustomerContact.Trim(),
                Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
                ConversationId = req.ConversationId,
                Status = InvoiceStatus.Unpaid,
                PublicToken = NewToken(),
            };

            var partIds = new List<int>();

            foreach (var it in req.Items)
            {
                var description = it.Description?.Trim() ?? "";
                var unitPrice = it.UnitPrice ?? 0m;
                var qty = it.Quantity < 1 ? 1 : it.Quantity;

                // a line that references a part: the part must exist and still be for sale
                if (it.PartId is int pid)
                {
                    var part = await _db.Parts.FindAsync(pid);
                    if (part == null)
                        return BadRequest($"Part #{pid} no longer exists.");
                    if (part.Status != InStock)
                        return BadRequest($"\"{part.Name}\" is not for sale (it's {part.Status}).");
                    if (partIds.Contains(pid))
                        return BadRequest($"\"{part.Name}\" is on this invoice twice.");

                    partIds.Add(pid);
                    qty = 1;                                         // each listed part is a single item
                    if (string.IsNullOrWhiteSpace(description))
                        description = $"{part.Name} — {part.Make} {part.Model} {part.Year}";
                    if (it.UnitPrice is null) unitPrice = part.Price;
                }

                if (string.IsNullOrWhiteSpace(description))
                    return BadRequest("Each item needs a description or a valid part.");
                if (unitPrice < 0)
                    return BadRequest("Prices can't be negative.");

                invoice.Items.Add(new InvoiceItem
                {
                    PartId = it.PartId,
                    Description = description,
                    Quantity = qty,
                    UnitPrice = unitPrice,
                    LineTotal = unitPrice * qty,
                });
            }

            // is any of these parts already on another unpaid invoice?
            var conflicts = partIds.Count == 0
                ? new List<Invoice>()
                : await _db.Invoices
                    .Include(i => i.Items)
                    .Where(i => i.Status == InvoiceStatus.Unpaid &&
                                i.Items.Any(it => it.PartId.HasValue && partIds.Contains(it.PartId.Value)))
                    .ToListAsync();

            if (conflicts.Count > 0 && !req.ReplaceConflicts)
            {
                return Conflict(new
                {
                    message = "Some parts are already on another unpaid invoice.",
                    conflicts = conflicts.Select(c => new
                    {
                        c.Id,
                        c.Number,
                        c.CustomerName,
                        parts = c.Items
                            .Where(it => it.PartId.HasValue && partIds.Contains(it.PartId.Value))
                            .Select(it => it.Description)
                    })
                });
            }

            foreach (var old in conflicts)                 // admin confirmed: void the older invoices
            {
                old.Status = InvoiceStatus.Void;
                old.CancelledAt = DateTime.UtcNow;
            }

            // GST-inclusive maths (Australia): the price already includes GST
            invoice.Total = invoice.Items.Sum(i => i.LineTotal);
            invoice.Gst = Math.Round(invoice.Total / 11m, 2, MidpointRounding.AwayFromZero);
            invoice.Subtotal = invoice.Total - invoice.Gst;

            _db.Invoices.Add(invoice);
            await _db.SaveChangesAsync();                 // assigns Id

            invoice.Number = $"INV-{invoice.Id:D4}";
            await _db.SaveChangesAsync();                 // store the number

            return Ok(ToDto(invoice));
        }

        // ---------------------------------------------------------------- read

        // GET /api/admin/invoices  -> every invoice with its items
        [EndpointSummary("List invoices")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var invoices = await _db.Invoices
                .Include(i => i.Items)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
            await EnsureTokens(invoices);
            return Ok(invoices.Select(ToDto));
        }

        // GET /api/admin/invoices/5  -> one invoice with items
        [EndpointSummary("Get one invoice")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOne(int id)
        {
            var inv = await Find(id);
            if (inv == null) return NotFound();
            await EnsureTokens(new[] { inv });
            return Ok(ToDto(inv));
        }

        // GET /api/admin/invoices/5/pdf  -> downloadable PDF (admin)
        [EndpointSummary("Download invoice PDF")]
        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> GetPdf(int id)
        {
            var inv = await Find(id);
            if (inv == null) return NotFound();
            var bytes = InvoicePdf.Generate(inv, _config.GetSection("Business"));
            return File(bytes, "application/pdf", $"{inv.Number}.pdf");
        }

        // ---------------------------------------------------------------- status changes

        // POST /api/admin/invoices/5/paid  -> mark paid; its parts become Sold everywhere
        [EndpointSummary("Mark invoice as paid")]
        [HttpPost("{id}/paid")]
        public async Task<IActionResult> MarkPaid(int id)
        {
            var inv = await Find(id);
            if (inv == null) return NotFound();
            if (inv.Status != InvoiceStatus.Unpaid)
                return BadRequest($"Only unpaid invoices can be marked paid (this one is {inv.Status}).");

            var partIds = PartIdsOf(inv);

            // safety net: never sell the same part twice
            var soldElsewhere = await _db.Invoices
                .Where(i => i.Id != inv.Id && i.Status == InvoiceStatus.Paid &&
                            i.Items.Any(it => it.PartId.HasValue && partIds.Contains(it.PartId.Value)))
                .Select(i => i.Number)
                .ToListAsync();
            if (soldElsewhere.Count > 0)
                return Conflict(new { message = $"A part on this invoice was already sold on {string.Join(", ", soldElsewhere)}." });

            var parts = await _db.Parts.Where(p => partIds.Contains(p.Id)).ToListAsync();
            foreach (var p in parts) p.Status = Sold;

            inv.Status = InvoiceStatus.Paid;
            inv.PaidAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ToDto(inv));
        }

        // POST /api/admin/invoices/5/unpaid  -> undo "paid" (e.g. a mis-click); parts go back in stock
        [EndpointSummary("Mark invoice as unpaid")]
        [HttpPost("{id}/unpaid")]
        public async Task<IActionResult> MarkUnpaid(int id)
        {
            var inv = await Find(id);
            if (inv == null) return NotFound();
            if (inv.Status != InvoiceStatus.Paid)
                return BadRequest("Only paid invoices can be marked unpaid.");

            var partIds = PartIdsOf(inv);
            var parts = await _db.Parts.Where(p => partIds.Contains(p.Id) && p.Status == Sold).ToListAsync();
            foreach (var p in parts) p.Status = InStock;

            inv.Status = InvoiceStatus.Unpaid;
            inv.PaidAt = null;
            await _db.SaveChangesAsync();
            return Ok(ToDto(inv));
        }

        // POST /api/admin/invoices/5/void  -> cancel an unpaid invoice (kept on record, parts untouched)
        [EndpointSummary("Void an unpaid invoice")]
        [HttpPost("{id}/void")]
        public async Task<IActionResult> Void(int id)
        {
            var inv = await Find(id);
            if (inv == null) return NotFound();
            if (inv.Status != InvoiceStatus.Unpaid)
                return BadRequest("Only unpaid invoices can be voided. Paid invoices are refunded instead.");

            inv.Status = InvoiceStatus.Void;
            inv.CancelledAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ToDto(inv));
        }

        // POST /api/admin/invoices/5/refund  -> paid invoice is refunded & voided;
        // chosen parts go back in stock, the rest are written off (not for sale, not counted as sold)
        [EndpointSummary("Refund a paid invoice")]
        [HttpPost("{id}/refund")]
        public async Task<IActionResult> Refund(int id, RefundRequest req)
        {
            var inv = await Find(id);
            if (inv == null) return NotFound();
            if (inv.Status != InvoiceStatus.Paid)
                return BadRequest("Only paid invoices can be refunded.");

            var onInvoice = PartIdsOf(inv);
            var restock = (req.RestockPartIds ?? new List<int>()).Where(onInvoice.Contains).ToList();
            var parts = await _db.Parts.Where(p => onInvoice.Contains(p.Id)).ToListAsync();
            foreach (var p in parts)
            {
                if (restock.Contains(p.Id)) p.Status = InStock;
                else if (p.Status == Sold) p.Status = WrittenOff;
            }

            inv.Status = InvoiceStatus.Refunded;
            inv.CancelledAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ToDto(inv));
        }
    }
}