using System;

namespace UiBuilderFull.Admin
{
	public partial class AccessDenied : System.Web.UI.Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			try
			{
				if (lnkHome != null)
					lnkHome.NavigateUrl = ResolveUrl("~/HomeRole");
			}
			catch { /* bỏ qua */ }
		}
	}
}
