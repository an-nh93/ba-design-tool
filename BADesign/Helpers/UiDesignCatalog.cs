using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.Text.RegularExpressions;

namespace BADesign.Helpers
{
    public class DesignListItem
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public bool IsPublic { get; set; }
        public string Updated { get; set; }
        public long UpdatedOrder { get; set; }
        public string Thumb { get; set; }
        public int? ProjectId { get; set; }
        public string ProjectName { get; set; }
        public string Owner { get; set; }
        public bool IsMine { get; set; }
    }

    public static class UiDesignCatalog
    {
        private const string ListColumns = @"
SELECT c.ControlId, c.Name, c.ControlType, c.IsPublic,
       ISNULL(c.UpdatedAt, c.CreatedAt) AS UpdatedAt,
       c.ThumbnailPath, p.ProjectId, p.Name AS ProjectName,
       u.UserName, c.OwnerUserId
FROM dbo.UiBuilderControl c
JOIN dbo.UiUser u ON c.OwnerUserId = u.UserId
LEFT JOIN dbo.UiProject p ON c.ProjectId = p.ProjectId AND p.IsDeleted = 0
WHERE c.IsDeleted = 0";

        private const string ListOrder = @"
ORDER BY ISNULL(c.UpdatedAt, c.CreatedAt) DESC, c.ControlId DESC;";

        private static readonly Regex ThumbnailPattern = new Regex(
            @"^/Content/design-thumbs/[A-Za-z0-9_.\-]+\.(png|jpg|jpeg)$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        public static string SafeThumbnail(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return null;
            var value = path.Trim();
            if (value.IndexOf("..", StringComparison.Ordinal) >= 0) return null;
            return ThumbnailPattern.IsMatch(value) ? value : null;
        }

        public static string FormatUpdated(DateTime value)
        {
            return value.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
        }

        public static long UpdatedOrder(DateTime value)
        {
            return value.Ticks / TimeSpan.TicksPerMillisecond;
        }

        public static DesignListItem CreateItem(int id, string name, string type, bool isPublic, DateTime updatedAt,
            string thumbnailPath, int? projectId, string projectName, string ownerName, int ownerUserId, int currentUserId)
        {
            return new DesignListItem
            {
                Id = id,
                Name = name ?? "",
                Type = type ?? "",
                IsPublic = isPublic,
                Updated = FormatUpdated(updatedAt),
                UpdatedOrder = UpdatedOrder(updatedAt),
                Thumb = SafeThumbnail(thumbnailPath),
                ProjectId = projectId,
                ProjectName = projectId.HasValue ? (projectName ?? "") : null,
                Owner = ownerName ?? "",
                IsMine = ownerUserId == currentUserId
            };
        }

        public static List<DesignListItem> ListMine(int userId)
        {
            return Query(ListColumns + " AND c.OwnerUserId = @uid" + ListOrder, userId);
        }

        public static List<DesignListItem> ListPublic(int userId)
        {
            return Query(ListColumns + " AND c.IsPublic = 1" + ListOrder, userId);
        }

        public static bool Delete(int userId, int controlId)
        {
            return Execute(@"
UPDATE dbo.UiBuilderControl
   SET IsDeleted = 1, UpdatedAt = SYSDATETIME()
 WHERE ControlId = @id AND OwnerUserId = @uid AND IsDeleted = 0;", userId, controlId, null);
        }

        public static bool SetPublic(int userId, int controlId, bool isPublic)
        {
            return Execute(@"
UPDATE dbo.UiBuilderControl
   SET IsPublic = @pub, UpdatedAt = SYSDATETIME()
 WHERE ControlId = @id AND OwnerUserId = @uid AND IsDeleted = 0;", userId, controlId, isPublic);
        }

        private static List<DesignListItem> Query(string sql, int userId)
        {
            var list = new List<DesignListItem>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = sql;
                cmd.Parameters.AddWithValue("@uid", userId);
                conn.Open();
                using (var rd = cmd.ExecuteReader())
                {
                    while (rd.Read())
                    {
                        list.Add(CreateItem(
                            (int)rd["ControlId"],
                            rd["Name"] as string,
                            rd["ControlType"] as string,
                            (bool)rd["IsPublic"],
                            (DateTime)rd["UpdatedAt"],
                            rd["ThumbnailPath"] as string,
                            rd["ProjectId"] == DBNull.Value ? (int?)null : (int)rd["ProjectId"],
                            rd["ProjectName"] as string,
                            rd["UserName"] as string,
                            (int)rd["OwnerUserId"],
                            userId));
                    }
                }
            }
            return list;
        }

        private static bool Execute(string sql, int userId, int controlId, bool? isPublic)
        {
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = sql;
                cmd.Parameters.AddWithValue("@id", controlId);
                cmd.Parameters.AddWithValue("@uid", userId);
                if (isPublic.HasValue) cmd.Parameters.AddWithValue("@pub", isPublic.Value);
                conn.Open();
                return cmd.ExecuteNonQuery() > 0;
            }
        }
    }
}
