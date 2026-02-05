using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Cadena.Library
{
    public class ParseException : FormatException
    {
        public ParseException() : base("Parse exception") { }
        public ParseException(string message) : base(message) { }
        public ParseException(string message, Exception exception) : base(message, exception) { }
    }
}