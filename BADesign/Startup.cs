using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(BADesign.Startup))]
namespace BADesign
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.MapSignalR(); // Route: /signalr, Hub: RestoreNotificationHub
            ConfigureAuth(app);
        }
    }
}
