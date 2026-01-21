using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web.UI;
using BADesign;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;

namespace BADesign.Pages
{
	public partial class DesignerHome : Page
	{
		class DesignRow
		{
			public int ControlId { get; set; }
			public string Name { get; set; }
			public string ControlType { get; set; }
			public bool IsPublic { get; set; }
			public DateTime UpdatedAt { get; set; }
			public string ThumbnailUrl { get; set; }
			public string EditUrl { get; set; }
			public string CloneUrl { get; set; }
			public string OwnerName { get; set; }   // only for public
		}

		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();
			if (!IsPostBack)
			{
				var userName = (string)Session["UiUserName"] ?? "";
				litUserName.Text = userName;
				
				// Load avatar
				var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT AvatarPath FROM UiUser WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					var avatarPath = cmd.ExecuteScalar() as string;
					if (!string.IsNullOrEmpty(avatarPath))
					{
						litUserInitial.Text = $"<img src=\"{VirtualPathUtility.ToAbsolute(avatarPath)}\" style=\"width: 100%; height: 100%; object-fit: cover; border-radius: 50%;\" />";
					}
					else
					{
						// Set user initial for avatar
						if (!string.IsNullOrEmpty(userName))
						{
							litUserInitial.Text = userName.Substring(0, 1).ToUpper();
						}
					}
				}
				
				lnkUserManagement.Visible = UiAuthHelper.IsSuperAdmin;

