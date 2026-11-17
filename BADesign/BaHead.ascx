<%@ Control Language="C#" ClassName="BaHead" %>
<script runat="server">
    private bool _bootstrapScript = true;

    public bool BootstrapScript
    {
        get { return _bootstrapScript; }
        set { _bootstrapScript = value; }
    }

    protected string Asset(string path, params string[] related)
    {
        var url = ResolveUrl(path);
        try
        {
            var stamp = System.IO.File.GetLastWriteTimeUtc(Server.MapPath(path));
            foreach (var other in related)
            {
                var otherStamp = System.IO.File.GetLastWriteTimeUtc(Server.MapPath(other));
                if (otherStamp > stamp) stamp = otherStamp;
            }
            return url + "?v=" + stamp.Ticks.ToString("x");
        }
        catch (Exception)
        {
            return url;
        }
    }
</script>
<link rel="stylesheet" href="<%= Asset("~/Content/bootstrap.min.css") %>" />
<link rel="stylesheet" href="<%= Asset("~/Content/ba-layout.css") %>" />
<link rel="stylesheet" href="<%= Asset("~/Content/ba-notification-bell.css") %>" />
<script src="<%= Asset("~/Scripts/jquery-1.10.2.min.js") %>"></script>
<script src="<%= Asset("~/Scripts/ba-i18n.js", "~/Scripts/i18n/ba-i18n.en.js") %>"></script>
<script src="<%= Asset("~/Scripts/ba-toast.js") %>"></script>
<script src="<%= Asset("~/Scripts/jquery.signalR.min.js") %>"></script>
<script src="<%= Asset("~/Scripts/ba-signalr.js") %>"></script>
<% if (BootstrapScript) { %><script src="<%= Asset("~/Scripts/bootstrap.min.js") %>"></script>
<% } %><script src="<%= Asset("~/Scripts/ba-layout.js") %>"></script>
<script src="<%= Asset("~/Scripts/ba-notification-jobs.js") %>"></script>
<script src="<%= Asset("~/Scripts/ba-notification-detail.js") %>"></script>
<script src="<%= Asset("~/Scripts/ba-job-progress.js") %>"></script>
<script src="<%= Asset("~/Scripts/ba-notification-bell.js") %>"></script>
