using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Globalization;
using System.Management;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace BADesign.Helpers
{
    /// <summary>Thu thập CPU/RAM/mạng (máy + tiến trình web + BADesign.Worker) — phục vụ IT/SuperAdmin.</summary>
    public static class ServerMetricsCollector
    {
        static readonly object Sync = new object();
        static PerformanceCounter _cpuMachineCounter;
        static bool _cpuMachineCounterUnavailable;

        static long _lastNetBytes;
        static DateTime _lastNetUtc = DateTime.MinValue;

        static DateTime _lastProcSampleUtc = DateTime.MinValue;
        static TimeSpan _lastProcCpu = TimeSpan.Zero;

        static int _lastWorkerPid = 0;
        static DateTime _lastWorkerSampleUtc = DateTime.MinValue;
        static TimeSpan _lastWorkerCpu = TimeSpan.Zero;
        static string _workerPerfInstance = null;
        static int _workerPerfPid = 0;
        static DateTime _workerPerfCacheUtc = DateTime.MinValue;
        /// <summary>Giữ một counter cho Worker; % Processor Time cần mẫu liên tiếp trên cùng instance.</summary>
        static PerformanceCounter _workerCpuPctCounter;
        static int _workerCpuPctCounterPid;
        static string _workerCpuPctInstanceName;

        public static Dictionary<string, object> GetMetricsSnapshot()
        {
            var d = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
            {
                ["success"] = true,
                ["collectTimeUtc"] = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture),
                ["machineName"] = Environment.MachineName,
                ["osVersion"] = Environment.OSVersion.ToString(),
                ["clrVersion"] = Environment.Version.ToString(),
                ["processorCount"] = Environment.ProcessorCount
            };

            try
            {
                var p = Process.GetCurrentProcess();
                p.Refresh();
                d["processId"] = p.Id;
                d["processName"] = p.ProcessName;
                d["processWorkingSetMb"] = Math.Round(p.WorkingSet64 / 1048576.0, 2);
                d["processPrivateMb"] = Math.Round(p.PrivateMemorySize64 / 1048576.0, 2);
                d["cpuProcessPercent"] = TryCalcCpuPercentDelta(
                    p.TotalProcessorTime,
                    ref _lastProcCpu,
                    ref _lastProcSampleUtc);
                if (d["cpuProcessPercent"] == null)
                    d["cpuProcessNote"] = "Lần đầu chưa đủ mẫu; refresh lần 2 sẽ có CPU.";

                PerformanceCounter counter = null;
                lock (Sync)
                {
                    if (!_cpuMachineCounterUnavailable && _cpuMachineCounter == null)
                    {
                        try
                        {
                            _cpuMachineCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                            _cpuMachineCounter.NextValue();
                        }
                        catch
                        {
                            _cpuMachineCounterUnavailable = true;
                            try { _cpuMachineCounter?.Dispose(); } catch { }
                            _cpuMachineCounter = null;
                        }
                    }
                    if (!_cpuMachineCounterUnavailable)
                        counter = _cpuMachineCounter;
                }

                if (counter != null)
                {
                    try
                    {
                        // Không sleep: monitor tự refresh định kỳ, NextValue sẽ tính dựa vào mẫu trước đó.
                        var cpuTot = counter.NextValue();
                        d["cpuMachinePercent"] = Math.Round(Math.Min(100, Math.Max(0, cpuTot)), 1);
                    }
                    catch
                    {
                        d["cpuMachinePercent"] = null;
                        d["cpuMachineNote"] = "Lỗi đọc counter CPU máy.";
                    }
                }
                else
                {
                    d["cpuMachinePercent"] = null;
                    if (_cpuMachineCounterUnavailable)
                        d["cpuMachineNote"] = "Không đọc được counter CPU máy (quyền hoặc Windows). Dùng CPU Process làm tham chiếu.";
                }

                // Fallback WMI khi PerfCounter Processor\_Total không dùng được (IIS user thường gặp).
                if (!d.ContainsKey("cpuMachinePercent") || d["cpuMachinePercent"] == null)
                {
                    double wmiCpu;
                    if (TryGetMachineCpuPercentWmi(out wmiCpu))
                    {
                        d["cpuMachinePercent"] = Math.Round(Math.Min(100, Math.Max(0, wmiCpu)), 1);
                        d["cpuMachineNote"] = "CPU máy (WMI Win32_PerfFormattedData_PerfOS_Processor).";
                    }
                }
            }
            catch (Exception ex)
            {
                d["processError"] = ex.Message;
            }

            try
            {
                ulong total, avail;
                if (TryGetGlobalMemory(out total, out avail))
                {
                    d["ramTotalMb"] = Math.Round(total / 1048576.0, 2);
                    d["ramAvailableMb"] = Math.Round(avail / 1048576.0, 2);
                    if (total > 0)
                        d["ramUsedPercent"] = Math.Round((1.0 - (double)avail / total) * 100.0, 1);
                }
            }
            catch (Exception ex)
            {
                d["memoryError"] = ex.Message;
            }

            lock (Sync)
            {
                try
                {
                    long netBytes = 0;
                    var nics = new List<Dictionary<string, object>>();
                    foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
                    {
                        if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                        var ipv4 = ni.GetIPv4Statistics();
                        var sent = ipv4.BytesSent;
                        var recv = ipv4.BytesReceived;
                        netBytes += sent + recv;
                        var row = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                        {
                            ["name"] = ni.Name,
                            ["description"] = ni.Description,
                            ["operationalStatus"] = ni.OperationalStatus.ToString(),
                            ["bytesSentMb"] = Math.Round(sent / 1048576.0, 2),
                            ["bytesReceivedMb"] = Math.Round(recv / 1048576.0, 2)
                        };
                        if (ni.Speed > 0)
                            row["speedMbps"] = Math.Round(ni.Speed / 1e6, 0);
                        nics.Add(row);
                    }
                    d["networkInterfaces"] = nics;

                    var now = DateTime.UtcNow;
                    if (_lastNetUtc != DateTime.MinValue)
                    {
                        var dt = (now - _lastNetUtc).TotalSeconds;
                        if (dt > 0.001)
                        {
                            var delta = netBytes - _lastNetBytes;
                            d["networkBytesPerSec"] = (long)(delta / dt);
                        }
                        else
                            d["networkBytesPerSec"] = 0L;
                    }
                    else
                        d["networkBytesPerSec"] = 0L;
                    _lastNetBytes = netBytes;
                    _lastNetUtc = now;
                }
                catch (Exception ex)
                {
                    d["networkError"] = ex.Message;
                }
            }

            d["worker"] = TryCollectWorkerMetrics();
            return d;
        }

        static Dictionary<string, object> TryCollectWorkerMetrics()
        {
            var w = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            try
            {
                var workerCfgPath = ResolveWorkerExePathFromConfig();
                if (!string.IsNullOrEmpty(workerCfgPath))
                    w["configuredExePath"] = workerCfgPath;
                var p = GetWorkerProcessFast();
                if (p == null)
                {
                    w["ok"] = false;
                    w["isRunning"] = false;
                    w["message"] = "Không tìm thấy process BADesign.Worker.";
                    if (!string.IsNullOrEmpty(workerCfgPath))
                        w["message"] = "Không tìm thấy process BADesign.Worker khớp WorkerExePath: " + workerCfgPath;
                    return w;
                }

                w["ok"] = true;
                w["isRunning"] = true;
                try { w["processId"] = p.Id; } catch { }
                try { w["processName"] = p.ProcessName; } catch { }
                try { p.Refresh(); } catch { }
                try
                {
                    var mp = p.MainModule;
                    if (mp != null && !string.IsNullOrEmpty(mp.FileName))
                        w["exePath"] = mp.FileName;
                }
                catch { }
                if (!w.ContainsKey("exePath"))
                {
                    int spid;
                    string spath;
                    if (TryGetWorkerServiceRuntimeInfo(ResolveWorkerServiceNameFromConfig(), out spid, out spath))
                    {
                        if (!string.IsNullOrWhiteSpace(spath))
                            w["exePath"] = spath;
                    }
                }
                if (!string.IsNullOrEmpty(workerCfgPath))
                {
                    object exeObj;
                    if (w.TryGetValue("exePath", out exeObj))
                    {
                        var exeNow = Convert.ToString(exeObj, CultureInfo.InvariantCulture);
                        try
                        {
                            if (!string.Equals(Path.GetFullPath(exeNow), workerCfgPath, StringComparison.OrdinalIgnoreCase))
                                w["pathWarning"] = "WorkerExePath không khớp process hiện tại. Đã fallback theo tên process.";
                        }
                        catch
                        {
                            if (!string.Equals(exeNow, workerCfgPath, StringComparison.OrdinalIgnoreCase))
                                w["pathWarning"] = "WorkerExePath không khớp process hiện tại. Đã fallback theo tên process.";
                        }
                    }
                }

                bool anyDenied = false;
                try { w["workingSetMb"] = Math.Round(p.WorkingSet64 / 1048576.0, 2); }
                catch (Exception ex) { anyDenied = IsAccessDenied(ex); w["wsError"] = ex.Message; }

                try { w["privateMb"] = Math.Round(p.PrivateMemorySize64 / 1048576.0, 2); }
                catch (Exception ex) { anyDenied = anyDenied || IsAccessDenied(ex); w["privateError"] = ex.Message; }

                try
                {
                    var cpu = TryCalcCpuPercentDelta(
                        p.TotalProcessorTime,
                        ref _lastWorkerCpu,
                        ref _lastWorkerSampleUtc);
                    w["cpuPercent"] = cpu;
                    if (cpu == null)
                        w["cpuNote"] = "Lần đầu chưa đủ mẫu; refresh lần 2 sẽ có CPU.";
                }
                catch (Exception ex)
                {
                    anyDenied = anyDenied || IsAccessDenied(ex);
                    w["cpuError"] = ex.Message;
                }

                if (anyDenied)
                {
                    // Fallback qua WMI để vẫn lấy được RAM/CPU cho service (không cần mở handle trực tiếp tới process).
                    try
                    {
                        var pidObj = w.ContainsKey("processId") ? w["processId"] : null;
                        int pid;
                        if (pidObj != null && int.TryParse(Convert.ToString(pidObj, CultureInfo.InvariantCulture), out pid) && pid > 0)
                        {
                            if (TryFillWorkerMetricsViaWmi(pid, w))
                                w["permissionHint"] = "Đang dùng WMI fallback vì web bị Access denied khi đọc trực tiếp process Worker.";
                            else
                                w["permissionHint"] = "Web bị Access denied khi đọc Worker; WMI fallback cũng không đọc được. Cần chạy AppPool dưới user có quyền.";

                            // Nếu vẫn chưa có CPU, thử perf counter theo PID (thường đọc được dù không mở handle process)
                            if (!w.ContainsKey("cpuPercent") || w["cpuPercent"] == null)
                            {
                                double cpuPc;
                                if (TryGetProcessCpuPercentViaPerfCounter(pid, out cpuPc))
                                {
                                    w["cpuPercent"] = cpuPc;
                                    w["cpuSource"] = "perfCounter";
                                }
                            }
                        }
                        else
                            w["permissionHint"] = "Web process không đủ quyền đọc thông tin Worker (Access denied). Cần chạy AppPool dưới user có quyền hoặc cấp quyền query process.";
                    }
                    catch
                    {
                        w["permissionHint"] = "Web process không đủ quyền đọc thông tin Worker (Access denied). Cần chạy AppPool dưới user có quyền hoặc cấp quyền query process.";
                    }
                }
                // Lần đầu delta CPU có thể null; hoặc WMI chưa trả % — thử perf counter theo PID (cùng cơ chế Get-Counter).
                if (Convert.ToBoolean(w["isRunning"], CultureInfo.InvariantCulture)
                    && (!w.ContainsKey("cpuPercent") || w["cpuPercent"] == null))
                {
                    object pidObj2;
                    int pid2;
                    if (w.TryGetValue("processId", out pidObj2) && pidObj2 != null
                        && int.TryParse(Convert.ToString(pidObj2, CultureInfo.InvariantCulture), out pid2) && pid2 > 0)
                    {
                        double cpuPc2;
                        if (TryGetProcessCpuPercentViaPerfCounter(pid2, out cpuPc2))
                        {
                            w["cpuPercent"] = cpuPc2;
                            w["cpuSource"] = "perfCounter";
                            if (w.ContainsKey("cpuNote")) w.Remove("cpuNote");
                        }
                    }
                }
                if (w.ContainsKey("cpuPercent") && w["cpuPercent"] != null && !w.ContainsKey("cpuSource"))
                    w["cpuSource"] = anyDenied ? "wmi" : "direct";
                // Nếu đã có CPU cuối cùng thì ẩn các lỗi CPU trung gian để UI không báo lỗi giả.
                if (w.ContainsKey("cpuPercent") && w["cpuPercent"] != null)
                {
                    if (w.ContainsKey("cpuError")) w.Remove("cpuError");
                    if (w.ContainsKey("cpuWmiError")) w.Remove("cpuWmiError");
                }
            }
            catch (Exception ex)
            {
                w["ok"] = false;
                w["isRunning"] = false;
                w["message"] = ex.Message;
            }
            return w;
        }

        static bool TryFillWorkerMetricsViaWmi(int pid, Dictionary<string, object> w)
        {
            try
            {
                // WorkingSetSize, PrivatePageCount (bytes), KernelModeTime/UserModeTime (100ns)
                var q = "SELECT ProcessId, WorkingSetSize, PrivatePageCount, KernelModeTime, UserModeTime, Name, ExecutablePath FROM Win32_Process WHERE ProcessId=" + pid;
                using (var searcher = new ManagementObjectSearcher(q))
                using (var results = searcher.Get())
                {
                    foreach (ManagementObject mo in results)
                    {
                        try
                        {
                            if (!w.ContainsKey("processName") && mo["Name"] != null) w["processName"] = Convert.ToString(mo["Name"], CultureInfo.InvariantCulture);
                            if (mo["ExecutablePath"] != null) w["exePath"] = Convert.ToString(mo["ExecutablePath"], CultureInfo.InvariantCulture);

                            if (!w.ContainsKey("workingSetMb") && mo["WorkingSetSize"] != null)
                            {
                                ulong ws = Convert.ToUInt64(mo["WorkingSetSize"], CultureInfo.InvariantCulture);
                                w["workingSetMb"] = Math.Round(ws / 1048576.0, 2);
                            }
                            if (!w.ContainsKey("privateMb") && mo["PrivatePageCount"] != null)
                            {
                                ulong priv = Convert.ToUInt64(mo["PrivatePageCount"], CultureInfo.InvariantCulture);
                                w["privateMb"] = Math.Round(priv / 1048576.0, 2);
                            }

                            // CPU% từ tổng Kernel+User time WMI (100ns) → TimeSpan
                            if (mo["KernelModeTime"] != null && mo["UserModeTime"] != null)
                            {
                                ulong k = Convert.ToUInt64(mo["KernelModeTime"], CultureInfo.InvariantCulture);
                                ulong u = Convert.ToUInt64(mo["UserModeTime"], CultureInfo.InvariantCulture);
                                // 100ns ticks => TimeSpan ticks (also 100ns)
                                var total = new TimeSpan((long)Math.Min(long.MaxValue, (k + u)));
                                var cpu = TryCalcCpuPercentDelta(total, ref _lastWorkerCpu, ref _lastWorkerSampleUtc);
                                w["cpuPercent"] = cpu;
                                if (cpu == null)
                                    w["cpuNote"] = "Lần đầu chưa đủ mẫu; refresh lần 2 sẽ có CPU.";
                            }
                        }
                        finally
                        {
                            try { mo.Dispose(); } catch { }
                        }
                        if (!w.ContainsKey("cpuPercent"))
                            TryFillWorkerCpuViaPerfWmi(pid, w);
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                w["wmiError"] = ex.Message;
            }
            return false;
        }

        static bool TryGetMachineCpuPercentWmi(out double percent)
        {
            percent = 0;
            try
            {
                var q = "SELECT PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor WHERE Name='_Total'";
                using (var searcher = new ManagementObjectSearcher(q))
                using (var results = searcher.Get())
                {
                    foreach (ManagementObject mo in results)
                    {
                        try
                        {
                            if (mo["PercentProcessorTime"] != null)
                            {
                                percent = Convert.ToDouble(mo["PercentProcessorTime"], CultureInfo.InvariantCulture);
                                return true;
                            }
                        }
                        finally { try { mo.Dispose(); } catch { } }
                    }
                }
            }
            catch { }
            return false;
        }

        static void TryFillWorkerCpuViaPerfWmi(int pid, Dictionary<string, object> w)
        {
            try
            {
                var q = "SELECT IDProcess, PercentProcessorTime FROM Win32_PerfFormattedData_PerfProc_Process WHERE IDProcess=" + pid;
                using (var searcher = new ManagementObjectSearcher(q))
                using (var results = searcher.Get())
                {
                    foreach (ManagementObject mo in results)
                    {
                        try
                        {
                            if (mo["PercentProcessorTime"] != null)
                            {
                                double cpu = Convert.ToDouble(mo["PercentProcessorTime"], CultureInfo.InvariantCulture);
                                if (cpu < 0) cpu = 0;
                                if (cpu > 100) cpu = 100;
                                w["cpuPercent"] = Math.Round(cpu, 1);
                                if (w.ContainsKey("cpuNote")) w.Remove("cpuNote");
                            }
                        }
                        finally
                        {
                            try { mo.Dispose(); } catch { }
                        }
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                w["cpuWmiError"] = ex.Message;
            }
        }

        static bool TryGetProcessCpuPercentViaPerfCounter(int pid, out double cpuPercent)
        {
            cpuPercent = 0;
            try
            {
                var instanceName = FindProcessPerfInstanceNameForPid(pid);
                if (string.IsNullOrEmpty(instanceName))
                    return false;

                _workerPerfInstance = instanceName;
                _workerPerfPid = pid;
                _workerPerfCacheUtc = DateTime.UtcNow;

                lock (Sync)
                {
                    if (_workerCpuPctCounter == null || _workerCpuPctCounterPid != pid
                        || !string.Equals(_workerCpuPctInstanceName, instanceName, StringComparison.OrdinalIgnoreCase))
                    {
                        try { _workerCpuPctCounter?.Dispose(); } catch { }
                        _workerCpuPctCounter = null;
                        _workerCpuPctCounterPid = pid;
                        _workerCpuPctInstanceName = instanceName;
                        try
                        {
                            _workerCpuPctCounter = new PerformanceCounter("Process", "% Processor Time", instanceName, true);
                            _workerCpuPctCounter.NextValue();
                        }
                        catch
                        {
                            _workerCpuPctCounter = null;
                            return false;
                        }
                    }

                    var v = _workerCpuPctCounter.NextValue();
                    var nProc = Math.Max(1, Environment.ProcessorCount);
                    var pct = v / nProc;
                    if (pct < 0) pct = 0;
                    if (pct > 100) pct = 100;
                    cpuPercent = Math.Round(pct, 1);
                    return true;
                }
            }
            catch { }
            return false;
        }

        static string FindProcessPerfInstanceNameForPid(int pid)
        {
            try
            {
                var cat = new PerformanceCounterCategory("Process");
                var instances = cat.GetInstanceNames();
                for (int i = 0; i < instances.Length; i++)
                {
                    var name = instances[i];
                    try
                    {
                        using (var cId = new PerformanceCounter("Process", "ID Process", name, true))
                        {
                            if ((int)cId.RawValue != pid) continue;
                        }
                        return name;
                    }
                    catch { }
                }
            }
            catch { }
            return null;
        }

        static bool IsAccessDenied(Exception ex)
        {
            if (ex == null) return false;
            try
            {
                if (ex is UnauthorizedAccessException) return true;
                var msg = ex.Message ?? "";
                return msg.IndexOf("Access is denied", StringComparison.OrdinalIgnoreCase) >= 0
                    || msg.IndexOf("denied", StringComparison.OrdinalIgnoreCase) >= 0;
            }
            catch { return false; }
        }

        static Process GetWorkerProcessFast()
        {
            var targetExe = ResolveWorkerExePathFromConfig();
            var serviceName = ResolveWorkerServiceNameFromConfig();

            int svcPid;
            string svcPath;
            if (TryGetWorkerServiceRuntimeInfo(serviceName, out svcPid, out svcPath))
            {
                if (svcPid > 0)
                {
                    try
                    {
                        var bySvcPid = Process.GetProcessById(svcPid);
                        if (bySvcPid != null && !bySvcPid.HasExited)
                        {
                            _lastWorkerPid = bySvcPid.Id;
                            return bySvcPid;
                        }
                    }
                    catch { }
                }
            }

            // Cache PID để không phải dò lại mỗi lần refresh
            if (_lastWorkerPid > 0)
            {
                try
                {
                    var p = Process.GetProcessById(_lastWorkerPid);
                    if (p != null && !p.HasExited)
                    {
                        if (!string.IsNullOrEmpty(targetExe) && !TryProcessExePathEquals(p, targetExe))
                        {
                            try { p.Dispose(); } catch { }
                            _lastWorkerPid = 0;
                            _lastWorkerSampleUtc = DateTime.MinValue;
                            _lastWorkerCpu = TimeSpan.Zero;
                        }
                        else
                            return p;
                    }
                }
                catch { /* PID đổi */ }
                _lastWorkerPid = 0;
                _lastWorkerSampleUtc = DateTime.MinValue;
                _lastWorkerCpu = TimeSpan.Zero;
            }

            if (!string.IsNullOrEmpty(targetExe))
            {
                var byPath = FindWorkerProcessByExePath(targetExe);
                if (byPath != null)
                {
                    _lastWorkerPid = byPath.Id;
                    return byPath;
                }
                // WorkerExePath có thể cũ/sai; fallback theo tên để vẫn hiển thị được số liệu.
                var byNameFallback = FindWorkerProcessByName();
                if (byNameFallback != null)
                {
                    _lastWorkerPid = byNameFallback.Id;
                    return byNameFallback;
                }
                return null;
            }

            var byName = FindWorkerProcessByName();
            if (byName != null)
                _lastWorkerPid = byName.Id;
            return byName;
        }

        static string ResolveWorkerExePathFromConfig()
        {
            try
            {
                var s = ConfigurationManager.AppSettings["WorkerExePath"];
                if (string.IsNullOrWhiteSpace(s)) return null;
                s = s.Trim().Trim('"');
                try
                {
                    return Path.GetFullPath(s);
                }
                catch
                {
                    return s;
                }
            }
            catch { return null; }
        }

        static string ResolveWorkerServiceNameFromConfig()
        {
            try
            {
                var s = ConfigurationManager.AppSettings["WorkerServiceName"];
                if (string.IsNullOrWhiteSpace(s)) return "BADesignWorker";
                return s.Trim();
            }
            catch { return "BADesignWorker"; }
        }

        static bool TryGetWorkerServiceRuntimeInfo(string serviceName, out int processId, out string exePath)
        {
            processId = 0;
            exePath = null;
            if (string.IsNullOrWhiteSpace(serviceName)) return false;
            try
            {
                var q = "SELECT Name, State, ProcessId, PathName FROM Win32_Service WHERE Name='" + serviceName.Replace("'", "''") + "'";
                using (var searcher = new ManagementObjectSearcher(q))
                using (var results = searcher.Get())
                {
                    foreach (ManagementObject mo in results)
                    {
                        try
                        {
                            var state = mo["State"] != null ? Convert.ToString(mo["State"], CultureInfo.InvariantCulture) : null;
                            if (!string.Equals(state, "Running", StringComparison.OrdinalIgnoreCase)) return false;
                            if (mo["ProcessId"] != null) processId = Convert.ToInt32(mo["ProcessId"], CultureInfo.InvariantCulture);
                            if (mo["PathName"] != null)
                            {
                                var p = Convert.ToString(mo["PathName"], CultureInfo.InvariantCulture);
                                if (!string.IsNullOrWhiteSpace(p))
                                    exePath = p.Trim().Trim('"');
                            }
                            return processId > 0;
                        }
                        finally { try { mo.Dispose(); } catch { } }
                    }
                }
            }
            catch { }
            return false;
        }

        static bool TryProcessExePathEquals(Process p, string targetFullPath)
        {
            if (p == null || string.IsNullOrEmpty(targetFullPath)) return false;
            try
            {
                p.Refresh();
                var mp = p.MainModule;
                if (mp == null || string.IsNullOrEmpty(mp.FileName)) return false;
                return string.Equals(Path.GetFullPath(mp.FileName), targetFullPath, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        static Process FindWorkerProcessByExePath(string targetFullPath)
        {
            if (string.IsNullOrEmpty(targetFullPath)) return null;

            Process[] candidates = null;
            try { candidates = Process.GetProcessesByName("BADesign.Worker"); } catch { candidates = null; }
            if (candidates == null || candidates.Length == 0)
                try { candidates = Process.GetProcessesByName("BADesignWorker"); } catch { candidates = null; }

            if (candidates != null)
            {
                foreach (var p in candidates)
                {
                    try
                    {
                        if (TryProcessExePathEquals(p, targetFullPath))
                            return p;
                    }
                    catch { }
                    try { p.Dispose(); } catch { }
                }
            }

            Process found = null;
            Process[] all = null;
            try { all = Process.GetProcesses(); } catch { all = null; }
            if (all == null) return null;
            foreach (var p in all)
            {
                try
                {
                    if (found == null && TryProcessExePathEquals(p, targetFullPath))
                        found = p;
                }
                catch { }
                finally
                {
                    if (found != p)
                        try { p.Dispose(); } catch { }
                }
            }
            return found;
        }

        static Process FindWorkerProcessByName()
        {
            Process best = null;
            long maxWs = -1;
            Process[] arr = null;
            try { arr = Process.GetProcessesByName("BADesign.Worker"); } catch { arr = null; }
            if (arr == null || arr.Length == 0)
                try { arr = Process.GetProcessesByName("BADesignWorker"); } catch { arr = null; }

            if (arr == null || arr.Length == 0) return null;
            for (int i = 0; i < arr.Length; i++)
            {
                try
                {
                    var ws = arr[i].WorkingSet64;
                    if (best == null || ws > maxWs)
                    {
                        best = arr[i];
                        maxWs = ws;
                    }
                }
                catch { }
            }
            return best;
        }

        static double? TryCalcCpuPercentDelta(TimeSpan currentTotalCpu, ref TimeSpan lastTotalCpu, ref DateTime lastUtc)
        {
            var now = DateTime.UtcNow;
            if (lastUtc == DateTime.MinValue)
            {
                lastUtc = now;
                lastTotalCpu = currentTotalCpu;
                return null;
            }
            var dt = (now - lastUtc).TotalMilliseconds;
            var dcpu = (currentTotalCpu - lastTotalCpu).TotalMilliseconds;
            lastUtc = now;
            lastTotalCpu = currentTotalCpu;
            if (dt <= 1) return null;
            var nProc = Math.Max(1, Environment.ProcessorCount);
            var pct = (dcpu / (dt * nProc)) * 100.0;
            if (pct > 100) pct = 100;
            if (pct < 0) pct = 0;
            return Math.Round(pct, 1);
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        struct MEMORYSTATUSEX
        {
            public uint dwLength;
            public uint dwMemoryLoad;
            public ulong ullTotalPhys;
            public ulong ullAvailPhys;
            public ulong ullTotalPageFile;
            public ulong ullAvailPageFile;
            public ulong ullTotalVirtual;
            public ulong ullAvailVirtual;
            public ulong ullAvailExtendedVirtual;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

        static bool TryGetGlobalMemory(out ulong totalPhys, out ulong availPhys)
        {
            totalPhys = availPhys = 0;
            MEMORYSTATUSEX ms = new MEMORYSTATUSEX();
            ms.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
            if (!GlobalMemoryStatusEx(ref ms)) return false;
            totalPhys = ms.ullTotalPhys;
            availPhys = ms.ullAvailPhys;
            return true;
        }
    }
}
