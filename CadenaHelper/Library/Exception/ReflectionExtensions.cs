using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Reflection;

namespace Cadena.Library
{
    public static class ReflectionExtensions
    {
        #region Methods of ReflectionExtensions

        public static IList CreateListOfEnumerableType(this Type type)
        {
            Contract.Requires(type != null);

            if (type.IsInterface)
            {
                var itemType = type.GetGenericEnumerableType();
                if (itemType != null) return (IList)Activator.CreateInstance(typeof(List<>).MakeGenericType(itemType));
                throw new ArgumentException("Interface {0} does not inherit from IEnumerable<T>.".ToFormat(type), "type");
            }
            if (type.IsArray) return (IList)Activator.CreateInstance(typeof(List<>).MakeGenericType(type.GetElementType()));
            if (type.IsList()) return (IList)Activator.CreateInstance(type);
            throw new ArgumentException("Type {0} does not implement IList.".ToFormat(type), "type");
        }

        /// <summary>
        /// Loads the custom attributes from the type
        /// </summary>
        /// <typeparam name="T">The type of the custom attribute to find.</typeparam>
        /// <param name="typeWithAttributes">The calling assembly to search.</param>
        /// <returns>The custom attribute of type T, if found.</returns>
        public static T GetAttribute<T>(this Type typeWithAttributes)
                                            where T : Attribute
        {
            return GetAttributes<T>(typeWithAttributes).FirstOrDefault();
        }

        public static T GetAttribute<T>(this MemberInfo memberInfo)
                                            where T : Attribute
        {
            return memberInfo.GetAttributes<T>().FirstOrDefault();
        }

        /// <summary>
        /// Loads the custom attributes from the type
        /// </summary>
        /// <typeparam name="T">The type of the custom attribute to find.</typeparam>
        /// <param name="typeWithAttributes">The calling assembly to search.</param>
        /// <returns>An enumeration of attributes of type T that were found.</returns>
        public static IEnumerable<T> GetAttributes<T>(this Type typeWithAttributes)
                                            where T : Attribute
        {
            // Try to find the configuration attribute for the default logger if it exists
            object[] configAttributes = Attribute.GetCustomAttributes(typeWithAttributes,
                typeof(T), false);

            if (configAttributes != null)
            {
                foreach (T attribute in configAttributes)
                {
                    yield return attribute;
                }
            }
        }

        public static IEnumerable<T> GetAttributes<T>(this MemberInfo memberInfo)
                                            where T : Attribute
        {
            object[] configAttributes = Attribute.GetCustomAttributes(memberInfo);

            if (configAttributes != null)
            {
                foreach (var attribute in configAttributes)
                {
                    T att = attribute as T;
                    if (att != null) yield return att;
                }
            }
        }

        public static T GetCustomAttribute<T>(this PropertyInfo property) where T : Attribute
        {
            Contract.Requires(property != null);

            return (T)property.GetCustomAttributes(true).FirstOrDefault(x => x.GetType() == typeof(T));
        }

        public static T GetCustomAttribute<T>(this Type type) where T : Attribute
        {
            Contract.Requires(type != null);

            return (T)type.GetCustomAttributes(true).FirstOrDefault(x => x.GetType() == typeof(T));
        }

        public static List<PropertyInfo> GetDeserializableProperties(this Type type, List<Func<Type, bool>> typeFilter = null)
        {
            Contract.Requires(type != null);

            return type.GetProperties(typeFilter).Where(x => x.CanWrite).ToList();
        }

        public static Type GetGenericEnumerableType(this Type type)
        {
            Contract.Requires(type != null);

            var enumerableInterface = (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(IEnumerable<>))
                ? type : type.GetInterfaces().FirstOrDefault(x => x.IsGenericType && x.GetGenericTypeDefinition() == typeof(IEnumerable<>));

            return enumerableInterface == null ? null : enumerableInterface.GetGenericArguments()[0];
        }

        private static IEnumerable<PropertyInfo> GetProperties(this Type type, IEnumerable<Func<Type, bool>> typeFilter = null)
        {
            Contract.Requires(type != null);

            return type.GetProperties(BindingFlags.Instance | BindingFlags.Public)
                .Where(x => typeFilter == null || !typeFilter.Any(y => y(x.PropertyType)));
        }

