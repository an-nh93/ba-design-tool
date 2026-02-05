using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;
using PgpCore;

namespace BADesign.Pages
{
	public partial class PgpTool : Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();
			if (!UiAuthHelper.HasFeature("PGPTool"))
			{
				Response.Redirect(ResolveUrl(UiAuthHelper.GetHomeUrlByRole() ?? "~/HomeRole"));
				return;
			}
		}

		/// <summary>Xuất key Base64 ra file .asc – giải mã Base64 và trả về file để tải.</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ExportKey(string keyBase64, string keyType, string code)
		{
			try
			{
				EnsurePgpToolPermission();
				if (string.IsNullOrWhiteSpace(keyBase64))
					return new { success = false, message = "Vui lòng dán chuỗi key (Base64)." };

				var clean = Regex.Replace(keyBase64, @"\s+", "");
				byte[] keyBytes;
				try
				{
					keyBytes = Convert.FromBase64String(clean);
				}
				catch
				{
					return new { success = false, message = "Chuỗi không phải Base64 hợp lệ." };
				}

				var prefix = (code ?? "").Trim();
				if (string.IsNullOrEmpty(prefix)) prefix = "export";
				var label = (keyType ?? "").Trim().Equals("private", StringComparison.OrdinalIgnoreCase) ? "Private Key" : "Public Key";
				var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
				var fileName = $"{label}_{prefix}_{timestamp}.asc";

				return new { success = true, fileBase64 = Convert.ToBase64String(keyBytes), fileName = fileName };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		/// <summary>Giải mã file PGP – nhận file mã hóa + private key (Base64) + passphrase, trả về file giải mã.</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object DecryptPgp(string encryptedFileBase64, string privateKeyBase64, string passphrase)
		{
			try
			{
				EnsurePgpToolPermission();
				if (string.IsNullOrWhiteSpace(encryptedFileBase64))
					return new { success = false, message = "Chưa chọn file đã mã hóa PGP." };
				if (string.IsNullOrWhiteSpace(privateKeyBase64))
					return new { success = false, message = "Chưa cung cấp Private Key (file .asc hoặc chuỗi Base64)." };

				var encClean = Regex.Replace(encryptedFileBase64, @"\s+", "");
				var keyClean = Regex.Replace(privateKeyBase64, @"\s+", "");
				byte[] encBytes;
				byte[] keyBytes;
				try
				{
					encBytes = Convert.FromBase64String(encClean);
					keyBytes = Convert.FromBase64String(keyClean);
				}
				catch
				{
					return new { success = false, message = "Dữ liệu file hoặc key không phải Base64 hợp lệ." };
				}

				// Chạy trên thread pool để tránh deadlock ASP.NET (PipeAllAsync trong PgpCore treo khi gọi từ WebMethod sync)
				byte[] outBytes = Task.Run(async () =>
				{
					using (var encStream = new MemoryStream(encBytes))
					using (var keyStream = new MemoryStream(keyBytes))
					using (var outStream = new MemoryStream())
					{
						var encryptionKeys = new EncryptionKeys(keyStream, passphrase ?? "");
						using (var pgp = new PGP(encryptionKeys))
						{
							await pgp.DecryptAsync(encStream, outStream);
						}
						return outStream.ToArray();
					}
				}).GetAwaiter().GetResult();

				string outFileName;

				// Lấy tên file từ PGP message nếu có (cần truyền key để Inspect không bị NullReferenceException)
				outFileName = GetDecryptedFileName(encBytes, keyBytes, passphrase ?? "") ?? "decrypted_file";

				return new { success = true, fileBase64 = Convert.ToBase64String(outBytes), fileName = outFileName };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		/// <summary>Mã hóa file PGP – nhận file + public key (Base64), trả về file đã mã hóa (.pgp hoặc .asc).</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object EncryptPgp(string inputFileBase64, string inputFileName, string publicKeyBase64, bool armor)
		{
			try
			{
				EnsurePgpToolPermission();
				if (string.IsNullOrWhiteSpace(inputFileBase64))
					return new { success = false, message = "Chưa chọn file cần mã hóa." };
				if (string.IsNullOrWhiteSpace(publicKeyBase64))
					return new { success = false, message = "Chưa cung cấp Public Key (file .asc hoặc chuỗi Base64)." };

				var inpClean = Regex.Replace(inputFileBase64, @"\s+", "");
				var keyClean = Regex.Replace(publicKeyBase64, @"\s+", "");
				byte[] inpBytes;
				byte[] keyBytes;
				try
				{
					inpBytes = Convert.FromBase64String(inpClean);
					keyBytes = Convert.FromBase64String(keyClean);
				}
				catch
				{
					return new { success = false, message = "Dữ liệu file hoặc key không phải Base64 hợp lệ." };
				}

				var baseName = (inputFileName ?? "file").Trim();
				if (string.IsNullOrEmpty(baseName)) baseName = "file";
				var ext = armor ? ".asc" : ".pgp";
				var outFileName = baseName + ext;

				// Chạy trên thread pool để tránh deadlock ASP.NET
				byte[] outBytes = Task.Run(async () =>
				{
					using (var inpStream = new MemoryStream(inpBytes))
					using (var keyStream = new MemoryStream(keyBytes))
					using (var outStream = new MemoryStream())
					{
						var encryptionKeys = new EncryptionKeys(keyStream);
						using (var pgp = new PGP(encryptionKeys))
						{
							await pgp.EncryptAsync(inpStream, outStream, armor, withIntegrityCheck: true, name: baseName);
						}
						return outStream.ToArray();
					}
				}).GetAwaiter().GetResult();

				return new { success = true, fileBase64 = Convert.ToBase64String(outBytes), fileName = outFileName };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		private static void EnsurePgpToolPermission()
		{
			UiAuthHelper.RequireLogin();
			if (!UiAuthHelper.HasFeature("PGPTool"))
				throw new UnauthorizedAccessException("Bạn không có quyền sử dụng PGP Tool.");
		}

		/// <summary>Inspect PGP message (đã mã hóa) để lấy tên file gốc. Cần truyền private key để PgpCore không throw NullReferenceException.</summary>
		private static string GetDecryptedFileName(byte[] encBytes, byte[] keyBytes, string passphrase)
		{
			try
			{
				if (keyBytes == null || keyBytes.Length == 0) return null;
				return Task.Run(async () =>
				{
					using (var ms = new MemoryStream(encBytes))
					using (var keyStream = new MemoryStream(keyBytes))
					{
						var encryptionKeys = new EncryptionKeys(keyStream, passphrase ?? "");
						using (var pgp = new PGP(encryptionKeys))
						{
							var result = await pgp.InspectAsync(ms);
							return result?.FileName;
						}
					}
				}).GetAwaiter().GetResult();
			}
			catch
			{
				return null;
			}
		}
	}
}
