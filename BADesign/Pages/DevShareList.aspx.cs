using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class DevShareList : Page
    {
        public int CurrentUserId => UiAuthHelper.CurrentUserId ?? 0;
        public bool IsSuperAdmin => UiAuthHelper.IsSuperAdmin;

        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            ucBaSidebar.ActiveSection = "DevShare";
            ucBaTopBar.PageTitle = "Community Share";
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetPostList(string search, string tag, string sort, int top = 20, int skip = 0)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var list = new List<object>();
                sort = sort ?? "newest";
                var orderBy = sort == "useful" ? "P.UsefulCount DESC, P.UpdatedAt DESC" : sort == "views" ? "P.ViewCount DESC, P.UpdatedAt DESC" : "P.UpdatedAt DESC";
                var searchTrim = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
                var tagTrim = string.IsNullOrWhiteSpace(tag) ? null : tag.Trim();
                var topVal = Math.Min(Math.Max(top, 1), 50);
                var skipVal = Math.Max(0, skip);

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    var sql = @"SELECT P.Id, P.Title, P.Slug, P.Summary, P.AuthorId, P.CreatedAt, P.UpdatedAt, P.PublishedAt, P.LanguageTags, P.ViewCount, P.UsefulCount,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS AuthorName,
(SELECT COUNT(*) FROM DevShareComment C WHERE C.PostId = P.Id AND C.ParentId IS NULL) AS CommentCount
FROM DevSharePost P
LEFT JOIN UiUser U ON U.UserId = P.AuthorId
WHERE (P.PublishedAt IS NOT NULL) ";
                    if (searchTrim != null) sql += " AND (P.Title LIKE N'%' + @search + N'%' OR P.Summary LIKE N'%' + @search + N'%' OR P.LanguageTags LIKE N'%' + @search + N'%') ";
                    if (tagTrim != null) sql += " AND (N',' + ISNULL(P.LanguageTags,'') + N',' LIKE N'%' + @tag + N'%') ";
                    sql += " ORDER BY " + orderBy + " OFFSET @skip ROWS FETCH NEXT @top ROWS ONLY";
                    cmd.CommandText = sql;
                    cmd.Parameters.AddWithValue("@skip", skipVal);
                    cmd.Parameters.AddWithValue("@top", topVal);
                    if (searchTrim != null) cmd.Parameters.AddWithValue("@search", searchTrim);
                    if (tagTrim != null) cmd.Parameters.AddWithValue("@tag", "," + tagTrim + ",");
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var published = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                            var updated = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6);
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                slug = r.IsDBNull(2) ? "" : r.GetString(2),
                                summary = r.IsDBNull(3) ? "" : r.GetString(3),
                                authorId = r.GetInt32(4),
                                createdAt = r.IsDBNull(5) ? (string)null : r.GetDateTime(5).ToString("o"),
                                updatedAt = updated.HasValue ? updated.Value.ToString("o") : (string)null,
                                publishedAt = published.HasValue ? published.Value.ToString("o") : (string)null,
                                languageTags = r.IsDBNull(8) ? "" : r.GetString(8),
                                viewCount = r.GetInt32(9),
                                usefulCount = r.GetInt32(10),
                                authorName = r.IsDBNull(11) ? "" : r.GetString(11),
                                commentCount = r.FieldCount > 12 ? r.GetInt32(12) : 0
                            });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, list = new List<object>() };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetTagList()
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var tagSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT LanguageTags FROM DevSharePost WHERE PublishedAt IS NOT NULL AND ISNULL(LanguageTags,'') <> ''";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var s = r.IsDBNull(0) ? "" : (r.GetString(0) ?? "");
                            foreach (var part in s.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
                            {
                                var t = part.Trim();
                                if (t.Length > 0) tagSet.Add(t);
                            }
                        }
                    }
                }
                var tags = new List<string>(tagSet);
                tags.Sort(StringComparer.OrdinalIgnoreCase);
                return new { success = true, tags = tags };
            }
            catch
            {
                return new { success = true, tags = new List<string>() };
            }
        }
    }
}