				BindMyDesigns();
				BindPublicDesigns();
			}
		}

		private void BindMyDesigns()
		{
			var list = new List<DesignRow>();
			var uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT ControlId, Name, ControlType, IsPublic,
       ISNULL(UpdatedAt, CreatedAt) AS UpdatedAt,
       ThumbnailPath
FROM dbo.UiBuilderControl
WHERE IsDeleted = 0 AND OwnerUserId = @uid
ORDER BY ISNULL(UpdatedAt, CreatedAt) DESC, ControlId DESC;";

				cmd.Parameters.AddWithValue("@uid", uid);
				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					while (rd.Read())
					{
						var id = (int)rd["ControlId"];
						var thumb = rd["ThumbnailPath"] as string;
						if (string.IsNullOrEmpty(thumb))
							thumb = ResolveUrl("~/Content/images/no-thumb.png");

						list.Add(new DesignRow
						{
							ControlId = id,
							Name = (string)rd["Name"],
							ControlType = (string)rd["ControlType"],
							IsPublic = (bool)rd["IsPublic"],
							UpdatedAt = (DateTime)rd["UpdatedAt"],
							ThumbnailUrl = thumb,
							EditUrl = ResolveUrl("~/Builder?controlId=" + id)
						});
					}
				}
			}

			rpMyDesigns.DataSource = list;
			rpMyDesigns.DataBind();
		}

		private void BindPublicDesigns()
		{
			var list = new List<DesignRow>();
			var uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT c.ControlId, c.Name, c.ControlType, c.IsPublic,
       ISNULL(c.UpdatedAt, c.CreatedAt) AS UpdatedAt,
       c.ThumbnailPath,
       u.UserName
FROM dbo.UiBuilderControl c
JOIN dbo.UiUser u ON c.OwnerUserId = u.UserId
WHERE c.IsDeleted = 0
  AND c.IsPublic   = 1          -- CHỈ CÒN ĐIỀU KIỆN NÀY
ORDER BY ISNULL(c.UpdatedAt, c.CreatedAt) DESC, c.ControlId DESC;";

				// nếu không dùng uid nữa thì bỏ dòng này:
				// cmd.Parameters.AddWithValue("@uid", uid);

				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					while (rd.Read())
					{
						var id = (int)rd["ControlId"];
						var thumb = rd["ThumbnailPath"] as string;
						if (string.IsNullOrEmpty(thumb))
							thumb = ResolveUrl("~/Content/images/no-thumb.png");

						list.Add(new DesignRow
						{
							ControlId = id,
							Name = (string)rd["Name"],
							ControlType = (string)rd["ControlType"],
							IsPublic = (bool)rd["IsPublic"],
							UpdatedAt = (DateTime)rd["UpdatedAt"],
							ThumbnailUrl = thumb,
							OwnerName = (string)rd["UserName"],
							CloneUrl = "Builder.aspx?cloneId=" + id
						});
					}
				}
			}

			rpPublicDesigns.DataSource = list;
			rpPublicDesigns.DataBind();
		}


		protected void rpMyDesigns_ItemCommand(object source,
				System.Web.UI.WebControls.RepeaterCommandEventArgs e)
		{
			if (e.CommandName == "Delete")
			{
				// Lấy Id
				int id = Convert.ToInt32(e.CommandArgument);

				// Chỉ cho xóa design của chính user hiện tại
				int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
						UPDATE dbo.UiBuilderControl
						   SET IsDeleted = 1,
							   UpdatedAt = SYSDATETIME()
						 WHERE ControlId  = @id
						   AND OwnerUserId = @uid;";
					cmd.Parameters.AddWithValue("@id", id);
					cmd.Parameters.AddWithValue("@uid", uid);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				// Rebind lại 2 lưới
				BindMyDesigns();
				BindPublicDesigns();
			}
		}


		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static void SetDesignPublic(int controlId, bool isPublic)
		{
			// đảm bảo user đã login
			UiAuthHelper.RequireLogin();
			int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
UPDATE dbo.UiBuilderControl
   SET IsPublic = @pub,
       UpdatedAt = SYSDATETIME()
 WHERE ControlId = @id
   AND OwnerUserId = @uid
   AND IsDeleted = 0;";
				cmd.Parameters.AddWithValue("@pub", isPublic);
				cmd.Parameters.AddWithValue("@id", controlId);
				cmd.Parameters.AddWithValue("@uid", uid);

			conn.Open();
			cmd.ExecuteNonQuery();
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object GetAccountInfo()
		{
			try
			{
				var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
SELECT UserId, UserName, ISNULL(FullName, '') AS FullName, 
       ISNULL(Email, '') AS Email, ISNULL(AvatarPath, '') AS AvatarPath,
       IsSuperAdmin, IsActive
FROM UiUser
WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					using (var rd = cmd.ExecuteReader())
					{
						if (rd.Read())
						{
							var fullName = rd["FullName"].ToString();
							var email = rd["Email"].ToString();
							var avatarPath = rd["AvatarPath"].ToString();
							string avatarPathAbsolute = null;
							if (!string.IsNullOrEmpty(avatarPath))
							{
								avatarPathAbsolute = VirtualPathUtility.ToAbsolute(avatarPath);
							}
							return new
							{
								success = true,
								userId = rd["UserId"].ToString(),
								userName = rd["UserName"].ToString(),
								fullName = string.IsNullOrEmpty(fullName) ? rd["UserName"].ToString() : fullName,
								fullName2 = string.IsNullOrEmpty(fullName) ? null : fullName,
								email = string.IsNullOrEmpty(email) ? null : email,
								avatarPath = avatarPathAbsolute,
								isSuperAdmin = (bool)rd["IsSuperAdmin"],
								isActive = (bool)rd["IsActive"]
							};
						}
					}
				}
				return new { success = false, message = "User not found" };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ChangePassword(string currentPassword, string newPassword)
		{
			try
			{
				var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
				var currentHash = UiAuthHelper.HashPassword(currentPassword);
				bool isValidPassword = false;

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
SELECT PasswordHash
FROM UiUser
WHERE UserId = @id AND PasswordHash = @hash";
					cmd.Parameters.AddWithValue("@id", userId);
					cmd.Parameters.AddWithValue("@hash", currentHash);

					conn.Open();
					using (var rd = cmd.ExecuteReader())
					{
						isValidPassword = rd.Read();
					}
				}

				if (!isValidPassword)
				{
					return new { success = false, message = "Current password is incorrect." };
				}

				if (string.IsNullOrEmpty(newPassword) || newPassword.Length < 6)
				{
					return new { success = false, message = "Password must be at least 6 characters." };
				}

				var newHash = UiAuthHelper.HashPassword(newPassword);

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
UPDATE UiUser 
SET PasswordHash = @hash
WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@hash", newHash);
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, message = "Password changed successfully!" };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object UploadAvatar()
		{
			try
			{
				var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
				var request = HttpContext.Current.Request;
				var file = request.Files["file"];

				if (file == null || file.ContentLength == 0)
				{
					return new { success = false, message = "No file uploaded." };
				}

				// Validate file type
				if (!file.ContentType.StartsWith("image/"))
				{
					return new { success = false, message = "File must be an image." };
				}

				// Validate file size (5MB max)
				if (file.ContentLength > 5 * 1024 * 1024)
				{
					return new { success = false, message = "Image size must be less than 5MB." };
				}

				// Create avatars folder if not exists
				var avatarsFolder = HttpContext.Current.Server.MapPath("~/Content/avatars/");
				if (!System.IO.Directory.Exists(avatarsFolder))
				{
					System.IO.Directory.CreateDirectory(avatarsFolder);
				}

				// Generate unique filename
				var extension = System.IO.Path.GetExtension(file.FileName);
				var fileName = $"avatar_{userId}_{DateTime.Now:yyyyMMddHHmmss}{extension}";
				var filePath = System.IO.Path.Combine(avatarsFolder, fileName);
				var virtualPath = $"~/Content/avatars/{fileName}";

				// Delete old avatar if exists
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT AvatarPath FROM UiUser WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					var oldPath = cmd.ExecuteScalar() as string;
					if (!string.IsNullOrEmpty(oldPath))
					{
						var oldPhysicalPath = HttpContext.Current.Server.MapPath(oldPath);
						if (System.IO.File.Exists(oldPhysicalPath))
						{
							try { System.IO.File.Delete(oldPhysicalPath); } catch { }
						}
					}
				}

				// Save new avatar
				file.SaveAs(filePath);

				// Update database
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
UPDATE UiUser 
SET AvatarPath = @path
WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@path", virtualPath);
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, avatarPath = VirtualPathUtility.ToAbsolute(virtualPath) };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}
	}
}
