using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Text.RegularExpressions;

namespace BADesign.Helpers
{
    public sealed class HrModuleInfo
    {
        public int ModuleId { get; set; }
        public string Name { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public int ScreenCount { get; set; }
        public int TemplateCount { get; set; }
    }

    public sealed class HrModuleAssignment
    {
        public string Kind { get; set; }
        public string Key { get; set; }
        public string Name { get; set; }
        public string Group { get; set; }
        public string Ui { get; set; }
        public int? ModuleId { get; set; }
    }

    public sealed class HrModuleResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int ModuleId { get; set; }
    }

    public static class UiHrModules
    {
        public const int MaxNameLength = 100;
        public const int MaxModules = 100;
        public const string KindScreen = "screen";
        public const string KindTemplate = "template";
        public const string MissingSchemaMessage = "Chưa cài chức năng phân hệ HR: cần chạy script AddUiHrModule.sql trên database của tool.";
        private const string DeniedMessage = "Bạn không có quyền quản lý phân hệ HR.";
        private const string NotFoundMessage = "Không tìm thấy phân hệ. Hãy tải lại trang.";
        private const string DuplicateMessage = "Tên phân hệ đã có. Hãy chọn tên khác.";
        private const int UniqueIndexViolation = 2601;
        private const int UniqueConstraintViolation = 2627;
        private const int ForeignKeyViolation = 547;
        private static readonly Regex ScreenKeyPattern = new Regex("^[a-z0-9][a-z0-9-]{0,63}$", RegexOptions.CultureInvariant);
        private static readonly Regex WhitespacePattern = new Regex("\\s+", RegexOptions.CultureInvariant);

        public static bool CanManage()
        {
            return UiTemplateLibrary.IsAdmin();
        }

        public static bool IsMissingSchema(SqlException ex)
        {
            return UiTemplateLibrary.IsMissingSchema(ex);
        }

        public static string CleanName(string name)
        {
            return name == null ? "" : WhitespacePattern.Replace(name, " ").Trim();
        }

        public static string NameProblem(string cleanName)
        {
            if (string.IsNullOrEmpty(cleanName)) return "Chưa nhập tên phân hệ.";
            if (cleanName.Length > MaxNameLength) return "Tên phân hệ dài tối đa " + MaxNameLength + " ký tự.";
            if (cleanName.IndexOfAny(new[] { '<', '>' }) >= 0 || cleanName.Any(char.IsControl))
                return "Tên phân hệ không được chứa ký tự < > hoặc ký tự điều khiển.";
            return null;
        }

        public static bool IsScreenKey(string key)
        {
            return key != null && ScreenKeyPattern.IsMatch(key);
        }

        public static List<int> CleanOrder(IEnumerable<int> moduleIds)
        {
            var result = new List<int>();
            if (moduleIds == null) return result;
            var seen = new HashSet<int>();
            foreach (var id in moduleIds)
            {
                if (id > 0 && seen.Add(id)) result.Add(id);
                if (result.Count >= MaxModules) break;
            }
            return result;
        }

        private static HrModuleResult Fail(string message)
        {
            return new HrModuleResult { Success = false, Message = message };
        }

        private static HrModuleResult Done(int moduleId, string message)
        {
            return new HrModuleResult { Success = true, Message = message, ModuleId = moduleId };
        }

        public static List<HrModuleInfo> ListActive()
        {
            return Query("SELECT ModuleId, Name, SortOrder, IsActive, 0, 0 FROM dbo.UiHrModule WHERE IsActive = 1 ORDER BY SortOrder, Name;");
        }

