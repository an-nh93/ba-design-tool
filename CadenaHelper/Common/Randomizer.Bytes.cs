using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace CadenaHelper.Common
{
    public partial class Randomizer
    {
        //
        // Summary:
        //     Fills an array of bytes with a cryptographically strong sequence of random
        //     nonzero values.
        //
        // Parameters:
        //   data:
        //     The array to fill with a cryptographically strong sequence of random nonzero
        //     values.
        //
        // Exceptions:
        //   System.Security.Cryptography.CryptographicException:
        //     The cryptographic service provider (CSP) cannot be acquired.
        //
        //   System.ArgumentNullException:
        //     data is null.
        public static void GetNonZeroBytes(byte[] data)
        {
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetNonZeroBytes(data);
            }
        }

        //
        // Summary:
        //     Fills an array of bytes with a cryptographically strong sequence of random
        //     nonzero values.
        //
        // Parameters:
        //   length:
        //     The length of new array with a cryptographically strong sequence of random nonzero
        //     values.
        public static byte[] GetNonZeroBytes(int length)
        {
            //Condition.Requires(length, "Length").IsGreaterThan(0);

            var result = new byte[length];

            GetNonZeroBytes(result);

            return result;
        }

        //
        // Summary:
        //     Fills an array of bytes with a cryptographically strong sequence of random values
        //
        // Parameters:
        //   data:
        //     The array to fill with a cryptographically strong sequence of random values.
        //
        // Exceptions:
        //   System.Security.Cryptography.CryptographicException:
        //     The cryptographic service provider (CSP) cannot be acquired.
        //
        //   System.ArgumentNullException:
        //     data is null.
        public static void GetBytes(byte[] data)
        {
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(data);
            }
        }

        public static byte[] GetBytes(int length)
        {
            //Condition.Requires(length, "Length").IsGreaterThan(0);

            var result = new byte[length];

            GetBytes(result);

            return result;
        }
    }
}