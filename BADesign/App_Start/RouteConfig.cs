using System.Web.Routing;
using Microsoft.AspNet.FriendlyUrls;

namespace BADesign
{
	public static class RouteConfig
	{
		public static void RegisterRoutes(RouteCollection routes)
		{
			// MapPageRoute phải đăng ký TRƯỚC EnableFriendlyUrls, nếu không query string có thể bị mất (vd: /ChangePassword?code=xxx)
			// 1. Route riêng cho Login: /Login -> ~/Pages/Login.aspx
			routes.MapPageRoute(
				"LoginRoute",          // tên route
				"Login",               // URL user gõ
				"~/Pages/Login.aspx"   // file thật
			);

			// 3. /Home -> trang chủ (guest + logged-in có Builder)
			routes.MapPageRoute(
				"HomeRoute",
				"Home",
				"~/Pages/Home.aspx"
			);

			// 4. Route mặc định: / -> Default.aspx (khi chưa login thì Transfer sang Login, URL giữ là /)
			routes.MapPageRoute(
				"DefaultRoute",
				"",
				"~/Default.aspx"
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
				"AccessDeniedRoute",
				"AccessDenied",
				"~/Pages/AccessDenied.aspx"
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
				"RegisterRoute",
				"Register",
				"~/Pages/Register.aspx"
			);

			routes.MapPageRoute(
				"ForgotPasswordRoute",
				"ForgotPassword",
				"~/Pages/ForgotPassword.aspx"
			);

			routes.MapPageRoute(
				"AppSettingsRoute",
				"AppSettings",
				"~/Pages/AppSettings.aspx"
			);

			routes.MapPageRoute(
				"AuditLogRoute",
				"AuditLog",
				"~/Pages/AuditLog.aspx"
			);

			routes.MapPageRoute(
				"FunctionQueueRoute",
				"FunctionQueue",
				"~/Pages/FunctionQueue.aspx"
			);

			routes.MapPageRoute(
				"FeedbackRoute",
				"Feedback",
				"~/Pages/Feedback.aspx"
			);

			routes.MapPageRoute(
				"FeedbackManageRoute",
				"FeedbackManage",
				"~/Pages/FeedbackManage.aspx"
			);

			routes.MapPageRoute(
				"DevShareRoute",
				"DevShare",
				"~/Pages/DevShareList.aspx"
			);
			routes.MapPageRoute(
				"DevShareViewRoute",
				"DevShare/View/{id}",
				"~/Pages/DevShareView.aspx"
			);
			routes.MapPageRoute(
				"DevShareEditRoute",
				"DevShare/Edit/{id}",
				"~/Pages/DevShareEdit.aspx"
			);
			routes.MapPageRoute(
				"DevShareEditNewRoute",
				"DevShare/Edit",
				"~/Pages/DevShareEdit.aspx"
			);

			// Friendly URLs đăng ký SAU tất cả MapPageRoute để giữ query string
			var settings = new FriendlyUrlSettings();
			settings.AutoRedirectMode = RedirectMode.Off;
			routes.EnableFriendlyUrls(settings);
		}
	}
}
