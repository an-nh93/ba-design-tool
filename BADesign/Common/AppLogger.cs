using System;
using System.IO;
using System.Web;
using System.Web.Hosting;

namespace BADesign
{
	/// <summary>
	/// Ghi log lỗi ứng dụng ra file. Log nằm trong App_Data\Logs (hoặc theo appSettings AppLogPath).
	/// </summary>
	public static class AppLogger
	{
		private static readonly object _lock = new object();

		/// <summary>Đường dẫn thư mục log (App_Data\Logs hoặc từ config).</summary>
		public static string LogDirectory
		{
			get
			{
				var configured = System.Configuration.ConfigurationManager.AppSettings["AppLogPath"];
				if (!string.IsNullOrWhiteSpace(configured))
				{
					if (Path.IsPathRooted(configured))
						return configured;
					// Tương đối so với App_Data
					var appData = HostingEnvironment.MapPath("~/App_Data") ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data");
					return Path.Combine(appData, configured.Trim().TrimStart('/', '\\'));
				}
				var baseDir = HostingEnvironment.MapPath("~/App_Data") ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data");
				return Path.Combine(baseDir, "Logs");
			}
		}

		/// <summary>Ghi một dòng log (thread-safe). File: app_yyyyMMdd.log</summary>
		public static void Log(string message, Exception ex = null)
		{
			try
			{
				var dir = LogDirectory;
				if (!Directory.Exists(dir))
					Directory.CreateDirectory(dir);
				var file = Path.Combine(dir, "app_" + DateTime.Now.ToString("yyyyMMdd") + ".log");
				var line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " " + message;
				if (ex != null)
					line += Environment.NewLine + ex.ToString();
				lock (_lock)
				{
					File.AppendAllText(file, line + Environment.NewLine);
				}
			}
			catch
			{
				// Tránh lỗi khi ghi log làm sập app
			}
		}

		/// <summary>Ghi log từ HttpApplication.Error (exception không xử lý).</summary>
		public static void LogApplicationError(Exception ex, HttpRequest request)
		{
			var url = request?.RawUrl ?? "";
			var method = request?.HttpMethod ?? "";
			var user = (request != null && request.IsLocal) ? "local" : (request?.UserHostAddress ?? "");
			Log("Unhandled: " + method + " " + url + " [" + user + "]", ex);
		}
	}
}
