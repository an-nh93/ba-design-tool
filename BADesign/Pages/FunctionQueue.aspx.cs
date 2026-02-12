using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    /// <summary>Trang Function Queue: xem job nền (Restore, Backup, Update User/Employee/Other), lịch sử, hủy job (chỉ người tạo).</summary>
    public partial class FunctionQueue : Page
    {
        protected void Page_Load(object sender, System.EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            ucBaSidebar.ActiveSection = "FunctionQueue";
            ucBaTopBar.PageTitle = "Function Queue";
        }
    }
}
