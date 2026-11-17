# SignalR cho thông báo chuông restore

Đã tích hợp **Microsoft.AspNet.SignalR 2.4.3**: server push thông báo xuống client khi có cập nhật (tiến độ % hoặc job completed). Client **ưu tiên SignalR** (refresh ngay khi nhận push), polling 4s chỉ làm fallback.

## Đã có trong project

- **Package:** `packages.config` có `Microsoft.AspNet.SignalR` 2.4.3; `BADesign.csproj` reference `Microsoft.AspNet.SignalR`, `Microsoft.AspNet.SignalR.Core`, `Microsoft.AspNet.SignalR.SystemWeb`.
- **Hub:** `Hubs/RestoreNotificationHub.cs` – server gọi từ bên ngoài qua `BaJobHubHelper.PushJobsUpdated(...)`.
- **Startup:** `Startup.cs` gọi `app.MapSignalR()` (route `/signalr`).
- **Server push (restore chạy trong web):** Trong `DatabaseSearch.aspx.cs`: timer cập nhật % và block `finally` khi restore xong đều gọi `PushRestoreJobsUpdated()`.
- **Worker → SignalR (restore chạy trong Worker):** Worker không chạy trong process web nên không gọi SignalR trực tiếp. Thay vào đó:
  - Worker sau mỗi lần cập nhật BaJob gọi `BaJobWorkerNotify.Notify(jobId)` (trong `UpdateJobPhaseAndPercent` / `UpdateJobPercentComplete`).
  - Worker đã đăng ký `OnBaJobUpdated = NotifyWeb` → gửi HTTP GET tới **`/Handlers/NotifyJobProgress.ashx?jobId=...`** (base URL cấu hình trong Worker).
  - Handler đọc job từ BaJob, gọi `BaJobHubHelper.PushJobsUpdated(jobType, serverId, startedByUserId)` → **web app** push SignalR xuống client.
  - Client nhận `jobsUpdated` → gọi `loadRestoreJobsPanel()` → chuông cập nhật realtime.
- **Client:** `Scripts/ba-signalr.js` – đăng ký `onRestoreJobsUpdated` / `onJobsUpdated` → khi nhận **tín hiệu push** (chỉ báo "có cập nhật", không gửi kèm % hay dữ liệu job) thì gọi `loadRestoreJobsPanel()`. Hàm này **gọi backend GetJobs** một lần để lấy danh sách job mới (gồm %, message, status) rồi render chuông. Như vậy client **chỉ gọi backend khi có push** (hoặc mỗi 4s fallback), không gọi liên tục mỗi giây. Polling 4 giây khi có job đang chạy chỉ làm fallback (mất kết nối SignalR hoặc Worker không gọi được ashx).
- **Chuông mượt, tránh giật:** Restore dùng **pollRestoreProgressOnly** (2s) cập nhật % tại chỗ, không full re-render; Backup / MultiDbAnalyze dùng **loadRestoreJobsPanel** (4s). **Caption thống nhất:** badge và dòng tiến trình dùng cùng một chữ (Restore, Backup, Phân tích, Reset) — không dùng "Đang Restore" / "Đang Backup" ở dòng % để tránh hai nguồn vẽ khác nhau.
- `DatabaseSearch.aspx` và `HomeRole.aspx` gọi `BA_SignalR.onRestoreJobsUpdated(...)` và `BA_SignalR.start(...)`.

## Restore NuGet (cần làm một lần)

Project dùng `packages.config`. Mở solution trong **Visual Studio**, vào **Package Manager Console** và chạy:

```powershell
Install-Package Microsoft.AspNet.SignalR -ProjectName BADesign -Version 2.4.3
```

Hoặc chuột phải solution → **Restore NuGet Packages**. Sau đó build lại; nếu thiếu DLL, chạy lệnh Install-Package trên.

## Tài liệu tham khảo

- [SignalR - Real-time ASP.NET](https://signalr.net/)
- [Get started with SignalR 2 and MVC 5](https://learn.microsoft.com/en-us/aspnet/signalr/overview/getting-started/tutorial-getting-started-with-signalr-and-mvc)
