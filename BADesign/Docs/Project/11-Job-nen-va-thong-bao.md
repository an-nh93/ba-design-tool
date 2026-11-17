# Job nền, Worker, thông báo

Backup, restore, reset HR, load nhân viên lớn không chạy trong request web. Chúng là job.

## BaJob

Một bảng cho mọi loại job (`JobType`: restore, backup, HR helper, …). Payload và kết quả là JSON. Thêm loại job mới là thêm `JobType` và handler, không thêm bảng riêng. Chi tiết cột ở `Docs/BaJob-Unified-Jobs.md`.

## Nơi chạy job

Restore, làm sạch dữ liệu, Reset Multi-DB, Update User, Update User Signature, Update Employee (kể cả Generate test data) và Update Other luôn được tạo ở trạng thái `Pending` rồi do **bộ chạy job** (`Helpers/BaJobRunner.cs`) lấy và chạy bằng hàm `Execute…Job` của loại đó. Trang chỉ gọi `BaJobQueue.Enqueue` (làm sạch dữ liệu tự `INSERT` kèm `QueueName` vì phải kiểm database đang bận) rồi trả về ngay. Danh sách loại job và hàm chạy nằm ở một chỗ: `BaJobQueue.Handlers()`.

Một bộ chạy dùng cho hai nơi chạy, chọn bằng khóa `UseBackgroundWorker` trong `Web.config`:

| `UseBackgroundWorker` | Nơi chạy |
|---|---|
| `false` | Ngay trong site web. `BaJobWebHost` khởi động bộ chạy ở `Application_Start` và đăng ký với IIS (`HostingEnvironment.RegisterObject`). Không cần file exe, dùng cho hosting chặn exe lạ. |
| `true` | `BADesign.Worker` (Windows service hoặc cửa sổ lệnh) chạy cùng bộ chạy; site chỉ tạo job. Hướng dẫn cài: `BADesign.Worker/HUONG_DAN_CAI_SERVICE.md`. |

Quy tắc của bộ chạy:

- **Hàng đợi** (`BaJob.QueueName`): job tạo khi chạy trong site mang tên `máy/site IIS/đường dẫn ứng dụng` (vd `CDV207/BADesign/`); job cho Worker để trống. Mỗi bộ chạy chỉ lấy job của hàng đợi mình, nên site dev và bản nội bộ dùng chung database không chạy hộ job của nhau. Hai site cùng database trên một máy phải khác tên site IIS.
- **Xếp hàng**: lấy job theo thứ tự tạo, tối đa `MaxConcurrentJobs` job cùng lúc (mặc định 15, tối đa 50). Job cùng loại + server + database chạy lần lượt, kể cả khi job đang chạy thuộc hàng đợi khác. Lệnh lấy job giữ khóa ứng dụng `sp_getapplock`, nên nhiều tiến trình cùng lấy không lấy trùng.
- **Bắt đầu ngay**: tạo job xong thì bộ chạy lấy luôn; ngoài ra quét lại mỗi `WorkerPollIntervalSeconds` giây (mặc định 10). Hai khóa này đặt trong `Web.config` (chạy trong site) hoặc `App.config` (Worker).
- **Nhịp sống**: mỗi 30 giây bộ chạy ghi `HeartbeatAt` cho mọi job nó đang giữ (`RunnerId`). Backup, Phân tích Multi-DB, Xóa nhân viên vẫn chạy thẳng trong site nhưng được gắn vào nhịp sống bằng `BaJobQueue.Track`.
- **Bị gián đoạn**: khi IIS dừng site (deploy, sửa `Web.config`, khởi động lại), bộ chạy ngừng lấy job, chờ job đang chạy tới khi IIS hết hạn chờ (`shutdownTimeout`, mặc định 30 giây), rồi ghi mọi job còn chạy là `Failed` với thông báo "Bị gián đoạn: nơi chạy job (site web hoặc Worker) đã dừng khi job đang chạy. Hãy chạy lại.". Tiến trình chết đột ngột thì bộ chạy cùng hàng đợi (lần khởi động sau) ghi như vậy cho job mất nhịp quá 3 phút. Job bị gián đoạn không tự chạy lại. Restore bị cắt giữa chừng có thể để database đích ở trạng thái RESTORING. Hàm chạy job trả về mà job vẫn `Running` thì bộ chạy ghi `Failed` với thông báo "Job đã dừng nhưng chưa ghi kết quả. Hãy chạy lại.", để job không giữ nhịp sống mãi.
- **Lỗi** của bộ chạy ghi vào log ứng dụng (`App_Data/Logs`, dòng `[BaJobRunner]`; Worker ghi `WorkerLog.txt`) và hiện ở trang Giám sát máy chủ, nhóm **Bộ chạy job**.
- **Cài đặt**: chạy `Scripts/AddBaJobRunner.sql` (thêm `QueueName`, `RunnerId`, `HeartbeatAt` và một index) trước khi chạy bản này. Thiếu cột thì bộ chạy báo "hãy chạy Scripts/AddBaJobRunner.sql" và job nằm chờ.

