using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers
{
    public sealed class TemplateUserInfo
    {
        public int UserId { get; set; }
        public string Name { get; set; }
        public string RoleCode { get; set; }
        public string RoleName { get; set; }
        public bool HasEmail { get; set; }
    }

    public sealed class TemplateRoleInfo
    {
        public int RoleId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string ManagerName { get; set; }
    }

    public sealed class TemplateWorkflowStepDto
    {
        public int StepNo { get; set; }
        public string StepName { get; set; }
        public bool UseRoleManager { get; set; }
        public List<int> ApproverIds { get; set; }
        public List<string> ApproverNames { get; set; }
    }

    public sealed class TemplateAdvanceStep
    {
        public int StepNo { get; set; }
        public List<int> ApproverIds { get; set; }
    }

    public sealed class TemplateAdvancePlan
    {
        public List<KeyValuePair<int, int>> AutoSteps { get; set; }
        public int PendingStepNo { get; set; }
    }

    public sealed class TemplateWorkflowDto
    {
        public int WorkflowId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public List<int> RoleIds { get; set; }
        public List<TemplateWorkflowStepDto> Steps { get; set; }
    }

    public sealed class TemplateTimelineItem
    {
        public string Kind { get; set; }
        public int StepNo { get; set; }
        public string Title { get; set; }
        public string Status { get; set; }
        public string By { get; set; }
        public string At { get; set; }
        public string Note { get; set; }
        public List<string> Waiting { get; set; }
    }

    public sealed class TemplateRequestInfo
    {
        public int RequestId { get; set; }
        public int? SourceControlId { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public string UiKind { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public string SubmitterName { get; set; }
        public string SubmitterRole { get; set; }
        public string SubmittedAt { get; set; }
        public string SubmitNote { get; set; }
        public string WorkflowName { get; set; }
        public int CurrentStepNo { get; set; }
        public int TotalSteps { get; set; }
        public string CompletedAt { get; set; }
        public string CompletedBy { get; set; }
        public string CompletedNote { get; set; }
        public bool IsInLibrary { get; set; }
        public int ControlCount { get; set; }
        public string Thumb { get; set; }
        public List<string> PendingWith { get; set; }
        public List<string> ApprovedBy { get; set; }
        public bool IsMine { get; set; }
        public bool CanAct { get; set; }
        public bool CanCancel { get; set; }
        public bool CanRemove { get; set; }
        public List<TemplateTimelineItem> Timeline { get; set; }
        public string JsonConfig { get; set; }
        public int? ModuleId { get; set; }
        public string ModuleName { get; set; }
    }

    public sealed class TemplateActionResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int RequestId { get; set; }
        public string Status { get; set; }
    }

    public static class UiTemplateLibrary
    {
        public const string AdminPermission = "UITemplateAdmin";
        public const string StatusPending = "Pending";
        public const string StatusApproved = "Approved";
        public const string StatusRejected = "Rejected";
        public const string StatusCancelled = "Cancelled";
        public const string StepWaiting = "Waiting";
        public const string StepAuto = "Auto";

        public const int MaxSteps = 5;
        public const int MaxApproversPerStep = 10;
        private const int MaxJsonLength = 8 * 1024 * 1024;
        private const int MaxControls = 3000;
        private const string DateFormat = "dd/MM/yyyy HH:mm";
        private const string ThumbFolder = "~/Content/design-thumbs/";
        private static readonly Regex SafeTokenPattern = new Regex("^[A-Za-z0-9_.:\\-]{1,120}$", RegexOptions.CultureInvariant);
        private static readonly Regex UnsafeTextPattern = new Regex("<[A-Za-z/!?]|\\bon[a-z]{3,}\\s*=|javascript\\s*:", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        private static readonly Regex ImageDataPattern = new Regex("^data:image/(png|jpeg|jpg|gif|webp|bmp);base64,[A-Za-z0-9+/=\\s]+$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        private static bool IsSafeToken(JToken token)
        {
            return token != null && token.Type == JTokenType.String && SafeTokenPattern.IsMatch((string)token);
        }

        public static bool IsAdmin()
        {
            return UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature(AdminPermission);
        }

        public static bool CanUseBuilder()
        {
            return UiAuthHelper.HasFeature("UIBuilder");
        }

        private static string Clean(string value, int max)
        {
            if (value == null) return null;
            var text = value.Trim();
            if (text.Length == 0) return null;
            return text.Length > max ? text.Substring(0, max) : text;
        }

        private static object DbValue(object value)
        {
            return value ?? DBNull.Value;
        }

        private static string Text(SqlDataReader reader, int index)
        {
            return reader.IsDBNull(index) ? null : reader.GetString(index);
        }

        private static string Date(SqlDataReader reader, int index)
        {
            return reader.IsDBNull(index) ? null : reader.GetDateTime(index).ToString(DateFormat);
        }

        public const string MissingSchemaMessage = "Chưa cài đủ chức năng mẫu chung: cần chạy script AddUiTemplateLibrary.sql và AddUiRoleManagers.sql trên database của tool.";

        public static bool IsMissingSchema(SqlException ex)
        {
            return ex != null && (ex.Number == 208 || ex.Number == 207);
        }

        public static int? GetUserRoleId(int userId)
        {
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT RoleId FROM dbo.UiUser WHERE UserId = @id";
                cmd.Parameters.AddWithValue("@id", userId);
                conn.Open();
                var value = cmd.ExecuteScalar();
                return value == null || value == DBNull.Value ? (int?)null : (int)value;
            }
        }

        private static TemplateActionResult Fail(string message)
        {
            return new TemplateActionResult { Success = false, Message = message };
        }

        public static List<TemplateRoleInfo> GetRoles()
        {
            var list = new List<TemplateRoleInfo>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT RoleId, Code, Name FROM dbo.UiRole ORDER BY RoleId";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                        list.Add(new TemplateRoleInfo { RoleId = r.GetInt32(0), Code = Text(r, 1), Name = Text(r, 2) });
                }
            }
            return list;
        }

        public static List<TemplateRoleInfo> GetRolesWithManagers()
        {
            var list = GetRoles();
            var byId = list.ToDictionary(r => r.RoleId);
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT m.RoleId, ISNULL(NULLIF(LTRIM(RTRIM(u.FullName)), N''), u.UserName)
FROM dbo.UiRoleManager m
INNER JOIN dbo.UiUser u ON u.UserId = m.UserId
WHERE u.IsActive = 1
ORDER BY m.RoleId, m.CreatedAt, m.UserId";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        TemplateRoleInfo role;
                        if (byId.TryGetValue(r.GetInt32(0), out role) && role.ManagerName == null) role.ManagerName = Text(r, 1);
                    }
                }
            }
            return list;
        }

        public static List<TemplateUserInfo> GetActiveUsers()
        {
            var list = new List<TemplateUserInfo>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT u.UserId, ISNULL(NULLIF(LTRIM(RTRIM(u.FullName)), N''), u.UserName) AS DisplayName, r.Code,
       CASE WHEN NULLIF(LTRIM(RTRIM(u.Email)), N'') IS NULL THEN 0 ELSE 1 END AS HasEmail, r.Name
FROM dbo.UiUser u
LEFT JOIN dbo.UiRole r ON r.RoleId = u.RoleId
WHERE u.IsActive = 1
ORDER BY DisplayName";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                        list.Add(new TemplateUserInfo { UserId = r.GetInt32(0), Name = Text(r, 1), RoleCode = Text(r, 2), HasEmail = r.GetInt32(3) == 1, RoleName = Text(r, 4) });
                }
            }
            return list;
        }

        public static List<TemplateWorkflowDto> GetWorkflows()
        {
            var list = new List<TemplateWorkflowDto>();
            var byId = new Dictionary<int, TemplateWorkflowDto>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT WorkflowId, Name, [Description], IsDefault, IsActive FROM dbo.UiTemplateWorkflow ORDER BY IsDefault DESC, Name";
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var item = new TemplateWorkflowDto
                            {
                                WorkflowId = r.GetInt32(0),
                                Name = Text(r, 1),
                                Description = Text(r, 2),
                                IsDefault = r.GetBoolean(3),
                                IsActive = r.GetBoolean(4),
                                RoleIds = new List<int>(),
                                Steps = new List<TemplateWorkflowStepDto>()
                            };
                            list.Add(item);
                            byId[item.WorkflowId] = item;
                        }
                    }
                }
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT WorkflowId, RoleId FROM dbo.UiTemplateWorkflowRole ORDER BY RoleId";
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            TemplateWorkflowDto owner;
                            if (byId.TryGetValue(r.GetInt32(0), out owner)) owner.RoleIds.Add(r.GetInt32(1));
                        }
                    }
                }
                var steps = new Dictionary<int, TemplateWorkflowStepDto>();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT StepId, WorkflowId, StepNo, StepName, UseRoleManager FROM dbo.UiTemplateWorkflowStep ORDER BY WorkflowId, StepNo";
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            TemplateWorkflowDto owner;
                            if (!byId.TryGetValue(r.GetInt32(1), out owner)) continue;
                            var step = new TemplateWorkflowStepDto
                            {
                                StepNo = r.GetInt32(2),
                                StepName = Text(r, 3),
                                UseRoleManager = r.GetBoolean(4),
                                ApproverIds = new List<int>(),
                                ApproverNames = new List<string>()
                            };
                            owner.Steps.Add(step);
                            steps[r.GetInt32(0)] = step;
                        }
                    }
                }
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT a.StepId, a.UserId, ISNULL(NULLIF(LTRIM(RTRIM(u.FullName)), N''), u.UserName)
FROM dbo.UiTemplateWorkflowStepApprover a
INNER JOIN dbo.UiUser u ON u.UserId = a.UserId
ORDER BY 3";
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            TemplateWorkflowStepDto step;
                            if (!steps.TryGetValue(r.GetInt32(0), out step)) continue;
                            step.ApproverIds.Add(r.GetInt32(1));
                            step.ApproverNames.Add(Text(r, 2));
                        }
                    }
                }
            }
            return list;
        }

        public static TemplateActionResult SaveWorkflow(TemplateWorkflowDto workflow)
        {
            if (!IsAdmin()) return Fail("Bạn không có quyền định nghĩa quy trình duyệt.");
            if (workflow == null) return Fail("Thiếu dữ liệu quy trình.");
            var name = Clean(workflow.Name, 128);
            if (name == null) return Fail("Hãy nhập tên quy trình.");
            var steps = workflow.Steps ?? new List<TemplateWorkflowStepDto>();
            var users = new HashSet<int>(GetActiveUsers().Select(u => u.UserId));
            var stepsProblem = StepsProblem(steps, users);
            if (stepsProblem != null) return Fail(stepsProblem);

            var roles = new HashSet<int>(GetRoles().Select(r => r.RoleId));
            var roleIds = (workflow.RoleIds ?? new List<int>()).Distinct().ToList();
            if (roleIds.Any(id => !roles.Contains(id))) return Fail("Có role không tồn tại.");

            for (var i = 0; i < steps.Count; i++)
            {
                var step = steps[i];
                step.ApproverIds = (step.ApproverIds ?? new List<int>()).Distinct().ToList();
                step.StepName = Clean(step.StepName, 128) ?? ("Bước " + (i + 1));
            }

            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            int workflowId = workflow.WorkflowId;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                using (var tran = conn.BeginTransaction())
                {
                    try
                    {
                        if (workflow.IsDefault)
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.Transaction = tran;
                                cmd.CommandText = "UPDATE dbo.UiTemplateWorkflow SET IsDefault = 0 WHERE IsDefault = 1 AND WorkflowId <> @id";
                                cmd.Parameters.AddWithValue("@id", workflowId);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tran;
                            if (workflowId > 0)
                            {
                                cmd.CommandText = @"
UPDATE dbo.UiTemplateWorkflow
SET Name = @name, [Description] = @desc, IsDefault = @def, IsActive = @active, UpdatedAt = SYSDATETIME(), UpdatedByUserId = @uid
WHERE WorkflowId = @id";
                                cmd.Parameters.AddWithValue("@id", workflowId);
                            }
                            else
                            {
                                cmd.CommandText = @"
INSERT INTO dbo.UiTemplateWorkflow (Name, [Description], IsDefault, IsActive, CreatedByUserId)
VALUES (@name, @desc, @def, @active, @uid);
SELECT CAST(SCOPE_IDENTITY() AS INT);";
                            }
                            cmd.Parameters.AddWithValue("@name", name);
                            cmd.Parameters.AddWithValue("@desc", DbValue(Clean(workflow.Description, 500)));
                            cmd.Parameters.AddWithValue("@def", workflow.IsDefault);
                            cmd.Parameters.AddWithValue("@active", workflow.IsActive);
                            cmd.Parameters.AddWithValue("@uid", uid);
                            if (workflowId > 0)
                            {
                                if (cmd.ExecuteNonQuery() == 0)
                                {
                                    tran.Rollback();
                                    return Fail("Không tìm thấy quy trình cần sửa.");
                                }
                            }
                            else
                            {
                                workflowId = (int)cmd.ExecuteScalar();
                            }
                        }
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tran;
                            cmd.CommandText = @"
DELETE FROM dbo.UiTemplateWorkflowRole WHERE WorkflowId = @id;
DELETE FROM dbo.UiTemplateWorkflowStep WHERE WorkflowId = @id;";
                            cmd.Parameters.AddWithValue("@id", workflowId);
                            cmd.ExecuteNonQuery();
                        }
                        foreach (var roleId in roleIds)
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.Transaction = tran;
                                cmd.CommandText = @"
DELETE FROM dbo.UiTemplateWorkflowRole WHERE RoleId = @rid;
INSERT INTO dbo.UiTemplateWorkflowRole (WorkflowId, RoleId) VALUES (@id, @rid);";
                                cmd.Parameters.AddWithValue("@id", workflowId);
                                cmd.Parameters.AddWithValue("@rid", roleId);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        for (var i = 0; i < steps.Count; i++)
                        {
                            int stepId;
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.Transaction = tran;
                                cmd.CommandText = @"
INSERT INTO dbo.UiTemplateWorkflowStep (WorkflowId, StepNo, StepName, UseRoleManager) VALUES (@id, @no, @name, @manager);
SELECT CAST(SCOPE_IDENTITY() AS INT);";
                                cmd.Parameters.AddWithValue("@id", workflowId);
                                cmd.Parameters.AddWithValue("@no", i + 1);
                                cmd.Parameters.AddWithValue("@name", steps[i].StepName);
                                cmd.Parameters.AddWithValue("@manager", steps[i].UseRoleManager);
                                stepId = (int)cmd.ExecuteScalar();
                            }
                            foreach (var approverId in steps[i].ApproverIds)
                            {
                                using (var cmd = conn.CreateCommand())
                                {
                                    cmd.Transaction = tran;
                                    cmd.CommandText = "INSERT INTO dbo.UiTemplateWorkflowStepApprover (StepId, UserId) VALUES (@sid, @uid)";
                                    cmd.Parameters.AddWithValue("@sid", stepId);
                                    cmd.Parameters.AddWithValue("@uid", approverId);
                                    cmd.ExecuteNonQuery();
                                }
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
            UserActionLogHelper.Log("UiTemplate.SaveWorkflow", "workflowId=" + workflowId + ", steps=" + steps.Count + ", roles=" + string.Join(",", roleIds));
            return new TemplateActionResult { Success = true, RequestId = workflowId };
        }

        public static TemplateActionResult DeleteWorkflow(int workflowId)
        {
            if (!IsAdmin()) return Fail("Bạn không có quyền định nghĩa quy trình duyệt.");
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "DELETE FROM dbo.UiTemplateWorkflow WHERE WorkflowId = @id";
                cmd.Parameters.AddWithValue("@id", workflowId);
                conn.Open();
                if (cmd.ExecuteNonQuery() == 0) return Fail("Không tìm thấy quy trình.");
            }
            UserActionLogHelper.Log("UiTemplate.DeleteWorkflow", "workflowId=" + workflowId);
            return new TemplateActionResult { Success = true, RequestId = workflowId };
        }

        public static TemplateWorkflowDto ResolveWorkflow(int? roleId)
        {
            var usable = GetWorkflows().Where(w => w.IsActive && w.Steps.Count > 0 && w.Steps.All(s => s.UseRoleManager || s.ApproverIds.Count > 0)).ToList();
            TemplateWorkflowDto match = null;
            if (roleId.HasValue) match = usable.FirstOrDefault(w => w.RoleIds.Contains(roleId.Value));
            var workflow = match ?? usable.FirstOrDefault(w => w.IsDefault);
            if (workflow == null) return null;
            var active = GetActiveUsers().ToDictionary(u => u.UserId, u => u.Name);
            var managerId = roleId.HasValue && workflow.Steps.Any(s => s.UseRoleManager)
                ? UiRoleManagers.GetActiveManagerId(roleId.Value)
                : null;
            foreach (var step in workflow.Steps)
            {
                step.ApproverIds = StepApproverIds(step, managerId, active.Keys);
                step.ApproverNames = step.ApproverIds.Select(id => active[id]).ToList();
            }
            return workflow;
        }

        public static string StepsProblem(IList<TemplateWorkflowStepDto> steps, ICollection<int> activeUserIds)
        {
            if (steps == null || steps.Count == 0) return "Quy trình cần ít nhất một bước duyệt.";
            if (steps.Count > MaxSteps) return "Quy trình có tối đa " + MaxSteps + " bước duyệt.";
            for (var i = 0; i < steps.Count; i++)
            {
                var step = steps[i];
                if (step == null) return "Bước " + (i + 1) + " thiếu dữ liệu.";
                var ids = step.ApproverIds ?? new List<int>();
                var count = ids.Distinct().Count();
                if (step.UseRoleManager && count > 0) return "Bước " + (i + 1) + ": chọn sếp của role người gửi hoặc người cụ thể, không chọn cả hai.";
                if (!step.UseRoleManager && count == 0) return "Bước " + (i + 1) + " chưa có người duyệt.";
                if (count > MaxApproversPerStep) return "Bước " + (i + 1) + " có tối đa " + MaxApproversPerStep + " người duyệt.";
                if (ids.Any(id => activeUserIds == null || !activeUserIds.Contains(id))) return "Bước " + (i + 1) + " có người duyệt không còn hoạt động.";
            }
            return null;
        }

        public static List<int> StepApproverIds(TemplateWorkflowStepDto step, int? roleManagerId, ICollection<int> activeUserIds)
        {
            var ids = new List<int>();
            if (step == null || activeUserIds == null) return ids;
            if (!step.UseRoleManager) ids.AddRange(step.ApproverIds ?? new List<int>());
            else if (roleManagerId.HasValue) ids.Add(roleManagerId.Value);
            return ids.Where(activeUserIds.Contains).Distinct().ToList();
        }

        public static string WorkflowProblem(TemplateWorkflowDto workflow)
        {
            if (workflow == null) return "Chưa có quy trình duyệt cho bộ phận của bạn. Hãy liên hệ người quản trị mẫu UI.";
            var empty = workflow.Steps.FirstOrDefault(s => s.ApproverIds.Count == 0);
            if (empty == null) return null;
            if (empty.UseRoleManager)
                return "Bước " + empty.StepNo + " cần sếp của role duyệt, nhưng bạn chưa được gán role hoặc role của bạn chưa được khai sếp. Hãy liên hệ Super Admin.";
            return "Bước " + empty.StepNo + " của quy trình duyệt không còn người duyệt đang hoạt động. Hãy liên hệ người quản trị mẫu UI.";
        }

        public static TemplateAdvancePlan PlanAdvance(IEnumerable<TemplateAdvanceStep> remainingSteps, int submitterId, int actorId)
        {
            var plan = new TemplateAdvancePlan { AutoSteps = new List<KeyValuePair<int, int>>() };
            foreach (var step in (remainingSteps ?? new List<TemplateAdvanceStep>()).OrderBy(s => s.StepNo))
            {
                var approvers = step.ApproverIds ?? new List<int>();
                int autoBy;
                if (approvers.Contains(submitterId)) autoBy = submitterId;
                else if (approvers.Contains(actorId)) autoBy = actorId;
                else
                {
                    plan.PendingStepNo = step.StepNo;
                    return plan;
                }
                plan.AutoSteps.Add(new KeyValuePair<int, int>(step.StepNo, autoBy));
            }
            return plan;
        }

        private static string CopyThumbnail(string sourceVirtualPath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(sourceVirtualPath)) return null;
                var ctx = HttpContext.Current;
                if (ctx == null) return null;
                var folder = ctx.Server.MapPath(ThumbFolder);
                var fileName = Path.GetFileName(sourceVirtualPath.Replace('\\', '/'));
                if (string.IsNullOrEmpty(fileName) || !fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) return null;
                var source = Path.Combine(folder, fileName);
                if (!File.Exists(source)) return null;
                var targetName = "template-" + Guid.NewGuid().ToString("N") + ".png";
                File.Copy(source, Path.Combine(folder, targetName), false);
                return VirtualPathUtility.ToAbsolute(ThumbFolder + targetName);
            }
            catch (Exception ex)
            {
                AppLogger.Log("UiTemplateLibrary.CopyThumbnail failed", ex);
                return null;
            }
        }

        public static int ValidateDesign(string json, out string error)
        {
            error = null;
            if (string.IsNullOrWhiteSpace(json)) { error = "Thiết kế chưa có nội dung."; return 0; }
            if (json.Length > MaxJsonLength) { error = "Thiết kế quá lớn để gửi làm mẫu (trên 8 MB). Hãy bỏ bớt ảnh trong thiết kế."; return 0; }
            try
            {
                var array = JArray.Parse(json);
                if (array.Count == 0) { error = "Thiết kế chưa có control nào."; return 0; }
                if (array.Count > MaxControls) { error = "Thiết kế có quá nhiều control (tối đa " + MaxControls + ")."; return 0; }
                foreach (var item in array)
                {
                    var obj = item as JObject;
                    if (obj == null || !IsSafeToken(obj["id"]) || !IsSafeToken(obj["type"])) { error = "Dữ liệu thiết kế không hợp lệ."; return 0; }
                }
                foreach (var value in array.Descendants().OfType<JValue>())
                {
                    if (value.Type != JTokenType.String) continue;
                    var text = (string)value;
                    if (string.IsNullOrEmpty(text)) continue;
                    var unsafeText = text.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
                        ? !ImageDataPattern.IsMatch(text)
                        : UnsafeTextPattern.IsMatch(text);
                    if (!unsafeText) continue;
                    var sample = text.Length > 40 ? text.Substring(0, 40) + "..." : text;
                    error = "Thiết kế có chữ giống mã HTML hoặc script (\"" + sample + "\"). Hãy sửa nhãn hoặc giá trị đó, lưu lại rồi gửi.";
                    return 0;
                }
                return array.Count;
            }
            catch (Exception)
            {
                error = "Dữ liệu thiết kế không hợp lệ.";
                return 0;
            }
        }

        public static TemplateActionResult Submit(int controlId, string name, string category, string uiKind, string description, string note)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            if (!CanUseBuilder()) return Fail("Bạn không có quyền dùng UI Builder.");
            name = Clean(name, 200);
            if (name == null) return Fail("Hãy nhập tên mẫu.");
            uiKind = (uiKind ?? "").Trim().ToLowerInvariant();
            if (uiKind != "core" && uiKind != "ess") uiKind = null;

            string json = null, thumb = null, controlType = null;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT ControlType, JsonConfig, ThumbnailPath
