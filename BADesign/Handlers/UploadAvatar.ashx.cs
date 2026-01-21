using System;
using System.Web;
using System.Web.SessionState;
using System.Data.SqlClient;
using BADesign;
using System.IO;

namespace BADesign.Handlers
{
	public class UploadAvatar : IHttpHandler, IRequiresSessionState
	{
		public void ProcessRequest(HttpContext context)
		{
			context.Response.ContentType = "application/json";

			try
			{
				// Check authentication
				var userIdObj = context.Session["UiUserId"];
				if (userIdObj == null)
				{
					context.Response.Write("{\"success\":false,\"message\":\"Not authenticated.\"}");
					return;
				}

				var userId = (int)userIdObj;
				var file = context.Request.Files["file"];

				if (file == null || file.ContentLength == 0)
				{
					context.Response.Write("{\"success\":false,\"message\":\"No file uploaded.\"}");
					return;
				}

				// Validate file type
				if (!file.ContentType.StartsWith("image/"))
				{
					context.Response.Write("{\"success\":false,\"message\":\"File must be an image.\"}");
					return;
				}

				// Validate file size (5MB max)
				if (file.ContentLength > 5 * 1024 * 1024)
				{
					context.Response.Write("{\"success\":false,\"message\":\"Image size must be less than 5MB.\"}");
					return;
				}

				// Create avatars folder if not exists
				var avatarsFolder = context.Server.MapPath("~/Content/avatars/");
				if (!Directory.Exists(avatarsFolder))
				{
					Directory.CreateDirectory(avatarsFolder);
				}

				// Generate unique filename
				var extension = Path.GetExtension(file.FileName);
				var fileName = $"avatar_{userId}_{DateTime.Now:yyyyMMddHHmmss}{extension}";
				var filePath = Path.Combine(avatarsFolder, fileName);
				var virtualPath = $"~/Content/avatars/{fileName}";

				// Delete old avatar if exists
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT AvatarPath FROM UiUser WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					var oldPath = cmd.ExecuteScalar() as string;
					if (!string.IsNullOrEmpty(oldPath))
					{
						var oldPhysicalPath = context.Server.MapPath(oldPath);
						if (File.Exists(oldPhysicalPath))
						{
							try { File.Delete(oldPhysicalPath); } catch { }
						}
					}
				}

				// Save new avatar
				file.SaveAs(filePath);

				// Update database
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
UPDATE UiUser 
SET AvatarPath = @path
WHERE UserId = @id";
					cmd.Parameters.AddWithValue("@path", virtualPath);
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				var absolutePath = VirtualPathUtility.ToAbsolute(virtualPath);
				context.Response.Write($"{{\"success\":true,\"avatarPath\":\"{absolutePath}\"}}");
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
