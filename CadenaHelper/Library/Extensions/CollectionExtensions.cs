using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Cadena.Library
{
    public static class CollectionExtensions
    {
        public static Dictionary<string, TElement> ToDictionary<TSource, TElement>(
            this IEnumerable<TSource> source,
            Func<TSource, string> keySelector,
            Func<TSource, TElement> elementSelector,
            bool caseInsensitiveKey)
        {
            var result = source.ToDictionary(keySelector, elementSelector);
            return caseInsensitiveKey ? new Dictionary<string, TElement>(result, StringComparer.OrdinalIgnoreCase) : result;
        }

        public static List<T> Clone<T>(this List<T> listToClone) where T : ICloneable
        {
            return listToClone.Select(item => (T)item.Clone()).ToList();
        }

        public static void ForEach(this IEnumerable source, Action<object> action)
        {
            foreach (var item in source) action(item);
        }

        public static void ForEach<T>(this IEnumerable<T> source, Action<T> action)
        {
            foreach (var item in source) action(item);
        }

        public static IEnumerable AsXmlEnumerable(this object source)
        {
            return (IEnumerable)source;
        }

        public static IEnumerable Select(this IEnumerable source, Func<object, object> map)
        {
            return source.Cast<object>().Select<object, object>(map);
        }

        public static IEnumerable<T> ConcatIf<T>(this IEnumerable<T> source1, bool shouldConcat, IEnumerable<T> source2)
        {
            return shouldConcat ? source1.Concat(source2) : source1;
        }

        public static Array ToArray(this IList source, Type type)
        {
            var array = Array.CreateInstance(type, source.Count);
            source.CopyTo(array, 0);
            return array;
        }

        public static bool IsNullOrEmpty<T>(this ICollection<T> collection)
        {
            return collection == null || collection.Count <= 0;
        }

        /// <summary>
        /// Swap two elemnts
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="collection"></param>
        /// <param name="index1"></param>
        /// <param name="index2"></param>
        public static void SwapElements<T>(this IList<T> collection, int index1, int index2)
        {
            T temp = collection[index1];
            collection[index1] = collection[index2];
            collection[index2] = temp;
        }

        public static void AddRange<T, S>(this Dictionary<T, S> source, Dictionary<T, S> collection)
        {
            if (collection != null && collection.Count > 0)
            {
                foreach (var item in collection)
                {
                    source.Add(item.Key, item.Value);
                }
            }
        }

        /// <summary>
        /// Update value of dictionary
        /// if key existed, update value
        /// else do nothing
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <typeparam name="S"></typeparam>
        /// <param name="source"></param>
        /// <param name="key"></param>
        /// <param name="value"></param>
        public static void UpdateDictionaryEntry<T, S>(this Dictionary<T, S> source, T key, S value)
        {
            if (source.ContainsKey(key))
            {
                source[key] = value;
            }
        }

        /// <summary>
        /// Convert IEnumerable(List data) to dictionary to Pivot
        /// </summary>
        /// <typeparam name="TSource"></typeparam>
        /// <typeparam name="TKey1"></typeparam>
        /// <typeparam name="TKey2"></typeparam>
        /// <typeparam name="TValue"></typeparam>
        /// <param name="source"></param>
        /// <param name="key1Selector">group by</param>
        /// <param name="key2Selector">Column Name</param>
        /// <param name="aggregate">Operation for pivot like sum, aggregate, min, max</param>
        /// <returns></returns>
        public static Dictionary<TKey1, Dictionary<TKey2, TValue>> Pivot3<TSource, TKey1, TKey2, TValue>(
        this IEnumerable<TSource> source
        , Func<TSource, TKey1> key1Selector
        , Func<TSource, TKey2> key2Selector
        , Func<IEnumerable<TSource>, TValue> aggregate)
        {
            return source.GroupBy(key1Selector).Select(
                x => new
                {
                    X = x.Key,
                    Y = source.GroupBy(key2Selector).Select(
                        z => new
                        {
                            Z = z.Key,
                            V = aggregate(from item in source
                                          where key1Selector(item).Equals(x.Key)
                                          && key2Selector(item).Equals(z.Key)
                                          select item
                            )
                        }
                    ).ToDictionary(e => e.Z, o => o.V)
                }
            ).ToDictionary(e => e.X, o => o.Y);
        }

        public static IEnumerable<TSource> DistinctBy<TSource, TKey>
        (this IEnumerable<TSource> source, Func<TSource, TKey> keySelector)
        {
            HashSet<TKey> knownKeys = new HashSet<TKey>();
            foreach (TSource element in source)
            {
                if (knownKeys.Add(keySelector(element)))
                {
                    yield return element;
                }
            }
        }

        public static object Sum(this IQueryable source, string member)
        {
            if (source == null) throw new ArgumentNullException("source");
            if (member == null) throw new ArgumentNullException("member");

            // Properties
            PropertyInfo property = source.ElementType.GetProperty(member);
            ParameterExpression parameter = Expression.Parameter(source.ElementType, "s");
            Expression selector = Expression.Lambda(Expression.MakeMemberAccess(parameter, property), parameter);

            // We've tried to find an expression of the type Expression<Func<TSource, TAcc>>,
            // which is expressed as ( (TSource s) => s.Price );

            // Method
            MethodInfo sumMethod = typeof(Queryable).GetMethods().First(
                m => m.Name == "Sum"
                    && m.ReturnType == property.PropertyType // should match the type of the property
                    && m.IsGenericMethod);

            return source.Provider.Execute(
                Expression.Call(
                    null,
                    sumMethod.MakeGenericMethod(new[] { source.ElementType }),
                    new[] { source.Expression, Expression.Quote(selector) }));
        }

        public static T[] RemoveAt<T>(this T[] source, int index)
        {
            T[] dest = new T[source.Length - 1];
            if (index > 0)
                Array.Copy(source, 0, dest, 0, index);

            if (index < source.Length - 1)
                Array.Copy(source, index + 1, dest, index, source.Length - index - 1);

            return dest;
        }

        public static IEnumerable<List<T>> SplitOn<T>(this IEnumerable<T> source, Func<T, bool> predicate)
        {
            return source.Aggregate(new List<List<T>> { new List<T>() },
                            (list, value) =>
                            {
                                if (!predicate(value)) list.Last().Add(value);
                                else list.Add(new List<T>());
                                return list;
                            });
        }
    }
}