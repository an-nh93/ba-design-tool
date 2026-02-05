using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Cadena.Library
{
    public static class Exceptions
    {
        public static TResult Wrap<T, TResult>(Func<TResult> action, Func<T, Exception> wrapper) where T : Exception
        {
            try { return action(); } catch (T exception) { throw wrapper(exception); }
        }

        public static object Wrap<T>(Func<object> action, Func<T, Exception> wrapper) where T : Exception
        {
            try { return action(); } catch (T exception) { throw wrapper(exception); }
        }

        public static TResult Wrap<TResult>(Func<TResult> action, Func<Exception, Exception> wrapper)
        {
            try { return action(); } catch (Exception exception) { throw wrapper(exception); }
        }
    }
}