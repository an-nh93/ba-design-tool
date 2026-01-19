using System;
using System.Configuration;
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
	}
}