FROM dbo.UiBuilderControl
WHERE ControlId = @id AND OwnerUserId = @uid AND IsDeleted = 0";
                cmd.Parameters.AddWithValue("@id", controlId);
                cmd.Parameters.AddWithValue("@uid", uid);
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) return Fail("Không tìm thấy thiết kế, hoặc thiết kế không phải của bạn. Hãy lưu thiết kế trước khi gửi.");
                    controlType = Text(r, 0);
                    json = Text(r, 1);
                    thumb = Text(r, 2);
                }
            }
            if (!string.Equals(controlType, "page", StringComparison.OrdinalIgnoreCase)) return Fail("Chỉ gửi được thiết kế trang làm mẫu chung.");
            string error;
            var count = ValidateDesign(json, out error);
            if (error != null) return Fail(error);

            var roleId = GetUserRoleId(uid);
            var workflow = ResolveWorkflow(roleId);
            var problem = WorkflowProblem(workflow);
            if (problem != null) return Fail(problem);

            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM dbo.UiTemplateRequest WHERE SourceControlId = @src AND SubmitterUserId = @uid AND [Status] = @pending";
                cmd.Parameters.AddWithValue("@src", controlId);
                cmd.Parameters.AddWithValue("@uid", uid);
                cmd.Parameters.AddWithValue("@pending", StatusPending);
                conn.Open();
                if ((int)cmd.ExecuteScalar() > 0)
                    return Fail("Thiết kế này đang có một yêu cầu chờ duyệt. Hãy chờ kết quả hoặc hủy yêu cầu đó trước.");
            }

            var thumbCopy = CopyThumbnail(thumb);
            int requestId;
            int pendingStep = 0;
            bool approved = false;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                using (var tran = conn.BeginTransaction())
                {
                    try
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tran;
                            cmd.CommandText = @"
INSERT INTO dbo.UiTemplateRequest
    (SourceControlId, Name, Category, UiKind, [Description], JsonConfig, ThumbnailPath, ControlCount, [Status],
     SubmitterUserId, SubmitterRoleId, SubmitNote, WorkflowId, WorkflowName, CurrentStepNo, TotalSteps)
VALUES
    (@src, @name, @category, @ui, @desc, @json, @thumb, @count, @status,
     @uid, @role, @note, @wf, @wfName, 1, @total);
SELECT CAST(SCOPE_IDENTITY() AS INT);";
                            cmd.Parameters.AddWithValue("@src", controlId);
                            cmd.Parameters.AddWithValue("@name", name);
                            cmd.Parameters.AddWithValue("@category", DbValue(Clean(category, 100)));
                            cmd.Parameters.AddWithValue("@ui", DbValue(uiKind));
                            cmd.Parameters.AddWithValue("@desc", DbValue(Clean(description, 1000)));
                            cmd.Parameters.AddWithValue("@json", json);
                            cmd.Parameters.AddWithValue("@thumb", DbValue(thumbCopy));
                            cmd.Parameters.AddWithValue("@count", count);
                            cmd.Parameters.AddWithValue("@status", StatusPending);
                            cmd.Parameters.AddWithValue("@uid", uid);
                            cmd.Parameters.AddWithValue("@role", roleId.HasValue ? (object)roleId.Value : DBNull.Value);
                            cmd.Parameters.AddWithValue("@note", DbValue(Clean(note, 1000)));
                            cmd.Parameters.AddWithValue("@wf", workflow.WorkflowId);
                            cmd.Parameters.AddWithValue("@wfName", workflow.Name);
                            cmd.Parameters.AddWithValue("@total", workflow.Steps.Count);
                            requestId = (int)cmd.ExecuteScalar();
                        }
                        foreach (var step in workflow.Steps.OrderBy(s => s.StepNo))
                        {
                            int requestStepId;
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.Transaction = tran;
                                cmd.CommandText = @"
INSERT INTO dbo.UiTemplateRequestStep (RequestId, StepNo, StepName, [Status]) VALUES (@rid, @no, @name, @status);
SELECT CAST(SCOPE_IDENTITY() AS INT);";
                                cmd.Parameters.AddWithValue("@rid", requestId);
                                cmd.Parameters.AddWithValue("@no", step.StepNo);
                                cmd.Parameters.AddWithValue("@name", step.StepName ?? ("Bước " + step.StepNo));
                                cmd.Parameters.AddWithValue("@status", StepWaiting);
                                requestStepId = (int)cmd.ExecuteScalar();
                            }
                            foreach (var approverId in step.ApproverIds)
                            {
                                using (var cmd = conn.CreateCommand())
                                {
                                    cmd.Transaction = tran;
                                    cmd.CommandText = "INSERT INTO dbo.UiTemplateRequestStepApprover (RequestStepId, UserId) VALUES (@sid, @uid)";
                                    cmd.Parameters.AddWithValue("@sid", requestStepId);
                                    cmd.Parameters.AddWithValue("@uid", approverId);
                                    cmd.ExecuteNonQuery();
                                }
                            }
                        }
                        pendingStep = Advance(conn, tran, requestId, 0, uid, uid, controlId, out approved);
                        tran.Commit();
                    }
                    catch
                    {
                        tran.Rollback();
                        throw;
                    }
                }
            }

            UserActionLogHelper.Log("UiTemplate.Submit", "requestId=" + requestId + ", controlId=" + controlId + ", workflowId=" + workflow.WorkflowId);
            var baseUrl = UiAuthHelper.GetBaseUrlForEmail();
            if (!approved) NotifyApproversAsync(requestId, pendingStep, baseUrl);
            return new TemplateActionResult
            {
                Success = true,
                RequestId = requestId,
                Status = approved ? StatusApproved : StatusPending,
                Message = approved
                    ? "Mẫu đã vào thư viện chung vì bạn là người duyệt của mọi bước."
                    : "Đã gửi mẫu. Người duyệt sẽ nhận được email."
            };
        }

        private static int Advance(SqlConnection conn, SqlTransaction tran, int requestId, int afterStep, int submitterId, int actorId, int? sourceControlId, out bool approved)
        {
            approved = false;
            var remaining = new List<TemplateAdvanceStep>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tran;
                cmd.CommandText = @"
SELECT s.StepNo, a.UserId
FROM dbo.UiTemplateRequestStep s
LEFT JOIN dbo.UiTemplateRequestStepApprover a ON a.RequestStepId = s.RequestStepId
WHERE s.RequestId = @rid AND s.StepNo > @after
ORDER BY s.StepNo";
                cmd.Parameters.AddWithValue("@rid", requestId);
                cmd.Parameters.AddWithValue("@after", afterStep);
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var stepNo = r.GetInt32(0);
                        var last = remaining.Count > 0 ? remaining[remaining.Count - 1] : null;
                        if (last == null || last.StepNo != stepNo)
                        {
                            last = new TemplateAdvanceStep { StepNo = stepNo, ApproverIds = new List<int>() };
                            remaining.Add(last);
                        }
                        if (!r.IsDBNull(1)) last.ApproverIds.Add(r.GetInt32(1));
                    }
                }
            }

            var plan = PlanAdvance(remaining, submitterId, actorId);
            foreach (var auto in plan.AutoSteps)
            {
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tran;
                    cmd.CommandText = "UPDATE dbo.UiTemplateRequestStep SET [Status] = @status, ActedByUserId = @by, ActedAt = SYSDATETIME() WHERE RequestId = @rid AND StepNo = @no";
                    cmd.Parameters.AddWithValue("@status", StepAuto);
                    cmd.Parameters.AddWithValue("@by", auto.Value);
                    cmd.Parameters.AddWithValue("@rid", requestId);
                    cmd.Parameters.AddWithValue("@no", auto.Key);
                    cmd.ExecuteNonQuery();
                }
            }
            if (plan.PendingStepNo > 0)
            {
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tran;
                    cmd.CommandText = @"
UPDATE dbo.UiTemplateRequestStep SET [Status] = @status WHERE RequestId = @rid AND StepNo = @no;
UPDATE dbo.UiTemplateRequest SET CurrentStepNo = @no WHERE RequestId = @rid;";
                    cmd.Parameters.AddWithValue("@status", StatusPending);
                    cmd.Parameters.AddWithValue("@rid", requestId);
                    cmd.Parameters.AddWithValue("@no", plan.PendingStepNo);
                    cmd.ExecuteNonQuery();
                }
                return plan.PendingStepNo;
            }

            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tran;
                cmd.CommandText = @"
