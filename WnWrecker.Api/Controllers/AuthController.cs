using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace WnWrecker.Api.Controllers
{
    public record LoginRequest(string Username, string Password);

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;
        public AuthController(IConfiguration config) => _config = config;

        // POST /api/auth/login -> a token the admin pages send with every request (valid 8 hours)
        [HttpPost("login")]
        [EnableRateLimiting("strict")]
        public IActionResult Login(LoginRequest login)
        {
            if (!Matches(login.Username, _config["AdminCredentials:Username"]) ||
                !Matches(login.Password, _config["AdminCredentials:Password"]))
                return Unauthorized();

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                claims: new[] { new Claim(ClaimTypes.Name, login.Username) },
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds);

            return Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
        }

        // compares in constant time, so response timing doesn't hint at how much of a guess was right
        private static bool Matches(string? given, string? expected) =>
            given != null && expected != null &&
            CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(expected));
    }
}
