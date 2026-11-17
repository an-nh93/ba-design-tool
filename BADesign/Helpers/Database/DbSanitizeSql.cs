using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using BADesign.Helpers.Security;

namespace BADesign.Helpers.Database
{
    public enum DbPlainKind
    {
        Email,
        Phone
    }

    public sealed class DbPlainColumn
    {
        public string Name { get; set; }
        public DbPlainKind Kind { get; set; }
        public int? MaxChars { get; set; }
        public bool IsLob { get; set; }
        public bool BlankCipher { get; set; }
    }

    public static class DbSanitizeSql
    {
        public const int EmailValueMaxLength = 1000;
        public const int MinCipherLength = 24;
        public const string FromKeyParameter = "@fromKey";
        public const string ToKeyParameter = "@toKey";
        public const string BatchParameter = "@batch";
        public const string EmailParameter = "@email";
        public const string PhoneParameter = "@phone";

        public static string Quote(string name)
        {
            return "[" + (name ?? "").Replace("]", "]]") + "]";
        }

        public static string QuoteTable(string schema, string table)
        {
            return Quote(string.IsNullOrEmpty(schema) ? DbSanitizeCatalog.Schema : schema) + "." + Quote(table);
        }

        public static string Literal(string value)
        {
            return "N'" + (value ?? "").Replace("'", "''") + "'";
        }

        public static string CipherPredicate(string columnExpression)
        {
            return "(LEN(" + columnExpression + ") >= " + MinCipherLength.ToString(CultureInfo.InvariantCulture)
                + " AND LEN(" + columnExpression + ") % 4 = 0 AND "
                + columnExpression + " COLLATE Latin1_General_BIN2 NOT LIKE N'%[^A-Za-z0-9+/=]%')";
        }

        public static string NonEmptyPredicate(string columnExpression)
        {
            return "(" + columnExpression + " IS NOT NULL AND " + columnExpression + " <> N'')";
        }

        public static string BlankPredicate(string columnExpression, DbBlankMode mode)
        {
            return mode == DbBlankMode.CipherOnly ? CipherPredicate(columnExpression) : NonEmptyPredicate(columnExpression);
        }

        public static bool LooksLikeCipher(string value)
        {
            if (string.IsNullOrEmpty(value)) return false;
            var text = value.TrimEnd(' ');
            if (text.Length < MinCipherLength || text.Length % 4 != 0) return false;
            for (var i = 0; i < text.Length; i++)
            {
                var c = text[i];
                var ok = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '+' || c == '/' || c == '=';
                if (!ok) return false;
            }
            return true;
        }

        public static string RangeClause(string keyColumn)
        {
            var key = "T." + Quote(keyColumn);
            return key + " > " + FromKeyParameter + " AND " + key + " <= " + ToKeyParameter;
        }

        public static string UpperRangeClause(string keyColumn)
        {
            return "T." + Quote(keyColumn) + " <= " + ToKeyParameter;
        }

        public static string BuildFirstKeyQuery(string quotedTable, string keyColumn)
        {
            var key = "T." + Quote(keyColumn);
            return "SELECT TOP (1) X.K FROM (SELECT TOP (" + BatchParameter + ") " + key + " AS K FROM " + quotedTable
                + " T ORDER BY " + key + ") X ORDER BY X.K DESC";
        }

        public static string BuildNextKeyQuery(string quotedTable, string keyColumn)
        {
            var key = "T." + Quote(keyColumn);
            return "SELECT TOP (1) X.K FROM (SELECT TOP (" + BatchParameter + ") " + key + " AS K FROM " + quotedTable
                + " T WHERE " + key + " > " + FromKeyParameter + " ORDER BY " + key + ") X ORDER BY X.K DESC";
        }

