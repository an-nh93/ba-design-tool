using System;
using System.Web;

namespace BADesign.Handlers
{
    /// <summary>Poll tiến trình load employee — không dùng Session (tránh pending khi bulk load giữ session lock).</summary>
    public class EmployeeLoadProgress : IHttpHandler
    {
        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            context.Response.AddHeader("Access-Control-Allow-Origin", "*");
            try
            {
                var dbName = context.Request["dbName"] ?? "";
                int companyId = -1;
                int.TryParse(context.Request["companyID"], out companyId);
                context.Response.Write(HrEmployeeLoadProgress.ToJson(dbName, companyId));
            }
            catch (Exception ex)
            {
                context.Response.Write("{\"success\":false,\"loading\":false,\"loaded\":0,\"total\":0,\"done\":false,\"hasError\":true,\"message\":\"" +
                    HttpUtility.JavaScriptStringEncode(ex.Message) + "\",\"step\":\"\"}");
            }
        }

        public bool IsReusable { get { return true; } }
    }
}
