using System;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;

namespace Cadena.Library.Serialization.Providers
{
    public class NoneSerializer : ISerializer
    {
        public SerializationFormat Format
        {
            get { return SerializationFormat.None; }
        }

        public object Serialize(object value)
        {
            return value;
        }

        public object Deserialize(Type type, object serializedValue)
        {
            return serializedValue;
        }
    }


}