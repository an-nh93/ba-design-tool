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

			// 4. Route mặc định: / -> ~/Pages/Login.aspx
			routes.MapPageRoute(
				"DefaultRoute",
				"",
				"~/Pages/Login.aspx"
			);

			// /Builder => ~/Pages/Builder.aspx   (query string giữ nguyên)
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
		}
	}
}
