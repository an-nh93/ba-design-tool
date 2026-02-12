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

        private const string EmailServer_Outgoing = "EmailServer_OutgoingServer";
        private const string EmailServer_Port = "EmailServer_Port";
        private const string EmailServer_AccountName = "EmailServer_AccountName";
        private const string EmailServer_Username = "EmailServer_Username";
        private const string EmailServer_EmailAddress = "EmailServer_EmailAddress";
        private const string EmailServer_Password = "EmailServer_Password";
        private const string EmailServer_EnableSSL = "EmailServer_EnableSSL";
        private const string EmailServer_SSLPort = "EmailServer_SSLPort";

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmailServerConfig()
        {
            try
            {
                string outgoing = null, port = null, accountName = null, username = null, emailAddress = null, password = null, sslPort = null;
                bool enableSSL = false;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT [Key], [Value] FROM BaAppSetting WHERE [Key] IN (
                        N'EmailServer_OutgoingServer', N'EmailServer_Port', N'EmailServer_AccountName', N'EmailServer_Username',
                        N'EmailServer_EmailAddress', N'EmailServer_Password', N'EmailServer_EnableSSL', N'EmailServer_SSLPort')";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var k = r.GetString(0);
                            var v = r.IsDBNull(1) ? null : r.GetString(1);
                            if (k == "EmailServer_OutgoingServer") outgoing = v;
                            else if (k == "EmailServer_Port") port = v;
                            else if (k == "EmailServer_AccountName") accountName = v;
                            else if (k == "EmailServer_Username") username = v;
                            else if (k == "EmailServer_EmailAddress") emailAddress = v;
                            else if (k == "EmailServer_Password") password = v;
                            else if (k == "EmailServer_EnableSSL") enableSSL = (v == "1" || string.Equals(v, "true", StringComparison.OrdinalIgnoreCase));
                            else if (k == "EmailServer_SSLPort") sslPort = v;
                        }
                    }
                }
                return new { success = true, outgoingServer = outgoing ?? "", port = port ?? "", accountName = accountName ?? "", username = username ?? "", emailAddress = emailAddress ?? "", password = password ?? "", enableSSL = enableSSL, sslPort = sslPort ?? "" };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveEmailServerConfig(string outgoingServer, string port, string accountName, string username, string emailAddress, string password, bool enableSSL, string sslPort)
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
                        new { Key = EmailServer_Outgoing, Val = outgoingServer ?? "" },
                        new { Key = EmailServer_Port, Val = port ?? "" },
                        new { Key = EmailServer_AccountName, Val = accountName ?? "" },
                        new { Key = EmailServer_Username, Val = username ?? "" },
                        new { Key = EmailServer_EmailAddress, Val = emailAddress ?? "" },
                        new { Key = EmailServer_Password, Val = password ?? "" },
                        new { Key = EmailServer_EnableSSL, Val = enableSSL ? "1" : "0" },
                        new { Key = EmailServer_SSLPort, Val = sslPort ?? "" }
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
