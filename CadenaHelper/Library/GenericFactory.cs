using System;
using System.Collections.Generic;

namespace CodePractices
{
    public class Factory<K, T>
    {
        private Dictionary<K, T> _items = new Dictionary<K, T>();

        public void Add<V>(K key) where V : T, new()
        {
            _items.Add(key, new V());
        }

        public void Add(K key, Func<T> creator)
        {
            _items.Add(key, creator());
        }

        public T Create(K key)
        {
            T item;
            if (_items.TryGetValue(key, out item))
            {
                return item;
            }

            throw new ArgumentOutOfRangeException(string.Format("{0} is not found.", key));
            //Test
            //Test 2
        }
    }
}