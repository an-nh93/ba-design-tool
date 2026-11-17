using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Hosting;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace BADesign
{
    public static class BaI18n
    {
        public const string CookieName = "baLang";
        public const string SourceLanguage = "vi";
        public const string PayloadKey = "lang";

        const string Word = @"A-Za-z0-9\u00C0-\u024F\u0300-\u036F\u1E00-\u1EFF";
        const string BlockStart = "BaI18n.add(";
        const int MaxDepth = 3;
        const int MaxPatternLength = 600;

        static readonly Regex Spaces = new Regex(@"\s+", RegexOptions.Compiled);
        static readonly Regex EdgeLeft = new Regex("^[^" + Word + "{]+", RegexOptions.Compiled);
        static readonly Regex EdgeRight = new Regex("[^" + Word + "}]+$", RegexOptions.Compiled);
        static readonly Regex HasLetter = new Regex(@"[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]", RegexOptions.Compiled);
        static readonly Regex Hole = new Regex(@"\{([0-9]+)(#?)\}", RegexOptions.Compiled);
        static readonly Regex Plural = new Regex(@"\[([0-9]+):([^|\]]*)\|([^\]]*)\]", RegexOptions.Compiled);
        static readonly Regex TemplateHole = new Regex(@"\{([0-9]+)\}", RegexOptions.Compiled);
        static readonly Regex SentenceEnd = new Regex("([.!?;]+ )", RegexOptions.Compiled);
        static readonly Regex LanguageCode = new Regex("^[a-z]{2}$", RegexOptions.Compiled);
        static readonly Regex HtmlKey = new Regex("<[a-zA-Z][^>]*>", RegexOptions.Compiled);
        static readonly Regex ScopedKey = new Regex("^@[A-Za-z0-9_-]+:", RegexOptions.Compiled);
        static readonly Regex Separators = new Regex(@"[.,\s]", RegexOptions.Compiled);
        static readonly object Sync = new object();
        static readonly Dictionary<string, Table> Tables = new Dictionary<string, Table>(StringComparer.Ordinal);

        sealed class Entry
        {
            public Regex Match;
            public int[] Order;
            public string Template;
            public string Anchor;
            public int Weight;
        }

        sealed class Table
        {
            public readonly Dictionary<string, string> Exact = new Dictionary<string, string>(StringComparer.Ordinal);
            public readonly List<Entry> Patterns = new List<Entry>();
            public DateTime Stamp;
        }

        public static string CurrentLanguage
        {
            get
            {
                var context = HttpContext.Current;
                if (context == null) return SourceLanguage;
                var cookie = context.Request.Cookies[CookieName];
                return Normalize(cookie == null ? null : cookie.Value);
            }
        }

        public static string Normalize(string language)
        {
            var code = (language ?? "").Trim().ToLowerInvariant();
            if (code == SourceLanguage || !LanguageCode.IsMatch(code)) return SourceLanguage;
            return Load(code) == null ? SourceLanguage : code;
        }

        public static string FromPayload(string payloadJson)
        {
            if (string.IsNullOrWhiteSpace(payloadJson)) return SourceLanguage;
            try
            {
                var token = JObject.Parse(payloadJson)[PayloadKey];
                return Normalize(token == null ? null : token.ToString());
            }
            catch (JsonException)
            {
                return SourceLanguage;
            }
        }

        public static string Translate(string language, string text)
        {
            if (string.IsNullOrEmpty(text)) return text;
            var code = Normalize(language);
            if (code == SourceLanguage) return text;
            var table = Load(code);
            if (table == null) return text;
            var lines = text.Split('\n');
            for (var i = 0; i < lines.Length; i++)
            {
                var end = lines[i].EndsWith("\r", StringComparison.Ordinal) ? "\r" : "";
                var body = lines[i].Substring(0, lines[i].Length - end.Length);
                if (!HasLetter.IsMatch(body)) continue;
                var flat = Flatten(body);
                var output = Segment(table, flat, 0) ?? BySentences(table, flat);
                if (output != null) lines[i] = output + end;
            }
            return string.Join("\n", lines);
        }

        static Table Load(string code)
        {
            var path = FilePath(code);
            var stamp = path == null ? DateTime.MinValue : File.GetLastWriteTimeUtc(path);
            lock (Sync)
            {
                Table table;
                if (Tables.TryGetValue(code, out table) && (table == null || table.Stamp == stamp)) return table;
                try
                {
                    table = path == null ? null : Parse(File.ReadAllText(path, Encoding.UTF8));
                    if (table != null) table.Stamp = stamp;
                }
                catch (Exception ex)
                {
                    table = null;
                    try { AppLogger.Log("BaI18n.Load " + code + " failed: " + ex.Message); } catch { }
                }
                Tables[code] = table;
                return table;
            }
        }

        static string FilePath(string code)
        {
            var name = "ba-i18n." + code + ".js";
            var path = HostingEnvironment.IsHosted
                ? HostingEnvironment.MapPath("~/Scripts/i18n/" + name)
                : Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "i18n", name);
            return path != null && File.Exists(path) ? path : null;
        }

        static Table Parse(string text)
        {
            var table = new Table();
            var at = 0;
            while (true)
            {
                var start = text.IndexOf(BlockStart, at, StringComparison.Ordinal);
                if (start < 0) break;
                var brace = text.IndexOf('{', start);
                if (brace < 0) break;
                using (var reader = new JsonTextReader(new StringReader(text.Substring(brace))))
                {
                    reader.Read();
                    while (reader.Read() && reader.TokenType == JsonToken.PropertyName)
                    {
                        var key = (string)reader.Value;
                        AddEntry(table, key, reader.ReadAsString());
                    }
                }
                at = brace + 1;
            }
            table.Patterns.Sort((a, b) => b.Weight.CompareTo(a.Weight));
            return table;
        }

        static void AddEntry(Table table, string key, string value)
        {
            if (string.IsNullOrEmpty(value) || ScopedKey.IsMatch(key)) return;
            var flatKey = Flatten(key);
            if (HtmlKey.IsMatch(flatKey)) return;
            string prefix, core, suffix;
            SplitEdges(flatKey, out prefix, out core, out suffix);
            if (core.Length == 0) return;
            string valuePrefix, valueCore, valueSuffix;
            SplitEdges(Flatten(value), out valuePrefix, out valueCore, out valueSuffix);
            var head = SameEdge(prefix, valuePrefix) ? "" : valuePrefix.TrimStart(' ');
            var tail = SameEdge(suffix, valueSuffix) ? "" : valueSuffix.TrimEnd(' ');
            var output = head + valueCore + tail;
            var holes = Hole.Matches(core);
            if (holes.Count == 0)
            {
                table.Exact[core] = output;
                return;
            }
            var source = new StringBuilder("^");
            var order = new List<int>();
            var anchor = "";
            var weight = 0;
            var last = 0;
            foreach (Match hole in holes)
            {
                var literal = core.Substring(last, hole.Index - last);
                source.Append(Regex.Escape(literal));
                weight += literal.Length;
                if (literal.Length > anchor.Length) anchor = literal;
                order.Add(int.Parse(hole.Groups[1].Value, CultureInfo.InvariantCulture));
                source.Append(hole.Groups[2].Length > 0 ? "([0-9][0-9.,]*)" : "(.*?)");
                last = hole.Index + hole.Length;
            }
            var rest = core.Substring(last);
            source.Append(Regex.Escape(rest)).Append("$");
            weight += rest.Length;
            if (rest.Length > anchor.Length) anchor = rest;
            table.Patterns.Add(new Entry
            {
                Match = new Regex(source.ToString(), RegexOptions.Singleline | RegexOptions.CultureInvariant),
                Order = order.ToArray(),
                Template = output,
                Anchor = anchor,
                Weight = weight
            });
        }

        static string Flatten(string text)
        {
            return Spaces.Replace(text, " ");
        }

        static void SplitEdges(string flat, out string prefix, out string core, out string suffix)
        {
            prefix = EdgeLeft.Match(flat).Value;
            var rest = flat.Substring(prefix.Length);
            suffix = EdgeRight.Match(rest).Value;
            core = rest.Substring(0, rest.Length - suffix.Length);
        }

        static bool SameEdge(string a, string b)
        {
            return a.Replace(" ", "") == b.Replace(" ", "");
        }

        static string Segment(Table table, string flat, int depth)
        {
            string prefix, core, suffix;
            SplitEdges(flat, out prefix, out core, out suffix);
            if (core.Length == 0) return null;
            var output = Lookup(table, core, depth);
            return output == null ? null : prefix + output + suffix;
        }

        static string Lookup(Table table, string core, int depth)
        {
            string hit;
            if (table.Exact.TryGetValue(core, out hit)) return hit;
            if (core.Length > MaxPatternLength) return null;
            foreach (var entry in table.Patterns)
            {
                if (core.IndexOf(entry.Anchor, StringComparison.Ordinal) < 0) continue;
                var match = entry.Match.Match(core);
                if (!match.Success) continue;
                var args = new Dictionary<int, string>();
                for (var i = 0; i < entry.Order.Length; i++)
                {
                    var raw = match.Groups[i + 1].Value;
                    var translated = depth < MaxDepth ? Segment(table, raw, depth + 1) : null;
                    args[entry.Order[i]] = translated ?? raw;
                }
                return ApplyTemplate(entry.Template, args);
            }
            return null;
        }

        static string BySentences(Table table, string flat)
        {
            var parts = SentenceEnd.Split(flat);
            if (parts.Length < 3) return null;
            var found = false;
            for (var i = 0; i < parts.Length; i += 2)
            {
                if (!HasLetter.IsMatch(parts[i])) continue;
                var output = Segment(table, parts[i], 0);
                if (output == null) continue;
                parts[i] = output;
                found = true;
            }
            return found ? string.Concat(parts) : null;
        }

        static string ApplyTemplate(string template, Dictionary<int, string> args)
        {
            var output = Plural.Replace(template, m =>
            {
                string value;
                args.TryGetValue(int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture), out value);
                return IsOne(value) ? m.Groups[2].Value : m.Groups[3].Value;
            });
            return TemplateHole.Replace(output, m =>
            {
                string value;
                return args.TryGetValue(int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture), out value) ? value : m.Value;
            });
        }

        static bool IsOne(string value)
        {
            double number;
            return double.TryParse(Separators.Replace(value ?? "", ""), NumberStyles.Float, CultureInfo.InvariantCulture, out number) && number == 1;
        }
    }
}
