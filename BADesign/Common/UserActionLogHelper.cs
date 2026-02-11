using System;
using System.Data.SqlClient;
using System.Web;

namespace BADesign
{
	/// <summary>Ghi log hành động user vào UiUserActionLog: UserId, UserName, ActionCode, Detail, IpAddress, UserAgent, At.</summary>
	public static class UserActionLogHelper
	{
		/// <summary>Ghi một action (thread-safe). Lưu IP, User-Agent (thiết bị), username, thời gian để audit.</summary>
		public static void Log(string actionCode, string detail = null)
		{
			try
			{
				var ctx = HttpContext.Current;
				var userId = UiAuthHelper.CurrentUserId;
				var ip = ctx?.Request?.UserHostAddress;
				var userAgent = ctx?.Request?.UserAgent;
				if (!string.IsNullOrEmpty(userAgent) && userAgent.Length > 512)
					userAgent = userAgent.Substring(0, 512);
				var userName = ctx?.Session?["UiUserName"] as string;
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				{
					conn.Open();
					try
					{
						using (var cmd = conn.CreateCommand())
						{
							cmd.CommandText = @"INSERT INTO UiUserActionLog (UserId, UserName, ActionCode, Detail, IpAddress, UserAgent) VALUES (@uid, @uname, @code, @detail, @ip, @ua)";
							cmd.Parameters.AddWithValue("@uid", userId.HasValue ? (object)userId.Value : DBNull.Value);
							cmd.Parameters.AddWithValue("@uname", string.IsNullOrEmpty(userName) ? (object)DBNull.Value : userName);
							cmd.Parameters.AddWithValue("@code", actionCode ?? "");
							cmd.Parameters.AddWithValue("@detail", string.IsNullOrEmpty(detail) ? (object)DBNull.Value : detail);
							cmd.Parameters.AddWithValue("@ip", string.IsNullOrEmpty(ip) ? (object)DBNull.Value : ip);
							cmd.Parameters.AddWithValue("@ua", string.IsNullOrEmpty(userAgent) ? (object)DBNull.Value : userAgent);
							cmd.ExecuteNonQuery();
						}
					}
					catch (SqlException)
					{
						using (var cmd = conn.CreateCommand())
						{
							cmd.CommandText = "INSERT INTO UiUserActionLog (UserId, ActionCode, Detail, IpAddress) VALUES (@uid, @code, @detail, @ip)";
							cmd.Parameters.AddWithValue("@uid", userId.HasValue ? (object)userId.Value : DBNull.Value);
							cmd.Parameters.AddWithValue("@code", actionCode ?? "");
							cmd.Parameters.AddWithValue("@detail", string.IsNullOrEmpty(detail) ? (object)DBNull.Value : detail);
							cmd.Parameters.AddWithValue("@ip", string.IsNullOrEmpty(ip) ? (object)DBNull.Value : ip);
							cmd.ExecuteNonQuery();
						}
					}
				}
			}
			catch
			{
				// Không làm sập app nếu log lỗi
			}
		}
	}
}
