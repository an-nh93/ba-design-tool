using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class AppSettings : Page
    {
        public bool CanEditSettings => UiAuthHelper.HasFeature("Settings");

        protected void Page_Load(object sender, System.EventArgs e)
        {
            UiAuthHelper.RequireLogin();
        }
    }
}
