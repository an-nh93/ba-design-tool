using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.IO;
using System.Web;
using System.Web.Services;
using BADesign;
using System.Web.Services;
using System.Web.Script.Services;

namespace BADesign
{
    public class ControlSummaryDto
    {
        public int ControlId { get; set; }
        public string Name { get; set; }
        public string ControlType { get; set; }
        public bool IsPublic { get; set; }
        public bool IsOwner { get; set; }
        public int? OriginalId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ControlDetailDto
    {
        public int ControlId { get; set; }
        public string Name { get; set; }
        public string ControlType { get; set; }
        public string JsonConfig { get; set; }
        public bool IsPublic { get; set; }
        public int? OriginalId { get; set; }
        public bool IsOwner { get; set; }
    }

    public partial class Builder : System.Web.UI.Page
    {
		// Lấy UserId từ session (bạn map theo hệ thống login hiện tại)
		private static int CurrentUserId
		{
			get
			{
				return UiAuthHelper.GetCurrentUserIdOrThrow();
			}
		}

		private static string ConnStr
	        => ConfigurationManager.ConnectionStrings["UiBuilderDb"].ConnectionString;

		private static string ConfigPath
        {
            get
            {
                var ctx = HttpContext.Current;
                return ctx.Server.MapPath("~/Output/generated-config.json");
            }
        }

		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();

			if (!IsPostBack)
			{
				int cid;

				// Đang edit control/page có sẵn
				if (int.TryParse(Request.QueryString["controlId"], out cid) && cid > 0)
				{
					hiddenControlId.Value = cid.ToString();
					hiddenIsClone.Value = "0";
				}
				// Đang clone từ public: chỉ dùng id này để LOAD, không dùng để UPDATE
				else if (int.TryParse(Request.QueryString["cloneId"], out cid) && cid > 0)
				{
					hiddenControlId.Value = cid.ToString();
					hiddenIsClone.Value = "1";
				}
				else
				{
					hiddenControlId.Value = "0";
					hiddenIsClone.Value = "0";
				}
			}
		}


		private string LoadControlJson(int controlId)
		{
			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = "SELECT JsonConfig FROM UiControlDesign WHERE ControlId=@id AND IsDeleted=0";
				cmd.Parameters.AddWithValue("@id", controlId);
				conn.Open();
				var obj = cmd.ExecuteScalar();
				return obj as string;
			}
		}

		// Lưu 1 PAGE (nhiều control) vào UiBuilderControl với ControlType = 'page'
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static int SaveDesign(int? controlId, string pageName, string controlName,
									 string controlType, string jsonConfig,
									 bool isPublic, string thumbnailData, int? projectId = null)
		{
			// Tên hiển thị: ưu tiên pageName
			var name = string.IsNullOrWhiteSpace(pageName) ? controlName : pageName;

			// Page luôn controlType = 'page'
			return SaveControl(controlId, name, "page", jsonConfig, isPublic, thumbnailData, projectId);
		}



