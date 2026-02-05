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
        public static byte[] GenerateSalt()
        {
            return Randomizer.GetBytes(16);
        }

        public static byte[] GenerateInitializationVector(SymmetricAlgorithm algorithm)
        {
            //Condition.Requires(algorithm, "algorithm").IsNotNull();

            int size = algorithm.LegalBlockSizes[0].MinSize / 8;
            var iv = new byte[size];
            Randomizer.GetBytes(iv);
            return iv;
        }
    }
}