using Cadena.Library.Serialization.Providers;
using CodePractices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Cadena.Library.Serialization
{
    public class SerializerFactory : Factory<SerializationFormat, ISerializer>
    {
        public static readonly ISerializer None = new NoneSerializer();
        public static readonly ISerializer Binary = new BinarySerializer();

        public SerializerFactory()
        {
            Add(SerializationFormat.None, () => SerializerFactory.None);
            Add(SerializationFormat.Binary, () => SerializerFactory.Binary);
        }
    }
}
