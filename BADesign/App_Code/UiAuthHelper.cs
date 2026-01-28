using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace BADesign
{
	public static class UiAuthHelper
	{
		public static string ConnStr
			=> ConfigurationManager.ConnectionStrings["UiBuilderDb"].ConnectionString;

		public static string HashPassword(string plain)
		{
			using (var sha = SHA256.Create())
			{
				var bytes = Encoding.UTF8.GetBytes(plain);
				var hash = sha.ComputeHash(bytes);
				return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
			}
		}

		/// <summary>
		/// Dùng trong WebMethod / Ajax – nếu chưa login thì quăng lỗi.
		/// </summary>
		public static int GetCurrentUserIdOrThrow()
		{
			var ctx = HttpContext.Current;
			if (ctx == null)
				throw new InvalidOperationException("Authentication failed: HttpContext.Current is null.");

			if (ctx.Session == null)
				throw new InvalidOperationException("Authentication failed: Session is null.");

			var obj = ctx.Session["UiUserId"];
			if (obj == null)
				throw new InvalidOperationException("Authentication failed: Session['UiUserId'] is null.");

			return (int)obj;
		}

		/// <summary>
		/// Dùng trong Page_Load – nếu chưa login thì redirect về Login.
		/// </summary>
		public static void RequireLogin()
		{
			var ctx = HttpContext.Current;
			if (ctx == null) return;

			if (ctx.Session == null || ctx.Session["UiUserId"] == null)
			{
				// URL sẽ quay lại sau khi login
				// (giữ nguyên RawUrl cũng được, nó chỉ nằm trong query string)
				var returnUrl = ctx.Request.RawUrl ?? "~/DesignerHome";

				// Dùng route friendly: "Login" -> ~/Pages/Login.aspx
				var url = "~/Login?returnUrl=" + HttpUtility.UrlEncode(returnUrl);

				// Chuyển sang URL friendly (không .aspx)
				ctx.Response.Redirect(VirtualPathUtility.ToAbsolute(url), true);
			}
		}


		// === Wrapper cũ cho code đang dùng ===
		public static int? CurrentUserId
		{
			get
			{
				var ctx = HttpContext.Current;
				if (ctx == null || ctx.Session == null)
					return null;

				var obj = ctx.Session["UiUserId"];
				if (obj == null)
					return null;

				return (int)obj;
			}
		}

		public static bool IsSuperAdmin
		{
			get
			{
				var ctx = HttpContext.Current;
				if (ctx == null || ctx.Session == null)
					return false;

				var obj = ctx.Session["IsSuperAdmin"];
				if (obj == null)
					return false;

				return (bool)obj;
			}
		}

		/// <summary>True khi chưa đăng nhập (dùng Database Search reset password).</summary>
		public static bool IsAnonymous
		{
			get { return CurrentUserId == null; }
		}

		public static int? GetCurrentUserRoleId()
		{
			var ctx = HttpContext.Current;
			if (ctx?.Session == null) return null;
			var obj = ctx.Session["UiRoleId"];
			return obj != null ? (int?)obj : null;
		}

		public static string GetCurrentUserRoleCode()
		{
			var ctx = HttpContext.Current;
			if (ctx?.Session == null) return null;
			return ctx.Session["UiRoleCode"] as string;
		}

		/// <summary>Quyền hiệu lực = Role permissions ∪ User extra permissions. SuperAdmin không dùng bảng.</summary>
		public static HashSet<string> GetEffectivePermissionCodesForUser(int userId)
		{
			var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
			using (var conn = new SqlConnection(ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT p.Code FROM UiPermission p
INNER JOIN UiRolePermission rp ON rp.PermissionId = p.PermissionId
INNER JOIN UiUser u ON u.RoleId = rp.RoleId
WHERE u.UserId = @uid
UNION
SELECT p.Code FROM UiPermission p
INNER JOIN UiUserPermission up ON up.PermissionId = p.PermissionId
WHERE up.UserId = @uid";
				cmd.Parameters.AddWithValue("@uid", userId);
				conn.Open();
				using (var r = cmd.ExecuteReader())
				{
					while (r.Read())
						codes.Add(r.GetString(0));
				}
			}
			return codes;
		}

		/// <summary>Kiểm tra user hiện tại có quyền dùng tính năng. SuperAdmin có tất cả. Còn lại xem DB (role + user permissions).</summary>
		public static bool HasFeature(string featureCode)
		{
			if (IsAnonymous) return false;
			if (IsSuperAdmin) return true;
			if (featureCode == "UserManagement") return false;
			var userId = CurrentUserId;
			if (!userId.HasValue) return false;
			var codes = GetEffectivePermissionCodesForUser(userId.Value);
			if (featureCode == "Builder") return codes.Contains("UIBuilder");
			return codes.Contains(featureCode);
		}

		/// <summary>Trang chủ: Anonymous→DesignerHome; SuperAdmin/BA/CONS/DEV→HomeRole.</summary>
		public static string GetHomeUrlByRole()
		{
			if (IsAnonymous) return "~/DesignerHome";
			return "~/HomeRole";
		}
	}
}
