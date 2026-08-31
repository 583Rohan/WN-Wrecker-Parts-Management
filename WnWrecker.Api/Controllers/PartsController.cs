using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]              // base URL = /api/parts
    public class PartsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        // the DbContext is handed to us automatically (dependency injection)
        public PartsController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // GET /api/parts?search=&make=&year=   -> list (with optional search/filter)
        [EndpointSummary("List / search parts")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Part>>> GetParts(string? search, string? make, string? model, int? year)
        {
            var query = _db.Parts.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(p => p.Name.Contains(search));
            if (!string.IsNullOrWhiteSpace(make))
                query = query.Where(p => p.Make == make);
            if (!string.IsNullOrWhiteSpace(model))
                query = query.Where(p => p.Model == model);
            if (year.HasValue)
                query = query.Where(p => p.Year == year);

            return await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        }

        // GET /api/parts/5   -> one part
        [EndpointSummary("Get a part by ID")]
        [HttpGet("{id}")]
        public async Task<ActionResult<Part>> GetPart(int id)
        {
            var part = await _db.Parts.FindAsync(id);
            if (part == null) return NotFound();      // returns 404
            return part;
        }

        // POST /api/parts    -> create
        [EndpointSummary("Create a part")]
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Part>> CreatePart(Part part)
        {
            _db.Parts.Add(part);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPart), new { id = part.Id }, part);  // 201
        }

        // PUT /api/parts/5   -> update
        [EndpointSummary("Update a part")]
        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePart(int id, Part updated)
        {
            var part = await _db.Parts.FindAsync(id);
            if (part == null) return NotFound();

            part.Name = updated.Name;
            part.Make = updated.Make;
            part.Model = updated.Model;
            part.Year = updated.Year;
            part.Condition = updated.Condition;
            part.Price = updated.Price;
            part.Status = updated.Status;
            part.Description = updated.Description;
            part.PhotoUrl = updated.PhotoUrl;

            await _db.SaveChangesAsync();
            return NoContent();      // 204
        }

        // DELETE /api/parts/5   -> delete
        [EndpointSummary("Delete a part")]
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePart(int id)
        {
            var part = await _db.Parts.FindAsync(id);
            if (part == null) return NotFound();

            // remove the image from Azure too, if it has one
            if (!string.IsNullOrEmpty(part.PhotoUrl))
            {
                var containerClient = new BlobContainerClient(
                    _config["AzureBlob:ConnectionString"],
                    _config["AzureBlob:Container"]);
                var blobName = Path.GetFileName(new Uri(part.PhotoUrl).LocalPath);
                await containerClient.DeleteBlobIfExistsAsync(blobName);
            }

            _db.Parts.Remove(part);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [EndpointSummary("Upload a part photo")]
        [Authorize]
        [HttpPost("{id}/photo")]
        public async Task<IActionResult> UploadPhoto(int id, IFormFile file)
        {
            var part = await _db.Parts.FindAsync(id);
            if (part == null) return NotFound();
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

            //image allowed only
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest("Only image files (jpg, jpeg, png, webp, gif) are allowed.");

            //image size upto 20mb
            const long maxBytes = 20 * 1024 * 1024; // 20 MB
            if (file.Length > maxBytes)
                return BadRequest("Image must be 20 MB or smaller.");

            var containerClient = new BlobContainerClient(
                _config["AzureBlob:ConnectionString"],
                _config["AzureBlob:Container"]);

            var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var blobClient = containerClient.GetBlobClient(blobName);

            using (var stream = file.OpenReadStream())
            {
                await blobClient.UploadAsync(stream,
                    new BlobHttpHeaders { ContentType = file.ContentType });
            }

            part.PhotoUrl = blobClient.Uri.ToString();
            await _db.SaveChangesAsync();

            return Ok(new { url = part.PhotoUrl });
        }
    }
}