Chạy trong IIS (hosting production), app pool nên đặt:

- **Start Mode** = AlwaysRunning và **Preload Enabled** = True (cần tính năng Application Initialization của IIS), để bộ chạy khởi động cùng máy, không chờ request đầu tiên.
- **Idle Time-out** = 0, để IIS không tắt site khi không có ai dùng.
- **Regular Time Interval** = 0 (tắt khởi động lại định kỳ 29 giờ), hoặc đặt giờ cố định ban đêm.
- Tài khoản app pool có quyền ghi `App_Data` và `Content/design-thumbs`.

Thêm loại job mới: thêm `JobType` và hàm chạy vào `BaJobQueue.Handlers()`, trang tạo job bằng `BaJobQueue.Enqueue`. Không viết bản chạy riêng trong trang.

Tiến độ restore ghi file/log để web poll `GetRestoreProgress` (%), và bắn SignalR để chuông cập nhật không cần F5.

## Tiến độ

Mọi job báo tiến độ qua một chỗ: `Helpers/BaJobProgress.cs`.

- `BaJobProgress.Report(jobId, percent, message, detail)`: ghi `PercentComplete`, `Message` và đẩy SignalR. Gọi bao nhiêu lần cũng được: tối đa khoảng một lần ghi mỗi 0,8 giây cho mỗi job, lần báo cuối cùng trong khoảng đó được giữ lại và ghi sau.
- `BaJobProgress.ReportPhase(jobId, phase, localPercent, detail)`: dùng cho job nhiều giai đoạn. Restore có một thang % liên tục cho cả job (`JobProgressPlan.ForRestore`): Restore, PostRestore, Reset Information, ShrinkLog, Completing. Đổi giai đoạn thì ghi ngay. Tên giai đoạn vẫn nằm trong `Message` như cũ.
- % không bao giờ lùi (kiểm cả trong câu `UPDATE`).
- Nhịp sống: job đang chạy mà không có gì mới thì cứ 5 giây đẩy lại trạng thái hiện tại, để trình duyệt biết job còn sống.
- Trình duyệt nhận `jobProgress` (id, %, message, detail, số giây đã chạy) và tự cập nhật, không gọi lại server. `jobsUpdated` chỉ còn dùng khi danh sách job đổi (bắt đầu, kết thúc).
- `Scripts/ba-job-progress.js` (nạp từ `BaHead.ascx`): thanh trên chuông chạy mượt, đồng hồ "Đã chạy mm:ss", báo "Chưa có tín hiệu N giây" khi quá 20 giây không có nhịp, và thanh tiến độ trên màn chờ của HR Helper. Job đang chạy mà quá 6 giây không nhận được `jobProgress` thì script tự gọi `loadRestoreJobsPanel` mỗi 5 giây, nên chuông không đứng yên khi SignalR không tới.
- Restore và Backup chỉ đẩy cho nhóm `server_<id>` và `server_all`. Hub không đọc được Session, nên trang phát một mã ký sẵn (`Helpers/HubAccessToken.cs`, khóa sinh ngẫu nhiên theo tiến trình, hạn 12 giờ) qua `window.BA_HUB_TOKEN`; `ba-signalr.js` gửi mã đó trong query string khi kết nối, `RestoreNotificationHub.OnConnected` kiểm tra rồi cho vào nhóm. Không có mã hoặc mã hết hạn thì kết nối không vào nhóm nào và chuông chạy theo cơ chế tự tải lại ở trên.
- Chuông (`Scripts/ba-notification-bell.js`) và bảng job tự poll của trang bỏ qua lượt poll khi vừa nhận `jobProgress` trong 8 giây gần nhất (`BaJobProgress.isLive()`).
- Job chạy trong Worker: Worker gọi `Handlers/NotifyJobProgress.ashx`, handler đọc dòng `BaJob` rồi đẩy. Dòng chi tiết đi qua cột `ProgressDetail` (script `Scripts/AddBaJobProgressColumns.sql`); chưa có cột thì bỏ qua chi tiết.
- Update Employee tự chỉnh cỡ batch để mỗi batch khoảng 3 giây (`JobBatchSizer`), kèm ước lượng thời gian còn lại.

