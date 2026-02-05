using System.Reflection;

namespace Cadena.Library.Serialization
{
    public class ReaderContext
    {
        public ReaderContext(Options options, PropertyInfo property, ValueNode valueNode)
        {
            Options = options;
            Property = property;
            Node = valueNode;
        }

        public Options Options { get; private set; }
        public PropertyInfo Property { get; private set; }
        public ValueNode Node { get; private set; }
    }
}
