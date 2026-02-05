using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Cadena.Library.Serialization
{
    public enum SerializationFormat
    {        
        /// <summary>No serialization to be done</summary>
        None,
        /// <summary>JSON serialization</summary>
        Json,
        /// <summary>XML serialization</summary>
        Xml,
        /// <summary>Binary serialization</summary>
        Binary
    }
}