Thêm tiến độ cho một job mới: gọi `Report` ở mỗi bước, không tự `UPDATE BaJob` và không tự đẩy SignalR.

## Chuông

Mọi trang có top bar dùng chung chuông. Job restore/backup/HR hiện trạng thái, %, và mở chi tiết. SignalR: `Docs/SignalR-Notification-Push.md`.

Chuông chỉ có một bản, không trang nào được chép lại:

- Khung: `NotificationBell.ascx` (nằm trong `BaTopBar.ascx`), phát `window.BA_API_BASE`, `window.BA_HUB_TOKEN` và `window.BA_BELL` (đường dẫn HR Helper, Quản lý góp ý, SignalR).
- Hành vi: `Scripts/ba-notification-bell.js`. Tải danh sách (`GetJobs`), đếm số trên chuông, mở/đóng bảng, gập nhóm, nút × (`DismissJob`), nút Hủy (`CancelRestoreJob`), xem chi tiết (`GetJobResult` rồi `window.showNotificationDetail`), poll dự phòng khi không có SignalR, và tự gọi `BA_SignalR.start`.
- Chi tiết job: `Scripts/ba-notification-detail.js`, gồm cả phần riêng của job HR Helper (danh sách database, danh sách nhân viên, "Dự kiến cập nhật").
- Trang cần làm mới chuông thì gọi `window.loadRestoreJobsPanel()` (hoặc `BaBell.reload()`); cần danh sách job đang hiện thì gọi `BaBell.jobs()`. Trang muốn làm thêm việc khi job đổi thì tự đăng ký `BA_SignalR.onJobsUpdated(...)`, không cần gọi `start`.
- Nút × ghi nhận trên server (`BaJobDismissedByUser`) và nhớ thêm trong `localStorage` (`baDismissedJobIds`, tối đa 500 mục) để mục không hiện lại trước khi server trả lời; job trên server không bị xóa.
- Nút Hủy chỉ hiện với job đang chạy do chính user tạo (Super Admin hủy được mọi job), đúng theo điều kiện của `CancelJob`.

## Function Queue

`Pages/FunctionQueue.aspx` là bảng job của user: lọc ngày, loại, sort. Nơi nhìn việc đã chạy khi chuông đã tắt.

## Hủy

`CancelJob` chỉ có hiệu lực khi job chưa xong. Hàm chạy job phải nhìn cờ hủy giữa chừng, không chỉ lúc bắt đầu.

## Ý tưởng

Trang = phát lệnh và quan sát. Bộ chạy job (trong site hoặc trong Worker) = làm việc dài. Một job một dòng BaJob, dù là backup, restore hay HR.