UPDATE dbo.UiTemplateRequest
SET [Status] = @approved, CurrentStepNo = NULL, CompletedAt = SYSDATETIME(), CompletedByUserId = @actor, IsInLibrary = 1
WHERE RequestId = @rid;
UPDATE dbo.UiTemplateRequest
SET IsInLibrary = 0, ReplacedByRequestId = @rid
WHERE @src IS NOT NULL AND SourceControlId = @src AND SubmitterUserId = @submitter AND IsInLibrary = 1 AND RequestId <> @rid;";
                cmd.Parameters.AddWithValue("@approved", StatusApproved);
                cmd.Parameters.AddWithValue("@actor", actorId);
                cmd.Parameters.AddWithValue("@rid", requestId);
                cmd.Parameters.AddWithValue("@src", sourceControlId.HasValue ? (object)sourceControlId.Value : DBNull.Value);
                cmd.Parameters.AddWithValue("@submitter", submitterId);
                cmd.ExecuteNonQuery();
            }
            approved = true;
            return 0;
        }

        public static TemplateActionResult Review(int requestId, bool approve, string comment)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            comment = Clean(comment, 1000);
            if (!approve && (comment == null || comment.Length < 3)) return Fail("Hãy ghi lý do từ chối để người gửi biết cần sửa gì.");

            var admin = IsAdmin();
            int pendingStep = 0;
            bool approved = false;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                using (var tran = conn.BeginTransaction())
                {
                    try
                    {
                        string status = null;
                        int stepNo = 0, submitterId = 0;
                        int? sourceControlId = null;
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tran;
                            cmd.CommandText = "SELECT [Status], ISNULL(CurrentStepNo, 0), SubmitterUserId, SourceControlId FROM dbo.UiTemplateRequest WITH (UPDLOCK, ROWLOCK) WHERE RequestId = @rid";
                            cmd.Parameters.AddWithValue("@rid", requestId);
                            using (var r = cmd.ExecuteReader())
                            {
                                if (!r.Read())
                                {
                                    r.Close();
                                    tran.Rollback();
                                    return Fail("Không tìm thấy yêu cầu.");
                                }
                                status = Text(r, 0);
                                stepNo = r.GetInt32(1);
                                submitterId = r.GetInt32(2);
                                sourceControlId = r.IsDBNull(3) ? (int?)null : r.GetInt32(3);
                            }
                        }
                        if (status != StatusPending || stepNo <= 0)
                        {
                            tran.Rollback();
                            return Fail("Yêu cầu này đã được xử lý, không còn chờ duyệt.");
                        }
                        if (submitterId == uid)
                        {
                            tran.Rollback();
                            return Fail("Bạn không thể tự duyệt mẫu do chính mình gửi.");
                        }
                        bool isApprover;
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tran;
                            cmd.CommandText = @"
SELECT COUNT(*)
FROM dbo.UiTemplateRequestStep s
INNER JOIN dbo.UiTemplateRequestStepApprover a ON a.RequestStepId = s.RequestStepId
WHERE s.RequestId = @rid AND s.StepNo = @no AND a.UserId = @uid";
                            cmd.Parameters.AddWithValue("@rid", requestId);
                            cmd.Parameters.AddWithValue("@no", stepNo);
                            cmd.Parameters.AddWithValue("@uid", uid);
                            isApprover = (int)cmd.ExecuteScalar() > 0;
                        }
                        if (!isApprover && !admin)
                        {
                            tran.Rollback();
                            return Fail("Bạn không phải người duyệt của bước này.");
                        }
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = tran;
                            cmd.CommandText = @"
