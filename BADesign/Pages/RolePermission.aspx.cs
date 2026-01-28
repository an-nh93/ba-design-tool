using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace UiBuilderFull.Admin
{
	public partial class RolePermission : System.Web.UI.Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();
			if (!UiAuthHelper.IsSuperAdmin)
			{
				Response.StatusCode = 403;
				Response.End();
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object LoadPermissions()
		{
			try
			{
				if (!UiAuthHelper.IsSuperAdmin)
					return new { success = false, message = "Unauthorized." };

				var list = new List<object>();
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT PermissionId, Code, Name FROM UiPermission ORDER BY PermissionId";
					conn.Open();
					using (var r = cmd.ExecuteReader())
					{
						while (r.Read())
							list.Add(new { id = r.GetInt32(0), code = r.GetString(1), name = r.IsDBNull(2) ? "" : r.GetString(2) });
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
				if (!UiAuthHelper.IsSuperAdmin)
					return new { success = false, message = "Unauthorized." };

				var list = new List<object>();
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT RoleId, Code, Name FROM UiRole ORDER BY RoleId";
					conn.Open();
					using (var r = cmd.ExecuteReader())
					{
						while (r.Read())
							list.Add(new { id = r.GetInt32(0), code = r.GetString(1), name = r.IsDBNull(2) ? "" : r.GetString(2) });
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
		public static object LoadRolePermissions()
		{
			try
			{
				if (!UiAuthHelper.IsSuperAdmin)
					return new { success = false, message = "Unauthorized." };

				var rolePermissions = new Dictionary<string, List<int>>();
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "SELECT RoleId, PermissionId FROM UiRolePermission";
					conn.Open();
					using (var r = cmd.ExecuteReader())
					{
						while (r.Read())
						{
							var rid = r.GetInt32(0);
							var pid = r.GetInt32(1);
							var key = rid.ToString();
							if (!rolePermissions.ContainsKey(key))
								rolePermissions[key] = new List<int>();
							rolePermissions[key].Add(pid);
						}
					}
				}
				return new { success = true, rolePermissions = rolePermissions };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object SaveRolePermissions(int roleId, int[] permissionIds)
		{
			try
			{
				if (!UiAuthHelper.IsSuperAdmin)
					return new { success = false, message = "Unauthorized." };

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				{
					conn.Open();
					using (var tr = conn.BeginTransaction())
					{
						using (var del = conn.CreateCommand())
						{
							del.Transaction = tr;
							del.CommandText = "DELETE FROM UiRolePermission WHERE RoleId = @rid";
							del.Parameters.AddWithValue("@rid", roleId);
							del.ExecuteNonQuery();
						}
						permissionIds = permissionIds ?? new int[0];
						foreach (var pid in permissionIds)
						{
							using (var ins = conn.CreateCommand())
							{
								ins.Transaction = tr;
								ins.CommandText = "INSERT INTO UiRolePermission (RoleId, PermissionId) VALUES (@rid, @pid)";
								ins.Parameters.AddWithValue("@rid", roleId);
								ins.Parameters.AddWithValue("@pid", pid);
								ins.ExecuteNonQuery();
							}
						}
						tr.Commit();
					}
				}
				return new { success = true };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}
	}
}
