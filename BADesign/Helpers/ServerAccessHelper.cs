using System;
using System.Collections.Generic;
using System.Data.SqlClient;

namespace BADesign.Helpers
{
    /// <summary>Lấy danh sách server id mà user có quyền (cho SignalR group và GetJobs).</summary>
    public static class ServerAccessHelper
    {
        /// <summary>Null = thấy tất cả (SuperAdmin hoặc DatabaseManageServers). Empty = không thấy server nào. Non-empty = chỉ các Id được phép.</summary>
        public static List<int> GetAccessibleServerIds(int? userId, int? roleId, bool isSuperAdmin, bool hasManageServers)
        {
            if (isSuperAdmin || hasManageServers)
                return null;
            if (!userId.HasValue && !roleId.HasValue)
                return new List<int>();
            var ids = new HashSet<int>();
            using (var conn = new SqlConnection(BADesign.UiAuthHelper.ConnStr))
            {
                conn.Open();
                if (roleId.HasValue)
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ServerId FROM UiRoleServerAccess WHERE RoleId = @rid";
                        cmd.Parameters.AddWithValue("@rid", roleId.Value);
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read()) ids.Add(r.GetInt32(0));
                        }
                    }
                }
                if (userId.HasValue)
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ServerId FROM UiUserServerAccess WHERE UserId = @uid";
                        cmd.Parameters.AddWithValue("@uid", userId.Value);
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read()) ids.Add(r.GetInt32(0));
                        }
                    }
                }
            }
            return ids.Count > 0 ? new List<int>(ids) : new List<int>();
        }
    }
}
