using Microsoft.AspNetCore.Mvc;

namespace WnWrecker.Api.Controllers
{
    // Public business details from the "Business" section of appsettings.json. Changing them there
    // updates the website, the invoices and the chat bot.
    [ApiController]
    [Route("api/business")]
    public class BusinessController : ControllerBase
    {
        private readonly IConfiguration _config;
        public BusinessController(IConfiguration config) => _config = config;

        // GET /api/business
        [EndpointSummary("Public business details")]
        [HttpGet]
        public IActionResult Get()
        {
            var b = _config.GetSection("Business");
            return Ok(new
            {
                name = b["Name"] ?? "WN Wrecker",
                abn = b["Abn"] ?? "",
                address = b["Address"] ?? "",
                phone = b["Phone"] ?? "",
                email = b["Email"] ?? "",
                hours = b["Hours"] ?? ""
            });
        }
    }
}
