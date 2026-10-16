using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;
using Microsoft.AspNetCore.Authorization;
using WnWrecker.Api.Services;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]              // base URL = /api/parts
    public class PartsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly PhotoStorage _photos;

        // the DbContext and photo storage are handed to us automatically (dependency injection)
        public PartsController(AppDbContext db, PhotoStorage photos)
        {
            _db = db;
            _photos = photos;
        }

        // GET /api/parts?search=&make=&model=&year=&inStock=true&sort=&page=&pageSize=   -> list (with optional search/filters)
        //   search   : every word must match the name, make, model, year or description (not case-sensitive)
        //   inStock  : true = only parts customers can buy (the shop, car finder and home page use this)
        //   sort     : newest (default) | price-asc | price-desc
        //   pageSize : return one page at a time (max 60); the total number of matches is sent in the X-Total-Count header
        [EndpointSummary("List / search parts")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Part>>> GetParts(string? search, string? make, string? model, int? year, bool? inStock,
                                                                    string? sort, int? page, int? pageSize)
        {
            var query = _db.Parts.AsQueryable();

            if (inStock == true)
                query = query.Where(p => p.Status == "In Stock");

            if (!string.IsNullOrWhiteSpace(search))
            {
                var words = search.Trim().ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
                foreach (var word in words)
                {
                    var w = word;   // each word must appear somewhere
                    query = query.Where(p =>
                        p.Name.ToLower().Contains(w) ||
                        p.Make.ToLower().Contains(w) ||
                        p.Model.ToLower().Contains(w) ||
                        p.Year.ToString() == w ||
                        (p.Description != null && p.Description.ToLower().Contains(w)));
                }
            }
            if (!string.IsNullOrWhiteSpace(make))
            {
                var m = make.Trim().ToLower();
                query = query.Where(p => p.Make.ToLower() == m);
            }
            if (!string.IsNullOrWhiteSpace(model))
            {
                var md = model.Trim().ToLower();
                query = query.Where(p => p.Model.ToLower() == md);
            }
            if (year.HasValue)
                query = query.Where(p => p.Year == year);

            query = sort switch
            {
                "price-asc" => query.OrderBy(p => p.Price).ThenByDescending(p => p.CreatedAt),
                "price-desc" => query.OrderByDescending(p => p.Price).ThenByDescending(p => p.CreatedAt),
                _ => query.OrderByDescending(p => p.CreatedAt),
            };

            if (pageSize.HasValue)
            {
                var size = Math.Clamp(pageSize.Value, 1, 60);
                var number = Math.Max(page ?? 1, 1);
                Response.Headers["X-Total-Count"] = (await query.CountAsync()).ToString();
                query = query.Skip((number - 1) * size).Take(size);
            }

            return await query.ToListAsync();
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
            // PhotoUrl is NOT changed here — photos only change through the upload endpoint below

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

            // remove the photo from Cloudinary too (if this fails, still delete the part)
            try { await _photos.DeleteAsync(part.PhotoUrl); } catch { /* photo clean-up is best-effort */ }

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

            if (!_photos.IsConfigured)
                return StatusCode(503, "Photo storage isn't set up yet (Cloudinary keys are missing).");

            string url;
            try
            {
                url = await _photos.UploadAsync(file);
            }
            catch (Exception ex)
            {
                return StatusCode(502, ex.Message);
            }

            // replacing a photo: delete the old one so Cloudinary doesn't fill up
            var oldUrl = part.PhotoUrl;
            part.PhotoUrl = url;
            await _db.SaveChangesAsync();
            try { await _photos.DeleteAsync(oldUrl); } catch { /* best-effort */ }

            return Ok(new { url = part.PhotoUrl });
        }
    }
}