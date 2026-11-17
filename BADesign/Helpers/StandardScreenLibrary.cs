using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json;

namespace BADesign.Helpers
{
    public sealed class StandardScreenInfo
    {
        public string Key { get; set; }
        public string Name { get; set; }
        public string Ui { get; set; }
        public string Group { get; set; }
        public string Description { get; set; }
        public string Thumb { get; set; }
        public int Controls { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public string Outline { get; set; }
        public int? ModuleId { get; set; }
        public string Module { get; set; }
    }

    public static class StandardScreenLibrary
    {
        public const int MaxFileBytes = 2 * 1024 * 1024;
        public const int MaxOutlineLength = 40000;
        private const string IndexFile = "index.json";
        private const int MaxEntries = 500;
        private const int MaxTextLength = 300;
        private const int MaxScreenSize = 20000;
        private static readonly Regex OutlinePattern = new Regex("^[\\[\\]\",a-z0-9-]*$", RegexOptions.CultureInvariant);
        private static readonly Regex KeyPattern = new Regex("^[a-z0-9][a-z0-9-]{0,63}$", RegexOptions.CultureInvariant);
        private static readonly Regex JsonFilePattern = new Regex("^[a-z0-9][a-z0-9-]{0,63}\\.json$", RegexOptions.CultureInvariant);
        private static readonly Regex ThumbPattern = new Regex("^[a-z0-9][a-z0-9-]{0,63}\\.png$", RegexOptions.CultureInvariant);

        public static string DefaultFolder
        {
            get { return System.Web.HttpContext.Current.Server.MapPath("~/App_Data/BuilderTemplates"); }
        }

        private sealed class Entry
        {
            public string Key { get; set; }
            public string Name { get; set; }
            public string Ui { get; set; }
            public string Group { get; set; }
            public string Description { get; set; }
            public string Thumb { get; set; }
            public int Controls { get; set; }
            public int Width { get; set; }
            public int Height { get; set; }
            public string Outline { get; set; }
            public string File { get; set; }
        }

        public static List<StandardScreenInfo> List(string folder)
        {
            var result = new List<StandardScreenInfo>();
            foreach (var entry in ReadIndex(folder))
            {
                result.Add(new StandardScreenInfo
                {
                    Key = entry.Key,
                    Name = Clip(entry.Name) ?? entry.Key,
                    Ui = entry.Ui,
                    Group = Clip(entry.Group) ?? "",
                    Description = Clip(entry.Description) ?? "",
                    Thumb = entry.Thumb != null && ThumbPattern.IsMatch(entry.Thumb) ? entry.Thumb : "",
                    Controls = Math.Max(0, entry.Controls),
                    Width = Math.Max(0, Math.Min(MaxScreenSize, entry.Width)),
                    Height = Math.Max(0, Math.Min(MaxScreenSize, entry.Height)),
                    Outline = entry.Outline != null && entry.Outline.Length <= MaxOutlineLength && OutlinePattern.IsMatch(entry.Outline) ? entry.Outline : ""
                });
            }
            return result;
        }

        public static string Read(string folder, string key)
        {
            if (string.IsNullOrEmpty(key) || !KeyPattern.IsMatch(key)) return null;
            foreach (var entry in ReadIndex(folder))
            {
                if (!string.Equals(entry.Key, key, StringComparison.Ordinal)) continue;
                var path = ResolveFile(folder, entry.File);
                return path == null ? null : File.ReadAllText(path, Encoding.UTF8);
            }
            return null;
        }

        private static List<Entry> ReadIndex(string folder)
        {
            var valid = new List<Entry>();
            if (string.IsNullOrEmpty(folder)) return valid;
            var indexPath = Path.Combine(folder, IndexFile);
            if (!File.Exists(indexPath) || new FileInfo(indexPath).Length > MaxFileBytes) return valid;
            List<Entry> entries;
            try
            {
                entries = JsonConvert.DeserializeObject<List<Entry>>(File.ReadAllText(indexPath, Encoding.UTF8));
            }
            catch (JsonException)
            {
                return valid;
            }
            if (entries == null) return valid;
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var entry in entries)
            {
                if (valid.Count >= MaxEntries) break;
                if (entry == null || entry.Key == null || !KeyPattern.IsMatch(entry.Key)) continue;
                if (entry.Ui != "core" && entry.Ui != "ess") continue;
                if (ResolveFile(folder, entry.File) == null) continue;
                if (!seen.Add(entry.Key)) continue;
                valid.Add(entry);
            }
            return valid;
        }

        private static string ResolveFile(string folder, string fileName)
        {
            if (string.IsNullOrEmpty(fileName) || !JsonFilePattern.IsMatch(fileName)) return null;
            var root = Path.GetFullPath(folder).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var full = Path.GetFullPath(Path.Combine(root, fileName));
            if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase)) return null;
            var info = new FileInfo(full);
            if (!info.Exists || info.Length > MaxFileBytes) return null;
            return full;
        }

        private static string Clip(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var trimmed = text.Trim();
            return trimmed.Length > MaxTextLength ? trimmed.Substring(0, MaxTextLength) : trimmed;
        }
    }
}