        public static string BuildBlankUpdate(string quotedTable, IList<string> columns, DbBlankMode mode, string filter, string keyColumn, bool filterByPredicates, string replacement = null)
        {
            if (columns == null || columns.Count == 0)
                throw new ArgumentException("columns");
            var value = Literal(replacement ?? "");
            var sets = new List<string>();
            var predicates = new List<string>();
            foreach (var column in columns)
            {
                var expression = "T." + Quote(column);
                var predicate = BlankPredicate(expression, mode);
                sets.Add(expression + " = CASE WHEN " + predicate + " THEN " + value + " ELSE " + expression + " END");
                predicates.Add(predicate);
            }
            var where = new List<string>();
            if (filterByPredicates)
                where.Add("(" + string.Join(" OR ", predicates) + ")");
            if (!string.IsNullOrWhiteSpace(filter))
                where.Add("(" + filter + ")");
            if (!string.IsNullOrEmpty(keyColumn))
                where.Add(RangeClause(keyColumn));
            return "UPDATE T SET " + string.Join(", ", sets) + " FROM " + quotedTable + " T"
                + (where.Count > 0 ? " WHERE " + string.Join(" AND ", where) : "");
        }

        public static string PlainValueExpression(DbPlainColumn column)
        {
            var parameter = column.Kind == DbPlainKind.Email ? EmailParameter : PhoneParameter;
            if (column.MaxChars.HasValue && column.MaxChars.Value > 0)
                return "LEFT(" + parameter + ", " + column.MaxChars.Value.ToString(CultureInfo.InvariantCulture) + ")";
            return parameter;
        }

