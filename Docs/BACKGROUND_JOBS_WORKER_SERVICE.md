# Job nền dài (Restore / Reset 50k+) – Session, treo web, và Worker Service

## 1. Hiện trạng

### Job chạy ở đâu?

- Restore, Backup, HR Helper (Update User/Employee, Multi-DB Reset, …) đều chạy trong **Task.Run(...)** ngay trong **process IIS** (cùng app pool với web).
- Request gọi StartRestore / StartMultiDbReset chỉ **insert BaJob + Task.Run** rồi **return ngay**; job chạy trên thread pool của IIS.

### Khi user tắt trình duyệt / hết session?

- **Job vẫn chạy**: Task không gắn với session hay connection của user. Request đã kết thúc, task chạy độc lập.
- **Rủi ro**: Nếu **IIS recycle** (idle timeout, memory limit, deploy, restart) thì **process bị tắt → job bị mất**. Restore gần 1 ngày rất dễ rơi vào trường hợp này.

### Tại sao 50k reset “treo” web?

- Một thread trong **cùng process** đang làm việc nặng (mã hóa 50k dòng, bulk copy, UPDATE).
- CPU/IO tập trung vào job → thread pool và tài nguyên dùng chung → request khác (mở trang, API) **chậm hoặc timeout** → cảm giác “treo”.

### Kết luận ngắn

| Câu hỏi | Trả lời |
|--------|--------|
| Tắt browser rồi job còn chạy không? | Có, vẫn chạy (task không phụ thuộc session). |
| Hết thời gian connect/session thì job dừng không? | Không, job không phụ thuộc connection/session. |
| Job có thể chạy gần 1 ngày an toàn không? | Không an toàn: IIS recycle sẽ **dừng process → mất job**. |
| 50k reset có làm web chậm/treo không? | Có, vì cùng process với web. |

---

## 2. Đã làm trong process (giảm treo, không đổi kiến trúc)

Để **giảm** ảnh hưởng khi vẫn chạy job trong IIS:

1. **Thread priority thấp**  
   Trong Task.Run của Restore, Multi-DB Reset, Update Employee: đặt  
   `Thread.CurrentThread.Priority = BelowNormal` (và restore lại khi xong).  
   → Ưu tiên CPU cho request web hơn.

2. **Yield sau mỗi chunk / mỗi DB**  
   - Trong **ResetEmailAndPhoneEncryptedForRestore**: sau mỗi chunk gọi `Thread.Sleep(0)` để nhường thread khác.  
   - Trong **ExecuteUpdateEmployeesCore**: sau mỗi batch update gọi `Thread.Sleep(0)`.  
   - Trong **Multi-DB Reset**: sau mỗi DB gọi `Thread.Sleep(0)`.  
   → Web có cơ hội xử lý request xen kẽ, bớt cảm giác treo.

**Giới hạn**: Vẫn cùng process IIS; job rất dài (gần 1 ngày) vẫn **không an toàn** khi app pool recycle. Muốn “job chạy dù tắt browser, dù data lớn, không ảnh hưởng web” **ổn định** thì cần tách ra process khác (Worker Service).

---

## 3. Giải pháp dài hạn: Worker Service (process riêng)

### Ý tưởng

- **Web** chỉ ghi job vào DB (trạng thái **Pending**) rồi trả về. Không gọi Task.Run cho job nặng/dài.
- **Một process khác** (Windows Service hoặc console chạy nền): định kỳ đọc BaJob (Status = Pending), đổi sang Running, **thực thi** đúng logic Restore / Reset / … trong process đó, cập nhật PercentComplete, Message, Status (Completed/Failed) vào BaJob.
- User có thể tắt browser; IIS recycle; job vẫn chạy trong Worker. Web chỉ đọc BaJob (và SignalR nếu cần) để hiển thị tiến độ.

### Lợi ích

- Job **không phụ thuộc** session, connection, hay lifecycle của IIS.
- Restore gần **1 ngày** vẫn chạy đến hết (trừ khi tắt máy / tắt service).
- Web **không** chạy logic nặng → không bị treo khi 50k reset.

### Cần thêm trong DB

- **BaJob.Status** hỗ trợ thêm giá trị **`Pending`** (hoặc dùng cột riêng nếu không muốn đụng status hiện tại).
- Job do web tạo (Restore, Multi-DB Reset, …) khi muốn giao cho Worker thì insert với **Status = 'Pending'** (và đủ Payload/ServerId/DatabaseName/… như hiện tại).

### Worker làm gì?

1. Kết nối DB app (connection string từ config, giống UiAuthHelper.ConnStr).
2. Vòng lặp (ví dụ mỗi 5–10 giây):
   - `SELECT TOP 1 * FROM BaJob WHERE Status = N'Pending' AND JobType IN (N'Restore', N'HRHelperMultiDbReset', ...) ORDER BY Id`
   - Nếu có dòng: update `Status = N'Running'`, rồi **thực thi** đúng loại job (Restore / Multi-DB Reset / …) giống code hiện tại trong DatabaseSearch / HRHelper (có thể copy logic sang project Worker hoặc gọi shared library).
3. Trong lúc chạy: cập nhật **PercentComplete**, **Message** vào BaJob (giống hiện tại).
4. Khi xong: update **Status = Completed/Failed**, **CompletedAt**, **Message**.
5. (Tùy chọn) Gửi thông báo (SignalR từ Worker hoặc để client poll BaJob).

### Web cần đổi gì?

- **Start Restore / Start Multi-DB Reset / …**: thay vì `Task.Run(doWork)` thì **chỉ insert BaJob** với `Status = N'Pending'`, Payload đầy đủ, rồi return jobId.
- **Chuông / Function Queue / GetRestoreStatus**: giữ nguyên (đọc BaJob). Khi Worker cập nhật BaJob, client poll hoặc SignalR (nếu Worker gửi) vẫn thấy tiến độ.

### Triển khai Worker

- **Cách 1 – Windows Service**: project .NET (Worker Service hoặc console), host bằng `Microsoft.Extensions.Hosting`, cài đặt bằng `sc.exe` hoặc installer. Chạy liên tục trên server.
- **Cách 2 – Console + Task Scheduler**: console app chạy vòng lặp; Task Scheduler đặt “At startup” hoặc “Every 1 minute” để đảm bảo process luôn chạy (hoặc chạy lại nếu tắt).
- **Cách 3 – Dịch vụ nền trên cloud** (nếu sau này đưa lên Azure/AWS): Azure Web Jobs, Azure Functions (timer), hoặc worker role tương tự.

### Tóm tắt

- **Đã áp dụng trong code**: giảm treo bằng **thread priority BelowNormal** và **Thread.Sleep(0)** sau từng chunk/batch/DB.
- **Để job dài (gần 1 ngày) an toàn và web không bị ảnh hưởng**: cần **tách job ra Worker Service** (process riêng), web chỉ ghi BaJob Pending và đọc trạng thái/tiến độ.

File này dùng làm tài liệu thiết kế khi triển khai Worker Service và khi cần giải thích cho team về session, treo web và hướng xử lý.
