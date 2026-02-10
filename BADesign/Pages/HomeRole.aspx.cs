using System;
using System.Data.SqlClient;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
	public partial class HomeRole : Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();
			
			var roleCode = (UiAuthHelper.GetCurrentUserRoleCode() ?? "").Trim();
			var roleUpper = roleCode.Length > 0 ? roleCode.ToUpperInvariant() : "";
			var userName = (string)Session["UiUserName"] ?? "";

			if (!IsPostBack)
			{
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
						if (!string.IsNullOrEmpty(userName))
							litUserInitial.Text = userName.Substring(0, 1).ToUpper();
					}
				}

				// Set user info
				litUserName.Text = userName;

				// Role badge (so sánh không phân biệt hoa thường)
				var roleName = roleUpper == "DEV" ? "Developer" :
				               (roleUpper == "CONS" ? "Consultant" :
				               (roleUpper == "BA" ? "Business Analyst" : (roleCode.Length > 0 ? roleCode : "User")));
				litRoleBadge.Text = $"<span class=\"ba-role-badge\">{roleName}</span>";

				// Page title and welcome based on role. Không redirect Home để tránh loop (BA/CONS/DEV hoặc không có role đều ở HomeRole).
				if (roleUpper == "DEV")
				{
					litPageTitle.Text = "Developer Home";
					litWelcomeTitle.Text = "Chào mừng Developer";
					litWelcomeDesc.Text = "Trang chủ dành cho Developer. Bạn có thể sử dụng các công cụ HR Helper để hỗ trợ cho công việc tại Cadena.";
				}
				else if (roleUpper == "CONS")
				{
					litPageTitle.Text = "Consultant Home";
					litWelcomeTitle.Text = "Chào mừng Consultant";
					litWelcomeDesc.Text = "Trang chủ dành cho Consultant. Bạn có thể sử dụng HR Helper để hỗ trợ cho công việc tại Cadena.";
				}
				else if (roleUpper == "QC")
				{
					litPageTitle.Text = "Quality Control Home";
					litWelcomeTitle.Text = "Chào mừng Quality Control";
					litWelcomeDesc.Text = "Trang chủ dành cho Quality Control. Bạn có thể sử dụng HR Helper để hỗ trợ cho công việc tại Cadena.";
				}
				else if (roleUpper == "BA")
				{
					litPageTitle.Text = "Business Analyst Home";
					litWelcomeTitle.Text = "Chào mừng Business Analyst";
					litWelcomeDesc.Text = "Trang chủ dành cho Business Analyst. Bạn có thể sử dụng UI Builder để thiết kế giao diện và HR Helper để hỗ trợ cho công việc tại Cadena.";
				}
				else
				{
					litPageTitle.Text = "Home";
					litWelcomeTitle.Text = "Chào mừng";
					litWelcomeDesc.Text = "Bạn chưa được gán role (BA/CONS/DEV). Liên hệ Super Admin để được cấp quyền.";
				}

				phNavEncryptDecrypt.Visible = UiAuthHelper.HasFeature("EncryptDecrypt");
				phFeatureEncryptDecrypt.Visible = UiAuthHelper.HasFeature("EncryptDecrypt");
				lnkNavUIBuilder.Visible = UiAuthHelper.HasFeature("UIBuilder");
				lnkNavDatabaseSearch.Visible = UiAuthHelper.HasFeature("DatabaseSearch");
				lnkFeatureUIBuilder.Visible = UiAuthHelper.HasFeature("UIBuilder");
				lnkFeatureDbSearch.Visible = UiAuthHelper.HasFeature("DatabaseSearch");
				phNavSuperAdmin.Visible = UiAuthHelper.IsSuperAdmin;
				phSuperAdminCards.Visible = UiAuthHelper.IsSuperAdmin;
				phNavAppSettings.Visible = UiAuthHelper.HasFeature("Settings");
				phFeatureAppSettings.Visible = UiAuthHelper.HasFeature("Settings");
				phNoFeatures.Visible = !UiAuthHelper.IsSuperAdmin && !UiAuthHelper.HasFeature("UIBuilder") && !UiAuthHelper.HasFeature("DatabaseSearch") && !UiAuthHelper.HasFeature("EncryptDecrypt") && !UiAuthHelper.HasFeature("PGPTool") && !UiAuthHelper.HasFeature("Settings");
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
SELECT u.UserId, u.UserName, ISNULL(u.FullName, '') AS FullName, 
       ISNULL(u.Email, '') AS Email, ISNULL(u.AvatarPath, '') AS AvatarPath,
       u.IsSuperAdmin, u.IsActive, ISNULL(r.Code, '') AS RoleCode
FROM UiUser u
LEFT JOIN UiRole r ON r.RoleId = u.RoleId
WHERE u.UserId = @id";
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					using (var rd = cmd.ExecuteReader())
					{
						if (rd.Read())
						{
							var fullName = rd["FullName"].ToString();
							var email = rd["Email"].ToString();
							var avatarPath = rd["AvatarPath"].ToString();
							var roleCode = rd["RoleCode"].ToString();
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
								isActive = (bool)rd["IsActive"],
								roleCode = roleCode
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

				return new { success = true, message = "Password changed successfully." };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}
	}
}
