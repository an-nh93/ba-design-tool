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
            // Trang chủ mặc định: chưa đăng nhập → hiển thị Login nhưng giữ URL (domain:port), đã đăng nhập → redirect trang chủ theo role.
            if (UiAuthHelper.IsAnonymous)
            {
                Server.Transfer("~/Pages/Login.aspx", false);
                return;
            }
            var homeUrl = UiAuthHelper.GetHomeUrlByRole() ?? "~/Pages/Home.aspx";
            Response.Redirect(ResolveUrl(homeUrl));
        }
    }
}