        public static bool ShouldBlankCipher(string columnName, DbPlainKind kind, int? maxChars)
        {
            if (string.IsNullOrEmpty(columnName)) return false;
            if (maxChars.HasValue && maxChars.Value < MinCipherLength) return false;
            if (kind == DbPlainKind.Phone) return true;
            var name = columnName.TrimEnd('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
            return name.EndsWith("Email", StringComparison.OrdinalIgnoreCase)
                || name.EndsWith("EmailAddress", StringComparison.OrdinalIgnoreCase);
        }

        public static string PlainPredicate(DbPlainColumn column)
        {
            var plain = PlainMatchPredicate(column);
            if (!column.BlankCipher || column.IsLob) return plain;
            return "(" + CipherPredicate("T." + Quote(column.Name)) + " OR " + plain + ")";
        }

        public static string PlainMatchPredicate(DbPlainColumn column)
        {
            var value = PlainValueExpression(column);
            if (column.IsLob)
            {
                var raw = "T." + Quote(column.Name);
                var text = "CAST(" + raw + " AS NVARCHAR(MAX))";
                var lengthLimit = "DATALENGTH(" + raw + ") <= " + (EmailValueMaxLength * 2).ToString(CultureInfo.InvariantCulture);
                return column.Kind == DbPlainKind.Email
                    ? "(" + text + " LIKE N'%_@_%' AND " + lengthLimit + " AND " + text + " <> " + value + ")"
                    : "(" + text + " LIKE N'%[0-9]%' AND " + lengthLimit + " AND " + text + " <> " + value + ")";
            }
            var expression = "T." + Quote(column.Name);
            return column.Kind == DbPlainKind.Email
                ? "(" + expression + " LIKE N'%_@_%' AND LEN(" + expression + ") <= " + EmailValueMaxLength.ToString(CultureInfo.InvariantCulture) + " AND " + expression + " <> " + value + ")"
                : "(" + expression + " LIKE N'%[0-9]%' AND " + expression + " <> " + value + ")";
        }

        public static string BuildPlainContactUpdate(string quotedTable, IList<DbPlainColumn> columns, string keyColumn)
        {
            if (columns == null || columns.Count == 0)
                throw new ArgumentException("columns");
            if (columns.Any(c => c.IsLob))
                throw new ArgumentException("LOB columns must use BuildPlainLobUpdate.");
            var sets = new List<string>();
            var predicates = new List<string>();
            foreach (var column in columns)
            {
                var expression = "T." + Quote(column.Name);
                var cipherCase = column.BlankCipher ? "WHEN " + CipherPredicate(expression) + " THEN N'' " : "";
                sets.Add(expression + " = CASE " + cipherCase + "WHEN " + PlainMatchPredicate(column) + " THEN " + PlainValueExpression(column) + " ELSE " + expression + " END");
                predicates.Add(PlainPredicate(column));
            }
            var where = "(" + string.Join(" OR ", predicates) + ")";
            if (!string.IsNullOrEmpty(keyColumn))
                where += " AND " + RangeClause(keyColumn);
            return "UPDATE T SET " + string.Join(", ", sets) + " FROM " + quotedTable + " T WHERE " + where;
        }

        public static string BuildPlainLobUpdate(string quotedTable, DbPlainColumn column)
        {
            return "UPDATE T SET T." + Quote(column.Name) + " = " + PlainValueExpression(column)
                + " FROM " + quotedTable + " T WHERE " + PlainPredicate(column);
        }

        public static string ReplaceListElements(string value, string separator, string replacement)
        {
            if (string.IsNullOrEmpty(value) || string.IsNullOrEmpty(separator)) return value;
            var parts = value.Split(new[] { separator }, StringSplitOptions.None);
            for (var i = 0; i < parts.Length; i++)
            {
                if (parts[i].Length > 0) parts[i] = replacement ?? "";
            }
            return string.Join(separator, parts);
        }

        public static string BuildBlankListUpdate(string quotedTable, string column, string separator)
        {
            var name = "T." + Quote(column);
            var text = "CAST(" + name + " AS NVARCHAR(MAX))";
            var sep = Literal(separator);
            return "UPDATE T SET " + name + " = REPLICATE(CAST(" + sep + " AS NVARCHAR(MAX)), (DATALENGTH(" + text + ") - DATALENGTH(REPLACE(" + text + ", " + sep + ", N''))) / DATALENGTH(" + sep + "))"
                + " FROM " + quotedTable + " T WHERE REPLACE(" + text + ", " + sep + ", N'') <> N''";
        }

        public static bool IsPlainContactCandidate(string columnName, out DbPlainKind kind)
        {
            kind = DbPlainKind.Email;
            if (string.IsNullOrEmpty(columnName)) return false;
            foreach (var excluded in DbSanitizeCatalog.PlainContactExcludedColumnNames)
                if (string.Equals(excluded, columnName, StringComparison.OrdinalIgnoreCase)) return false;
            if (columnName.IndexOf("Email", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                kind = DbPlainKind.Email;
                return true;
            }
            if (columnName.IndexOf("Phone", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                kind = DbPlainKind.Phone;
                return true;
            }
            return false;
        }

        public static SimpleHash.HashType DetectPasswordHashType(IEnumerable<string> storedHashes)
        {
            int md5 = 0, sha256 = 0, sha512 = 0;
            if (storedHashes != null)
            {
                foreach (var stored in storedHashes)
                {
                    if (string.IsNullOrWhiteSpace(stored)) continue;
                    int length;
                    try { length = Convert.FromBase64String(stored.Trim()).Length; }
                    catch (FormatException) { continue; }
                    if (length >= 20 && length <= 24) md5++;
                    else if (length >= 36 && length <= 40) sha256++;
                    else if (length >= 68 && length <= 72) sha512++;
                }
            }
            if (sha512 > sha256 && sha512 >= md5) return SimpleHash.HashType.SHA512;
            if (md5 > sha256 && md5 > sha512) return SimpleHash.HashType.MD5;
            return SimpleHash.HashType.SHA256;
        }

        public static string BuildUserSignaturePlainText(long userId, string userName, long? employeeId)
        {
            return userId.ToString(CultureInfo.InvariantCulture)
                + (userName ?? "")
                + (employeeId.HasValue ? employeeId.Value.ToString(CultureInfo.InvariantCulture) : "");
        }

        public static decimal NextFakeSalary(Random random, decimal min, decimal max)
        {
            if (max < min)
            {
                var t = min;
                min = max;
                max = t;
            }
            var span = max - min;
            var value = span <= 0 ? min : min + (decimal)random.NextDouble() * span;
            var step = max >= 1000000m ? 100000m : (max >= 10000m ? 100m : 1m);
            value = Math.Round(value / step, 0, MidpointRounding.AwayFromZero) * step;
            if (value < min) value = Math.Ceiling(min / step) * step;
            if (value > max) value = Math.Floor(max / step) * step;
            if (value < min) value = Math.Round(min, 0, MidpointRounding.AwayFromZero);
            return value;
        }
    }
}
