using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI.WebControls;
using BADesign;

namespace UiBuilderFull.Admin
{
	public partial class Users : System.Web.UI.Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();
			if (!UiAuthHelper.IsSuperAdmin)
			{
				Response.StatusCode = 403;
				Response.End();
			}

			if (!IsPostBack)
			{
				BindUsers();
			}
		}

		private void BindUsers()
		{
			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"SELECT u.UserId, u.UserName, u.FullName, u.Email, u.IsSuperAdmin, u.IsActive, u.RoleId, r.Code AS RoleCode, r.Name AS RoleName
FROM UiUser u
LEFT JOIN UiRole r ON r.RoleId = u.RoleId
ORDER BY u.UserId";
				conn.Open();
				using (var da = new SqlDataAdapter(cmd))
				{
					var dt = new DataTable();
					da.Fill(dt);
					rpUsers.DataSource = dt;
					rpUsers.DataBind();
				}
			}
		}

		protected void btnAddUser_Click(object sender, EventArgs e)
		{
			var user = txtNewUser.Text.Trim();
			var pass = txtNewPass.Text;
			if (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
			{
				lblMsg.Text = "User và password không được trống.";
				return;
			}

			var hash = UiAuthHelper.HashPassword(pass);

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
INSERT INTO UiUser(UserName, PasswordHash, FullName, Email, IsSuperAdmin)
VALUES (@u, @p, @f, @e, @sa);";
				cmd.Parameters.AddWithValue("@u", user);
				cmd.Parameters.AddWithValue("@p", hash);
				cmd.Parameters.AddWithValue("@f", txtNewFullName.Text.Trim());
				cmd.Parameters.AddWithValue("@e", txtNewEmail.Text.Trim());
				cmd.Parameters.AddWithValue("@sa", chkNewSuper.Checked);

				conn.Open();
				cmd.ExecuteNonQuery();
			}

			txtNewUser.Text = txtNewPass.Text = txtNewFullName.Text = txtNewEmail.Text = "";
			chkNewSuper.Checked = false;
			lblMsg.Text = "Đã thêm user.";
			BindUsers();
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ChangePassword(int userId, string newPassword)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				newPassword = newPassword ?? "";
				if (newPassword.Trim().Length < 1)
				{
					return new { success = false, message = "Password mới phải >= 1 ký tự!" };
				}

				string hash = UiAuthHelper.HashPassword(newPassword);

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "UPDATE UiUser SET PasswordHash=@p WHERE UserId=@id";
					cmd.Parameters.AddWithValue("@p", hash);
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, message = $"Đã đổi password cho User {userId}." };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ResetPassword(int userId)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				// Reset về "123456"
				string newPass = "123456";
				string hash = UiAuthHelper.HashPassword(newPass);

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "UPDATE UiUser SET PasswordHash=@p WHERE UserId=@id";
					cmd.Parameters.AddWithValue("@p", hash);
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, message = $"User {userId} password reset = 123456" };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ToggleActive(int userId)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
UPDATE UiUser SET IsActive = CASE WHEN IsActive=1 THEN 0 ELSE 1 END
WHERE UserId=@id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, message = "User status updated successfully." };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object GetUserInfo(int userId)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT UserId, UserName, FullName, Email, IsSuperAdmin, IsActive, RoleId FROM UiUser WHERE UserId=@id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					using (var rd = cmd.ExecuteReader())
					{
						if (rd.Read())
						{
							var roleIdObj = rd["RoleId"];
							var uid = (int)rd["UserId"];
							var roleId = roleIdObj != DBNull.Value && roleIdObj != null ? (int?)Convert.ToInt32(roleIdObj) : null;
							var userName = (string)rd["UserName"];
							var fullName = rd["FullName"] as string ?? "";
							var email = rd["Email"] as string ?? "";
							var isSuperAdmin = (bool)rd["IsSuperAdmin"];
							var isActive = (bool)rd["IsActive"];
							rd.Close();

							var userPermissionIds = new List<int>();
							using (var cmd2 = conn.CreateCommand())
							{
								cmd2.CommandText = "SELECT PermissionId FROM UiUserPermission WHERE UserId = @uid";
								cmd2.Parameters.AddWithValue("@uid", uid);
								using (var r2 = cmd2.ExecuteReader())
								{
									while (r2.Read())
										userPermissionIds.Add(r2.GetInt32(0));
								}
							}

							var userServerIds = new List<int>();
							using (var cmd3 = conn.CreateCommand())
							{
								cmd3.CommandText = "SELECT ServerId FROM UiUserServerAccess WHERE UserId = @uid";
								cmd3.Parameters.AddWithValue("@uid", uid);
								using (var r3 = cmd3.ExecuteReader())
								{
									while (r3.Read())
										userServerIds.Add(r3.GetInt32(0));
								}
							}

							return new
							{
								success = true,
								userId = uid,
								userName = userName,
								fullName = fullName,
								email = email,
								isSuperAdmin = isSuperAdmin,
								isActive = isActive,
								roleId = roleId,
								userPermissionIds = userPermissionIds,
								userServerIds = userServerIds
							};
						}
						else
						{
							return new { success = false, message = "User not found." };
						}
					}
				}
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object CreateUser(string userName, string password, string fullName = null, string email = null, bool isSuperAdmin = false, bool isActive = true, int? roleId = null, int[] extraPermissionIds = null, int[] extraServerIds = null)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(password))
				{
					return new { success = false, message = "Username and password are required." };
				}

				var hash = UiAuthHelper.HashPassword(password);

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				{
					conn.Open();

					int userId;
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = @"
INSERT INTO UiUser(UserName, PasswordHash, FullName, Email, IsSuperAdmin, IsActive, RoleId)
VALUES (@u, @p, @f, @e, @sa, @ia, @rid);
SELECT CAST(SCOPE_IDENTITY() AS INT);";
						cmd.Parameters.AddWithValue("@u", userName.Trim());
						cmd.Parameters.AddWithValue("@p", hash);
						cmd.Parameters.AddWithValue("@f", string.IsNullOrWhiteSpace(fullName) ? (object)DBNull.Value : fullName.Trim());
						cmd.Parameters.AddWithValue("@e", string.IsNullOrWhiteSpace(email) ? (object)DBNull.Value : email.Trim());
						cmd.Parameters.AddWithValue("@sa", isSuperAdmin);
						cmd.Parameters.AddWithValue("@ia", isActive);
						cmd.Parameters.AddWithValue("@rid", roleId.HasValue ? (object)roleId.Value : DBNull.Value);

						userId = (int)cmd.ExecuteScalar();
					}

					if (extraPermissionIds != null && extraPermissionIds.Length > 0)
					{
						foreach (var pid in extraPermissionIds)
						{
							using (var ins = conn.CreateCommand())
							{
								ins.CommandText = "INSERT INTO UiUserPermission (UserId, PermissionId) VALUES (@uid, @pid)";
								ins.Parameters.AddWithValue("@uid", userId);
								ins.Parameters.AddWithValue("@pid", pid);
								ins.ExecuteNonQuery();
							}
						}
					}

					if (extraServerIds != null && extraServerIds.Length > 0)
					{
						foreach (var sid in extraServerIds)
						{
							using (var ins = conn.CreateCommand())
							{
								ins.CommandText = "INSERT INTO UiUserServerAccess (UserId, ServerId) VALUES (@uid, @sid)";
								ins.Parameters.AddWithValue("@uid", userId);
								ins.Parameters.AddWithValue("@sid", sid);
								ins.ExecuteNonQuery();
							}
						}
					}

					return new { success = true, message = "User created successfully.", userId = userId };
				}
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object UpdateUser(int? userId, string userName, string password = null, string fullName = null, string email = null, bool? isSuperAdmin = null, bool? isActive = null, int? roleId = null, int[] extraPermissionIds = null, int[] extraServerIds = null)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				if (!userId.HasValue)
				{
					return new { success = false, message = "User ID is required." };
				}

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				{
					conn.Open();

					var updates = new List<string>();
					var parameters = new List<SqlParameter>();

					if (!string.IsNullOrWhiteSpace(password))
					{
						var hash = UiAuthHelper.HashPassword(password);
						updates.Add("PasswordHash=@p");
						parameters.Add(new SqlParameter("@p", hash));
					}
					if (fullName != null)
					{
						updates.Add("FullName=@f");
						parameters.Add(new SqlParameter("@f", string.IsNullOrWhiteSpace(fullName) ? (object)DBNull.Value : fullName.Trim()));
					}
					if (email != null)
					{
						updates.Add("Email=@e");
						parameters.Add(new SqlParameter("@e", string.IsNullOrWhiteSpace(email) ? (object)DBNull.Value : email.Trim()));
					}
					if (isSuperAdmin.HasValue)
					{
						updates.Add("IsSuperAdmin=@sa");
						parameters.Add(new SqlParameter("@sa", isSuperAdmin.Value));
					}
					if (isActive.HasValue)
					{
						updates.Add("IsActive=@ia");
						parameters.Add(new SqlParameter("@ia", isActive.Value));
					}
					if (roleId.HasValue && roleId.Value != 0)
					{
						updates.Add("RoleId=@rid");
						parameters.Add(new SqlParameter("@rid", roleId.Value));
					}
					else
					{
						updates.Add("RoleId=@rid");
						parameters.Add(new SqlParameter("@rid", DBNull.Value));
					}

					if (updates.Count == 0 && (extraPermissionIds == null || extraPermissionIds.Length == 0) && (extraServerIds == null))
					{
						return new { success = false, message = "No fields to update." };
					}

					if (updates.Count > 0)
					{
						using (var cmd = conn.CreateCommand())
						{
							cmd.CommandText = "UPDATE UiUser SET " + string.Join(", ", updates) + " WHERE UserId=@id";
							cmd.Parameters.AddWithValue("@id", userId.Value);
							foreach (var param in parameters)
								cmd.Parameters.Add(param);
							cmd.ExecuteNonQuery();
						}
					}

					if (extraPermissionIds != null)
					{
						using (var del = conn.CreateCommand())
						{
							del.CommandText = "DELETE FROM UiUserPermission WHERE UserId = @uid";
							del.Parameters.AddWithValue("@uid", userId.Value);
							del.ExecuteNonQuery();
						}
						foreach (var pid in extraPermissionIds)
						{
							using (var ins = conn.CreateCommand())
							{
								ins.CommandText = "INSERT INTO UiUserPermission (UserId, PermissionId) VALUES (@uid, @pid)";
								ins.Parameters.AddWithValue("@uid", userId.Value);
								ins.Parameters.AddWithValue("@pid", pid);
								ins.ExecuteNonQuery();
							}
						}
					}

					if (extraServerIds != null)
					{
						using (var del = conn.CreateCommand())
						{
							del.CommandText = "DELETE FROM UiUserServerAccess WHERE UserId = @uid";
							del.Parameters.AddWithValue("@uid", userId.Value);
							del.ExecuteNonQuery();
						}
						foreach (var sid in extraServerIds)
						{
							using (var ins = conn.CreateCommand())
							{
								ins.CommandText = "INSERT INTO UiUserServerAccess (UserId, ServerId) VALUES (@uid, @sid)";
								ins.Parameters.AddWithValue("@uid", userId.Value);
								ins.Parameters.AddWithValue("@sid", sid);
								ins.ExecuteNonQuery();
							}
						}
					}
				}

				return new { success = true, message = "User updated successfully." };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object LoadServers()
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
					return new { success = false, message = "Unauthorized." };
				var list = new List<object>();
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT Id, ServerName, Port, Username FROM BaDatabaseServer WHERE IsActive = 1 ORDER BY Id";
					conn.Open();
					using (var r = cmd.ExecuteReader())
					{
						while (r.Read())
							list.Add(new { id = r.GetInt32(0), serverName = r.IsDBNull(1) ? "" : r.GetString(1), port = r.IsDBNull(2) ? (int?)null : r.GetInt32(2), username = r.IsDBNull(3) ? "" : r.GetString(3) });
					}
				}
				return new { success = true, list = list };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object LoadRoles()
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				var list = new List<object>();
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT RoleId, Code, Name FROM UiRole ORDER BY RoleId";
					conn.Open();
					using (var r = cmd.ExecuteReader())
					{
						while (r.Read())
						{
							list.Add(new { id = r.GetInt32(0), code = r.GetString(1), name = r.IsDBNull(2) ? "" : r.GetString(2) });
						}
					}
				}
				return new { success = true, list = list };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}
	}
}
