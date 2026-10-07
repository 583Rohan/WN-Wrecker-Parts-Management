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
        public InvoicesController(AppDbContext db) => _db = db;

        public record InvoiceItemRequest(int? PartId, string? Description, int Quantity, decimal? UnitPrice);
        public record CreateInvoiceRequest(string CustomerName, string? CustomerContact, string? Notes, int? ConversationId, List<InvoiceItemRequest> Items);

        // POST /api/admin/invoices  -> create an invoice (items can be free-text or reference a part)
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
                CustomerContact = req.CustomerContact?.Trim(),
                Notes = req.Notes?.Trim(),
                ConversationId = req.ConversationId,
            };

            foreach (var it in req.Items)
            {
                var description = it.Description?.Trim() ?? "";
                var unitPrice = it.UnitPrice ?? 0m;
                var qty = it.Quantity < 1 ? 1 : it.Quantity;

                // if the item references a part, fill in missing name/price from that part
                if (it.PartId is int pid)
                {
                    var part = await _db.Parts.FindAsync(pid);
                    if (part != null)
                    {
                        if (string.IsNullOrWhiteSpace(description))
                            description = $"{part.Name} — {part.Make} {part.Model} {part.Year}";
                        if (it.UnitPrice is null) unitPrice = part.Price;
                    }
                }

                if (string.IsNullOrWhiteSpace(description))
                    return BadRequest("Each item needs a description or a valid part.");

                invoice.Items.Add(new InvoiceItem
                {
                    PartId = it.PartId,
                    Description = description,
                    Quantity = qty,
                    UnitPrice = unitPrice,
                    LineTotal = unitPrice * qty,
                });
            }

            invoice.Subtotal = invoice.Items.Sum(i => i.LineTotal);
            invoice.Gst = Math.Round(invoice.Subtotal * 0.10m, 2);
            invoice.Total = invoice.Subtotal + invoice.Gst;

            _db.Invoices.Add(invoice);
            await _db.SaveChangesAsync();                 // assigns Id

            invoice.Number = $"INV-{invoice.Id:D4}";
            await _db.SaveChangesAsync();                 // store the number

            return Ok(new { invoice.Id, invoice.Number });
        }

        // GET /api/admin/invoices  -> invoice history
        [EndpointSummary("List invoices")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var invoices = await _db.Invoices
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new
                {
                    i.Id,
                    i.Number,
                    i.CustomerName,
                    i.CustomerContact,
                    i.Total,
                    i.CreatedAt,
                    itemCount = i.Items.Count
                })
                .ToListAsync();
            return Ok(invoices);
        }

        // GET /api/admin/invoices/5  -> one invoice with items
        [EndpointSummary("Get one invoice")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOne(int id)
        {
            var inv = await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
            if (inv == null) return NotFound();
            return Ok(new
            {
                inv.Id,
                inv.Number,
                inv.CustomerName,
                inv.CustomerContact,
                inv.Notes,
                inv.Subtotal,
                inv.Gst,
                inv.Total,
                inv.CreatedAt,
                items = inv.Items.Select(it => new { it.Description, it.Quantity, it.UnitPrice, it.LineTotal })
            });
        }

        // GET /api/admin/invoices/5/pdf  -> downloadable PDF
        [EndpointSummary("Download invoice PDF")]
        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> GetPdf(int id)
        {
            var inv = await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
            if (inv == null) return NotFound();
            var bytes = InvoicePdf.Generate(inv);
            return File(bytes, "application/pdf", $"{inv.Number}.pdf");
        }
    }
}