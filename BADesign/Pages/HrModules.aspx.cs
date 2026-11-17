using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web.Script.Services;
using System.Web.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers;

namespace BADesign.Pages
{
    public partial class HrModules : Page
    {
        private const string DeniedMessage = "Bạn không có quyền quản lý phân hệ HR.";

        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!UiHrModules.CanManage())
            {
                Response.Redirect(ResolveUrl("~/AccessDenied"), true);
                return;
            }
            if (!IsPostBack)
            {
                ucBaSidebar.ActiveSection = "HrModules";
                ucBaTopBar.PageTitle = "Phân hệ HR";
            }
        }

        private static object Failure(Exception ex)
        {
            if (UiHrModules.IsMissingSchema(ex as SqlException)) return new { success = false, message = UiHrModules.MissingSchemaMessage };
            AppLogger.Log("HrModules failed", ex);
            return new { success = false, message = "Không thực hiện được. Hãy thử lại hoặc xem log của ứng dụng." };
        }

        private static object Answer(HrModuleResult result)
        {
            return new { success = result.Success, message = result.Message, moduleId = result.ModuleId };
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadAll()
        {
            try
            {
                UiAuthHelper.GetCurrentUserIdOrThrow();
                if (!UiHrModules.CanManage()) return new { success = false, message = DeniedMessage };
                var screens = StandardScreenLibrary.List(StandardScreenLibrary.DefaultFolder);
                var templates = UiTemplateLibrary.ListRequests("library");
                return new
                {
                    success = true,
                    modules = UiHrModules.ListAll(),
                    items = UiHrModules.Assignments(screens, templates)
                };
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveModule(int moduleId, string name, bool isActive)
        {
            try
            {
                return Answer(UiHrModules.Save(moduleId, name, isActive));
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ReorderModules(List<int> moduleIds)
        {
            try
            {
                return Answer(UiHrModules.Reorder(moduleIds));
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DeleteModule(int moduleId)
        {
            try
            {
                return Answer(UiHrModules.Delete(moduleId));
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object Assign(string kind, string key, int moduleId)
        {
            try
            {
                int? module = moduleId > 0 ? moduleId : (int?)null;
                if (kind == UiHrModules.KindScreen)
                    return Answer(UiHrModules.AssignScreen(StandardScreenLibrary.DefaultFolder, key, module));
                int requestId;
                if (kind == UiHrModules.KindTemplate && int.TryParse(key, out requestId))
                    return Answer(UiHrModules.AssignTemplate(requestId, module));
                return new { success = false, message = "Không tìm thấy màn hình này." };
            }
            catch (Exception ex)
            {
                return Failure(ex);
            }
        }
    }
}