UPDATE dbo.UiTemplateRequestStep
SET [Status] = @status, ActedByUserId = @uid, ActedAt = SYSDATETIME(), Comment = @comment
WHERE RequestId = @rid AND StepNo = @no AND [Status] = @pending";
                            cmd.Parameters.AddWithValue("@status", approve ? StatusApproved : StatusRejected);
                            cmd.Parameters.AddWithValue("@uid", uid);
                            cmd.Parameters.AddWithValue("@comment", DbValue(comment));
                            cmd.Parameters.AddWithValue("@rid", requestId);
                            cmd.Parameters.AddWithValue("@no", stepNo);
                            cmd.Parameters.AddWithValue("@pending", StatusPending);
                            if (cmd.ExecuteNonQuery() == 0)
                            {
                                tran.Rollback();
                                return Fail("Bước này vừa được người khác xử lý. Hãy tải lại trang.");
                            }
                        }
                        if (approve)
                        {
                            pendingStep = Advance(conn, tran, requestId, stepNo, submitterId, uid, sourceControlId, out approved);
                        }
                        else
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.Transaction = tran;
                                cmd.CommandText = @"
UPDATE dbo.UiTemplateRequest
SET [Status] = @rejected, CompletedAt = SYSDATETIME(), CompletedByUserId = @uid, CompletedNote = @comment
WHERE RequestId = @rid";
                                cmd.Parameters.AddWithValue("@rejected", StatusRejected);
                                cmd.Parameters.AddWithValue("@uid", uid);
                                cmd.Parameters.AddWithValue("@comment", DbValue(comment));
                                cmd.Parameters.AddWithValue("@rid", requestId);
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

            UserActionLogHelper.Log(approve ? "UiTemplate.Approve" : "UiTemplate.Reject", "requestId=" + requestId);
            var baseUrl = UiAuthHelper.GetBaseUrlForEmail();
            if (approve && !approved) NotifyApproversAsync(requestId, pendingStep, baseUrl);
            else NotifySubmitterAsync(requestId, baseUrl);
            return new TemplateActionResult
            {
                Success = true,
                RequestId = requestId,
                Status = !approve ? StatusRejected : (approved ? StatusApproved : StatusPending),
                Message = !approve ? "Đã từ chối. Người gửi sẽ nhận được email kèm lý do."
                    : (approved ? "Đã duyệt. Mẫu đã vào thư viện chung." : "Đã duyệt. Yêu cầu chuyển sang bước duyệt tiếp theo.")
            };
        }

        public static TemplateActionResult Cancel(int requestId)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
