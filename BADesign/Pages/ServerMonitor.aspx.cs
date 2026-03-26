using System;
using System.Collections.Generic;
using System.Web;
using System.Web.Script.Services;
using System.Web.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers;

namespace BADesign.Pages
{
    /// <summary>Giám sát CPU/RAM/mạng/Docker trên máy chạy web — chỉ SuperAdmin.</summary>
    public partial class ServerMonitor : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!UiAuthHelper.IsSuperAdmin)
            {
                Response.Redirect(ResolveUrl("~/AccessDenied"), true);
                return;
            }
            ucBaSidebar.ActiveSection = "ServerMonitor";
            ucBaTopBar.PageTitle = "Server & Docker monitor";
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetMetrics()
        {
            try
            {
                if (!UiAuthHelper.IsSuperAdmin)
                    return new Dictionary<string, object> { { "success", false }, { "message", "Unauthorized." } };
                return ServerMetricsCollector.GetMetricsSnapshot();
            }
            catch (Exception ex)
            {
                return new Dictionary<string, object> { { "success", false }, { "message", ex.Message } };
            }
        }
    }
}
