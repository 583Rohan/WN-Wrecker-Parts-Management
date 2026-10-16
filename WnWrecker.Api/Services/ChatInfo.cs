using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using WnWrecker.Api.Data;
using WnWrecker.Api.Models;

namespace WnWrecker.Api.Services
{
    // Shared chat logic used by both the customer and the admin chat controllers.
    public static class ChatInfo
    {
        public const string StatusNeedsReply = "Needs reply";       // customer is waiting for a person
        public const string StatusWaiting = "Waiting on customer";  // an admin replied last
        public const string StatusClosed = "Closed";

        private const string CodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no 0/O/1/I/L to avoid mix-ups

        // a human-handled chat needs a reply when the customer (not the admin) spoke last
        public static bool NeedsReply(Conversation c)
        {
            if (c.Archived) return false;
            var lastHuman = c.Messages
                .Where(m => m.Sender == "customer" || m.Sender == "admin")
                .OrderBy(m => m.SentAt).ThenBy(m => m.Id)
                .LastOrDefault();
            return lastHuman == null || lastHuman.Sender == "customer";
        }

        public static string StatusOf(Conversation c) =>
            c.Archived ? StatusClosed
            : NeedsReply(c) ? StatusNeedsReply
            : StatusWaiting;

        // "$250" for whole dollars, "$22.73" with cents (same format as the website)
        public static string Money(decimal value) =>
            value == decimal.Truncate(value) ? $"${value:N0}" : $"${value:N2}";

        // e.g. "WN-7F3K2"
        public static async Task<string> NewReferenceCode(AppDbContext db)
        {
            while (true)
            {
                var chars = new char[5];
                for (var i = 0; i < chars.Length; i++)
                    chars[i] = CodeChars[RandomNumberGenerator.GetInt32(CodeChars.Length)];
                var code = "WN-" + new string(chars);
                if (!await db.Conversations.AnyAsync(c => c.ReferenceCode == code)) return code;
            }
        }

        // accepts "wn-7f3k2", "WN 7F3K2", "7f3k2" ...
        public static string NormalizeCode(string? input)
        {
            var s = new string((input ?? "").ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());
            if (s.StartsWith("WN")) s = s[2..];
            return "WN-" + s;
        }

        public static string NewToken() => Guid.NewGuid().ToString("N");

        public static object MessageDto(Message m) => new
        {
            m.Id,
            m.Sender,
            m.Text,
            m.SentAt,
            m.Kind,
            invoice = m.Invoice == null ? null : new
            {
                m.Invoice.Number,
                m.Invoice.Title,
                m.Invoice.Total,
                m.Invoice.Status,
                m.Invoice.PublicToken
            }
        };

        public static IEnumerable<object> OrderedMessages(Conversation c) =>
            c.Messages.OrderBy(m => m.SentAt).ThenBy(m => m.Id).Select(MessageDto);

        // parts show their LIVE inventory status (In Stock / Sold / Written off)
        public static IEnumerable<object> PartsDto(Conversation c) =>
            c.Parts.Where(cp => cp.Part != null).Select(cp => new
            {
                cp.PartId,
                name = cp.Part!.Name,
                vehicle = $"{cp.Part.Make} {cp.Part.Model} {cp.Part.Year}",
                cp.Part.Price,
                status = cp.Part.Status
            });

        public static void Close(AppDbContext db, Conversation c, string by)
        {
            c.Archived = true;
            c.ClosedBy = by;
            c.ClosedAt = DateTime.UtcNow;
            c.LastMessageAt = DateTime.UtcNow;
            db.Messages.Add(new Message
            {
                ConversationId = c.Id,
                Sender = "system",
                Text = by == "customer" ? "Chat closed by the customer." : "Chat closed by WN Wrecker."
            });
        }
    }
}
