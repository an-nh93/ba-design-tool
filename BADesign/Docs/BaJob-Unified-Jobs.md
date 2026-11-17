# Bảng BaJob — Job chung cho mọi tác vụ chạy nền

## Mục đích

Một bảng **BaJob** thay cho nhiều bảng (BaRestoreJob, BaBackupJob, …), phân biệt loại job bằng cột **JobType**. Chuông thông báo gọi **GetJobs()** và **DismissJob(jobId)** cho mọi loại.

## Cấu trúc bảng (AddBaJob.sql)

| Cột | Mô tả |
|-----|--------|
| Id | PK, identity |
| **JobType** | 'Restore', 'Backup', 'UpdateUser', 'UpdateEmployee', … |
| ServerId, ServerName, DatabaseName | Dùng cho Restore/Backup (nullable) |
| BackupFileName, FileName | Restore: file .bak chọn; Backup: file .bak tạo ra |
| SessionId | Restore: SPID để poll % (nullable) |
| StartedByUserId, StartedByUserName, StartTime | Chung |
| Status | 'Running', 'Completed', 'Failed' |
| PercentComplete | 0–100 |
| Message, CompletedAt, DismissedAt | Nullable |
| **Payload** | NVARCHAR(MAX), JSON cho loại job mới (UpdateUser, UpdateEmployee, …) |

## JobType hiện có

- **Restore** — Restore database (StartRestore → INSERT BaJob JobType='Restore', timer cập nhật PercentComplete).
- **Backup** — Backup database (StartBackup → INSERT BaJob JobType='Backup', Task.Run cập nhật khi xong).

## Thêm loại job mới (vd: UpdateUser, UpdateEmployee)

1. **INSERT job:**  
   `INSERT INTO BaJob (JobType, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Payload) VALUES (N'UpdateUser', @uid, @uname, SYSDATETIME(), N'Running', 0, @json);`

2. **Payload:** Lưu tham số/context (userId, employeeId, …) dạng JSON vào cột **Payload**.

3. **Chạy nền:** Task.Run hoặc queue xử lý; khi xong:  
   `UPDATE BaJob SET Status = N'Completed'|N'Failed', PercentComplete = 100, Message = @msg, CompletedAt = SYSDATETIME() WHERE Id = @id`

4. **Push SignalR:** Gọi **PushRestoreJobsUpdated()** hoặc **PushBackupJobsUpdated()** (client đều refresh GetJobs), hoặc thêm **PushJobsUpdated()** chung.

5. **GetJobs():** Đã lấy `WHERE JobType IN (N'Restore', N'Backup')`. Khi thêm UpdateUser/UpdateEmployee, sửa thành `WHERE JobType IN (N'Restore', N'Backup', N'UpdateUser', N'UpdateEmployee')` và map thêm type ra JSON cho client.

6. **Client:** Chuông đã hiển thị theo `job.type`; có thể thêm nhãn/icon cho 'UpdateUser', 'UpdateEmployee'.

## API

- **GetJobs()** — Danh sách job (Restore + Backup + …), có `type` cho từng dòng.
- **DismissJob(jobId)** — Đánh dấu đã đọc (mọi JobType).
- **DismissRestoreJob**, **DismissBackupJob** — Giữ để tương thích, gọi DismissJob.

## Migration

- **AddBaJob.sql** — Tạo bảng BaJob.
- **MigrateRestoreAndBackupJobsToBaJob.sql** — Copy dữ liệu từ BaRestoreJob, BaBackupJob sang BaJob (chạy một lần). Sau đó có thể xóa bảng cũ.
