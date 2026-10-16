using Npgsql;

namespace WnWrecker.Api.Services
{
    // Neon shows its connection string as a URL (postgresql://user:password@host/db?sslmode=require).
    // Npgsql needs "Host=...;Database=...;" format, so a URL is converted here. Either format can be pasted.
    public static class DbConnection
    {
        public static string Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";

            value = value.Trim();
            if (!value.StartsWith("postgres://") && !value.StartsWith("postgresql://")) return value;

            var uri = new Uri(value);
            var user = uri.UserInfo.Split(':', 2);
            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.Port > 0 ? uri.Port : 5432,
                Database = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/')),
                Username = Uri.UnescapeDataString(user[0]),
                Password = user.Length > 1 ? Uri.UnescapeDataString(user[1]) : "",
                SslMode = SslMode.Require,
            };
            return builder.ConnectionString;
        }
    }
}
