using System;
using System.Data.SqlClient;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace BADesign
{
	/// <summary>Helper cho Community Share: slug, tên tác giả, v.v.</summary>
	public static class DevShareHelper
    {
        public static string GenerateSlug(string title)
        {
            if (string.IsNullOrWhiteSpace(title)) return "post-" + Guid.NewGuid().ToString("N").Substring(0, 8);
            var s = title.Trim().ToLowerInvariant();
            var normalized = s.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            s = sb.ToString().Normalize(NormalizationForm.FormC);
            s = Regex.Replace(s, @"[^a-z0-9\s\-]", "");
            s = Regex.Replace(s, @"\s+", "-");
            s = Regex.Replace(s, @"\-+", "-").Trim('-');
            if (string.IsNullOrEmpty(s)) s = "post-" + Guid.NewGuid().ToString("N").Substring(0, 8);
            return s.Length > 200 ? s.Substring(0, 200) : s;
        }

        public static string GetUserName(int userId)
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT ISNULL(NULLIF(RTRIM(FullName),''), UserName) FROM UiUser WHERE UserId = @id";
                    cmd.Parameters.AddWithValue("@id", userId);
                    conn.Open();
                    var o = cmd.ExecuteScalar();
                    return o != null && o != DBNull.Value ? (o.ToString() ?? "").Trim() : "";
                }
            }
            catch
            {
                return "";
            }
        }

        /// <summary>Kiểm tra slug đã tồn tại chưa (bỏ qua postId khi update).</summary>
        public static bool SlugExists(string slug, int excludePostId = 0)
        {
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT 1 FROM DevSharePost WHERE Slug = @slug AND Id <> @exclude";
                cmd.Parameters.AddWithValue("@slug", slug);
                cmd.Parameters.AddWithValue("@exclude", excludePostId);
                conn.Open();
                return cmd.ExecuteScalar() != null;
            }
        }

        /// <summary>Tạo slug duy nhất: nếu trùng thì thêm số.</summary>
        public static string EnsureUniqueSlug(string title, int excludePostId = 0)
        {
            var baseSlug = GenerateSlug(title);
            var slug = baseSlug;
            var n = 0;
            while (SlugExists(slug, excludePostId))
            {
                n++;
                slug = baseSlug + "-" + n;
                if (slug.Length > 250) slug = baseSlug.Substring(0, 240) + "-" + n;
            }
            return slug;
        }
    }
}
