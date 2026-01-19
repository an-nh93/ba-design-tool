using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web.UI;
using BADesign;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;

namespace BADesign.Pages
{
	public partial class DesignerHome : Page
	{
		class DesignRow
		{
			public int ControlId { get; set; }
			public string Name { get; set; }
			public string ControlType { get; set; }
			public bool IsPublic { get; set; }
			public DateTime UpdatedAt { get; set; }
			public string ThumbnailUrl { get; set; }
			public string EditUrl { get; set; }
			public string CloneUrl { get; set; }
			public string OwnerName { get; set; }   // only for public
		}

		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();
			if (!IsPostBack)
			{
				litUserName.Text = (string)Session["UiUserName"] ?? "";
				lnkUserManagement.Visible = UiAuthHelper.IsSuperAdmin;

				BindMyDesigns();
				BindPublicDesigns();
			}
		}

		private void BindMyDesigns()
		{
			var list = new List<DesignRow>();
			var uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT ControlId, Name, ControlType, IsPublic,
       ISNULL(UpdatedAt, CreatedAt) AS UpdatedAt,
       ThumbnailPath
FROM dbo.UiBuilderControl
WHERE IsDeleted = 0 AND OwnerUserId = @uid
ORDER BY ISNULL(UpdatedAt, CreatedAt) DESC, ControlId DESC;";

				cmd.Parameters.AddWithValue("@uid", uid);
				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					while (rd.Read())
					{
						var id = (int)rd["ControlId"];
						var thumb = rd["ThumbnailPath"] as string;
						if (string.IsNullOrEmpty(thumb))
							thumb = ResolveUrl("~/Content/images/no-thumb.png");

						list.Add(new DesignRow
						{
							ControlId = id,
							Name = (string)rd["Name"],
							ControlType = (string)rd["ControlType"],
							IsPublic = (bool)rd["IsPublic"],
							UpdatedAt = (DateTime)rd["UpdatedAt"],
							ThumbnailUrl = thumb,
							EditUrl = ResolveUrl("~/Builder?controlId=" + id)
						});
					}
				}
			}

			rpMyDesigns.DataSource = list;
			rpMyDesigns.DataBind();
		}

		private void BindPublicDesigns()
		{
			var list = new List<DesignRow>();
			var uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT c.ControlId, c.Name, c.ControlType, c.IsPublic,
       ISNULL(c.UpdatedAt, c.CreatedAt) AS UpdatedAt,
       c.ThumbnailPath,
       u.UserName
FROM dbo.UiBuilderControl c
JOIN dbo.UiUser u ON c.OwnerUserId = u.UserId
WHERE c.IsDeleted = 0
  AND c.IsPublic   = 1          -- CHỈ CÒN ĐIỀU KIỆN NÀY
ORDER BY ISNULL(c.UpdatedAt, c.CreatedAt) DESC, c.ControlId DESC;";

				// nếu không dùng uid nữa thì bỏ dòng này:
				// cmd.Parameters.AddWithValue("@uid", uid);

				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					while (rd.Read())
					{
						var id = (int)rd["ControlId"];
						var thumb = rd["ThumbnailPath"] as string;
						if (string.IsNullOrEmpty(thumb))
							thumb = ResolveUrl("~/Content/images/no-thumb.png");

						list.Add(new DesignRow
						{
							ControlId = id,
							Name = (string)rd["Name"],
							ControlType = (string)rd["ControlType"],
							IsPublic = (bool)rd["IsPublic"],
							UpdatedAt = (DateTime)rd["UpdatedAt"],
							ThumbnailUrl = thumb,
							OwnerName = (string)rd["UserName"],
							CloneUrl = "Builder.aspx?cloneId=" + id
						});
					}
				}
			}

			rpPublicDesigns.DataSource = list;
			rpPublicDesigns.DataBind();
		}


		protected void rpMyDesigns_ItemCommand(object source,
				System.Web.UI.WebControls.RepeaterCommandEventArgs e)
		{
			if (e.CommandName == "Delete")
			{
				// Lấy Id
				int id = Convert.ToInt32(e.CommandArgument);

				// Chỉ cho xóa design của chính user hiện tại
				int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
						UPDATE dbo.UiBuilderControl
						   SET IsDeleted = 1,
							   UpdatedAt = SYSDATETIME()
						 WHERE ControlId  = @id
						   AND OwnerUserId = @uid;";
					cmd.Parameters.AddWithValue("@id", id);
					cmd.Parameters.AddWithValue("@uid", uid);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				// Rebind lại 2 lưới
				BindMyDesigns();
				BindPublicDesigns();
			}
		}


		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static void SetDesignPublic(int controlId, bool isPublic)
		{
			// đảm bảo user đã login
			UiAuthHelper.RequireLogin();
			int uid = UiAuthHelper.GetCurrentUserIdOrThrow();

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
UPDATE dbo.UiBuilderControl
   SET IsPublic = @pub,
       UpdatedAt = SYSDATETIME()
 WHERE ControlId = @id
   AND OwnerUserId = @uid
   AND IsDeleted = 0;";
				cmd.Parameters.AddWithValue("@pub", isPublic);
				cmd.Parameters.AddWithValue("@id", controlId);
				cmd.Parameters.AddWithValue("@uid", uid);

				conn.Open();
				cmd.ExecuteNonQuery();
			}
		}
	}
}
