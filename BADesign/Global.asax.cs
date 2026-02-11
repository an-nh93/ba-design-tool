using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Optimization;
using System.Web.Routing;
using System.Web.Security;
using System.Web.SessionState;

namespace BADesign
{
    public class Global : HttpApplication
    {
        void Application_Start(object sender, EventArgs e)
        {
            // Code that runs on application startup
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
        }

        protected void Application_BeginRequest(object sender, EventArgs e)
        {
            // Restore session từ Remember Me cookie nếu session trống
            var userId = UiAuthHelper.TryRestoreFromRememberCookie();
            if (userId.HasValue)
                UiAuthHelper.RestoreSessionFromUserId(userId.Value);
        }

        protected void Application_Error(object sender, EventArgs e)
        {
            var ex = Server.GetLastError();
            if (ex == null) return;
            AppLogger.LogApplicationError(ex, Request);
            // Không gọi Server.ClearError() để khi customErrors mode="Off" trình duyệt vẫn hiển thị lỗi chi tiết (YSOD) khi debug local.
        }
    }
}