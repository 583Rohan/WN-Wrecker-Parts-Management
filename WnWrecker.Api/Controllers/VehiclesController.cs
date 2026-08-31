using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;



namespace WnWrecker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public VehiclesController(AppDbContext db) => _db = db;

        // GET /api/vehicles/makes  → all makes we have in-stock parts for
        [HttpGet("makes")]
        public async Task<ActionResult<IEnumerable<string>>> GetMakes()
        {
            var makes = await _db.Parts
                .Where(p => p.Status == "In Stock" && p.Make != "")
                .Select(p => p.Make)
                .Distinct()
                .OrderBy(m => m)
                .ToListAsync();
            return Ok(makes);
        }

        // GET /api/vehicles/models?make=Toyota  → models for that make
        [HttpGet("models")]
        public async Task<ActionResult<IEnumerable<string>>> GetModels(string make)
        {
            if (string.IsNullOrWhiteSpace(make)) return BadRequest("make is required");

            var models = await _db.Parts
                .Where(p => p.Status == "In Stock" && p.Make == make && p.Model != "")
                .Select(p => p.Model)
                .Distinct()
                .OrderBy(m => m)
                .ToListAsync();
            return Ok(models);
        }

        // GET /api/vehicles/years?make=Toyota&model=Corolla  → years for that make+model
        [HttpGet("years")]
        public async Task<ActionResult<IEnumerable<int>>> GetYears(string make, string model)
        {
            if (string.IsNullOrWhiteSpace(make) || string.IsNullOrWhiteSpace(model))
                return BadRequest("make and model are required");

            var years = await _db.Parts
                .Where(p => p.Status == "In Stock" && p.Make == make && p.Model == model)
                .Select(p => p.Year)
                .Distinct()
                .OrderByDescending(y => y)
                .ToListAsync();
            return Ok(years);
        }
    }
}
