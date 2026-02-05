using System;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class LeaveManager : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!UiAuthHelper.IsSuperAdmin)
            {
                Response.Redirect(ResolveUrl(UiAuthHelper.GetHomeUrlByRole()));
                return;
            }
        }
    }
}