UPDATE dbo.UiTemplateRequest
SET [Status] = @cancelled, CompletedAt = SYSDATETIME(), CompletedByUserId = @uid
WHERE RequestId = @rid AND SubmitterUserId = @uid AND [Status] = @pending";
                cmd.Parameters.AddWithValue("@cancelled", StatusCancelled);
                cmd.Parameters.AddWithValue("@uid", uid);
                cmd.Parameters.AddWithValue("@rid", requestId);
                cmd.Parameters.AddWithValue("@pending", StatusPending);
                conn.Open();
                if (cmd.ExecuteNonQuery() == 0) return Fail("Chỉ người gửi mới hủy được yêu cầu đang chờ duyệt.");
            }
            UserActionLogHelper.Log("UiTemplate.Cancel", "requestId=" + requestId);
            return new TemplateActionResult { Success = true, RequestId = requestId, Status = StatusCancelled, Message = "Đã hủy yêu cầu." };
        }

        public static TemplateActionResult RemoveFromLibrary(int requestId)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            var admin = IsAdmin();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
UPDATE dbo.UiTemplateRequest
SET IsInLibrary = 0, RemovedAt = SYSDATETIME(), RemovedByUserId = @uid
WHERE RequestId = @rid AND IsInLibrary = 1 AND (@admin = 1 OR SubmitterUserId = @uid)";
                cmd.Parameters.AddWithValue("@uid", uid);
                cmd.Parameters.AddWithValue("@rid", requestId);
                cmd.Parameters.AddWithValue("@admin", admin ? 1 : 0);
                conn.Open();
                if (cmd.ExecuteNonQuery() == 0) return Fail("Không gỡ được: mẫu không còn trong thư viện, hoặc bạn không có quyền gỡ mẫu này.");
            }
            UserActionLogHelper.Log("UiTemplate.RemoveFromLibrary", "requestId=" + requestId);
            return new TemplateActionResult { Success = true, RequestId = requestId, Message = "Đã gỡ mẫu khỏi thư viện chung." };
        }

        private const string RequestColumns = @"
