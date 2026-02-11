using System;
using System.Data.SqlClient;
using System.Web;

namespace BADesign
{
	/// <summary>Ghi log hành động user vào UiUserActionLog (mở rộng sau).</summary>
	public static class UserActionLogHelper
	{
		/// <summary>Ghi một action (thread-safe, bắt lỗi để không ảnh hưởng luồng chính).</summary>
		public static void Log(string actionCode, string detail = null)
		{
			try
			{
				var userId = UiAuthHelper.CurrentUserId;
				var ip = HttpContext.Current?.Request?.UserHostAddress;
				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "INSERT INTO UiUserActionLog (UserId, ActionCode, Detail, IpAddress) VALUES (@uid, @code, @detail, @ip)";
					cmd.Parameters.AddWithValue("@uid", userId.HasValue ? (object)userId.Value : DBNull.Value);
					cmd.Parameters.AddWithValue("@code", actionCode ?? "");
					cmd.Parameters.AddWithValue("@detail", string.IsNullOrEmpty(detail) ? (object)DBNull.Value : detail);
					cmd.Parameters.AddWithValue("@ip", string.IsNullOrEmpty(ip) ? (object)DBNull.Value : ip);
					conn.Open();
					cmd.ExecuteNonQuery();
				}
			}
			catch
			{
				// Không làm sập app nếu log lỗi
			}
		}
	}
}
