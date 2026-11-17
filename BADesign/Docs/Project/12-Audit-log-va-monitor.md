# Audit log, log file, server monitor

Ba chỗ ghi khác nhau. Đừng ghi chung một túi.

## Audit log

`Pages/AuditLog.aspx`. Hành động nghiệp vụ: restore, backup, xóa database, sửa user/employee. Mỗi dòng có user, thời điểm, IP, user-agent, và chi tiết (server, database, job id). Dùng khi cần biết ai đã làm gì trên data demo.

## Log file ứng dụng

`App_Data/Logs/`. Exception và trace kỹ thuật (load nhân viên, restore). Không thay audit. Khi debug local có thể bật lỗi chi tiết trên trình duyệt; production thì chỉ file log. Xem `Docs/Application-Log.md`.

## Server monitor

`Pages/ServerMonitor.aspx`. Số liệu sức khỏe máy chạy web/worker (CPU, bộ nhớ, ổ đĩa, hàng đợi) để biết job chậm vì máy hay vì SQL. Không phải danh sách database của Database Tools.

Nhóm **Bộ chạy job** luôn hiện: nơi chạy job, số job đang chạy trên tối đa, lỗi gần nhất của bộ chạy. Nhóm **BADesign.Worker.exe** (CPU, RAM, đường dẫn của tiến trình Worker) và câu giới thiệu nhắc tới Worker chỉ hiện khi `UseBackgroundWorker=true`; để `false` (job chạy trong site) thì trang không hiện nhóm này và server không dò tiến trình Worker. Khi đó CPU/RAM của nhóm IIS / App Pool đã gồm cả job nền.

## Ý tưởng

Audit trả lời “ai đụng data”. File log trả lời “code lỗi chỗ nào”. Monitor trả lời “máy còn chịu được job không”.
