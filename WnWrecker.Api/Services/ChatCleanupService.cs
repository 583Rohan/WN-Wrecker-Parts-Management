using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;

namespace WnWrecker.Api.Services
{
    // Runs in the background while the API is up and deletes old chats so the database
    // doesn't grow forever:
    //   - closed chats, a set number of days after they were closed   (default 7)
    //   - open chats with no new messages for a set number of days     (default 60)
    // Messages and attached-part links are deleted with them. Invoices are kept (they're business records).
    // The day counts live in appsettings.json → "ChatCleanup".
    public class ChatCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly IConfiguration _config;
        private readonly ILogger<ChatCleanupService> _log;

        public ChatCleanupService(IServiceScopeFactory scopes, IConfiguration config, ILogger<ChatCleanupService> log)
        {
            _scopes = scopes;
            _config = config;
            _log = log;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // wait a minute after start-up, then check every 6 hours
            try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanUp(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _log.LogWarning(ex, "Chat clean-up failed; will try again later.");
                }

                try { await Task.Delay(TimeSpan.FromHours(6), stoppingToken); } catch (TaskCanceledException) { return; }
            }
        }

        private async Task CleanUp(CancellationToken ct)
        {
            var closedDays = _config.GetValue("ChatCleanup:ClosedChatDays", 7);
            var inactiveDays = _config.GetValue("ChatCleanup:InactiveChatDays", 60);

            var closedCutoff = DateTime.UtcNow.AddDays(-closedDays);
            var inactiveCutoff = DateTime.UtcNow.AddDays(-inactiveDays);

            using var scope = _scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // the database removes each chat's messages and part links automatically (cascade delete)
            var deleted = await db.Conversations
                .Where(c => (c.Archived && (c.ClosedAt ?? c.LastMessageAt) < closedCutoff)
                         || (!c.Archived && c.LastMessageAt < inactiveCutoff))
                .ExecuteDeleteAsync(ct);

            if (deleted > 0)
                _log.LogInformation("Chat clean-up removed {Count} old chat(s).", deleted);
        }
    }
}
