using System;
using System.Web;
using System.Web.SessionState;
using System.Data.SqlClient;
using System.IO;
using BADesign;

namespace BADesign.Handlers
{
	public class RemoveAvatar : IHttpHandler, IRequiresSessionState
	{
		public void ProcessRequest(HttpContext context)
		{
			context.Response.ContentType = "application/json";

			try
			{
				var userIdObj = context.Session["UiUserId"];
				if (userIdObj == null)
				{
					context.Response.Write("{\"success\":false,\"message\":\"Not authenticated.\"}");
					return;
				}

				var userId = (int)userIdObj;
				string oldPath = null;
				string userName = null;

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT AvatarPath, FullName, UserName FROM UiUser WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					using (var rd = cmd.ExecuteReader())
					{
						if (rd.Read())
						{
							oldPath = rd["AvatarPath"] as string;
							userName = (rd["FullName"] as string) ?? (rd["UserName"] as string) ?? "";
						}
					}
				}

				if (!string.IsNullOrEmpty(oldPath))
				{
					var oldPhysicalPath = context.Server.MapPath(oldPath);
					if (File.Exists(oldPhysicalPath))
					{
						try { File.Delete(oldPhysicalPath); } catch { }
					}
				}

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "UPDATE UiUser SET AvatarPath = NULL WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					cmd.ExecuteNonQuery();
				}

				var initial = !string.IsNullOrEmpty(userName) ? userName.Substring(0, 1).ToUpperInvariant() : "";
				context.Response.Write($"{{\"success\":true,\"userName\":\"{HttpUtility.JavaScriptStringEncode(userName ?? "")}\",\"initial\":\"{HttpUtility.JavaScriptStringEncode(initial)}\"}}");
			}
			catch (Exception ex)
			{
				context.Response.Write($"{{\"success\":false,\"message\":\"{HttpUtility.JavaScriptStringEncode(ex.Message)}\"}}");
			}
		}

		public bool IsReusable
		{
			get { return false; }
		}
	}
}
