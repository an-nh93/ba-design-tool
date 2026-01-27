using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace BADesign.Helpers.Utils
{
    public static class MyConvert
    {
        private static CultureInfo _convertCultureInfo = new CultureInfo("en-US");
        private static string _convertDate = "MM/dd/yyyy";
        private static bool _isSetDefaultConvertCultureInfo = false;
        //private static CultureInfo _convertCult

        public static T To<T>(object obj, T defaultValue = default(T))
        {
            try
            {
                Type t = typeof(T);
                Type u = Nullable.GetUnderlyingType(t);

                if (u != null)
                {
                    if (obj == null || obj == DBNull.Value)
                        return defaultValue;

                    if (u.IsEnum)
                    {
                        return (T)Enum.Parse(u, obj.ToString());
                    }
                    else
                    {
                        return (T)ChangeType(obj, u);
                    }
                }
                else
                {
                    if (t.IsEnum)
                    {
                        return (T)Enum.Parse(t, obj.ToString());
                    }
                    else
                    {
                        if ((obj == null || obj == DBNull.Value) && defaultValue != null)
                            return (T)ChangeType(defaultValue, t);

                        return (T)ChangeType(obj, t);
                    }
                }
            }
            catch (Exception ex)
            {
                return (T)defaultValue;
            }
        }

        /// <summary>
        /// Set default for _convertCultureInfo variable to convert Value to Text DB and Text DB to Value
        /// </summary>
        private static void SetDefaultConvertCultureInfo()
        {
            if (!_isSetDefaultConvertCultureInfo)
            {
                _isSetDefaultConvertCultureInfo = true;

                //Set default for format date
                _convertDate = "MM/dd/yyyy";
                _convertCultureInfo = new CultureInfo("en-US");
                _convertCultureInfo.DateTimeFormat.ShortDatePattern = _convertDate;
                _convertCultureInfo.DateTimeFormat.DateSeparator = "/";
            }
        }

        private static object ChangeType(object value, Type newType)
        {
            if (newType == typeof(Guid))
            {
                return Guid.Parse(value.ToString());
            }
            else
            {
                return Convert.ChangeType(value, newType);
            }
        }

        /// <summary>
        /// Convert object value (int, long, double, date, text) to text before save database
        /// </summary>
        /// <param name="value"></param>
        /// <returns></returns>
        public static string ValueToTextDB<T>(T value)
        {
            if (value == null || string.IsNullOrWhiteSpace(value.ToString()))
                return null;
            Type t = typeof(T);
            MyConvert.SetDefaultConvertCultureInfo();
            if (t.Equals(typeof(double)) || t.Equals(typeof(double?)))
            {
                double doubleVal = 0;
                //if (value != null && value.ToString().Length > 0)
                doubleVal = Convert.ToDouble(value);
                //if (doubleVal == 0)
                //    return string.Empty;
                //else
                {
                    return doubleVal.ToString(_convertCultureInfo);
                }
            }

            if (t.Equals(typeof(DateTime)) ||
                t.Equals(typeof(DateTime?)) ||
                Nullable.GetUnderlyingType(t) == typeof(DateTime))
            {
                DateTime datetimeVal = DateTime.Now;
                //if (value != null && value.ToString().Length > 0)
                datetimeVal = Convert.ToDateTime(value);
                if (datetimeVal == DateTime.Now || datetimeVal == ((DateTime?)(null)).GetValueOrDefault())
                {
                    //return string.Empty;
                    return null;
                }
                else
                    return datetimeVal.ToString(_convertDate, _convertCultureInfo);
            }

            return value.ToString();
        }

        /// <summary>
        /// Convert string value get from database to data type of value
        /// </summary>
        /// <param name="value"></param>
        /// <returns></returns>
        public static T TextDBToValue<T>(object value)
        {
            Type t = typeof(T);
            try
            {
                MyConvert.SetDefaultConvertCultureInfo();
                //Convert to DateTime
                if (t.Equals(typeof(DateTime)) || t.Equals(typeof(DateTime?)))
                {
                    if (value == null || string.IsNullOrWhiteSpace(value.ToString()))
                    {
                        if (t.Equals(typeof(DateTime)))
                            return (T)ChangeType(DateTime.Now, typeof(DateTime));
                        else
                            return (T)ChangeType(null, typeof(DateTime?));
                    }
                    else
                        return (T)ChangeType(DateTime.Parse(value.ToString(), _convertCultureInfo), typeof(DateTime));
                }
                //Convert to double
                if (t.Equals(typeof(double)) || t.Equals(typeof(double?)))
                {
                    if (value == null || string.IsNullOrWhiteSpace(value.ToString()))
                    {
                        if (t.Equals(typeof(double)))
                            return (T)ChangeType(0, typeof(double));
                        else
                            return (T)ChangeType(null, typeof(double?));
                    }
                    else
                    {
                        try
                        {
                            return (T)ChangeType(double.Parse(value.ToString(), _convertCultureInfo), typeof(double));
                        }
                        catch (Exception)
                        {
                            return (T)ChangeType(0, typeof(double));
                        }
                    }
                }

                return MyConvert.To<T>(value);
            }
            catch (Exception ex)
            {
                string stringValue = (value == null || string.IsNullOrWhiteSpace(value.ToString())) ? "IsNullOrWhiteSpace" : value.ToString();
                string message = string.Format("Could not convert data {0} to data type {1} by TextDBToValue function", value, t.ToString());
                throw new ConvertDataTypeException(message, ex);
            }
        }
    }

    public class ConvertDataTypeException : Exception
    {
        public ConvertDataTypeException()
            : base("Cadena Convert Data Type Exception")
        {
        }

        public ConvertDataTypeException(string message)
            : base(message)
        {
        }

        public ConvertDataTypeException(string message, Exception exception)
            : base(message, exception)
        {
        }
    }
}