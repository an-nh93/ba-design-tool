using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace CadenaHelper.Security.DWB
{
	public class DWBDataSecurityWrapper
	{
		/// <summary>
		/// Using for Encrypt the sensitive data.
		/// </summary>
		/// <param name="plainText">Text to Encrypt</param>
		/// <param name="key">The salt text.
		/// If the plainText which does not belong to Employee then saltText equal to null.
		/// If the plainText which belong to Employee then the saltText is EmployeeID.</param>
		/// <returns></returns>
		public static string EncryptData(object plainText, object key)
		{
            key = key!=null ? key : "@Cedan1#1";
            const string initVector = "Cadena$hrm@@0717";
            const int keysize = 256;
            var initVectorBytes = Encoding.UTF8.GetBytes(initVector);
            var plainTextBytes = Encoding.UTF8.GetBytes(plainText.ToString());
            var password = new PasswordDeriveBytes(key.ToString(), null);
            var keyBytes = password.GetBytes(keysize / 8);
            var rijndaelManaged = new RijndaelManaged
            {
                Mode = CipherMode.CBC
            };
            var encryptor = rijndaelManaged.CreateEncryptor(keyBytes, initVectorBytes);
            using (var memoryStream = new MemoryStream())
            {
                using (var cryptoStream = new CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write))
                {
                    cryptoStream.Write(plainTextBytes, 0, plainTextBytes.Length);
                    cryptoStream.FlushFinalBlock();
                    var cipherTextBytes = memoryStream.ToArray();
                    var result = Convert.ToBase64String(cipherTextBytes);
                    return result;
                }
            }
        }
		
		/// <summary>
		/// Using for Decrypt the sensitive data.
		/// </summary>
		/// <typeparam name="T">Type of return value</typeparam>
		/// <param name="encryptedText">Encrypted text</param>
		/// <param name="key">
		/// The salt text.
		/// If the plainText which does not belong to Employee then saltText equal to null.
		/// If the plainText which belong to Employee then the saltText is EmployeeID.</param>
		/// </param>
		/// <returns></returns>
		public static T DecryptData<T>(string source, object key)
		{
            try
            {
                key = key!=null? key.ToString().Replace("-", "").ToLower():"@Cedan1#1";
                const string initVector = "Cadena$hrm@@0717";
                const int keysize = 256;
                var initVectorBytes = Encoding.UTF8.GetBytes(initVector);
                var cipherTextBytes = Convert.FromBase64String(source);
                var password = new PasswordDeriveBytes(key.ToString(), null);
                var keyBytes = password.GetBytes(keysize / 8);
                var symmetricKey = new RijndaelManaged
                {
                    Mode = CipherMode.CBC
                };
                var decryptor = symmetricKey.CreateDecryptor(keyBytes, initVectorBytes);
                using (var memoryStream = new MemoryStream(cipherTextBytes))
                {
                    using (var cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read))
                    {
                        var plainTextBytes = new byte[cipherTextBytes.Length];
                        var decryptedByteCount = cryptoStream.Read(plainTextBytes, 0, plainTextBytes.Length);
                        var result = Encoding.UTF8.GetString(plainTextBytes, 0, decryptedByteCount);
                        return ConvertTo<T>(result); ;
                    }
                }
            }
            catch
            {
                return default(T);
            }
        }

		public static T ConvertTo<T>(string data)
		{
			var type = typeof(T);

			if (type.IsGenericType
				&& type.GetGenericTypeDefinition() == typeof(Nullable<>))
			{
				return (T)Convert.ChangeType(data, type.GetGenericArguments()[0], new CultureInfo("en-US"));
			}

			//else if (type.Name == "System.Guid")
			//{
			//    return Guid.Parse(data);
			//}

			return (T)Convert.ChangeType(data, type, new CultureInfo("en-US"));
		}


	}

}
