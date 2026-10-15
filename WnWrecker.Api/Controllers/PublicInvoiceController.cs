using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Services;

namespace WnWrecker.Api.Controllers
{
    // The link customers get. No login needed: the long random token in the URL is the "key".
    [ApiController]
    [Route("api/invoices")]
    [AllowAnonymous]
    public class PublicInvoiceController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public PublicInvoiceController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // GET /api/invoices/p/{token}/pdf             -> opens the invoice PDF in the browser
        // GET /api/invoices/p/{token}/pdf?download=true -> downloads it as a file
        [EndpointSummary("Customer invoice link")]
        [HttpGet("p/{token}/pdf")]
        public async Task<IActionResult> GetPdf(string token, [FromQuery] bool download = false)
        {
            if (string.IsNullOrWhiteSpace(token) || token.Length < 20) return NotFound();

            var inv = await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.PublicToken == token);
            if (inv == null) return NotFound();

            var bytes = InvoicePdf.Generate(inv, _config.GetSection("Business"));
            if (download) return File(bytes, "application/pdf", $"{inv.Number}.pdf");

            Response.Headers.ContentDisposition = $"inline; filename=\"{inv.Number}.pdf\"";   // view in browser
            return File(bytes, "application/pdf");
        }
    }
}