		[WebMethod]
        public static string SaveConfig(string json)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(ConfigPath));
            File.WriteAllText(ConfigPath, json ?? "[]");
            return "ok";
        }

        [WebMethod]
        public static string LoadConfig()
        {
            if (File.Exists(ConfigPath))
            {
                return File.ReadAllText(ConfigPath);
            }
            return "[]";
        }

        [WebMethod]
        public static string GetConfigFileName()
        {
            return "generated-config.json";
        }

		// 3.1. Lấy danh sách control của user + public
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static List<ControlSummaryDto> GetControlList()
		{
			var list = new List<ControlSummaryDto>();
			using (var conn = new SqlConnection(ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT c.ControlId, c.Name, c.ControlType, c.IsPublic,
       c.OriginalControlId,
       c.OwnerUserId,
       c.CreatedAt
FROM dbo.UiBuilderControl c
WHERE c.IsDeleted = 0
  AND (c.OwnerUserId = @uid OR c.IsPublic = 1)
ORDER BY
    CASE WHEN c.OwnerUserId = @uid THEN 0 ELSE 1 END,  -- của mình lên trước
    c.CreatedAt DESC;";

				cmd.Parameters.AddWithValue("@uid", CurrentUserId);
				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					while (rd.Read())
					{
						list.Add(new ControlSummaryDto
						{
							ControlId = rd.GetInt32(0),
							Name = rd.GetString(1),
							ControlType = rd.GetString(2),
							IsPublic = rd.GetBoolean(3),
							OriginalId = rd.IsDBNull(4) ? (int?)null : rd.GetInt32(4),
							IsOwner = (rd.GetInt32(5) == CurrentUserId),
							CreatedAt = rd.GetDateTime(6)
						});
					}
				}
			}
			return list;
		}


		// 3.2. Lấy chi tiết 1 control
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static ControlDetailDto LoadControl(int controlId)
		{
			using (var conn = new SqlConnection(ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT ControlId, Name, ControlType, JsonConfig,
       IsPublic, OriginalControlId, OwnerUserId
FROM dbo.UiBuilderControl
WHERE ControlId = @id AND IsDeleted = 0;";
				cmd.Parameters.AddWithValue("@id", controlId);
				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					if (!rd.Read()) return null;

					int ownerId = rd.GetInt32(6);
					return new ControlDetailDto
					{
						ControlId = rd.GetInt32(0),
						Name = rd.GetString(1),
						ControlType = rd.GetString(2),
						JsonConfig = rd.GetString(3),
						IsPublic = rd.GetBoolean(4),
						OriginalId = rd.IsDBNull(5) ? (int?)null : rd.GetInt32(5),
						IsOwner = (ownerId == CurrentUserId)
					};
				}
			}
		}

		public static string SaveThumbnailFile(int? controlId, string dataUrl)
		{
			// dataUrl dạng "data:image/png;base64,AAAA..."
			int idx = dataUrl.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
			if (idx >= 0)
				dataUrl = dataUrl.Substring(idx + "base64,".Length);

			byte[] bytes = Convert.FromBase64String(dataUrl);

			string fileName = "design-" + (controlId?.ToString() ?? Guid.NewGuid().ToString("N")) + ".png";
			string relativePath = "~/Content/design-thumbs/" + fileName;
			string physicalPath = HttpContext.Current.Server.MapPath(relativePath);

			string dir = Path.GetDirectoryName(physicalPath);
			if (!Directory.Exists(dir))
				Directory.CreateDirectory(dir);

			File.WriteAllBytes(physicalPath, bytes);

			// Lưu path tương đối để hiển thị lại
			return VirtualPathUtility.ToAbsolute(relativePath);
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static int SaveControl(int? controlId, string name,
					  string controlType, string jsonConfig,
					  bool isPublic, string thumbnailData, int? projectId = null)
		{
			int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			// Validate projectId belongs to user
			if (projectId.HasValue && projectId.Value > 0)
			{
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT ProjectId FROM dbo.UiProject WHERE ProjectId = @pid AND OwnerUserId = @uid AND IsDeleted = 0";
					cmd.Parameters.AddWithValue("@pid", projectId.Value);
					cmd.Parameters.AddWithValue("@uid", uid);
					conn.Open();
					var validProjectId = cmd.ExecuteScalar();
					if (validProjectId == null)
						throw new Exception("Project không tồn tại hoặc không thuộc về bạn.");
				}
			}

			string thumbPath = null;
			if (!string.IsNullOrEmpty(thumbnailData))
			{
				thumbPath = SaveThumbnailFile(controlId, thumbnailData);
			}

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				conn.Open();

				if (controlId.HasValue)
				{
					cmd.CommandText = @"
UPDATE dbo.UiBuilderControl
SET Name = @name,
    ControlType = @type,
    JsonConfig = @json,
    IsPublic = @pub,
    ThumbnailPath = @thumb,
    ProjectId = @projectId,
    UpdatedAt = SYSDATETIME()
WHERE ControlId = @id AND OwnerUserId = @uid AND IsDeleted = 0;";

					cmd.Parameters.AddWithValue("@id", controlId.Value);
					cmd.Parameters.AddWithValue("@uid", uid);
				}
				else
				{
					cmd.CommandText = @"
INSERT INTO dbo.UiBuilderControl
    (OwnerUserId, Name, ControlType, JsonConfig, IsPublic, ThumbnailPath, ProjectId)
VALUES (@uid, @name, @type, @json, @pub, @thumb, @projectId);
SELECT CAST(SCOPE_IDENTITY() AS INT);";

					cmd.Parameters.AddWithValue("@uid", uid);
				}

				cmd.Parameters.AddWithValue("@name", name);
				cmd.Parameters.AddWithValue("@type", controlType);
				cmd.Parameters.AddWithValue("@json", jsonConfig);
				cmd.Parameters.AddWithValue("@pub", isPublic);
				cmd.Parameters.AddWithValue("@thumb",
					string.IsNullOrEmpty(thumbPath) ? (object)DBNull.Value : thumbPath);
				cmd.Parameters.AddWithValue("@projectId",
					projectId.HasValue && projectId.Value > 0 ? (object)projectId.Value : DBNull.Value);

				if (controlId.HasValue)
				{
					int rows = cmd.ExecuteNonQuery();
					if (rows == 0)
						throw new Exception("Không có quyền update control này.");
					return controlId.Value;
				}
				else
				{
					var newId = (int)cmd.ExecuteScalar();
					return newId;
				}
			}
		}

		// ========= Project Management =========
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object GetProjects()
		{
			int uid = UiAuthHelper.GetCurrentUserIdOrThrow();
			var list = new List<object>();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT p.ProjectId, p.Name, p.Description, p.CreatedAt, p.UpdatedAt,
       COUNT(c.ControlId) AS DesignCount
FROM dbo.UiProject p
LEFT JOIN dbo.UiBuilderControl c ON p.ProjectId = c.ProjectId AND c.IsDeleted = 0
WHERE p.OwnerUserId = @uid AND p.IsDeleted = 0
GROUP BY p.ProjectId, p.Name, p.Description, p.CreatedAt, p.UpdatedAt
ORDER BY p.Name;";
				cmd.Parameters.AddWithValue("@uid", uid);
				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					while (rd.Read())
					{
						list.Add(new
						{
							projectId = (int)rd["ProjectId"],
							name = (string)rd["Name"],
							description = rd["Description"] as string ?? "",
							designCount = (int)rd["DesignCount"],
							createdAt = ((DateTime)rd["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss"),
							updatedAt = rd["UpdatedAt"] != DBNull.Value ? ((DateTime)rd["UpdatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : null
						});
					}
				}
			}

			return list;
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object CreateProject(string name, string description = null)
		{
			int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			if (string.IsNullOrWhiteSpace(name))
				return new { success = false, message = "Project name is required." };

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				conn.Open();
				
				// Check for duplicate project name (case-insensitive, same user, not deleted)
				cmd.CommandText = @"
SELECT COUNT(*) FROM dbo.UiProject 
WHERE OwnerUserId = @uid AND LOWER(Name) = LOWER(@name) AND IsDeleted = 0;";
				cmd.Parameters.AddWithValue("@uid", uid);
				cmd.Parameters.AddWithValue("@name", name.Trim());
				var duplicateCount = (int)cmd.ExecuteScalar();
				
				if (duplicateCount > 0)
				{
					return new { success = false, message = "Project name already exists. Please choose a different name." };
				}

				// Insert new project
				cmd.Parameters.Clear();
				cmd.CommandText = @"
INSERT INTO dbo.UiProject (OwnerUserId, Name, Description)
VALUES (@uid, @name, @desc);
SELECT CAST(SCOPE_IDENTITY() AS INT);";
				cmd.Parameters.AddWithValue("@uid", uid);
				cmd.Parameters.AddWithValue("@name", name.Trim());
				cmd.Parameters.AddWithValue("@desc", string.IsNullOrWhiteSpace(description) ? (object)DBNull.Value : description.Trim());

				var projectId = (int)cmd.ExecuteScalar();

				return new { success = true, projectId = projectId };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object UpdateProject(int projectId, string name, string description = null)
		{
			int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			if (string.IsNullOrWhiteSpace(name))
				return new { success = false, message = "Project name is required." };

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				conn.Open();
				
				// Check if project exists and belongs to user
				cmd.CommandText = @"
SELECT Name FROM dbo.UiProject 
WHERE ProjectId = @pid AND OwnerUserId = @uid AND IsDeleted = 0;";
				cmd.Parameters.AddWithValue("@pid", projectId);
				cmd.Parameters.AddWithValue("@uid", uid);
				var currentName = cmd.ExecuteScalar() as string;
				
				if (currentName == null)
					return new { success = false, message = "Project không tồn tại hoặc không thuộc về bạn." };
				
				// If name changed, check for duplicate (excluding current project)
				if (!currentName.Equals(name.Trim(), StringComparison.OrdinalIgnoreCase))
				{
					cmd.Parameters.Clear();
					cmd.CommandText = @"
SELECT COUNT(*) FROM dbo.UiProject 
WHERE OwnerUserId = @uid AND LOWER(Name) = LOWER(@name) AND ProjectId != @pid AND IsDeleted = 0;";
					cmd.Parameters.AddWithValue("@uid", uid);
					cmd.Parameters.AddWithValue("@name", name.Trim());
					cmd.Parameters.AddWithValue("@pid", projectId);
					var duplicateCount = (int)cmd.ExecuteScalar();
					
					if (duplicateCount > 0)
					{
						return new { success = false, message = "Project name already exists. Please choose a different name." };
					}
				}

				// Update project
				cmd.Parameters.Clear();
				cmd.CommandText = @"
UPDATE dbo.UiProject
SET Name = @name, Description = @desc, UpdatedAt = SYSDATETIME()
WHERE ProjectId = @pid AND OwnerUserId = @uid AND IsDeleted = 0;";
				cmd.Parameters.AddWithValue("@pid", projectId);
				cmd.Parameters.AddWithValue("@uid", uid);
				cmd.Parameters.AddWithValue("@name", name.Trim());
				cmd.Parameters.AddWithValue("@desc", string.IsNullOrWhiteSpace(description) ? (object)DBNull.Value : description.Trim());

				int rows = cmd.ExecuteNonQuery();
				if (rows == 0)
					return new { success = false, message = "Project không tồn tại hoặc không thuộc về bạn." };

				return new { success = true };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object DeleteProject(int projectId)
		{
			int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				conn.Open();
				using (var tran = conn.BeginTransaction())
				{
					try
					{
						cmd.Transaction = tran;

						// Check if project exists and belongs to user
						cmd.CommandText = "SELECT ProjectId FROM dbo.UiProject WHERE ProjectId = @pid AND OwnerUserId = @uid AND IsDeleted = 0";
						cmd.Parameters.AddWithValue("@pid", projectId);
						cmd.Parameters.AddWithValue("@uid", uid);
						var exists = cmd.ExecuteScalar();
						if (exists == null)
						{
							tran.Rollback();
							return new { success = false, message = "Project không tồn tại hoặc không thuộc về bạn." };
						}

						// Move designs to "Uncategorized" project
						cmd.Parameters.Clear();
						cmd.CommandText = @"
DECLARE @uncatId INT;
SELECT @uncatId = ProjectId FROM dbo.UiProject WHERE OwnerUserId = @uid AND Name = N'Uncategorized' AND IsDeleted = 0;

UPDATE dbo.UiBuilderControl
SET ProjectId = @uncatId
WHERE ProjectId = @pid AND OwnerUserId = @uid AND IsDeleted = 0;";
						cmd.Parameters.AddWithValue("@pid", projectId);
						cmd.Parameters.AddWithValue("@uid", uid);
						cmd.ExecuteNonQuery();

						// Delete project (soft delete)
						cmd.Parameters.Clear();
						cmd.CommandText = "UPDATE dbo.UiProject SET IsDeleted = 1, UpdatedAt = SYSDATETIME() WHERE ProjectId = @pid AND OwnerUserId = @uid";
						cmd.Parameters.AddWithValue("@pid", projectId);
						cmd.Parameters.AddWithValue("@uid", uid);
						cmd.ExecuteNonQuery();

						tran.Commit();
						return new { success = true };
					}
					catch (Exception ex)
					{
						tran.Rollback();
						return new { success = false, message = ex.Message };
					}
				}
			}
		}

		// 3.x. Xoá 1 control (template hoặc page) của user
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static void DeleteControl(int controlId)
		{
			int uid = CurrentUserId;

			using (var conn = new SqlConnection(ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
UPDATE dbo.UiBuilderControl
   SET IsDeleted = 1,
       UpdatedAt = SYSDATETIME()
 WHERE ControlId = @id
   AND OwnerUserId = @uid;";

				cmd.Parameters.AddWithValue("@id", controlId);
				cmd.Parameters.AddWithValue("@uid", uid);

				conn.Open();
				cmd.ExecuteNonQuery();
			}
		}





		// 3.4. Clone từ bản public (user khác)
		[WebMethod]
		public static int CloneControl(int sourceControlId, string newName)
		{
			var uid = CurrentUserId;
			using (var conn = new SqlConnection(ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
INSERT INTO dbo.UiBuilderControl
    (OwnerUserId, Name, ControlType, JsonConfig,
     IsPublic, OriginalControlId)
SELECT
    @uid,
    @name,
    c.ControlType,
    c.JsonConfig,
    0,                      -- clone mặc định private
    c.ControlId
FROM dbo.UiBuilderControl c
WHERE c.ControlId = @src AND c.IsDeleted = 0 AND c.IsPublic = 1;

SELECT SCOPE_IDENTITY();";
				cmd.Parameters.AddWithValue("@uid", uid);
				cmd.Parameters.AddWithValue("@name", newName);
				cmd.Parameters.AddWithValue("@src", sourceControlId);

				conn.Open();
				var id = cmd.ExecuteScalar();
				return Convert.ToInt32(id);
			}
		}
	}
}
