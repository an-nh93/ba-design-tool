using System;
using System.Data.SqlClient;
using System.Web.Script.Services;
using System.Web.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers;

namespace BADesign.Pages
{
    public partial class TemplateRequests : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!IsPostBack)
            {
                ucBaSidebar.ActiveSection = "TemplateRequests";
                ucBaTopBar.PageTitle = "Mẫu UI dùng chung";
            }
        }

        private static object Failure(Exception ex)
        {
            var sql = ex as SqlException;
            if (UiTemplateLibrary.IsMissingSchema(sql)) return new { success = false, message = UiTemplateLibrary.MissingSchemaMessage };
            AppLogger.Log("TemplateRequests failed", ex);
            return new { success = false, message = "Không thực hiện được. Hãy thử lại hoặc xem log của ứng dụng." };
        }

        private static object Result(TemplateActionResult result)
        {
            return new { success = result.Success, message = result.Message, status = result.Status };
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ListRequests(string scope)
        {
            try
            {
                UiAuthHelper.GetCurrentUserIdOrThrow();
                return new
                {
                    success = true,
                    list = UiTemplateLibrary.ListRequests(scope),
                    todo = UiTemplateLibrary.CountTodo(),
                    isAdmin = UiTemplateLibrary.IsAdmin(),
                    canBuild = UiTemplateLibrary.CanUseBuilder()
                };
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetRequest(int requestId)
        {
            try
            {
                UiAuthHelper.GetCurrentUserIdOrThrow();
                var info = UiTemplateLibrary.GetRequest(requestId, false);
                if (info == null) return new { success = false, message = "Không tìm thấy yêu cầu, hoặc bạn không được xem yêu cầu này." };
                return new { success = true, request = info };
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object CancelRequest(int requestId)
        {
            try
            {
                return Result(UiTemplateLibrary.Cancel(requestId));
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object RemoveFromLibrary(int requestId)
        {
            try
            {
                return Result(UiTemplateLibrary.RemoveFromLibrary(requestId));
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }
    }
}
