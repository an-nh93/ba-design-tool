using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace BADesign
{
    public partial class _Default : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            // Trang chủ mặc định: chưa đăng nhập → Login; đã đăng nhập → trang chủ theo role.
            if (UiAuthHelper.IsAnonymous)
            {
                Response.Redirect(ResolveUrl("~/Pages/Login.aspx"));
                return;
            }
            var homeUrl = UiAuthHelper.GetHomeUrlByRole() ?? "~/Pages/Home.aspx";
            Response.Redirect(ResolveUrl(homeUrl));
        }
    }
}