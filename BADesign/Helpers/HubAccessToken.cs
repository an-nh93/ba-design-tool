using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace BADesign.Helpers
{
    public sealed class HubIdentity
    {
        public int UserId { get; set; }
        public int? RoleId { get; set; }
        public bool IsSuperAdmin { get; set; }
        public bool CanManageServers { get; set; }
    }

    public static class HubAccessToken
    {
        public const int LifetimeHours = 12;
        private const int MaxTokenLength = 200;
        private static readonly byte[] ProcessKey = CreateKey();

        private static byte[] CreateKey()
        {
            var key = new byte[32];
            using (var rng = new RNGCryptoServiceProvider())
                rng.GetBytes(key);
            return key;
        }

        public static string Create(HubIdentity identity, DateTime utcNow)
        {
            return Create(identity, utcNow, ProcessKey);
        }

        public static bool TryRead(string token, DateTime utcNow, out HubIdentity identity)
        {
            return TryRead(token, utcNow, ProcessKey, out identity);
        }

        public static string Create(HubIdentity identity, DateTime utcNow, byte[] key)
        {
            if (identity == null || identity.UserId <= 0 || key == null || key.Length == 0) return "";
            var body = string.Join(".", new[]
            {
                identity.UserId.ToString(CultureInfo.InvariantCulture),
                identity.RoleId.HasValue ? identity.RoleId.Value.ToString(CultureInfo.InvariantCulture) : "",
                identity.IsSuperAdmin ? "1" : "0",
                identity.CanManageServers ? "1" : "0",
                ToUnixSeconds(utcNow.AddHours(LifetimeHours)).ToString(CultureInfo.InvariantCulture)
            });
            return body + "." + Sign(body, key);
        }

        public static bool TryRead(string token, DateTime utcNow, byte[] key, out HubIdentity identity)
        {
            identity = null;
            if (string.IsNullOrEmpty(token) || token.Length > MaxTokenLength || key == null || key.Length == 0) return false;
            var cut = token.LastIndexOf('.');
            if (cut <= 0 || cut == token.Length - 1) return false;
            var body = token.Substring(0, cut);
            if (!FixedTimeEquals(Sign(body, key), token.Substring(cut + 1))) return false;

            var parts = body.Split('.');
            if (parts.Length != 5) return false;
            int userId;
            long expires;
            if (!int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out userId) || userId <= 0) return false;
            if (!long.TryParse(parts[4], NumberStyles.None, CultureInfo.InvariantCulture, out expires)) return false;
            if (ToUnixSeconds(utcNow) > expires) return false;
            int? roleId = null;
            if (parts[1].Length > 0)
            {
                int parsedRole;
                if (!int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out parsedRole)) return false;
                roleId = parsedRole;
            }
            identity = new HubIdentity
            {
                UserId = userId,
                RoleId = roleId,
                IsSuperAdmin = parts[2] == "1",
                CanManageServers = parts[3] == "1"
            };
            return true;
        }

        private static long ToUnixSeconds(DateTime utc)
        {
            return (long)(utc - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
        }

        private static string Sign(string body, byte[] key)
        {
            using (var hmac = new HMACSHA256(key))
            {
                var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
                return Convert.ToBase64String(hash).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            }
        }

        private static bool FixedTimeEquals(string a, string b)
        {
            if (a == null || b == null || a.Length != b.Length) return false;
            var diff = 0;
            for (var i = 0; i < a.Length; i++)
                diff |= a[i] ^ b[i];
            return diff == 0;
        }
    }
}
