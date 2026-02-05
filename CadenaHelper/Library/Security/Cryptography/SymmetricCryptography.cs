using Cadena.Library.Serialization;
using System;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Cadena.Library.Security.Cryptography
{
    public class SymmetricCryptography<T> : ISymmetricCryptography
        where T : SymmetricAlgorithm, new()
    {
        private T _provider = new T();
        private readonly Encoding _defaultEncoding = Encoding.UTF8;
        //private static byte[] _keyBytes;

        public void Dispose()
        {
            if (_provider != null)
            {
                _provider.Dispose();
                _provider = null;
            }
        }

        public byte[] EncryptBytes(byte[] data, byte[] keyBytes, byte[] iv)
        {
            byte[] encrypted;
            using (var encryptor = _provider.CreateEncryptor(keyBytes, iv))
            {
                using (var memoryStream = new MemoryStream())
                {
                    using (var cryptoStream = new CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write))
                    {
                        cryptoStream.Write(data, 0, data.Length);
                        cryptoStream.FlushFinalBlock();

                        encrypted = memoryStream.ToArray();

                        memoryStream.Close();
                        cryptoStream.Close();
                    }
                }
            }

            return encrypted;
        }

        public byte[] DecryptBytes(byte[] encryptedData, byte[] iv, byte[] keyBytes)
        {
            byte[] plainTextBytes;
            int decryptedBytesCount;
            using (var decryptor = _provider.CreateDecryptor(keyBytes, iv))
            {
                using (var memoryStream = new MemoryStream(encryptedData))
                {
                    using (var cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read))
                    {
                        plainTextBytes = new byte[encryptedData.Length];
                        decryptedBytesCount = cryptoStream.Read(plainTextBytes, 0, plainTextBytes.Length);

                        memoryStream.Close();
                        cryptoStream.Close();
                    }
                }
            }

            return plainTextBytes.Take(decryptedBytesCount).ToArray();
        }

        public byte[] EncryptBytes(byte[] data, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000)
        {
            if (data == null || data.Length == 0) throw new ArgumentException("Data are empty", "data");
            if (password == null || password.Length == 0) throw new ArgumentException("Password is empty", "password");
            if (salt == null || salt.Length < 8) throw new ArgumentException("Salt is not at least eight bytes", "salt");
            if (iv == null || iv.Length < (_provider.LegalBlockSizes[0].MinSize / 8)) throw new ArgumentException("Specified initialization vector (IV) does not match the block size for this algorithm", "iv");
            if (keySize == null) keySize = _provider.LegalKeySizes[0].MaxSize;

            byte[] keyBytes;
            //var isOldWay = true;
            //if(ConfigurationManager.AppSettings["IsOldWay"] != null)
            //    isOldWay = bool.Parse(ConfigurationManager.AppSettings["IsOldWay"]);
            //if (isOldWay)
            //{
            //    using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(password, salt, passwordIterations))
            //    {
            //        keyBytes = rfc2898DeriveBytes.GetBytes(keySize.Value / 8); // Slowly way
            //    }
            //}
            //else
            keyBytes = salt;

            return EncryptBytes(data, keyBytes, iv);
        }

        public byte[] DecryptBytes(byte[] encryptedData, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000)
        {
            if (encryptedData == null || encryptedData.Length == 0) throw new ArgumentException("Encrypted data is null or empty", "encryptedData");
            if (password == null || password.Length == 0) throw new ArgumentException("Password is null or empty", "password");
            if (salt == null || salt.Length < 8) throw new ArgumentException("Salt is not at least eight bytes", "salt");
            if (iv == null || iv.Length < (_provider.LegalBlockSizes[0].MinSize / 8)) throw new ArgumentException("Specified initialization vector (IV) does not match the block size for this algorithm", "iv");
            if (keySize == null) keySize = _provider.LegalKeySizes[0].MaxSize;

            byte[] keyBytes;
            //var isOldWay = true;
            //if (ConfigurationManager.AppSettings["IsOldWay"] != null)
            //    isOldWay = bool.Parse(ConfigurationManager.AppSettings["IsOldWay"]);
            //if (isOldWay)
            //{
            //    using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(password, salt, passwordIterations))
            //    {
            //        keyBytes = rfc2898DeriveBytes.GetBytes(keySize.Value / 8); // Slowly way
            //    }
            //}
            //else
            keyBytes = salt;

            return DecryptBytes(encryptedData, iv, keyBytes);
        }

        //public byte[] DecryptBytes(byte[] encryptedData, byte[] password, byte[] salt, byte[] iv, byte[] keyBytes, int? keySize = null, int passwordIterations = 1000)
        //{
        //    if (encryptedData == null || encryptedData.Length == 0) throw new ArgumentException("Encrypted data is null or empty", "encryptedData");
        //    if (password == null || password.Length == 0) throw new ArgumentException("Password is null or empty", "password");
        //    if (salt == null || salt.Length < 8) throw new ArgumentException("Salt is not at least eight bytes", "salt");
        //    if (iv == null || iv.Length < (_provider.LegalBlockSizes[0].MinSize / 8)) throw new ArgumentException("Specified initialization vector (IV) does not match the block size for this algorithm", "iv");
        //    if (keySize == null) keySize = _provider.LegalKeySizes[0].MaxSize;

        //    //byte[] keyBytes;
        //    //using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(password, salt, passwordIterations))
        //    //{
        //    //    keyBytes = rfc2898DeriveBytes.GetBytes(keySize.Value / 8);
        //    //}

        //    return DecryptBytes(encryptedData, iv, keyBytes);
        //}

        public string EncryptText(string text, string password, string salt, string iv, int? keySize = null, int passwordIterations = 1000)
        {
            var encryptedBytes = EncryptBytes(_defaultEncoding.GetBytes(text), _defaultEncoding.GetBytes(password),
                _defaultEncoding.GetBytes(salt), _defaultEncoding.GetBytes(iv), keySize, passwordIterations);

            return Convert.ToBase64String(encryptedBytes);
        }

        public string DecryptText(string text, string password, string salt, string iv, int? keySize = null, int passwordIterations = 1000)
        {
            var decryptedBytes = DecryptBytes(Convert.FromBase64String(text), _defaultEncoding.GetBytes(password),
                _defaultEncoding.GetBytes(salt), _defaultEncoding.GetBytes(iv), keySize, passwordIterations);

            return _defaultEncoding.GetString(decryptedBytes);
        }

        //public string DecryptText(string text, string password, string salt, string iv,byte[] keyBytes, int? keySize = null, int passwordIterations = 1000)
        //{
        //    var decryptedBytes = DecryptBytes(Convert.FromBase64String(text), _defaultEncoding.GetBytes(password),
        //        _defaultEncoding.GetBytes(salt), _defaultEncoding.GetBytes(iv), keyBytes, keySize, passwordIterations);

        //    return _defaultEncoding.GetString(decryptedBytes);
        //}

        public void EncryptFile(byte[] bytes, string fileOutput, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000)
        {
            var encryptedBytes = EncryptBytes(bytes, password, salt, iv, keySize, passwordIterations);

            File.WriteAllBytes(fileOutput, encryptedBytes);
        }

        public void EncryptFile(string fileInput, string fileOutput, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000)
        {
            var fileBytes = File.ReadAllBytes(fileInput);
            var encryptedBytes = EncryptBytes(fileBytes, password, salt, iv, keySize, passwordIterations);

            File.WriteAllBytes(fileOutput, encryptedBytes);
        }

        public void DecryptFile(string fileInput, string fileOutput, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000)
        {
            var fileBytes = File.ReadAllBytes(fileInput);
            var decryptedBytes = DecryptBytes(fileBytes, password, salt, iv, keySize, passwordIterations);

            File.WriteAllBytes(fileOutput, decryptedBytes);
        }

        public byte[] DecryptBytes(byte[] encryptedData, string key, string iv)
        {
            return DecryptBytes(encryptedData,
                SerializerFactory.Binary.Serialize(key) as byte[],
                SerializerFactory.Binary.Serialize(iv) as byte[]);
        }

        public byte[] EncryptBytes(byte[] data, string key, string iv)
        {
            return EncryptBytes(data,
                SerializerFactory.Binary.Serialize(key) as byte[],
                SerializerFactory.Binary.Serialize(iv) as byte[]);
        }

        public string DecryptTextByNewAlgo(string text, string stringPassword, string stringSalt, string stringIV, int? keySize = null, int passwordIterations = 1000)
        {
            byte[] encryptedData = Convert.FromBase64String(text);
            byte[] password = _defaultEncoding.GetBytes(stringPassword);
            byte[] salt = _defaultEncoding.GetBytes(stringSalt);
            byte[] iv = _defaultEncoding.GetBytes(stringIV);

            if (encryptedData == null || encryptedData.Length == 0) throw new ArgumentException("Encrypted data is null or empty", "encryptedData");
            if (password == null || password.Length == 0) throw new ArgumentException("Password is null or empty", "password");
            if (salt == null || salt.Length < 8) throw new ArgumentException("Salt is not at least eight bytes", "salt");
            if (iv == null || iv.Length < (_provider.LegalBlockSizes[0].MinSize / 8)) throw new ArgumentException("Specified initialization vector (IV) does not match the block size for this algorithm", "iv");
            if (keySize == null) keySize = _provider.LegalKeySizes[0].MaxSize;

            //var isOldWay = true;
            //if (ConfigurationManager.AppSettings["IsOldWay"] != null)
            //    isOldWay = bool.Parse(ConfigurationManager.AppSettings["IsOldWay"]);

            byte[] keyBytes;
            //if (isOldWay)
            //{
            //    using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(password, salt, passwordIterations))
            //    {
            //        keyBytes = rfc2898DeriveBytes.GetBytes(keySize.Value / 8); // Slowly way
            //    }
            //}
            //else
            keyBytes = salt;

            var decryptedBytes = DecryptBytes(encryptedData, iv, keyBytes);
            return _defaultEncoding.GetString(decryptedBytes);
        }

        public string EncryptTextByNewAlgo(string text, string stringPassword, string stringSalt, string stringIV, int? keySize = null, int passwordIterations = 1000)
        {
            byte[] data = _defaultEncoding.GetBytes(text);
            byte[] password = _defaultEncoding.GetBytes(stringPassword);
            byte[] salt = _defaultEncoding.GetBytes(stringSalt);
            byte[] iv = _defaultEncoding.GetBytes(stringIV);

            if (data == null || data.Length == 0) throw new ArgumentException("Data are empty", "data");
            if (password == null || password.Length == 0) throw new ArgumentException("Password is empty", "password");
            if (salt == null || salt.Length < 8) throw new ArgumentException("Salt is not at least eight bytes", "salt");
            if (iv == null || iv.Length < (_provider.LegalBlockSizes[0].MinSize / 8)) throw new ArgumentException("Specified initialization vector (IV) does not match the block size for this algorithm", "iv");
            if (keySize == null) keySize = _provider.LegalKeySizes[0].MaxSize;

            //var isOldWay = true;
            //if (ConfigurationManager.AppSettings["IsOldWay"] != null)
            //    isOldWay = bool.Parse(ConfigurationManager.AppSettings["IsOldWay"]);

            byte[] keyBytes;
            //if (isOldWay)
            //{
            //    using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(password, salt, passwordIterations))
            //    {
            //        keyBytes = rfc2898DeriveBytes.GetBytes(keySize.Value / 8); // Slowly way
            //    }
            //}
            //else
            keyBytes = salt;

            var encryptedBytes = EncryptBytes(data, keyBytes, iv);
            return Convert.ToBase64String(encryptedBytes);
        }

        public string DecryptTextByOldAlgo(string text, string stringPassword, string stringSalt, string stringIV, int? keySize = null, int passwordIterations = 1000)
        {
            byte[] encryptedData = Convert.FromBase64String(text);
            byte[] password = _defaultEncoding.GetBytes(stringPassword);
            byte[] salt = _defaultEncoding.GetBytes(stringSalt);
            byte[] iv = _defaultEncoding.GetBytes(stringIV);

            if (encryptedData == null || encryptedData.Length == 0) throw new ArgumentException("Encrypted data is null or empty", "encryptedData");
            if (password == null || password.Length == 0) throw new ArgumentException("Password is null or empty", "password");
            if (salt == null || salt.Length < 8) throw new ArgumentException("Salt is not at least eight bytes", "salt");
            if (iv == null || iv.Length < (_provider.LegalBlockSizes[0].MinSize / 8)) throw new ArgumentException("Specified initialization vector (IV) does not match the block size for this algorithm", "iv");
            if (keySize == null) keySize = _provider.LegalKeySizes[0].MaxSize;

            //var isOldWay = true;
            //if (ConfigurationManager.AppSettings["IsOldWay"] != null)
            //    isOldWay = bool.Parse(ConfigurationManager.AppSettings["IsOldWay"]);

            byte[] keyBytes;
            //if (isOldWay)
            //{
            using (var rfc2898DeriveBytes = new Rfc2898DeriveBytes(password, salt, passwordIterations))
            {
                keyBytes = rfc2898DeriveBytes.GetBytes(keySize.Value / 8); // Slowly way
            }
            //}
            //else
            //keyBytes = salt;

            var decryptedBytes = DecryptBytes(encryptedData, iv, keyBytes);
            return _defaultEncoding.GetString(decryptedBytes);
        }

        public Stream DecryptFile(string fileInput, byte[] password, byte[] salt, byte[] iv, int? keySize = default(int?), int passwordIterations = 1000)
        {
            var fileBytes = File.ReadAllBytes(fileInput);
            var decryptedBytes = DecryptBytes(fileBytes, password, salt, iv, keySize, passwordIterations);

            Stream stream = new MemoryStream(decryptedBytes);
            return stream;
        }
    }

    public static class SymmetricCryptography
    {
        public enum SymmetricType
        {
            Aes,
            DES,
            RC2,
            TripleDES,
            Rijndeal
        }

        public static ISymmetricCryptography GetProvider(SymmetricType providerType)
        {
            switch (providerType)
            {
                case SymmetricType.Aes:
                    return CreateAes();

                case SymmetricType.DES:
                    return CreateDES();

                case SymmetricType.RC2:
                    return CreateRC2();

                case SymmetricType.TripleDES:
                    return CreateTripleDES();

                case SymmetricType.Rijndeal:
                    return CreateRijndael();

                default:
                    throw new NotSupportedException("SymmetricType is not supported");
            }
        }

        public static ISymmetricCryptography GetProvider(string providerName)
        {
            if (string.IsNullOrEmpty(providerName))
                providerName = "";

            switch (providerName.ToLower())
            {
                case "aes":
                    return CreateAes();

                case "des":
                    return CreateDES();

                case "rc2":
                    return CreateRC2();

                case "tripledes":
                    return CreateTripleDES();

                case "rijndael":
                    return CreateRijndael();

                default:
                    throw new NotSupportedException("SymmetricType is not supported");
            }
        }

        #region Support algorithm

        public static ISymmetricCryptography CreateAes()
        {
            //return new SymmetricCryptography<AesCryptoServiceProvider>();

            // Using this Cryptography will not fix size of KeyBytes
            return new SymmetricCryptography<RijndaelManaged>();
        }

        public static ISymmetricCryptography CreateDES()
        {
            return new SymmetricCryptography<DESCryptoServiceProvider>();
        }

        public static ISymmetricCryptography CreateRC2()
        {
            return new SymmetricCryptography<RC2CryptoServiceProvider>();
        }

        public static ISymmetricCryptography CreateTripleDES()
        {
            return new SymmetricCryptography<TripleDESCryptoServiceProvider>();
        }

        public static ISymmetricCryptography CreateRijndael()
        {
            return new SymmetricCryptography<RijndaelManaged>();
        }

        #endregion Support algorithm
    }
}