r.RequestId, r.SourceControlId, r.Name, r.Category, r.UiKind, r.[Description], r.[Status],
ISNULL(NULLIF(LTRIM(RTRIM(su.FullName)), N''), su.UserName) AS SubmitterName, sr.Name AS SubmitterRole,
r.SubmittedAt, r.SubmitNote, r.WorkflowName, ISNULL(r.CurrentStepNo, 0), r.TotalSteps, r.CompletedAt,
ISNULL(NULLIF(LTRIM(RTRIM(cu.FullName)), N''), cu.UserName) AS CompletedBy, r.CompletedNote, r.IsInLibrary,
r.ControlCount, r.ThumbnailPath, r.SubmitterUserId, r.RemovedAt,
ISNULL(NULLIF(LTRIM(RTRIM(ru.FullName)), N''), ru.UserName) AS RemovedBy";

        private const string RequestJoins = @"
FROM dbo.UiTemplateRequest r
INNER JOIN dbo.UiUser su ON su.UserId = r.SubmitterUserId
LEFT JOIN dbo.UiRole sr ON sr.RoleId = r.SubmitterRoleId
LEFT JOIN dbo.UiUser cu ON cu.UserId = r.CompletedByUserId
LEFT JOIN dbo.UiUser ru ON ru.UserId = r.RemovedByUserId";

        private sealed class RequestRow
        {
            public TemplateRequestInfo Info;
            public int SubmitterUserId;
            public string RemovedAt;
            public string RemovedBy;
        }

        private static RequestRow ReadRequest(SqlDataReader r, int currentUserId)
        {
            var info = new TemplateRequestInfo
            {
                RequestId = r.GetInt32(0),
                SourceControlId = r.IsDBNull(1) ? (int?)null : r.GetInt32(1),
                Name = Text(r, 2),
                Category = Text(r, 3),
                UiKind = Text(r, 4),
                Description = Text(r, 5),
                Status = Text(r, 6),
                SubmitterName = Text(r, 7),
                SubmitterRole = Text(r, 8),
                SubmittedAt = Date(r, 9),
                SubmitNote = Text(r, 10),
                WorkflowName = Text(r, 11),
                CurrentStepNo = r.GetInt32(12),
                TotalSteps = r.GetInt32(13),
                CompletedAt = Date(r, 14),
                CompletedBy = Text(r, 15),
                CompletedNote = Text(r, 16),
                IsInLibrary = r.GetBoolean(17),
                ControlCount = r.GetInt32(18),
                Thumb = Text(r, 19),
                PendingWith = new List<string>(),
                ApprovedBy = new List<string>()
            };
            var submitter = r.GetInt32(20);
            info.IsMine = submitter == currentUserId;
            return new RequestRow { Info = info, SubmitterUserId = submitter, RemovedAt = Date(r, 21), RemovedBy = Text(r, 22) };
        }

        private sealed class StepRow
        {
            public int RequestId;
            public int StepNo;
            public string StepName;
            public string Status;
            public string ActedBy;
            public string ActedAt;
            public string Comment;
            public int? ActedById;
            public List<int> ApproverIds = new List<int>();
            public List<string> ApproverNames = new List<string>();
        }

        private static Dictionary<int, List<StepRow>> LoadSteps(SqlConnection conn, List<int> requestIds)
        {
            var result = new Dictionary<int, List<StepRow>>();
            if (requestIds.Count == 0) return result;
            var idList = string.Join(",", requestIds);
            var byStepId = new Dictionary<int, StepRow>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT s.RequestStepId, s.RequestId, s.StepNo, s.StepName, s.[Status],
       ISNULL(NULLIF(LTRIM(RTRIM(u.FullName)), N''), u.UserName), s.ActedAt, s.Comment, s.ActedByUserId
FROM dbo.UiTemplateRequestStep s
LEFT JOIN dbo.UiUser u ON u.UserId = s.ActedByUserId
WHERE s.RequestId IN (" + idList + @")
ORDER BY s.RequestId, s.StepNo";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var row = new StepRow
                        {
                            RequestId = r.GetInt32(1),
                            StepNo = r.GetInt32(2),
                            StepName = Text(r, 3),
                            Status = Text(r, 4),
                            ActedBy = Text(r, 5),
                            ActedAt = Date(r, 6),
                            Comment = Text(r, 7),
                            ActedById = r.IsDBNull(8) ? (int?)null : r.GetInt32(8)
                        };
                        byStepId[r.GetInt32(0)] = row;
                        List<StepRow> list;
                        if (!result.TryGetValue(row.RequestId, out list)) result[row.RequestId] = list = new List<StepRow>();
                        list.Add(row);
                    }
                }
            }
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT a.RequestStepId, a.UserId, ISNULL(NULLIF(LTRIM(RTRIM(u.FullName)), N''), u.UserName)
FROM dbo.UiTemplateRequestStepApprover a
INNER JOIN dbo.UiTemplateRequestStep s ON s.RequestStepId = a.RequestStepId
INNER JOIN dbo.UiUser u ON u.UserId = a.UserId
WHERE s.RequestId IN (" + idList + @")
ORDER BY 3";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        StepRow row;
                        if (!byStepId.TryGetValue(r.GetInt32(0), out row)) continue;
                        row.ApproverIds.Add(r.GetInt32(1));
                        row.ApproverNames.Add(Text(r, 2));
                    }
                }
            }
            return result;
        }

        private static void Fill(RequestRow row, List<StepRow> steps, int currentUserId, bool admin, bool withTimeline)
        {
            var info = row.Info;
            steps = steps ?? new List<StepRow>();
            var pending = info.Status == StatusPending ? steps.FirstOrDefault(s => s.StepNo == info.CurrentStepNo) : null;
            if (pending != null) info.PendingWith = pending.ApproverNames.ToList();
            info.ApprovedBy = steps.Where(s => s.Status == StatusApproved && s.ActedBy != null).Select(s => s.ActedBy).Distinct().ToList();
            info.CanAct = pending != null && !info.IsMine && (admin || pending.ApproverIds.Contains(currentUserId));
            info.CanCancel = info.IsMine && info.Status == StatusPending;
            info.CanRemove = info.IsInLibrary && (admin || info.IsMine);
            if (!withTimeline) return;

            var timeline = new List<TemplateTimelineItem>();
            timeline.Add(new TemplateTimelineItem
            {
                Kind = "submitted",
                Title = "Gửi mẫu",
                Status = "done",
                By = info.SubmitterName + (string.IsNullOrEmpty(info.SubmitterRole) ? "" : " (" + info.SubmitterRole + ")"),
                At = info.SubmittedAt,
                Note = info.SubmitNote
            });
            foreach (var step in steps)
            {
                var item = new TemplateTimelineItem
                {
                    Kind = "step",
                    StepNo = step.StepNo,
                    Title = "Bước " + step.StepNo + ": " + step.StepName,
                    By = step.ActedBy,
                    At = step.ActedAt,
                    Note = step.Comment,
                    Waiting = step.ApproverNames.ToList()
                };
                if (step.Status == StatusApproved) item.Status = "approved";
                else if (step.Status == StatusRejected) item.Status = "rejected";
                else if (step.Status == StepAuto) item.Status = step.ActedById.HasValue && step.ActedById.Value != row.SubmitterUserId ? "autochain" : "auto";
                else if (step.Status == StatusPending && info.Status == StatusPending) item.Status = "pending";
                else item.Status = "waiting";
                timeline.Add(item);
            }
            if (info.Status == StatusApproved)
                timeline.Add(new TemplateTimelineItem { Kind = "result", Title = "Đã vào thư viện chung", Status = "approved", By = info.CompletedBy, At = info.CompletedAt });
            else if (info.Status == StatusRejected)
                timeline.Add(new TemplateTimelineItem { Kind = "result", Title = "Bị từ chối", Status = "rejected", By = info.CompletedBy, At = info.CompletedAt, Note = info.CompletedNote });
            else if (info.Status == StatusCancelled)
                timeline.Add(new TemplateTimelineItem { Kind = "result", Title = "Người gửi đã hủy yêu cầu", Status = "cancelled", By = info.CompletedBy, At = info.CompletedAt });
            if (row.RemovedAt != null)
                timeline.Add(new TemplateTimelineItem { Kind = "removed", Title = "Đã gỡ khỏi thư viện chung", Status = "cancelled", By = row.RemovedBy, At = row.RemovedAt });
            info.Timeline = timeline;
        }

        public static List<TemplateRequestInfo> ListRequests(string scope)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            var admin = IsAdmin();
            scope = (scope ?? "").Trim().ToLowerInvariant();
            string filter;
            if (scope == "todo")
                filter = @"r.[Status] = N'Pending' AND r.SubmitterUserId <> @uid AND EXISTS (
    SELECT 1 FROM dbo.UiTemplateRequestStep s
    INNER JOIN dbo.UiTemplateRequestStepApprover a ON a.RequestStepId = s.RequestStepId
    WHERE s.RequestId = r.RequestId AND s.StepNo = r.CurrentStepNo AND a.UserId = @uid)";
            else if (scope == "mine")
                filter = "r.SubmitterUserId = @uid";
            else if (scope == "library")
            {
                if (!CanUseBuilder() && !admin) return new List<TemplateRequestInfo>();
                filter = "r.IsInLibrary = 1";
            }
            else if (scope == "all")
            {
                if (!admin) return new List<TemplateRequestInfo>();
                filter = "1 = 1";
            }
            else return new List<TemplateRequestInfo>();

            var rows = new List<RequestRow>();
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT TOP (500) " + RequestColumns + RequestJoins + " WHERE " + filter +
                            (scope == "library" ? " ORDER BY r.CompletedAt DESC" : " ORDER BY r.SubmittedAt DESC");
                        cmd.Parameters.AddWithValue("@uid", uid);
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read()) rows.Add(ReadRequest(r, uid));
                        }
                    }
                    var steps = LoadSteps(conn, rows.Select(x => x.Info.RequestId).ToList());
                    foreach (var row in rows)
                    {
                        List<StepRow> list;
                        steps.TryGetValue(row.Info.RequestId, out list);
                        Fill(row, list, uid, admin, false);
                    }
                }
            }
            catch (SqlException ex)
            {
                if (IsMissingSchema(ex)) return new List<TemplateRequestInfo>();
                throw;
            }
            var requests = rows.Select(x => x.Info).ToList();
            UiHrModules.Annotate(null, requests);
            return requests;
        }

        public static TemplateRequestInfo GetRequest(int requestId, bool withJson)
        {
            var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
            var admin = IsAdmin();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                RequestRow row = null;
                string json = null;
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT " + RequestColumns + (withJson ? ", r.JsonConfig" : ", CAST(NULL AS NVARCHAR(MAX))") + RequestJoins + " WHERE r.RequestId = @rid";
                    cmd.Parameters.AddWithValue("@rid", requestId);
                    using (var r = cmd.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            row = ReadRequest(r, uid);
                            json = Text(r, 23);
                        }
                    }
                }
                if (row == null) return null;
                List<StepRow> steps;
                LoadSteps(conn, new List<int> { requestId }).TryGetValue(requestId, out steps);
                var isApprover = steps != null && steps.Any(s => s.ApproverIds.Contains(uid));
                var libraryReader = row.Info.IsInLibrary && CanUseBuilder();
                if (!row.Info.IsMine && !isApprover && !admin && !libraryReader) return null;
                Fill(row, steps, uid, admin, true);
                if (withJson) row.Info.JsonConfig = json;
                UiHrModules.Annotate(null, new List<TemplateRequestInfo> { row.Info });
                return row.Info;
            }
        }

        public static int CountTodo()
        {
            var uid = UiAuthHelper.CurrentUserId;
            if (!uid.HasValue) return 0;
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT COUNT(*)
FROM dbo.UiTemplateRequest r
INNER JOIN dbo.UiTemplateRequestStep s ON s.RequestId = r.RequestId AND s.StepNo = r.CurrentStepNo
INNER JOIN dbo.UiTemplateRequestStepApprover a ON a.RequestStepId = s.RequestStepId
WHERE r.[Status] = N'Pending' AND r.SubmitterUserId <> @uid AND a.UserId = @uid";
                    cmd.Parameters.AddWithValue("@uid", uid.Value);
                    conn.Open();
                    return (int)cmd.ExecuteScalar();
                }
            }
            catch (SqlException ex)
            {
                if (IsMissingSchema(ex)) return 0;
                throw;
            }
        }

        public static bool IsApproverSomewhere()
        {
            var uid = UiAuthHelper.CurrentUserId;
            if (!uid.HasValue) return false;
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.UiTemplateWorkflowStepApprover WHERE UserId = @uid)
              OR EXISTS (SELECT 1 FROM dbo.UiTemplateRequestStepApprover WHERE UserId = @uid) THEN 1 ELSE 0 END";
                    cmd.Parameters.AddWithValue("@uid", uid.Value);
                    conn.Open();
                    return (int)cmd.ExecuteScalar() == 1;
                }
            }
            catch (SqlException ex)
            {
                if (IsMissingSchema(ex)) return false;
                throw;
            }
        }

        private static string Encode(string value)
        {
            return HttpUtility.HtmlEncode(value ?? "");
        }

        private static string SubjectText(string value)
        {
            var text = (value ?? "").Replace("\r", " ").Replace("\n", " ").Trim();
            return text.Length > 120 ? text.Substring(0, 120) : text;
        }

        private static string ReviewLink(string baseUrl, int requestId)
        {
            if (string.IsNullOrWhiteSpace(baseUrl)) return "";
            var url = baseUrl.TrimEnd('/') + "/Builder?reviewId=" + requestId;
            return "<p><a href=\"" + Encode(url) + "\">Mở mẫu trong UI Builder</a></p>";
        }

        private static void Send(IEnumerable<string> emails, string subject, string body)
        {
            foreach (var email in emails.Where(e => !string.IsNullOrWhiteSpace(e)).Select(e => e.Trim()).Distinct(StringComparer.OrdinalIgnoreCase))
            {
                var error = EmailHelper.SendEmail(email, subject, body, true);
                if (error != null) AppLogger.Log("UiTemplateLibrary: gửi email thất bại: " + error);
            }
        }

        public static void NotifyApproversAsync(int requestId, int stepNo, string baseUrl)
        {
            if (requestId <= 0 || stepNo <= 0) return;
            Task.Run(() =>
            {
                try
                {
                    string name = null, submitter = null, description = null, stepName = null;
                    int total = 0;
                    var emails = new List<string>();
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    {
                        conn.Open();
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
SELECT r.Name, ISNULL(NULLIF(LTRIM(RTRIM(u.FullName)), N''), u.UserName), r.[Description], r.TotalSteps, s.StepName
FROM dbo.UiTemplateRequest r
INNER JOIN dbo.UiUser u ON u.UserId = r.SubmitterUserId
INNER JOIN dbo.UiTemplateRequestStep s ON s.RequestId = r.RequestId AND s.StepNo = @no
WHERE r.RequestId = @rid";
                            cmd.Parameters.AddWithValue("@rid", requestId);
                            cmd.Parameters.AddWithValue("@no", stepNo);
                            using (var r = cmd.ExecuteReader())
                            {
                                if (!r.Read()) return;
                                name = Text(r, 0);
                                submitter = Text(r, 1);
                                description = Text(r, 2);
                                total = r.GetInt32(3);
                                stepName = Text(r, 4);
                            }
                        }
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
SELECT LTRIM(RTRIM(u.Email))
FROM dbo.UiTemplateRequestStep s
INNER JOIN dbo.UiTemplateRequestStepApprover a ON a.RequestStepId = s.RequestStepId
INNER JOIN dbo.UiUser u ON u.UserId = a.UserId
WHERE s.RequestId = @rid AND s.StepNo = @no AND u.IsActive = 1 AND u.Email IS NOT NULL";
                            cmd.Parameters.AddWithValue("@rid", requestId);
                            cmd.Parameters.AddWithValue("@no", stepNo);
                            using (var r = cmd.ExecuteReader())
                            {
                                while (r.Read()) emails.Add(Text(r, 0));
                            }
                        }
                    }
                    var body = new StringBuilder();
                    body.Append("<p>Có một mẫu UI đang chờ bạn duyệt để đưa vào thư viện chung.</p>");
                    body.Append("<p><b>Tên mẫu:</b> ").Append(Encode(name)).Append("<br/>");
                    body.Append("<b>Người gửi:</b> ").Append(Encode(submitter)).Append("<br/>");
                    body.Append("<b>Bước duyệt:</b> ").Append(stepNo).Append("/").Append(total).Append(" - ").Append(Encode(stepName));
                    if (!string.IsNullOrWhiteSpace(description)) body.Append("<br/><b>Mô tả:</b> ").Append(Encode(description));
                    body.Append("</p>").Append(ReviewLink(baseUrl, requestId));
                    Send(emails, "[HR Helper] Mẫu UI chờ duyệt: " + SubjectText(name), body.ToString());
                }
                catch (Exception ex)
                {
                    AppLogger.Log("UiTemplateLibrary.NotifyApprovers failed, requestId=" + requestId, ex);
                }
            });
        }

        public static void NotifySubmitterAsync(int requestId, string baseUrl)
        {
            if (requestId <= 0) return;
            Task.Run(() =>
            {
                try
                {
                    string name = null, status = null, email = null, by = null, note = null;
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"
SELECT r.Name, r.[Status], LTRIM(RTRIM(u.Email)), ISNULL(NULLIF(LTRIM(RTRIM(c.FullName)), N''), c.UserName), r.CompletedNote
FROM dbo.UiTemplateRequest r
INNER JOIN dbo.UiUser u ON u.UserId = r.SubmitterUserId
LEFT JOIN dbo.UiUser c ON c.UserId = r.CompletedByUserId
WHERE r.RequestId = @rid";
                        cmd.Parameters.AddWithValue("@rid", requestId);
                        conn.Open();
                        using (var r = cmd.ExecuteReader())
                        {
                            if (!r.Read()) return;
                            name = Text(r, 0);
                            status = Text(r, 1);
                            email = Text(r, 2);
                            by = Text(r, 3);
                            note = Text(r, 4);
                        }
                    }
                    if (string.IsNullOrWhiteSpace(email)) return;
                    var approved = status == StatusApproved;
                    if (!approved && status != StatusRejected) return;
                    var body = new StringBuilder();
                    body.Append("<p>Mẫu UI <b>").Append(Encode(name)).Append("</b> của bạn ")
                        .Append(approved ? "đã được duyệt và đã có trong thư viện chung." : "chưa được duyệt.").Append("</p>");
                    body.Append("<p><b>Người ").Append(approved ? "duyệt" : "từ chối").Append(":</b> ").Append(Encode(by));
                    if (!approved && !string.IsNullOrWhiteSpace(note)) body.Append("<br/><b>Lý do:</b> ").Append(Encode(note));
                    body.Append("</p>").Append(ReviewLink(baseUrl, requestId));
                    Send(new[] { email }, "[HR Helper] Mẫu UI " + (approved ? "đã được duyệt: " : "bị từ chối: ") + SubjectText(name), body.ToString());
                }
                catch (Exception ex)
                {
                    AppLogger.Log("UiTemplateLibrary.NotifySubmitter failed, requestId=" + requestId, ex);
                }
            });
        }
    }
}
