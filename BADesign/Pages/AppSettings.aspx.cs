using System;
using System.Data.SqlClient;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class AppSettings : Page
    {
        public bool CanEditSettings => UiAuthHelper.HasFeature("Settings");

        protected void Page_Load(object sender, System.EventArgs e)
        {
            UiAuthHelper.RequireLogin();
        }

        private const string SftpHostKey = "SftpHost";
        private const string SftpPortKey = "SftpPort";
        private const string SftpUserKey = "SftpUser";
        private const string SftpPasswordKey = "SftpPassword";

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadSftpConfig()
        {
            try
            {
                string host = null, port = null, user = null, password = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT [Key], [Value] FROM BaAppSetting WHERE [Key] IN (N'SftpHost', N'SftpPort', N'SftpUser', N'SftpPassword')";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var k = r.GetString(0);
                            var v = r.IsDBNull(1) ? null : r.GetString(1);
                            if (k == "SftpHost") host = v;
                            else if (k == "SftpPort") port = v;
                            else if (k == "SftpUser") user = v;
                            else if (k == "SftpPassword") password = v;
                        }
                    }
                }
                return new { success = true, host = host ?? "", port = port ?? "", user = user ?? "", password = password ?? "" };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveSftpConfig(string host, string port, string user, string password)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("Settings"))
                    return new { success = false, message = "Bạn không có quyền Settings." };
                var uid = UiAuthHelper.CurrentUserId;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    foreach (var kv in new[] {
                        new { Key = SftpHostKey, Val = host ?? "" },
                        new { Key = SftpPortKey, Val = port ?? "" },
                        new { Key = SftpUserKey, Val = user ?? "" },
                        new { Key = SftpPasswordKey, Val = password ?? "" }
                    })
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM BaAppSetting WHERE [Key] = @key)
    UPDATE BaAppSetting SET [Value] = @val, UpdatedAt = SYSDATETIME(), UpdatedBy = @uid WHERE [Key] = @key;
ELSE
    INSERT INTO BaAppSetting ([Key], [Value], UpdatedBy) VALUES (@key, @val, @uid);";
                            cmd.Parameters.AddWithValue("@key", kv.Key);
                            cmd.Parameters.AddWithValue("@val", kv.Val);
                            cmd.Parameters.AddWithValue("@uid", uid.HasValue ? (object)uid.Value : DBNull.Value);
                            cmd.ExecuteNonQuery();
                        }
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
