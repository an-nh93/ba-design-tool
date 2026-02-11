using System;
using System.Linq;
using System.Web;

namespace BADesign
{
	/// <summary>Helper lấy thông tin từ Windows user đang đăng nhập (IIS Windows Auth).</summary>
	public static class WindowsAuthHelper
	{
		private const string DefaultDomain = "cadena.com.sg";

		/// <summary>Lấy email từ Windows user. VD: cadena\an.nh → an.nh@cadena.com.sg</summary>
		/// <param name="domainSuffix">Domain email, mặc định cadena.com.sg</param>
		public static string GetWindowsUserEmail(string domainSuffix = null)
		{
			var domain = domainSuffix ?? DefaultDomain;
			var logonUser = HttpContext.Current?.Request?.LogonUserIdentity?.Name;
			if (string.IsNullOrEmpty(logonUser) || !logonUser.Contains("\\"))
				return null;

			var parts = logonUser.Split('\\');
			var username = (parts.Length > 1 ? parts.Last() : logonUser).Trim();
			return string.IsNullOrEmpty(username) ? null : $"{username}@{domain}";
		}

		/// <summary>Lấy phần username (an.nh) từ Windows user.</summary>
		public static string GetWindowsUsername()
		{
			var logonUser = HttpContext.Current?.Request?.LogonUserIdentity?.Name;
			if (string.IsNullOrEmpty(logonUser) || !logonUser.Contains("\\"))
				return null;
			var parts = logonUser.Split('\\');
			return parts.Length > 1 ? parts.Last().Trim() : logonUser.Trim();
		}
	}
}
