using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Cadena.Library
{
    public static partial class StringExtensions
    {
        public static bool IsNullOrEmpty(this string value)
        {
            return string.IsNullOrEmpty(value);
        }

        public static string TruncateAt(this string value, int length)
        {
            return !string.IsNullOrEmpty(value) && length > 0 && value.Length > length ? value.Substring(0, length) + "..." : value;
        }

        public static string ToFormat(this string value, params object[] args)
        {
            return string.Format(value, args);
        }

        public static string GetValueOrDefault(this string instance)
        {
            return instance == null ? string.Empty : instance;
        }

        /// <summary>
        /// Returns a string with the delimiters added to make the input string
        /// a valid SQL Server delimited identifier. Brackets are used as the
        /// delimiter. Unlike the T-SQL version, an ArgumentException is thrown
        /// instead of returning a null for invalid arguments.
        /// </summary>
        /// <param name="name">sysname, limited to 128 characters.</param>
        /// <returns>An escaped identifier, no longer than 258 characters.</returns>
        public static string QuoteName(this string name) { return QuoteName(name, '['); }

        /// <summary>
        /// Returns a string with the delimiters added to make the input string
        /// a valid SQL Server delimited identifier. Unlike the T-SQL version,
        /// an ArgumentException is thrown instead of returning a null for
        /// invalid arguments.
        /// if string is quoted, return origin string.
        /// </summary>
        /// <param name="name">sysname, limited to 128 characters.</param>
        /// <param name="quoteCharacter">Can be a single quotation mark ( ' ), a
        /// left or right bracket ( [] ), or a double quotation mark ( " ).</param>
        /// <returns>An escaped identifier, no longer than 258 characters.</returns>
        public static string QuoteName(this string name, char quoteCharacter)
        {
            name = name ?? String.Empty;
            const int sysnameLength = 500;
            if (name.Length > sysnameLength)
            {
                throw new ArgumentException(String.Format(
                    "name is longer than {0} characters", sysnameLength));
            }
            if (name.StartsWith(quoteCharacter.ToString()) || name.EndsWith(quoteCharacter.ToString()))
            {
                return name;
            }
            switch (quoteCharacter)
            {
                case '\'':
                    return String.Format("'{0}'", name.Replace("'", "''"));

                case '"':
                    return String.Format("\"{0}\"", name.Replace("\"", "\"\""));

                case '[':
                case ']':
                    return String.Format("[{0}]", name.Replace("]", "]]"));

                case '(':
                case ')':
                    return String.Format("({0})", name.Replace(")", "))"));

                default:
                    throw new ArgumentException(
                        "quoteCharacter must be one of: ', \", [, (, or ]");
            }
        }

        // Convert the string to Pascal case.
        public static string ToPascalCase(this string the_string)
        {
            // If there are 0 or 1 characters, just return the string.
            if (the_string == null) return the_string;
            if (the_string.Length < 2) return the_string.ToUpper();

            // Split the string into words.
            string[] words = the_string.Split(
                new char[] { },
                StringSplitOptions.RemoveEmptyEntries);

            // Combine the words.
            string result = "";
            foreach (string word in words)
            {
                result +=
                    word.Substring(0, 1).ToUpper() +
                    word.Substring(1);
            }

            return result;
        }

        // Convert the string to camel case.
        public static string ToCamelCaseString(this string the_string)
        {
            // If there are 0 or 1 characters, just return the string.
            if (the_string == null || the_string.Length < 2)
                return the_string;

            // Split the string into words.
            string[] words = the_string.Split(
                new char[] { },
                StringSplitOptions.RemoveEmptyEntries);

            // Combine the words.
            string result = words[0].ToLower();
            for (int i = 1; i < words.Length; i++)
            {
                result +=
                    words[i].Substring(0, 1).ToUpper() +
                    words[i].Substring(1);
            }

            return result;
        }

        // Capitalize the first character and add a space before
        // each capitalized letter (except the first character).
        public static string ToProperCase(this string the_string)
        {
            // If there are 0 or 1 characters, just return the string.
            if (the_string == null) return the_string;
            if (the_string.Length < 2) return the_string.ToUpper();

            // Start with the first character.
            string result = the_string.Substring(0, 1).ToUpper();

            // Add the remaining characters.
            for (int i = 1; i < the_string.Length; i++)
            {
                if (char.IsUpper(the_string[i])) result += " ";
                result += the_string[i];
            }

            return result;
        }

        public static string AddSpaceToCamelCase(this string instance)
        {
            return Regex.Replace(instance, "(\\B[A-Z])", " $1");
        }

        public static bool IsEmailAddress(this string instance)
        {
            if (instance.IsNullOrEmpty()) return false;
            return Regex.IsMatch(instance.ToLower(), @"^(?("")("".+?(?<!\\)""@)|(([0-9a-z]((\.(?!\.))|[-!#\$%&'\*\+/=\?\^`\{\}\|~\w])*)(?<=[0-9a-z])@))" +
                                    @"(?(\[)(\[(\d{1,3}\.){3}\d{1,3}\])|(([0-9a-z][-\w]*[0-9a-z]*\.)+[a-z0-9][\-a-z0-9]{0,22}[a-z0-9]))$");
        }

        public static string GetMd5(this string source)
        {
            var md5 = new MD5CryptoServiceProvider();
            md5.ComputeHash(Encoding.ASCII.GetBytes(source));
            var hashBytes = md5.Hash;
            var builder = new StringBuilder();
            for (int i = 0; i < hashBytes.Length; i++)
            {

                builder.Append(hashBytes[i].ToString("x2"));
            }

            var result = builder.ToString();
            return result;
        }
    }

    public static class ObjectExtension
    {
        public static string GetString(this object source)
        {
            var result = Convert.ToString(source);
            return result;
        }
    }
}