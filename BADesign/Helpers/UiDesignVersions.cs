using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers
{
    public sealed class DesignVersionInfo
    {
        public int VersionId { get; set; }
        public int VersionNo { get; set; }
        public string Kind { get; set; }
        public string Name { get; set; }
        public int ControlCount { get; set; }
        public string CreatedAt { get; set; }
        public string CreatedBy { get; set; }
    }

    public static class UiDesignVersions
    {
        public const string KindSave = "save";
        public const string KindBaseline = "baseline";
        private const int KeepVersions = 30;
        private const int MaxJsonLength = 8 * 1024 * 1024;
        private const string DateFormat = "dd/MM/yyyy HH:mm";

        private static int CountControls(string json)
        {
            try
            {
                return JArray.Parse(json ?? "[]").Count;
            }
            catch (Exception)
            {
                return 0;
            }
        }

        private static void Insert(SqlConnection conn, int controlId, int versionNo, string kind, string name, string json, int userId, DateTime? createdAt)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
INSERT INTO dbo.UiBuilderControlVersion (ControlId, VersionNo, Kind, Name, JsonConfig, ControlCount, CreatedAt, CreatedByUserId)
VALUES (@id, @no, @kind, @name, @json, @count, ISNULL(@at, SYSDATETIME()), @uid)";
                cmd.Parameters.AddWithValue("@id", controlId);
                cmd.Parameters.AddWithValue("@no", versionNo);
                cmd.Parameters.AddWithValue("@kind", kind);
                cmd.Parameters.AddWithValue("@name", name ?? "");
                cmd.Parameters.AddWithValue("@json", json ?? "[]");
                cmd.Parameters.AddWithValue("@count", CountControls(json));
                cmd.Parameters.Add("@at", SqlDbType.DateTime2).Value = createdAt.HasValue ? (object)createdAt.Value : DBNull.Value;
                cmd.Parameters.AddWithValue("@uid", userId);
                cmd.ExecuteNonQuery();
            }
        }

        public static void CaptureBeforeUpdate(int controlId, int userId)
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM dbo.UiBuilderControlVersion WHERE ControlId = @id AND Kind = @kind";
                        cmd.Parameters.AddWithValue("@id", controlId);
                        cmd.Parameters.AddWithValue("@kind", KindSave);
                        if ((int)cmd.ExecuteScalar() > 0) return;
                    }
                    string name = null, json = null;
                    DateTime? savedAt = null;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT Name, JsonConfig, UpdatedAt FROM dbo.UiBuilderControl WHERE ControlId = @id AND OwnerUserId = @uid AND IsDeleted = 0 AND ControlType = N'page'";
                        cmd.Parameters.AddWithValue("@id", controlId);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        using (var r = cmd.ExecuteReader())
                        {
                            if (!r.Read()) return;
                            name = r.IsDBNull(0) ? "" : r.GetString(0);
                            json = r.IsDBNull(1) ? "[]" : r.GetString(1);
                            savedAt = r.IsDBNull(2) ? (DateTime?)null : r.GetDateTime(2);
                        }
                    }
                    if (json.Length > MaxJsonLength) return;
                    Insert(conn, controlId, 1, KindSave, name, json, userId, savedAt);
                }
            }
            catch (Exception ex)
            {
                AppLogger.Log("UiDesignVersions.CaptureBeforeUpdate failed, controlId=" + controlId, ex);
            }
        }

        public static void RecordSave(int controlId, string name, string json, int userId)
        {
            try
            {
                if (json == null || json.Length > MaxJsonLength) return;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    int lastNo = 0;
                    string lastJson = null;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT TOP (1) VersionNo, JsonConfig FROM dbo.UiBuilderControlVersion WHERE ControlId = @id AND Kind = @kind ORDER BY VersionNo DESC";
                        cmd.Parameters.AddWithValue("@id", controlId);
                        cmd.Parameters.AddWithValue("@kind", KindSave);
                        using (var r = cmd.ExecuteReader())
                        {
                            if (r.Read())
                            {
                                lastNo = r.GetInt32(0);
                                lastJson = r.IsDBNull(1) ? null : r.GetString(1);
                            }
                        }
                    }
                    if (lastJson != null && string.Equals(lastJson, json, StringComparison.Ordinal)) return;
                    Insert(conn, controlId, lastNo + 1, KindSave, name, json, userId, null);
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"
DELETE FROM dbo.UiBuilderControlVersion
WHERE ControlId = @id AND Kind = @kind AND VersionNo <= @no - @keep";
                        cmd.Parameters.AddWithValue("@id", controlId);
                        cmd.Parameters.AddWithValue("@kind", KindSave);
                        cmd.Parameters.AddWithValue("@no", lastNo + 1);
                        cmd.Parameters.AddWithValue("@keep", KeepVersions);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex)
            {
                AppLogger.Log("UiDesignVersions.RecordSave failed, controlId=" + controlId, ex);
            }
        }

        public static bool SaveBaseline(int controlId, string json, int userId)
        {
            if (string.IsNullOrWhiteSpace(json) || json.Length > MaxJsonLength) return false;
            if (CountControls(json) == 0) return false;
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    if (!UiDesignCatalog.Owns(conn, userId, controlId)) return false;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM dbo.UiBuilderControlVersion WHERE ControlId = @id AND Kind = @kind";
                        cmd.Parameters.AddWithValue("@id", controlId);
                        cmd.Parameters.AddWithValue("@kind", KindBaseline);
                        if ((int)cmd.ExecuteScalar() > 0) return false;
                    }
                    Insert(conn, controlId, 0, KindBaseline, "Bản gốc", json, userId, null);
                    return true;
                }
            }
            catch (SqlException ex)
            {
                if (ex.Number == 208) return false;
                throw;
            }
        }

        public static List<DesignVersionInfo> List(int controlId, int userId)
        {
            try
            {
                return ListCore(controlId, userId);
            }
            catch (SqlException ex)
            {
                if (ex.Number == 208) return new List<DesignVersionInfo>();
                throw;
            }
        }

        private static List<DesignVersionInfo> ListCore(int controlId, int userId)
        {
            var list = new List<DesignVersionInfo>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                if (!UiDesignCatalog.Owns(conn, userId, controlId)) return list;
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT v.VersionId, v.VersionNo, v.Kind, v.Name, v.ControlCount, v.CreatedAt,
       ISNULL(NULLIF(LTRIM(RTRIM(u.FullName)), N''), u.UserName)
FROM dbo.UiBuilderControlVersion v
LEFT JOIN dbo.UiUser u ON u.UserId = v.CreatedByUserId
WHERE v.ControlId = @id
ORDER BY CASE WHEN v.Kind = N'baseline' THEN 1 ELSE 0 END, v.VersionNo DESC";
                    cmd.Parameters.AddWithValue("@id", controlId);
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            list.Add(new DesignVersionInfo
                            {
                                VersionId = r.GetInt32(0),
                                VersionNo = r.GetInt32(1),
                                Kind = r.IsDBNull(2) ? KindSave : r.GetString(2),
                                Name = r.IsDBNull(3) ? "" : r.GetString(3),
                                ControlCount = r.GetInt32(4),
                                CreatedAt = r.GetDateTime(5).ToString(DateFormat),
                                CreatedBy = r.IsDBNull(6) ? "" : r.GetString(6)
                            });
                        }
                    }
                }
            }
            return list;
        }

        public static string Load(int versionId, int userId)
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT v.JsonConfig
FROM dbo.UiBuilderControlVersion v
INNER JOIN dbo.UiBuilderControl c ON c.ControlId = v.ControlId
WHERE v.VersionId = @vid AND c.OwnerUserId = @uid AND c.IsDeleted = 0";
                    cmd.Parameters.AddWithValue("@vid", versionId);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    return cmd.ExecuteScalar() as string;
                }
            }
            catch (SqlException ex)
            {
                if (ex.Number == 208) return null;
                throw;
            }
        }
    }
}
