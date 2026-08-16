using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;
using Microsoft.AspNetCore.Authorization;

namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]              // base URL = /api/parts
    public class PartsController : ControllerBase
    {
        private readonly AppDbContext _db;

        // the DbContext is handed to us automatically (dependency injection)
        public PartsController(AppDbContext db)
        {
            _db = db;
        }

        // GET /api/parts?search=&make=&year=   -> list (with optional search/filter)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Part>>> GetParts(string? search, string? make, int? year)
        {
            var query = _db.Parts.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(p => p.Name.Contains(search));
            if (!string.IsNullOrWhiteSpace(make))
                query = query.Where(p => p.Make == make);
            if (year.HasValue)
                query = query.Where(p => p.Year == year);

            return await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        }

        // GET /api/parts/5   -> one part
        [HttpGet("{id}")]
        public async Task<ActionResult<Part>> GetPart(int id)
        {
            var part = await _db.Parts.FindAsync(id);
            if (part == null) return NotFound();      // returns 404
            return part;
        }

        // POST /api/parts    -> create
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Part>> CreatePart(Part part)
        {
            _db.Parts.Add(part);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPart), new { id = part.Id }, part);  // 201
        }

        // PUT /api/parts/5   -> update
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
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePart(int id)
        {
            var part = await _db.Parts.FindAsync(id);
            if (part == null) return NotFound();

            _db.Parts.Remove(part);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
