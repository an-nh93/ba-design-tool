using System;
using System.Collections.Generic;
using System.Linq;

namespace BADesign
{
    /// <summary>Cache COUNT employee theo DB + filter — tránh query đếm lặp khi chuyển trang.</summary>
    public static class HrEmployeeCountCache
    {
        private sealed class CacheEntry
        {
            public int Total;
            public DateTime ExpiresUtc;
        }

        private static readonly object Sync = new object();
        private static readonly Dictionary<string, CacheEntry> Map = new Dictionary<string, CacheEntry>(StringComparer.OrdinalIgnoreCase);

        public static string BuildKey(string database, int? companyId, string search)
        {
            var cid = companyId.HasValue ? companyId.Value.ToString() : "All";
            var s = (search ?? "").Trim().ToLowerInvariant();
            return (database ?? "") + "|" + cid + "|" + s;
        }

        public static bool TryGet(string key, out int total)
        {
            total = 0;
            if (string.IsNullOrEmpty(key)) return false;
            lock (Sync)
            {
                CacheEntry entry;
                if (!Map.TryGetValue(key, out entry) || entry == null || DateTime.UtcNow > entry.ExpiresUtc)
                {
                    if (entry != null) Map.Remove(key);
                    return false;
                }
                total = entry.Total;
                return true;
            }
        }

        public static void Set(string key, int total, int ttlSeconds)
        {
            if (string.IsNullOrEmpty(key) || total < 0) return;
            if (ttlSeconds < 5) ttlSeconds = 5;
            lock (Sync)
            {
                Map[key] = new CacheEntry
                {
                    Total = total,
                    ExpiresUtc = DateTime.UtcNow.AddSeconds(ttlSeconds)
                };
            }
        }

        public static void InvalidateDatabase(string database)
        {
            if (string.IsNullOrEmpty(database)) return;
            var prefix = database + "|";
            lock (Sync)
            {
                foreach (var key in Map.Keys.Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)).ToList())
                    Map.Remove(key);
            }
        }
    }
}