        public static MethodInfo GetPublicMethod(this Type type, string methodName)
        {
            Contract.Requires(type != null);

            return type.GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
        }

        public static MethodInfo GetPublicMethod<T>(this Type type, string methodName)
        {
            Contract.Requires(type != null);

            return type.GetPublicMethod(methodName, typeof(T));
        }

        public static MethodInfo GetPublicMethod(this Type type, string methodName, Type genericType)
        {
            var method = type.GetMethods(BindingFlags.Instance | BindingFlags.Public)
                .Where(m => m.IsGenericMethod && m.Name == methodName)
                .FirstOrDefault();

            var genericMethod = method.MakeGenericMethod(genericType);

            return genericMethod;
        }

        public static MethodInfo GetPublicStaticMethod(this Type type, string methodName, Type genericType)
        {
            var method = type.GetMethods(BindingFlags.Static | BindingFlags.Public | BindingFlags.FlattenHierarchy)
                .Where(m => m.IsGenericMethod && m.Name == methodName)
                .FirstOrDefault();

            var genericMethod = method.MakeGenericMethod(genericType);

            return genericMethod;
        }

        public static List<PropertyInfo> GetSerializableProperties(this Type type, List<Func<Type, bool>> typeFilter = null)
        {
            Contract.Requires(type != null);

            return type.GetProperties(typeFilter).Where(x => x.CanRead).ToList();
        }

        public static TypeCode GetTypeCode(this Type type, bool includeNullable)
        {
            return includeNullable && type.IsNullable() ? Type.GetTypeCode(Nullable.GetUnderlyingType(type)) : Type.GetTypeCode(type);
        }

        public static Type GetUnderlyingNullableType(this Type type)
        {
            Contract.Requires(type != null);

            return type.IsNullable() ? Nullable.GetUnderlyingType(type) : type;
        }

        public static bool HasConstructor(this Type type, params Type[] arguments)
        {
            Contract.Requires(type != null);

            return type.GetConstructor(arguments) != null;
        }

        public static bool HasCustomAttribute<T>(this PropertyInfo property) where T : Attribute
        {
            Contract.Requires(property != null);

            return property.GetCustomAttribute<T>() != null;
        }

        public static bool HasParameterlessConstructor(this Type type)
        {
            Contract.Requires(type != null);

            return type.GetConstructor(Type.EmptyTypes) != null;
        }

        public static bool IsBclType(this Type type)
        {
            Contract.Requires(type != null);

            return type.Namespace == "System" || type.Namespace.StartsWith("System.");
        }

        public static bool IsClrCollectionType(this Type type)
        {
            Contract.Requires(type != null);

            return type.Namespace.StartsWith("System.Collections.") || type.Namespace == "System.Collections";
        }

        public static bool IsEnumerable(this Type type)
        {
            return type.IsEnumerableInterface() || type.GetInterfaces().Any(x => x == typeof(IEnumerable));
        }

        public static bool IsEnumerableInterface(this Type type)
        {
            return type == typeof(IEnumerable);
        }

        public static bool IsEnumOrNullable(this Type type)
        {
            Contract.Requires(type != null);

            return type.IsEnum || (type.IsNullable() && Nullable.GetUnderlyingType(type).IsEnum);
        }

        public static bool IsGenericEnumerable(this Type type)
        {
            Contract.Requires(type != null);

            return type.IsGenericEnumerableInterface() ||
                type.GetInterfaces().Any(x => x.IsGenericType && x.GetGenericTypeDefinition() == typeof(IEnumerable<>));
        }

        public static bool IsGenericEnumerableInterface(this Type type)
        {
            Contract.Requires(type != null);

            return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(IEnumerable<>);
        }

        public static bool IsList(this Type type)
        {
            Contract.Requires(type != null);

            return type.GetInterfaces().Any(x => x.IsListInterface());
        }

        public static bool IsListInterface(this Type type)
        {
            Contract.Requires(type != null);

            return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(IList<>);
        }

        public static bool IsNullable(this Type type)
        {
            Contract.Requires(type != null);

            return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>);
        }

