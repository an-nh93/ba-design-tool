using System;
using System.Data.SqlClient;
using System.Web.Script.Services;
using System.Web.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers;

namespace BADesign.Pages
{
    public partial class TemplateWorkflow : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!UiTemplateLibrary.IsAdmin())
            {
                Response.Redirect(ResolveUrl("~/AccessDenied"), true);
                return;
            }
            if (!IsPostBack)
            {
                ucBaSidebar.ActiveSection = "TemplateWorkflow";
                ucBaTopBar.PageTitle = "Quy trình duyệt mẫu UI";
            }
        }

        private static object Failure(Exception ex)
        {
            var sql = ex as SqlException;
            if (UiTemplateLibrary.IsMissingSchema(sql)) return new { success = false, message = UiTemplateLibrary.MissingSchemaMessage };
            AppLogger.Log("TemplateWorkflow failed", ex);
            return new { success = false, message = "Không thực hiện được. Hãy thử lại hoặc xem log của ứng dụng." };
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadAll()
        {
            try
            {
                UiAuthHelper.GetCurrentUserIdOrThrow();
                if (!UiTemplateLibrary.IsAdmin()) return new { success = false, message = "Bạn không có quyền định nghĩa quy trình duyệt." };
                return new
                {
                    success = true,
                    workflows = UiTemplateLibrary.GetWorkflows(),
                    roles = UiTemplateLibrary.GetRolesWithManagers(),
                    users = UiTemplateLibrary.GetActiveUsers()
                };
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveWorkflow(TemplateWorkflowDto workflow)
        {
            try
            {
                UiAuthHelper.GetCurrentUserIdOrThrow();
                var result = UiTemplateLibrary.SaveWorkflow(workflow);
                return new { success = result.Success, message = result.Message, workflowId = result.RequestId };
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DeleteWorkflow(int workflowId)
        {
            try
            {
                UiAuthHelper.GetCurrentUserIdOrThrow();
                var result = UiTemplateLibrary.DeleteWorkflow(workflowId);
                return new { success = result.Success, message = result.Message };
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }
    }
}
