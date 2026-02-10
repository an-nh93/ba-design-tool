using System.Web.Routing;
using Microsoft.AspNet.FriendlyUrls;

namespace BADesign
{
	public static class RouteConfig
	{
		public static void RegisterRoutes(RouteCollection routes)
		{
			// 1. Friendly URLs (ẩn .aspx cho các trang hiện có, ví dụ /Pages/Login)
			var settings = new FriendlyUrlSettings();
			settings.AutoRedirectMode = RedirectMode.Off;
			routes.EnableFriendlyUrls(settings);

			// 2. Route riêng cho Login: /Login -> ~/Pages/Login.aspx
			routes.MapPageRoute(
				"LoginRoute",          // tên route
				"Login",               // URL user gõ
				"~/Pages/Login.aspx"   // file thật
			);

			// 3. Route cho DesignerHome (nếu cần): /DesignerHome -> ~/Pages/DesignerHome.aspx
			routes.MapPageRoute(
				"DesignerHomeRoute",
				"DesignerHome",
				"~/Pages/DesignerHome.aspx"
			);

			// 4. Route mặc định: / -> DesignerHome (anonymous: minimal; logged-in: full, role-based)
			routes.MapPageRoute(
				"DefaultRoute",
				"",
				"~/Pages/DesignerHome.aspx"
			);

			// /Builder => ~/Pages/Builder.aspx   (query string giữ nguyên)
			// Lưu ý: Route này chỉ áp dụng cho /Builder, không chặn /Pages/Builder.aspx
			routes.MapPageRoute(
				"BuilderRoute",
				"Builder",
				"~/Pages/Builder.aspx"
			);

			routes.MapPageRoute(
				"UsersRoute",
				"Users",
				"~/Pages/Users.aspx"
			);

			routes.MapPageRoute(
				"ChangePasswordRoute",
				"ChangePassword",
				"~/Pages/ChangePassword.aspx"
			);

			routes.MapPageRoute(
				"AccountSettingsRoute",
				"AccountSettings",
				"~/Pages/AccountSettings.aspx"
			);

			// Alias for Account/Manage
			routes.MapPageRoute(
				"AccountManageRoute",
				"Account/Manage",
				"~/Pages/AccountSettings.aspx"
			);

			// Alias for Account/ManagePassword
			routes.MapPageRoute(
				"AccountManagePasswordRoute",
				"Account/ManagePassword",
				"~/Pages/ChangePassword.aspx"
			);

			routes.MapPageRoute(
				"DatabaseSearchRoute",
				"DatabaseSearch",
				"~/Pages/DatabaseSearch.aspx"
			);

			routes.MapPageRoute(
				"HRHelperRoute",
				"HRHelper",
				"~/Pages/HRHelper.aspx"
			);

			routes.MapPageRoute(
				"HomeRoleRoute",
				"HomeRole",
				"~/Pages/HomeRole.aspx"
			);

			routes.MapPageRoute(
				"RolePermissionRoute",
				"RolePermission",
				"~/Pages/RolePermission.aspx"
			);

			routes.MapPageRoute(
				"EncryptDecryptRoute",
				"EncryptDecrypt",
				"~/Pages/EncryptDecrypt.aspx"
			);

			routes.MapPageRoute(
				"LeaveManagerRoute",
				"LeaveManager",
				"~/Pages/LeaveManager.aspx"
			);

			routes.MapPageRoute(
				"PgpToolRoute",
				"PgpTool",
				"~/Pages/PgpTool.aspx"
			);

			routes.MapPageRoute(
				"AppSettingsRoute",
				"AppSettings",
				"~/Pages/AppSettings.aspx"
			);
		}
	}
}
