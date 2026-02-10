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
				var returnUrl = ctx.Request.RawUrl ?? "~/Home";

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

		/// <summary>Trang chủ: Anonymous→/Home; Logged-in→HomeRole.</summary>
		public static string GetHomeUrlByRole()
		{
			if (IsAnonymous) return "~/Home";
			return "~/HomeRole";
		}

		// === Remember Me (cookie 30 ngày) ===
		private const string RememberCookieName = "UiRemember";
		private const int RememberDays = 30;

		private static byte[] GetRememberMeSecret()
		{
			var key = ConfigurationManager.AppSettings["RememberMeSecret"];
			if (string.IsNullOrEmpty(key)) key = "BADesign-UiRemember-DefaultKey-ChangeInProduction";
			return Encoding.UTF8.GetBytes(key);
		}

		/// <summary>Tạo cookie Remember Me khi đăng nhập thành công (chọn Remember me).</summary>
		public static void SetRememberMeCookie(int userId)
		{
			var ctx = HttpContext.Current;
			if (ctx?.Response == null) return;

			var expiry = DateTime.UtcNow.AddDays(RememberDays);
			var expiryUnix = ((DateTimeOffset)expiry).ToUnixTimeSeconds().ToString();
			var payload = userId + "." + expiryUnix;
			var sig = ComputeRememberSignature(payload);
			var value = payload + "." + sig;

			var cookie = new HttpCookie(RememberCookieName, value)
			{
				Expires = expiry.ToLocalTime(),
				HttpOnly = true,
				Secure = ctx.Request.IsSecureConnection
			};
			ctx.Response.Cookies.Set(cookie);
		}

		/// <summary>Xóa cookie Remember Me (khi đăng xuất).</summary>
		public static void ClearRememberMeCookie()
		{
			var ctx = HttpContext.Current;
			if (ctx?.Response != null)
			{
				var cookie = new HttpCookie(RememberCookieName) { Expires = DateTime.Now.AddYears(-1) };
				ctx.Response.Cookies.Set(cookie);
			}
		}

		/// <summary>Đọc cookie Remember Me, verify chữ ký và hạn dùng. Trả về userId nếu hợp lệ.</summary>
		public static int? TryRestoreFromRememberCookie()
		{
			var ctx = HttpContext.Current;
			if (ctx == null || ctx.Session == null) return null;
			if (ctx.Session["UiUserId"] != null) return null; // Đã login rồi

			var cookie = ctx.Request.Cookies[RememberCookieName];
			if (cookie == null || string.IsNullOrEmpty(cookie.Value)) return null;

			var parts = cookie.Value.Split('.');
			if (parts.Length != 3) return null;

			var payload = parts[0] + "." + parts[1];
			if (ComputeRememberSignature(payload) != parts[2]) return null;

			long expiryUnix;
			if (!long.TryParse(parts[1], out expiryUnix)) return null;
			var expiry = DateTimeOffset.FromUnixTimeSeconds(expiryUnix);
			if (DateTimeOffset.UtcNow > expiry) return null;

			int userId;
			if (!int.TryParse(parts[0], out userId) || userId <= 0) return null;
			return userId;
		}

		private static string ComputeRememberSignature(string payload)
		{
			using (var hmac = new HMACSHA256(GetRememberMeSecret()))
			{
				var bytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
				return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
			}
		}

		/// <summary>Load user từ DB vào Session (sau khi restore từ Remember cookie).</summary>
		public static void RestoreSessionFromUserId(int userId)
		{
			var ctx = HttpContext.Current;
			if (ctx?.Session == null) return;

			using (var conn = new SqlConnection(ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT u.UserId, u.UserName, u.IsSuperAdmin, u.IsActive, u.RoleId, r.Code AS RoleCode
FROM UiUser u
LEFT JOIN UiRole r ON r.RoleId = u.RoleId
WHERE u.UserId = @id";
				cmd.Parameters.AddWithValue("@id", userId);
				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					if (!rd.Read()) return;
					if (!(bool)rd["IsActive"]) return; // Tài khoản bị khóa

					ctx.Session["UiUserId"] = (int)rd["UserId"];
					ctx.Session["UiUserName"] = (string)rd["UserName"];
					ctx.Session["IsSuperAdmin"] = (bool)rd["IsSuperAdmin"];
					ctx.Session["UiRoleId"] = rd["RoleId"] != DBNull.Value && rd["RoleId"] != null ? (object)(int)rd["RoleId"] : null;
					ctx.Session["UiRoleCode"] = rd["RoleCode"] != DBNull.Value && rd["RoleCode"] != null ? (rd["RoleCode"] as string) : null;
				}
			}
		}
	}
}
