using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web.UI;
using BADesign;
using BADesign.Helpers;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;

namespace BADesign.Pages
{
	public partial class Home : Page
	{
		private const string BuilderFeature = "Builder";

		protected void Page_Load(object sender, EventArgs e)
		{
			// Tất cả tính năng đều yêu cầu đăng nhập: không còn màn hình guest (Database Tools, PGP Tool). Chuyển thẳng sang Login.
			if (UiAuthHelper.IsAnonymous)
			{
				Response.Redirect(ResolveUrl("~/"));
				return;
			}

			UiAuthHelper.RequireLogin();

			// Home cho BA, CONS, DEV, Super Admin (có Builder). Không có quyền → HomeRole.
			if (!UiAuthHelper.HasFeature(BuilderFeature))
			{
				Response.Redirect(UiAuthHelper.GetHomeUrlByRole());
				return;
			}

			if (!IsPostBack)
			{
				ucBaSidebar.ActiveSection = "Home";
				ucBaTopBar.PageTitle = "Thiết kế giao diện";
			}
		}

		private static bool CanUseBuilder()
		{
			return !UiAuthHelper.IsAnonymous && UiAuthHelper.HasFeature(BuilderFeature);
		}

		private static object Denied()
		{
			return new { success = false, message = "Phiên đăng nhập đã hết hoặc bạn không có quyền dùng UI Builder. Hãy tải lại trang." };
		}

		private static object Failure(Exception ex)
		{
			AppLogger.Log("Home failed", ex);
			return new { success = false, message = "Không thực hiện được. Hãy thử lại hoặc xem log của ứng dụng." };
		}

		private static object Changed(bool done, string doneMessage)
		{
			return new { success = done, message = done ? doneMessage : "Không tìm thấy thiết kế, hoặc thiết kế không phải của bạn." };
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ListDesigns()
		{
			try
			{
				if (!CanUseBuilder()) return Denied();
				int uid = UiAuthHelper.GetCurrentUserIdOrThrow();
				return new { success = true, mine = UiDesignCatalog.ListMine(uid), shared = UiDesignCatalog.ListPublic(uid) };
			}
			catch (Exception ex)
			{
				return Failure(ex);
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object DeleteDesign(int controlId)
		{
			try
			{
				if (!CanUseBuilder()) return Denied();
				return Changed(UiDesignCatalog.Delete(UiAuthHelper.GetCurrentUserIdOrThrow(), controlId), "Đã xóa thiết kế.");
			}
			catch (Exception ex)
			{
				return Failure(ex);
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object SetDesignPublic(int controlId, bool isPublic)
		{
			try
			{
				if (!CanUseBuilder()) return Denied();
				return Changed(UiDesignCatalog.SetPublic(UiAuthHelper.GetCurrentUserIdOrThrow(), controlId, isPublic),
					isPublic ? "Đã chuyển thiết kế thành công khai." : "Đã chuyển thiết kế thành riêng tư.");
			}
			catch (Exception ex)
			{
				return Failure(ex);
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
