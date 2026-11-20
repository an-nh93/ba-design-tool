using System;

namespace BADesign.Helpers.Security
{
    public static class PgpFileNames
    {
        private static readonly string[] EncryptedExtensions = { ".pgp", ".gpg", ".asc" };

        public static string WithoutEncryptedExtension(string encryptedFileName)
        {
            var name = (encryptedFileName ?? "").Trim();
            foreach (var extension in EncryptedExtensions)
            {
                if (name.Length > extension.Length && name.EndsWith(extension, StringComparison.OrdinalIgnoreCase))
                    return name.Substring(0, name.Length - extension.Length);
            }
            return null;
        }
    }
}
