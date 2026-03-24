using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers.Security;
using Org.BouncyCastle.Bcpg;
using PgpCore;

namespace BADesign.Pages
{
	public partial class PgpTool : Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			// Cho phép guest sử dụng PGP Tool. Nếu đã login nhưng không có quyền thì redirect.
			if (!UiAuthHelper.IsAnonymous && !UiAuthHelper.HasFeature("PGPTool"))
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
				var msg = ex.Message ?? "";
				if (msg.IndexOf("Checksum mismatch", StringComparison.OrdinalIgnoreCase) >= 0)
					msg = "Passphrase không đúng với Passphrase lúc key được generate. Vui lòng kiểm tra lại (ví dụ: dự án mới mặc định P@pCdn-Cry5, hoặc tìm \"Passphrase\" / \"PASS_PHRASE\" trong App Setting / source code).";
				return new { success = false, message = msg };
			}
		}

		/// <summary>Mã hóa file PGP – nhận file + public key (Base64), trả về file đã mã hóa (.pgp hoặc .asc). compress: true = nén ZIP trước khi encrypt (chuẩn PGP, tương thích PgpCompressedData).</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object EncryptPgp(string inputFileBase64, string inputFileName, string publicKeyBase64, bool armor, bool compress = true)
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
							pgp.CompressionAlgorithm = compress ? CompressionAlgorithmTag.Zip : CompressionAlgorithmTag.Uncompressed;
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
			// Guest được phép dùng PGP Tool. User đã login phải có feature PGPTool.
			if (!UiAuthHelper.IsAnonymous && !UiAuthHelper.HasFeature("PGPTool"))
				throw new UnauthorizedAccessException("Bạn không có quyền sử dụng PGP Tool.");
		}

		/// <summary>Lấy connection string từ token k (Database Tools / HR Helper). Khi không có k hoặc invalid, trả null.</summary>
		private static string GetConnectionStringFromToken(string tokenK)
		{
			if (string.IsNullOrWhiteSpace(tokenK)) return null;
			var id = DataSecurityWrapper.DecryptConnectId(tokenK);
			if (string.IsNullOrEmpty(id)) return null;
			var info = HttpContext.Current?.Session?["HRConn_" + id] as DatabaseSearch.HRConnInfo;
			return info?.ConnectionString;
		}

		/// <summary>Trả về thông tin server/database đang kết nối (để hiển thị trên UI). Không trả ConnectionString.</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object GetConnectionInfo(string tokenK)
		{
			try
			{
				EnsurePgpToolPermission();
				if (string.IsNullOrWhiteSpace(tokenK))
					return new { success = false, server = "", database = "" };
				var id = DataSecurityWrapper.DecryptConnectId(tokenK);
				if (string.IsNullOrEmpty(id))
					return new { success = false, server = "", database = "" };
				var info = HttpContext.Current?.Session?["HRConn_" + id] as DatabaseSearch.HRConnInfo;
				if (info == null)
					return new { success = false, server = "", database = "" };
				return new { success = true, server = info.Server ?? "", database = info.Database ?? "" };
			}
			catch
			{
				return new { success = false, server = "", database = "" };
			}
		}

		/// <summary>Danh sách cấu hình Folder (key lưu trong Setting_FolderConfigurations). Cần token k (từ Database Tools) để truy vấn DB Cadena.</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object GetFolderConfigList(string tokenK)
		{
			try
			{
				EnsurePgpToolPermission();
				var list = new List<object>();
				var connStr = GetConnectionStringFromToken(tokenK);
				if (string.IsNullOrEmpty(connStr))
					return new { success = false, message = "Chưa chọn database. Để dùng key từ database, hãy vào Database Tools → Chọn Server & Database → bấm PGP Tool (hoặc HR Helper rồi sang PGP Tool).", list = list };

				using (var conn = new SqlConnection(connStr))
				{
					conn.Open();
					string schema = null;
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = "SELECT OBJECT_SCHEMA_NAME(t.object_id) FROM sys.tables t WHERE t.name = N'Setting_FolderConfigurations'";
						var o = cmd.ExecuteScalar();
						if (o == null || o == DBNull.Value || string.IsNullOrWhiteSpace(o?.ToString()))
							return new { success = true, message = "Bảng Setting_FolderConfigurations không tồn tại trong database.", list = list };
						schema = o.ToString().Trim().Replace("]", "]]");
					}
					var quotedTable = "[" + schema.Replace("]", "]]") + "].[Setting_FolderConfigurations]";
					// Dùng QUOTENAME trong SQL để tránh lỗi tạo tên bảng. Thử MultiTenant_Tenants hoặc MultiTenant.Tenants
					string selectSql = "SELECT TenantID, Code, NULL AS TenantName, " +
						"CASE WHEN EncryptionPublicKey IS NOT NULL AND LEN(RTRIM(EncryptionPublicKey)) > 0 THEN 1 ELSE 0 END, " +
						"CASE WHEN EncryptionPrimaryKey IS NOT NULL AND LEN(RTRIM(EncryptionPrimaryKey)) > 0 THEN 1 ELSE 0 END " +
						"FROM " + quotedTable + " ORDER BY TenantID, Code";
					try
					{
						var tenantSchema = "";
						var tenantTbl = "";
						using (var cmdTenant = conn.CreateCommand())
						{
							cmdTenant.CommandText = @"SELECT TOP 1 OBJECT_SCHEMA_NAME(t.object_id), t.name FROM sys.tables t 
								WHERE t.name IN (N'MultiTenant_Tenants', N'Tenants') 
								AND OBJECT_SCHEMA_NAME(t.object_id) IN (N'dbo', N'MultiTenant')";
							using (var rt = cmdTenant.ExecuteReader())
							{
								if (rt.Read())
								{
									tenantSchema = rt.IsDBNull(0) ? "" : (rt.GetString(0) ?? "").Trim();
									tenantTbl = rt.IsDBNull(1) ? "" : (rt.GetString(1) ?? "").Trim();
								}
							}
						}
						if (!string.IsNullOrEmpty(tenantSchema) && !string.IsNullOrEmpty(tenantTbl))
						{
							var tenantSchemaQ = "[" + tenantSchema.Replace("]", "]]") + "]";
							var tenantTblQ = "[" + tenantTbl.Replace("]", "]]") + "]";
							selectSql = "SELECT F.TenantID, F.Code, T.Code AS TenantName, " +
								"CASE WHEN F.EncryptionPublicKey IS NOT NULL AND LEN(RTRIM(F.EncryptionPublicKey)) > 0 THEN 1 ELSE 0 END, " +
								"CASE WHEN F.EncryptionPrimaryKey IS NOT NULL AND LEN(RTRIM(F.EncryptionPrimaryKey)) > 0 THEN 1 ELSE 0 END " +
								"FROM " + quotedTable + " F LEFT JOIN " + tenantSchemaQ + "." + tenantTblQ + " T ON F.TenantID = T.ID ORDER BY F.TenantID, F.Code";
						}
					}
					catch { /* bỏ qua, dùng query không có join */ }
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = selectSql;
						using (var r = cmd.ExecuteReader())
						{
							while (r.Read())
							{
								var tenantId = r.IsDBNull(0) ? null : r.GetValue(0)?.ToString();
								var code = r.IsDBNull(1) ? "" : (r.GetString(1) ?? "").Trim();
								var tenantName = r.IsDBNull(2) ? null : (r.GetString(2) ?? "").Trim();
								if (string.IsNullOrEmpty(tenantName)) tenantName = null;
								var hasPublic = !r.IsDBNull(3) && r.GetInt32(3) == 1;
								var hasPrivate = !r.IsDBNull(4) && r.GetInt32(4) == 1;
								list.Add(new { tenantId, code, tenantName, hasPublicKey = hasPublic, hasPrivateKey = hasPrivate });
							}
						}
					}
				}
				return new { success = true, list = list };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message, list = new List<object>() };
			}
		}

		/// <summary>Lấy Public/Private key (Base64) của một cấu hình theo TenantID và Code. Cần token k từ Database Tools.</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object GetFolderConfigKeys(string tokenK, string tenantId, string code)
		{
			try
			{
				EnsurePgpToolPermission();
				if (string.IsNullOrWhiteSpace(code))
					return new { success = false, message = "Vui lòng chọn cấu hình (Code không được trống)." };

				var connStr = GetConnectionStringFromToken(tokenK);
				if (string.IsNullOrEmpty(connStr))
					return new { success = false, message = "Chưa chọn database. Để dùng key từ database, hãy vào Database Tools → Chọn Server & Database → bấm PGP Tool." };

				string encryptionPublicKey = null;
				string encryptionPrimaryKey = null;
				string codeOut = null;

				using (var conn = new SqlConnection(connStr))
				{
					conn.Open();
					string schema = null;
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = "SELECT OBJECT_SCHEMA_NAME(t.object_id) FROM sys.tables t WHERE t.name = N'Setting_FolderConfigurations'";
						var o = cmd.ExecuteScalar();
						if (o == null || o == DBNull.Value || string.IsNullOrWhiteSpace(o?.ToString()))
							return new { success = false, message = "Bảng Setting_FolderConfigurations không tồn tại." };
						schema = o.ToString().Trim().Replace("]", "]]");
					}
					var quotedTable = "[" + schema + "].[Setting_FolderConfigurations]";
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = "SELECT EncryptionPublicKey, EncryptionPrimaryKey, Code FROM " + quotedTable + " WHERE Code = @code AND (TenantID = @tid OR (@tid IS NULL AND TenantID IS NULL))";
						cmd.Parameters.AddWithValue("@code", code ?? "");
						cmd.Parameters.AddWithValue("@tid", string.IsNullOrWhiteSpace(tenantId) ? DBNull.Value : (object)tenantId.Trim());
						using (var r = cmd.ExecuteReader())
						{
							if (r.Read())
							{
								encryptionPublicKey = r.IsDBNull(0) ? null : r.GetString(0)?.Trim();
								encryptionPrimaryKey = r.IsDBNull(1) ? null : r.GetString(1)?.Trim();
								codeOut = r.IsDBNull(2) ? code : (r.GetString(2) ?? code).Trim();
							}
						}
					}
				}

				if (string.IsNullOrEmpty(encryptionPublicKey) && string.IsNullOrEmpty(encryptionPrimaryKey))
					return new { success = false, message = "Cấu hình này chưa có Public Key hoặc Private Key." };

				return new { success = true, encryptionPublicKey = encryptionPublicKey ?? "", encryptionPrimaryKey = encryptionPrimaryKey ?? "", code = codeOut ?? code };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		/// <summary>Generate cặp PGP Public/Private key. Trả về Base64 của cả hai.</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object GeneratePgpKey(string passphrase)
		{
			try
			{
				EnsurePgpToolPermission();
				var pwd = passphrase ?? "";
				string pubPath = null, privPath = null;
				try
				{
					pubPath = Path.Combine(Path.GetTempPath(), "pgp_pub_" + Guid.NewGuid().ToString("N") + ".asc");
					privPath = Path.Combine(Path.GetTempPath(), "pgp_priv_" + Guid.NewGuid().ToString("N") + ".asc");
					var pubFile = new FileInfo(pubPath);
					var privFile = new FileInfo(privPath);
					using (var pgp = new PGP())
					{
						pgp.GenerateKey(pubFile, privFile, "pgp@cadena.local", pwd);
					}
					var pubBytes = File.ReadAllBytes(pubPath);
					var privBytes = File.ReadAllBytes(privPath);
					return new { success = true, publicKeyBase64 = Convert.ToBase64String(pubBytes), privateKeyBase64 = Convert.ToBase64String(privBytes) };
				}
				finally
				{
					try { if (pubPath != null && File.Exists(pubPath)) File.Delete(pubPath); } catch { }
					try { if (privPath != null && File.Exists(privPath)) File.Delete(privPath); } catch { }
				}
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		/// <summary>Cập nhật Public/Private key xuống Setting_FolderConfigurations (theo TenantID, Code). Yêu cầu captcha khi ghi DB.</summary>
		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object UpdateFolderConfigKeys(string tokenK, string tenantId, string code, string publicKeyBase64, string privateKeyBase64, int captchaA, int captchaB)
		{
			try
			{
				EnsurePgpToolPermission();
				if (captchaA + captchaB < 2 || captchaA + captchaB > 18)
					return new { success = false, message = "Captcha không đúng. Vui lòng nhập lại." };
				if (string.IsNullOrWhiteSpace(code))
					return new { success = false, message = "Code cấu hình không được trống." };
				if (string.IsNullOrWhiteSpace(publicKeyBase64) || string.IsNullOrWhiteSpace(privateKeyBase64))
					return new { success = false, message = "Public Key và Private Key không được trống." };

				var connStr = GetConnectionStringFromToken(tokenK);
				if (string.IsNullOrEmpty(connStr))
					return new { success = false, message = "Chưa chọn database. Mở PGP Tool từ Database Tools với kết nối database." };

				using (var conn = new SqlConnection(connStr))
				{
					conn.Open();
					string schema = null;
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = "SELECT OBJECT_SCHEMA_NAME(t.object_id) FROM sys.tables t WHERE t.name = N'Setting_FolderConfigurations'";
						var o = cmd.ExecuteScalar();
						if (o == null || o == DBNull.Value || string.IsNullOrWhiteSpace(o?.ToString()))
							return new { success = false, message = "Bảng Setting_FolderConfigurations không tồn tại." };
						schema = o.ToString().Trim().Replace("]", "]]");
					}
					var quotedTable = "[" + schema + "].[Setting_FolderConfigurations]";
					// UPDATE có thể không có cột GenerateDate - chỉ cập nhật 2 cột key
					var updateSql = "UPDATE " + quotedTable + " SET EncryptionPublicKey = @pub, EncryptionPrimaryKey = @priv WHERE Code = @code AND (TenantID = @tid OR (@tid IS NULL AND TenantID IS NULL))";
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = updateSql;
						cmd.Parameters.AddWithValue("@pub", publicKeyBase64 ?? "");
						cmd.Parameters.AddWithValue("@priv", privateKeyBase64 ?? "");
						cmd.Parameters.AddWithValue("@code", code ?? "");
						cmd.Parameters.AddWithValue("@tid", string.IsNullOrWhiteSpace(tenantId) ? DBNull.Value : (object)tenantId.Trim());
						var rows = cmd.ExecuteNonQuery();
						if (rows == 0)
							return new { success = false, message = "Không tìm thấy cấu hình với Code và TenantID tương ứng để cập nhật." };
					}
				}
				return new { success = true, message = "Đã cập nhật key xuống database." };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
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