        public static bool IsSimpleType(this Type type)
        {
            Func<Type, bool> isSimpleType = x =>
            {
                return x.IsPrimitive || x.IsEnum || x == typeof(string)
                    || x == typeof(byte[]) || x == typeof(decimal)
                    || x == typeof(DateTime) || x == typeof(TimeSpan)
                    || x == typeof(Guid) || x == typeof(Uri)
                    || x == typeof(object);
            };

            return isSimpleType(type) || (type.IsNullable() && isSimpleType(Nullable.GetUnderlyingType(type)));
        }

        /// <summary>
        /// Check if a type subclasses a generic type
        /// </summary>
        /// <param name="genericType">The suspected base class</param>
        /// <returns>True if this is indeed a subclass of the given generic type</returns>
        public static bool IsSubclassOfGeneric(this Type type, Type genericType)
        {
            Type baseType = type.BaseType;

            while (baseType != null)
            {
                if (baseType.IsGenericType &&
                    baseType.GetGenericTypeDefinition() == genericType)
                    return true;
                else baseType = baseType.BaseType;
            }
            return false;
        }

        public static bool IsTypeOrNullable<T>(this Type type)
        {
            return type == typeof(T) || (type.IsNullable() && Nullable.GetUnderlyingType(type) == typeof(T));
        }

        public static T ParseEnum<T>(this string value) where T : struct
        {
            Contract.Requires(!string.IsNullOrEmpty(value));

            return (T)Enum.Parse(typeof(T), value, true);
        }

        public static object ParseSimpleType(this string value, Type type, bool defaultNonNullableTypes, Dictionary<Type, string> parseErrorMesages)
        {
            if (value.IsNullOrEmpty() && type.IsNullable()) return null;
            var returnDefault = value.IsNullOrEmpty() && defaultNonNullableTypes;
            if (type.IsEnumOrNullable())
                return returnDefault ? Activator.CreateInstance(type)
                    : Exceptions.Wrap(() => Enum.Parse(type.GetUnderlyingNullableType(), value, true),
                        x => new ParseException(parseErrorMesages[typeof(Enum)], x));

            switch (type.GetTypeCode(true))
            {
                case TypeCode.String: return value;
                case TypeCode.Char: if (value != null && value.Length == 1) return value.First(); throw new ParseException(parseErrorMesages[typeof(char)]);
                case TypeCode.Boolean: return !returnDefault && Exceptions.Wrap(() => Boolean.Parse(value), x => new ParseException(parseErrorMesages[typeof(bool)], x));
                case TypeCode.SByte: return returnDefault ? (sbyte)0 : Exceptions.Wrap(() => SByte.Parse(value), x => new ParseException(parseErrorMesages[typeof(sbyte)], x));
                case TypeCode.Byte: return returnDefault ? (byte)0 : Exceptions.Wrap(() => Byte.Parse(value), x => new ParseException(parseErrorMesages[typeof(byte)], x));
                case TypeCode.Int16: return returnDefault ? (short)0 : Exceptions.Wrap(() => Int16.Parse(value), x => new ParseException(parseErrorMesages[typeof(short)], x));
                case TypeCode.UInt16: return returnDefault ? (ushort)0 : Exceptions.Wrap(() => UInt16.Parse(value), x => new ParseException(parseErrorMesages[typeof(ushort)], x));
                case TypeCode.Int32: return returnDefault ? 0 : Exceptions.Wrap(() => Int32.Parse(value), x => new ParseException(parseErrorMesages[typeof(int)], x));
                case TypeCode.UInt32: return returnDefault ? (uint)0 : Exceptions.Wrap(() => UInt32.Parse(value), x => new ParseException(parseErrorMesages[typeof(uint)], x));
                case TypeCode.Int64: return returnDefault ? (long)0 : Exceptions.Wrap(() => Int64.Parse(value), x => new ParseException(parseErrorMesages[typeof(long)], x));
                case TypeCode.UInt64: return returnDefault ? (ulong)0 : Exceptions.Wrap(() => UInt64.Parse(value), x => new ParseException(parseErrorMesages[typeof(ulong)], x));
                case TypeCode.Single: return returnDefault ? (float)0 : Exceptions.Wrap(() => Single.Parse(value), x => new ParseException(parseErrorMesages[typeof(float)], x));
                case TypeCode.Double: return returnDefault ? (double)0 : Exceptions.Wrap(() => Double.Parse(value), x => new ParseException(parseErrorMesages[typeof(double)], x));
                case TypeCode.Decimal: return returnDefault ? (decimal)0 : Exceptions.Wrap(() => Decimal.Parse(value), x => new ParseException(parseErrorMesages[typeof(decimal)], x));
                case TypeCode.DateTime: return returnDefault ? DateTime.MinValue : Exceptions.Wrap(() => DateTime.Parse(value), x => new ParseException(parseErrorMesages[typeof(DateTime)], x));
                default:
                    if (type.IsTypeOrNullable<Guid>()) return returnDefault ? Guid.Empty : Exceptions.Wrap(() => Guid.Parse(value), x => new ParseException(parseErrorMesages[typeof(Guid)], x));
                    if (type.IsTypeOrNullable<TimeSpan>()) return returnDefault ? TimeSpan.Zero : Exceptions.Wrap(() => TimeSpan.Parse(value), x => new ParseException(parseErrorMesages[typeof(TimeSpan)], x));
                    throw new InvalidOperationException("Could not parse type {0}.".ToFormat(type));
            }
        }

