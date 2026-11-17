using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;

namespace BADesign.Helpers.Database
{
    public sealed class DbColumnInfo
    {
        public string Name { get; set; }
        public string TypeName { get; set; }
        public int MaxLengthBytes { get; set; }

        public bool IsLob
        {
            get
            {
                return string.Equals(TypeName, "ntext", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(TypeName, "text", StringComparison.OrdinalIgnoreCase);
            }
        }

        public bool IsUnicode
        {
            get
            {
                return string.Equals(TypeName, "nvarchar", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(TypeName, "nchar", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(TypeName, "ntext", StringComparison.OrdinalIgnoreCase);
            }
        }

        public bool IsString
        {
            get
            {
                return string.Equals(TypeName, "nvarchar", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(TypeName, "varchar", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(TypeName, "nchar", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(TypeName, "char", StringComparison.OrdinalIgnoreCase);
            }
        }

        public int? MaxChars
        {
            get
            {
                if (!IsString || MaxLengthBytes <= 0) return null;
                return IsUnicode ? MaxLengthBytes / 2 : MaxLengthBytes;
            }
        }
    }

    public sealed class DbTableInfo
    {
        public DbTableInfo()
        {
            Columns = new Dictionary<string, DbColumnInfo>(StringComparer.OrdinalIgnoreCase);
        }

        public int ObjectId { get; set; }
        public string Schema { get; set; }
        public string Name { get; set; }
        public long Rows { get; set; }
        public string KeyColumn { get; set; }
        public string KeyType { get; set; }
        public Dictionary<string, DbColumnInfo> Columns { get; private set; }

        public string QuotedName
        {
            get { return DbSanitizeSql.QuoteTable(Schema, Name); }
        }

        public bool HasColumn(string name)
        {
            return name != null && Columns.ContainsKey(name);
        }

        public DbColumnInfo Column(string name)
        {
            DbColumnInfo c;
            return name != null && Columns.TryGetValue(name, out c) ? c : null;
        }

        public List<string> ExistingStringColumns(IEnumerable<string> names)
        {
            var result = new List<string>();
            if (names == null) return result;
            foreach (var name in names)
            {
                var c = Column(name);
                if (c != null && c.IsString) result.Add(c.Name);
            }
            return result;
        }
    }

    public sealed class DbSchemaSnapshot
    {
        private readonly Dictionary<string, DbTableInfo> _byName = new Dictionary<string, DbTableInfo>(StringComparer.OrdinalIgnoreCase);
        private readonly List<DbTableInfo> _tables = new List<DbTableInfo>();

        public IList<DbTableInfo> Tables
        {
            get { return _tables; }
        }

        public string RecoveryModel { get; set; }
        public string DatabaseName { get; set; }

        public void Add(DbTableInfo table)
        {
            _tables.Add(table);
            _byName[Key(table.Schema, table.Name)] = table;
        }

        public DbTableInfo Find(string table)
        {
            return Find(DbSanitizeCatalog.Schema, table);
        }

        public DbTableInfo Find(string schema, string table)
        {
            DbTableInfo t;
            return _byName.TryGetValue(Key(schema, table), out t) ? t : null;
        }

        public IEnumerable<DbTableInfo> FindLike(string likePattern)
        {
            return _tables.Where(t => string.Equals(t.Schema, DbSanitizeCatalog.Schema, StringComparison.OrdinalIgnoreCase)
                && DbSanitizeCatalog.MatchesLikePattern(t.Name, likePattern));
        }

        private static string Key(string schema, string table)
        {
            return (schema ?? "") + "." + (table ?? "");
        }

        public static DbSchemaSnapshot Load(SqlConnection connection, int commandTimeout)
        {
            var snapshot = new DbSchemaSnapshot();
            var byObjectId = new Dictionary<int, DbTableInfo>();
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandTimeout = commandTimeout;
                cmd.CommandText = "SELECT DB_NAME(), (SELECT recovery_model_desc FROM sys.databases WHERE database_id = DB_ID())";
                using (var r = cmd.ExecuteReader())
                {
                    if (r.Read())
                    {
                        snapshot.DatabaseName = r.IsDBNull(0) ? "" : r.GetString(0);
                        snapshot.RecoveryModel = r.IsDBNull(1) ? "" : r.GetString(1);
                    }
                }
            }
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandTimeout = commandTimeout;
                cmd.CommandText = @"
SELECT t.object_id, s.name, t.name,
       ISNULL((SELECT SUM(p.rows) FROM sys.partitions p WHERE p.object_id = t.object_id AND p.index_id IN (0, 1)), 0)
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var table = new DbTableInfo
                        {
                            ObjectId = r.GetInt32(0),
                            Schema = r.GetString(1),
                            Name = r.GetString(2),
                            Rows = Convert.ToInt64(r.GetValue(3))
                        };
                        snapshot.Add(table);
                        byObjectId[table.ObjectId] = table;
                    }
                }
            }
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandTimeout = commandTimeout;
                cmd.CommandText = @"
SELECT c.object_id, c.name, TYPE_NAME(c.system_type_id), c.max_length
FROM sys.columns c
INNER JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.is_ms_shipped = 0 AND c.is_computed = 0";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        DbTableInfo table;
                        if (!byObjectId.TryGetValue(r.GetInt32(0), out table)) continue;
                        var column = new DbColumnInfo
                        {
                            Name = r.GetString(1),
                            TypeName = r.IsDBNull(2) ? "" : r.GetString(2),
                            MaxLengthBytes = Convert.ToInt32(r.GetValue(3))
                        };
                        table.Columns[column.Name] = column;
                    }
                }
            }
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandTimeout = commandTimeout;
                cmd.CommandText = @"
SELECT i.object_id, MIN(c.name), MIN(TYPE_NAME(c.system_type_id))
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
INNER JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.is_primary_key = 1
GROUP BY i.object_id
HAVING COUNT(*) = 1 AND MIN(TYPE_NAME(c.system_type_id)) IN (N'int', N'bigint', N'uniqueidentifier')";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        DbTableInfo table;
                        if (byObjectId.TryGetValue(r.GetInt32(0), out table))
                        {
                            table.KeyColumn = r.GetString(1);
                            table.KeyType = r.GetString(2);
                        }
                    }
                }
            }
            return snapshot;
        }
    }
}
