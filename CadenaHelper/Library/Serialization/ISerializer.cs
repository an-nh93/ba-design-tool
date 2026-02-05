using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Cadena.Library.Serialization
{
    public interface ISerializer 
    {
        SerializationFormat Format { get; }
        object Serialize(object value);
        object Deserialize(Type type, object serializedValue);
    }
}