        public static void SetPropertyValue(this object instance, string propertyName, object value)
        {
            Contract.Requires(instance != null);

            var propertyInfo = instance.GetType().GetProperty(propertyName);
            var propertyType = Nullable.GetUnderlyingType(propertyInfo.PropertyType) ?? propertyInfo.PropertyType;
            //if (propertyInfo.PropertyType.IsSimpleType())
            {
                var safeValue = (value == null) ? null : Convert.ChangeType(value, propertyType);
                propertyInfo.SetValue(instance, safeValue);
            }
            //else
            //{
            //    var referenceInstance = Activator.CreateInstance(propertyInfo.PropertyType);
            //    var referencePropertyInfo = referenceInstance.GetType().GetProperty("ID");
            //    var referencePropertyType = Nullable.GetUnderlyingType(referencePropertyInfo.PropertyType) ?? referencePropertyInfo.PropertyType;
            //    var referenceSafeValue = (value == null) ? null : Convert.ChangeType(value, referencePropertyType);
            //    referencePropertyInfo.SetValue(referenceInstance, referenceSafeValue);

            //    propertyInfo.SetValue(instance, referenceInstance);
            //}
        }

        public static bool IsText(this object instance)
        {
            if (instance != null)
            {
                return instance.GetType() == typeof(System.String);
            }
            return false;
        }

        public static void SetSafeValue(this PropertyInfo pInfo, object instance, object value)
        {
            if (pInfo != null)
            {
                var propertyType = Nullable.GetUnderlyingType(pInfo.PropertyType) ?? pInfo.PropertyType;
                var safeValue = (value == null) ? null : Convert.ChangeType(value, propertyType);
                pInfo.SetValue(instance, safeValue);
            }
        }

        public static string ToFriendlyType(this Type type)
        {
            Contract.Requires(type != null);

            if (type.IsEnumOrNullable()) return "enumeration";
            switch (type.GetTypeCode(true))
            {
                case TypeCode.String: return "string";
                case TypeCode.Char: return "char";
                case TypeCode.Boolean: return "boolean";
                case TypeCode.SByte: return "signedByte";
                case TypeCode.Byte: return "byte";
                case TypeCode.Int16: return "word";
                case TypeCode.UInt16: return "usignedWord";
                case TypeCode.Int32: return "integer";
                case TypeCode.UInt32: return "usignedInteger";
                case TypeCode.Int64: return "long";
                case TypeCode.UInt64: return "usignedLong";
                case TypeCode.Single: return "singleFloat";
                case TypeCode.Double: return "doubleFloat";
                case TypeCode.Decimal: return "decimal";
                case TypeCode.DateTime: return "datetime";
                default:
                    if (type.IsTypeOrNullable<Guid>()) return "guid";
                    if (type.IsTypeOrNullable<TimeSpan>()) return "duration";
                    return type.Name;
            }
        }

        #endregion Methods of ReflectionExtensions
    }
}