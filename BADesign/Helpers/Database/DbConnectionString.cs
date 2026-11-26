using System.Data.SqlClient;

namespace BADesign.Helpers.Database
{
    /// <summary>Chuỗi kết nối SQL Server đăng nhập bằng tài khoản SQL, dựng từ thông tin server đã lưu.</summary>
    public static class DbConnectionString
    {
        /// <summary>
        /// Data Source là server, hoặc "server,port" khi có port; server trống thì là "." (máy đang chạy).
        /// Giá trị có ký tự đặc biệt (dấu chấm phẩy, dấu bằng, dấu nháy, khoảng trắng ở đầu hoặc cuối) được bọc lại nên luôn là đúng một giá trị.
        /// connectTimeoutSeconds để trống thì dùng mặc định của SqlClient (15 giây).
        /// </summary>
        public static string ForServer(string server, int? port, string user, string password, string catalog, int? connectTimeoutSeconds = null)
        {
            var builder = new SqlConnectionStringBuilder();
            builder.DataSource = DataSource(server, port);
            builder.InitialCatalog = catalog ?? "";
            builder.UserID = user ?? "";
            builder.Password = password ?? "";
            if (connectTimeoutSeconds.HasValue) builder.ConnectTimeout = connectTimeoutSeconds.Value;
            return builder.ConnectionString;
        }

        private static string DataSource(string server, int? port)
        {
            if (string.IsNullOrEmpty(server)) return ".";
            if (port.HasValue && port.Value > 0) return server + "," + port.Value;
            return server;
        }
    }
}
