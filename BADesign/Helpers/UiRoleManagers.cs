using System;
using System.Collections.Generic;
using System.Data.SqlClient;

namespace BADesign.Helpers
{
    public static class UiRoleManagers
    {
        public static Dictionary<string, int> GetAll()
        {
            var result = new Dictionary<string, int>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT RoleId, UserId FROM dbo.UiRoleManager ORDER BY RoleId, CreatedAt, UserId";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var key = r.GetInt32(0).ToString();
                        if (!result.ContainsKey(key)) result[key] = r.GetInt32(1);
                    }
                }
            }
            return result;
        }

        public static int? GetActiveManagerId(int roleId)
        {
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT TOP (1) m.UserId
FROM dbo.UiRoleManager m
INNER JOIN dbo.UiUser u ON u.UserId = m.UserId
WHERE m.RoleId = @rid AND u.IsActive = 1
ORDER BY m.CreatedAt, m.UserId";
                cmd.Parameters.AddWithValue("@rid", roleId);
                conn.Open();
                var value = cmd.ExecuteScalar();
                return value == null || value == DBNull.Value ? (int?)null : Convert.ToInt32(value);
            }
        }

        public static string Save(int roleId, int? userId)
        {
            if (!UiAuthHelper.IsSuperAdmin) return "Chỉ Super Admin được khai sếp của role.";
            var by = UiAuthHelper.GetCurrentUserIdOrThrow();

            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT COUNT(*) FROM dbo.UiRole WHERE RoleId = @rid";
                    cmd.Parameters.AddWithValue("@rid", roleId);
                    if ((int)cmd.ExecuteScalar() == 0) return "Role không tồn tại.";
                }

                var current = new List<int>();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT UserId FROM dbo.UiRoleManager WHERE RoleId = @rid";
                    cmd.Parameters.AddWithValue("@rid", roleId);
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read()) current.Add(r.GetInt32(0));
                    }
                }
                var unchanged = userId.HasValue
                    ? current.Count == 1 && current[0] == userId.Value
                    : current.Count == 0;
                if (unchanged) return null;

                if (userId.HasValue)
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM dbo.UiUser WHERE IsActive = 1 AND UserId = @uid";
                        cmd.Parameters.AddWithValue("@uid", userId.Value);
                        if ((int)cmd.ExecuteScalar() == 0) return "User không tồn tại hoặc đã bị khóa.";
                    }
                }

                using (var tran = conn.BeginTransaction())
                {
                    try
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tran;
                            cmd.CommandText = "DELETE FROM dbo.UiRoleManager WHERE RoleId = @rid";
                            cmd.Parameters.AddWithValue("@rid", roleId);
                            cmd.ExecuteNonQuery();
                        }
                        if (userId.HasValue)
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.Transaction = tran;
                                cmd.CommandText = "INSERT INTO dbo.UiRoleManager (RoleId, UserId, CreatedByUserId) VALUES (@rid, @uid, @by)";
                                cmd.Parameters.AddWithValue("@rid", roleId);
                                cmd.Parameters.AddWithValue("@uid", userId.Value);
                                cmd.Parameters.AddWithValue("@by", by);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        tran.Commit();
                    }
                    catch
                    {
                        tran.Rollback();
                        throw;
                    }
                }
            }
            UserActionLogHelper.Log("UiTemplate.SaveRoleManagers", "roleId=" + roleId + ", manager=" + (userId.HasValue ? userId.Value.ToString() : "none"));
            return null;
        }
    }
}
