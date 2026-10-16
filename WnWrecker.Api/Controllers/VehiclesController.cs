using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;

namespace WnWrecker.Api.Controllers
{
    // Makes, models and years for the car finder and home page tiles.
    // Matching ignores capitals ("FORD", "Ford" and "ford" are one make), the same as the shop search.
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public VehiclesController(AppDbContext db) => _db = db;

        // the spelling used most often for a group of names that only differ in capitals
        // (on a tie, "Toyota" is preferred over "TOYOTA")
        private static string Display(IEnumerable<string> names) =>
            names.GroupBy(n => n)
                 .OrderByDescending(g => g.Count())
                 .ThenBy(g => g.Key == g.Key.ToUpperInvariant() ? 1 : 0)
                 .ThenBy(g => g.Key, StringComparer.Ordinal)
                 .First().Key;

        private static List<string> DistinctIgnoringCase(IEnumerable<string> names) =>
            names.Select(n => n.Trim())
                 .Where(n => n != "")
                 .GroupBy(n => n.ToLowerInvariant())
                 .Select(Display)
                 .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
                 .ToList();

        // GET /api/vehicles/makes  → all makes we have in-stock parts for
        [HttpGet("makes")]
        public async Task<ActionResult<IEnumerable<string>>> GetMakes()
        {
            var makes = await _db.Parts
                .Where(p => p.Status == "In Stock")
                .Select(p => p.Make)
                .ToListAsync();
            return Ok(DistinctIgnoringCase(makes));
        }

        // GET /api/vehicles/makes/counts  → each in-stock make with how many parts we have (home page tiles)
        [HttpGet("makes/counts")]
        public async Task<IActionResult> GetMakeCounts()
        {
            var makes = await _db.Parts
                .Where(p => p.Status == "In Stock")
                .Select(p => p.Make)
                .ToListAsync();
            var counts = makes
                .Select(m => m.Trim())
                .Where(m => m != "")
                .GroupBy(m => m.ToLowerInvariant())
                .Select(g => new { make = Display(g), count = g.Count() })
                .OrderBy(x => x.make, StringComparer.OrdinalIgnoreCase);
            return Ok(counts);
        }

        // GET /api/vehicles/models?make=Toyota  → models for that make
        [HttpGet("models")]
        public async Task<ActionResult<IEnumerable<string>>> GetModels(string make)
        {
            if (string.IsNullOrWhiteSpace(make)) return BadRequest("make is required");
            var mk = make.Trim().ToLower();

            var models = await _db.Parts
                .Where(p => p.Status == "In Stock" && p.Make.Trim().ToLower() == mk)
                .Select(p => p.Model)
                .ToListAsync();
            return Ok(DistinctIgnoringCase(models));
        }

        // GET /api/vehicles/years?make=Toyota&model=Corolla  → years for that make+model
        [HttpGet("years")]
        public async Task<ActionResult<IEnumerable<int>>> GetYears(string make, string model)
        {
            if (string.IsNullOrWhiteSpace(make) || string.IsNullOrWhiteSpace(model))
                return BadRequest("make and model are required");
            var mk = make.Trim().ToLower();
            var md = model.Trim().ToLower();

            var years = await _db.Parts
                .Where(p => p.Status == "In Stock" && p.Make.Trim().ToLower() == mk && p.Model.Trim().ToLower() == md)
                .Select(p => p.Year)
                .Distinct()
                .OrderByDescending(y => y)
                .ToListAsync();
            return Ok(years);
        }
    }
}
