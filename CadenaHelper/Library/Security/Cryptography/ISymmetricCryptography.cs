using System;
using System.IO;

namespace Cadena.Library.Security.Cryptography
{
    public interface ISymmetricCryptography : IDisposable
    {
        byte[] DecryptBytes(byte[] encryptedData, string key, string iv);

        byte[] DecryptBytes(byte[] encryptedData, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000);

        void DecryptFile(string fileInput, string fileOutput, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000);

        Stream DecryptFile(string fileInput, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000);

        string DecryptText(string text, string password, string salt, string iv, int? keySize = null, int passwordIterations = 1000);

        byte[] EncryptBytes(byte[] data, string key, string iv);

        byte[] EncryptBytes(byte[] data, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000);

        void EncryptFile(string fileInput, string fileOutput, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000);

        void EncryptFile(byte[] bytes, string fileOutput, byte[] password, byte[] salt, byte[] iv, int? keySize = null, int passwordIterations = 1000);

        string EncryptText(string text, string password, string salt, string iv, int? keySize = null, int passwordIterations = 1000);

        ///
        ///

        string DecryptTextByNewAlgo(string text, string password, string salt, string iv, int? keySize = null, int passwordIterations = 1000);
        string DecryptTextByOldAlgo(string text, string password, string salt, string iv, int? keySize = null, int passwordIterations = 1000);
        string EncryptTextByNewAlgo(string text, string password, string salt, string iv, int? keySize = null, int passwordIterations = 1000);

    }
}