        public static List<HrModuleInfo> ListAll()
        {
            return Query(@"
SELECT m.ModuleId, m.Name, m.SortOrder, m.IsActive,
       (SELECT COUNT(*) FROM dbo.UiStandardScreenModule s WHERE s.ModuleId = m.ModuleId),
       (SELECT COUNT(*) FROM dbo.UiTemplateRequest r WHERE r.ModuleId = m.ModuleId AND r.IsInLibrary = 1)
FROM dbo.UiHrModule m
ORDER BY m.SortOrder, m.Name;");
        }

        private static List<HrModuleInfo> Query(string sql)
        {
            var list = new List<HrModuleInfo>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = sql;
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        list.Add(new HrModuleInfo
                        {
                            ModuleId = r.GetInt32(0),
                            Name = r.GetString(1),
                            SortOrder = r.GetInt32(2),
                            IsActive = r.GetBoolean(3),
                            ScreenCount = r.GetInt32(4),
                            TemplateCount = r.GetInt32(5)
                        });
                    }
                }
            }
            return list;
        }

        public static HrModuleResult Save(int moduleId, string name, bool isActive)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            if (!CanManage()) return Fail(DeniedMessage);
            var clean = CleanName(name);
            var problem = NameProblem(clean);
            if (problem != null) return Fail(problem);

            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    conn.Open();
                    cmd.Parameters.AddWithValue("@name", clean);
                    cmd.Parameters.AddWithValue("@active", isActive);
                    cmd.Parameters.AddWithValue("@uid", uid);
                    if (moduleId > 0)
                    {
                        cmd.CommandText = @"
UPDATE dbo.UiHrModule
   SET Name = @name, IsActive = @active, UpdatedAt = SYSDATETIME(), UpdatedByUserId = @uid
 WHERE ModuleId = @id;";
                        cmd.Parameters.AddWithValue("@id", moduleId);
                        if (cmd.ExecuteNonQuery() == 0) return Fail(NotFoundMessage);
                    }
                    else
                    {
                        cmd.CommandText = @"
IF (SELECT COUNT(*) FROM dbo.UiHrModule) >= @max
    SELECT -1;
ELSE
BEGIN
    INSERT INTO dbo.UiHrModule (Name, SortOrder, IsActive, CreatedByUserId)
    SELECT @name, ISNULL(MAX(SortOrder), 0) + 1, @active, @uid FROM dbo.UiHrModule;
    SELECT CAST(SCOPE_IDENTITY() AS INT);
END";
                        cmd.Parameters.AddWithValue("@max", MaxModules);
                        moduleId = Convert.ToInt32(cmd.ExecuteScalar());
                        if (moduleId < 0) return Fail("Danh sách phân hệ đã đủ " + MaxModules + " mục.");
                    }
                }
            }
            catch (SqlException ex)
            {
                if (ex.Number == UniqueIndexViolation || ex.Number == UniqueConstraintViolation) return Fail(DuplicateMessage);
                throw;
            }

            UserActionLogHelper.Log("UiHrModule.Save", "moduleId=" + moduleId + ", name=" + clean + ", active=" + isActive);
            return Done(moduleId, "Đã lưu phân hệ.");
        }

        public static HrModuleResult Reorder(IEnumerable<int> moduleIds)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            if (!CanManage()) return Fail(DeniedMessage);
            var order = CleanOrder(moduleIds);
            if (order.Count == 0) return Fail("Không có phân hệ nào để sắp xếp.");

            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                using (var tran = conn.BeginTransaction())
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tran;
                    cmd.CommandText = "UPDATE dbo.UiHrModule SET SortOrder = @sort, UpdatedAt = SYSDATETIME(), UpdatedByUserId = @uid WHERE ModuleId = @id;";
                    var sort = cmd.Parameters.Add("@sort", System.Data.SqlDbType.Int);
                    var id = cmd.Parameters.Add("@id", System.Data.SqlDbType.Int);
                    cmd.Parameters.AddWithValue("@uid", uid);
                    for (var i = 0; i < order.Count; i++)
                    {
                        sort.Value = i + 1;
                        id.Value = order[i];
                        cmd.ExecuteNonQuery();
                    }
                    tran.Commit();
                }
            }

            UserActionLogHelper.Log("UiHrModule.Save", "order=" + string.Join(",", order));
            return Done(0, "Đã lưu thứ tự phân hệ.");
        }

        public static HrModuleResult Delete(int moduleId)
        {
            UiAuthHelper.GetCurrentUserIdOrThrow();
            if (!CanManage()) return Fail(DeniedMessage);
            int rows;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "DELETE FROM dbo.UiHrModule WHERE ModuleId = @id;";
                cmd.Parameters.AddWithValue("@id", moduleId);
                conn.Open();
                rows = cmd.ExecuteNonQuery();
            }
            if (rows == 0) return Fail(NotFoundMessage);
            UserActionLogHelper.Log("UiHrModule.Delete", "moduleId=" + moduleId);
            return Done(moduleId, "Đã xóa phân hệ.");
        }

        public static HrModuleResult AssignScreen(string libraryFolder, string screenKey, int? moduleId)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            if (!CanManage()) return Fail(DeniedMessage);
            if (!IsScreenKey(screenKey) || !StandardScreenLibrary.List(libraryFolder).Any(s => s.Key == screenKey))
                return Fail("Không tìm thấy màn hình chuẩn này.");

            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Parameters.AddWithValue("@key", screenKey);
                    if (moduleId.HasValue && moduleId.Value > 0)
                    {
                        cmd.CommandText = @"
UPDATE dbo.UiStandardScreenModule
   SET ModuleId = @module, UpdatedAt = SYSDATETIME(), UpdatedByUserId = @uid
 WHERE ScreenKey = @key;
IF @@ROWCOUNT = 0
    INSERT INTO dbo.UiStandardScreenModule (ScreenKey, ModuleId, UpdatedByUserId) VALUES (@key, @module, @uid);";
                        cmd.Parameters.AddWithValue("@module", moduleId.Value);
                        cmd.Parameters.AddWithValue("@uid", uid);
                    }
                    else
                    {
                        cmd.CommandText = "DELETE FROM dbo.UiStandardScreenModule WHERE ScreenKey = @key;";
                    }
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
            }
            catch (SqlException ex)
            {
                if (ex.Number == ForeignKeyViolation) return Fail(NotFoundMessage);
                throw;
            }

            UserActionLogHelper.Log("UiHrModule.Assign", "screen=" + screenKey + ", moduleId=" + (moduleId.HasValue && moduleId.Value > 0 ? moduleId.Value.ToString() : "none"));
            return Done(moduleId ?? 0, "Đã lưu phân hệ của màn hình.");
        }

        public static HrModuleResult AssignTemplate(int requestId, int? moduleId)
        {
            UiAuthHelper.GetCurrentUserIdOrThrow();
            if (!CanManage()) return Fail(DeniedMessage);
            int rows;
            try
            {
                rows = SetTemplateModule(requestId, moduleId, "r.IsInLibrary = 1", null);
            }
            catch (SqlException ex)
            {
                if (ex.Number == ForeignKeyViolation) return Fail(NotFoundMessage);
                throw;
            }
            if (rows == 0) return Fail("Không tìm thấy mẫu này trong thư viện chung.");
            UserActionLogHelper.Log("UiHrModule.Assign", "template=" + requestId + ", moduleId=" + (moduleId.HasValue && moduleId.Value > 0 ? moduleId.Value.ToString() : "none"));
            return Done(moduleId ?? 0, "Đã lưu phân hệ của mẫu.");
        }

        public static void SetSubmittedTemplateModule(int requestId, int moduleId, int submitterId)
        {
            if (requestId <= 0 || moduleId <= 0) return;
            try
            {
                SetTemplateModule(requestId, moduleId,
                    "r.SubmitterUserId = @uid AND EXISTS (SELECT 1 FROM dbo.UiHrModule m WHERE m.ModuleId = @module AND m.IsActive = 1)", submitterId);
            }
            catch (SqlException ex)
            {
                if (!IsMissingSchema(ex)) throw;
            }
        }

        private static int SetTemplateModule(int requestId, int? moduleId, string condition, int? userId)
        {
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "UPDATE r SET ModuleId = @module FROM dbo.UiTemplateRequest r WHERE r.RequestId = @id AND " + condition + ";";
                cmd.Parameters.AddWithValue("@id", requestId);
                cmd.Parameters.AddWithValue("@module", moduleId.HasValue && moduleId.Value > 0 ? (object)moduleId.Value : DBNull.Value);
                if (userId.HasValue) cmd.Parameters.AddWithValue("@uid", userId.Value);
                conn.Open();
                return cmd.ExecuteNonQuery();
            }
        }

        private static Dictionary<string, int> ScreenModules(SqlConnection conn)
        {
            var map = new Dictionary<string, int>(StringComparer.Ordinal);
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT ScreenKey, ModuleId FROM dbo.UiStandardScreenModule;";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read()) map[r.GetString(0)] = r.GetInt32(1);
                }
            }
            return map;
        }

        private static Dictionary<int, int> TemplateModules(SqlConnection conn)
        {
            var map = new Dictionary<int, int>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT RequestId, ModuleId FROM dbo.UiTemplateRequest WHERE ModuleId IS NOT NULL;";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read()) map[r.GetInt32(0)] = r.GetInt32(1);
                }
            }
            return map;
        }

        public static void Annotate(List<StandardScreenInfo> screens, List<TemplateRequestInfo> templates)
        {
            try
            {
                var names = ListActive().ToDictionary(m => m.ModuleId, m => m.Name);
                if (names.Count == 0) return;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    if (screens != null && screens.Count > 0)
                    {
                        var byKey = ScreenModules(conn);
                        foreach (var screen in screens)
                        {
                            int moduleId;
                            string name;
                            if (!byKey.TryGetValue(screen.Key, out moduleId) || !names.TryGetValue(moduleId, out name)) continue;
                            screen.ModuleId = moduleId;
                            screen.Module = name;
                        }
                    }
                    if (templates != null && templates.Count > 0)
                    {
                        var byRequest = TemplateModules(conn);
                        foreach (var template in templates)
                        {
                            int moduleId;
                            string name;
                            if (!byRequest.TryGetValue(template.RequestId, out moduleId) || !names.TryGetValue(moduleId, out name)) continue;
                            template.ModuleId = moduleId;
                            template.ModuleName = name;
                        }
                    }
                }
            }
            catch (SqlException ex)
            {
                if (!IsMissingSchema(ex)) throw;
            }
        }

        public static List<HrModuleAssignment> Assignments(List<StandardScreenInfo> screens, List<TemplateRequestInfo> templates)
        {
            var list = new List<HrModuleAssignment>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                var byKey = ScreenModules(conn);
                foreach (var screen in screens ?? new List<StandardScreenInfo>())
                {
                    int moduleId;
                    list.Add(new HrModuleAssignment
                    {
                        Kind = KindScreen,
                        Key = screen.Key,
                        Name = screen.Name,
                        Group = screen.Group,
                        Ui = screen.Ui,
                        ModuleId = byKey.TryGetValue(screen.Key, out moduleId) ? moduleId : (int?)null
                    });
                }
                var byRequest = TemplateModules(conn);
                foreach (var template in templates ?? new List<TemplateRequestInfo>())
                {
                    int moduleId;
                    list.Add(new HrModuleAssignment
                    {
                        Kind = KindTemplate,
                        Key = template.RequestId.ToString(),
                        Name = template.Name,
                        Group = "Mẫu của team",
                        Ui = template.UiKind,
                        ModuleId = byRequest.TryGetValue(template.RequestId, out moduleId) ? moduleId : (int?)null
                    });
                }
            }
            return list;
        }
    }
}
