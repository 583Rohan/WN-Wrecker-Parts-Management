using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using WnWrecker.Api;
using WnWrecker.Api.Data;
using WnWrecker.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// hosts like Render tell the app which port to listen on
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port)) builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;   // invoice + transcript PDFs

builder.Services.AddControllers();
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<BearerSecuritySchemeTransformer>());

// PostgreSQL (Neon). The connection string comes from User Secrets locally and an environment variable when hosted.
var connectionString = DbConnection.Normalize(builder.Configuration.GetConnectionString("DefaultConnection"));
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure(5)));   // retries while a sleeping database wakes up

// admin login: a signed token from AuthController
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddHostedService<ChatCleanupService>();   // deletes old chats (see "ChatCleanup" in appsettings.json)
builder.Services.AddSingleton<PhotoStorage>();              // part photos on Cloudinary

// the website addresses allowed to call this API (see "Cors" in appsettings.json)
var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("X-Total-Count")          // the shop reads how many parts match
              .SetPreflightMaxAge(TimeSpan.FromHours(1)));
});

// the host's proxy passes on the visitor's real address and https (needed for the limits below)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
#pragma warning disable ASPDEPR005
    options.KnownNetworks.Clear();
#pragma warning restore ASPDEPR005
    options.KnownProxies.Clear();
});

// limits per visitor so the chat and login can't be spammed or guessed (over the limit -> 429)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    static string Visitor(HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    // sending chat messages and other chat actions: 40 a minute
    options.AddPolicy("chat", ctx => RateLimitPartition.GetFixedWindowLimiter(Visitor(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 40, Window = TimeSpan.FromMinutes(1) }));

    // admin login and rejoining a chat by reference code: 10 tries every 5 minutes
    options.AddPolicy("strict", ctx => RateLimitPartition.GetFixedWindowLimiter(Visitor(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5) }));
});

var app = builder.Build();

// create or update the database tables on start-up (also runs on every deploy)
if (string.IsNullOrEmpty(connectionString))
    throw new InvalidOperationException("No database connection string. Set ConnectionStrings:DefaultConnection in User Secrets (local) " +
                                        "or the ConnectionStrings__DefaultConnection environment variable (hosted).");
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.UseForwardedHeaders();

FaqBot.UseBusinessDetails(app.Configuration.GetSection("Business"));   // the bot's answers use the business details

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();   // API test page at /scalar
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));   // for the host's health check

app.Run();
