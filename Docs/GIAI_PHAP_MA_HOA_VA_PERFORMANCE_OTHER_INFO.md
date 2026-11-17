# Giải pháp mã hóa & tối ưu performance – Other Information & Restore

Tài liệu mô tả nghiệp vụ, ràng buộc và cách triển khai đảm bảo **đúng nghiệp vụ** (mã hóa khi ghi, giải mã khi so sánh) và **tối ưu performance** cho dữ liệu lớn (50k–100k bản ghi, Multi-DB lên đến ~100 database).

---

## 1. Nguyên tắc nghiệp vụ

- **Cột cần mã hóa** (Staffing_Employees / Staffing_EmployeeInformations):  
  PersonalEmailAddress, BusinessEmailAddress, MobilePhone1, MobilePhone2, HomePhone1, HomePhone2.  
  Key mã hóa: **ID** (Staffing_Employees) hoặc **EmployeeID** (Staffing_EmployeeInformations).

- **Mọi lần ghi** vào các cột này phải dùng **giá trị đã mã hóa** (EncryptData(value, key)), không ghi plain.  
  Restore, Other Information (Single/Multi), và Employee Info đều thống nhất dùng cùng cơ chế.

- **Phát hiện “chưa reset”**: phải **đọc + giải mã** rồi so sánh với giá trị mẫu (email ignore / số điện thoại mặc định).  
  Để tránh quét toàn bộ bảng, dùng **mẫu (sampling)** TOP 50 theo thứ tự key ASC/DESC.

---

## 2. Các luồng chính

### 2.1 Restore database (có auto reset)

- **Plain reset** (User + Other, Setting_EmailServers):  
  **Không** cập nhật Staffing_Employees / Staffing_EmployeeInformations (đã loại các cột mã hóa khỏi GetEmailColumns/GetPhoneColumns khi gọi UpdateEmailValuesInDb / ResetPhoneColumnsInDb trong luồng restore).

- **Encrypted reset**:  
  Chỉ một nơi ghi vào các cột mã hóa: **ResetEmailAndPhoneEncryptedForRestore** (mã hóa từng dòng theo EmployeeID, ghi qua temp table + bulk copy + UPDATE).

- **Performance**:  
  Chunk động theo số bản ghi:  
  - ≥ 20k bản ghi: chunk ~2500–4000 (15–40 chunk), giảm round-trip.  
  - &lt; 20k: chunk nhỏ hơn (50–100 tối thiểu), nhiều chunk hơn (10–60).  
  SqlBulkCopy BatchSize 5000, transaction từng chunk.

### 2.2 Single Database – Tab Other Information

- **Hai nhóm**: Email data, Phone data.  
  Mỗi nhóm: “Tải danh sách bảng có cột Email/Phone” → hiển thị danh sách với **status (Reset / NotReset)** và reason.

- **Cách xác định NotReset**  
  - Với **cột mã hóa** (Staffing_Employees…): đọc TOP 50 (ASC/DESC theo key), **giải mã** từng giá trị, so sánh với email ignore / default phone.  
  - Với **cột plain**: đọc TOP 50, so sánh trực tiếp.  
  → Chỉ tối đa ~100 dòng × số cột, không quét hết 50k–100k.

- **Reset các cột đã chọn**  
  - **Cột plain**: update trực tiếp (ExecuteBatchUpdate) với giá trị người dùng nhập.  
  - **Cột mã hóa** (bất kỳ cột nào trong 6 cột trên): **không** ghi plain; gọi **ResetEmailAndPhoneEncryptedForRestore** một lần với email/phone từ form (chỉ email hoặc chỉ phone tùy nút “Reset Email” hay “Reset Phone”).  
  → Đảm bảo luôn ghi giá trị đã mã hóa vào DB.

### 2.3 Multiple Database

- **Phân tích (Multi-DB Analyze)**  
  - Chạy **tuần tự** từng database (tránh mở 100 DB cùng lúc).  
  - Mỗi DB: **DatabaseNeedsReset** kiểm tra cả **email** và **phone** (TOP 50 per column, giải mã cho cột mã hóa).  
  - Kết quả: danh sách DB với status Reset/NotReset/Error và reason.

- **Reset (Multi-DB Reset)**  
  - Vẫn xử lý **tuần tự** từng DB.  
  - Mỗi DB:  
    1. **Plain reset**: UpdateEmailValuesInDb, ResetPhoneColumnsInDb (đã loại trừ cột mã hóa).  
    2. **Encrypted reset**: Gọi **ResetEmailAndPhoneEncryptedForRestore** cho connection string của DB đó (email/phone từ payload job).  
  - Không chạy song song nhiều DB để tránh treo server; một DB xong mới sang DB tiếp theo.

---

## 3. Tối ưu performance

| Tình huống | Giải pháp |
|------------|-----------|
| Restore + encrypted reset (50k–100k rows) | Chunk lớn (2500–4000) khi totalCount ≥ 20k; BulkCopy batch 5000; transaction per chunk. |
| Other Information – Load list (Email/Phone) | Sampling TOP 50 (ASC + DESC) mỗi cột; giải mã tối đa ~100 giá trị/cột. |
| Other Information – Reset có cột mã hóa | Một lần ResetEmailAndPhoneEncryptedForRestore (chunked), sau đó chỉ update cột plain. |
| Multi-DB Analyze (100 DB) | Tuần tự từng DB; mỗi DB chỉ sampling (email + phone), không full scan. |
| Multi-DB Reset (100 DB × 50k) | Tuần tự từng DB; mỗi DB plain + encrypted reset chunked; không parallel DB. |

---

## 4. Lưu ý triển khai

- **IsEncryptedEmployeeColumn**: dùng thống nhất để biết cột nào thuộc “encrypted employee” (PersonalEmailAddress, BusinessEmailAddress, MobilePhone1/2, HomePhone1/2) trên Staffing_Employees / Staffing_EmployeeInformations.

- **GetEmailColumns / GetPhoneColumns** (dùng cho **plain** reset): luôn **loại** các cột encrypted employee để không bao giờ ghi plain vào đó.

- **ResetEmailColumns / ResetPhoneColumns** (Other Information): tách danh sách cột thành plain vs encrypted; nếu có ít nhất một cột encrypted thì gọi ResetEmailAndPhoneEncryptedForRestore trước, sau đó chỉ ExecuteBatchUpdate cho cột plain.

- Multi-DB reset job: sau khi plain reset từng DB, gọi ngay ResetEmailAndPhoneEncryptedForRestore cho DB đó (email/phone từ job payload).

---

## 5. Tóm tắt

- **Đúng nghiệp vụ**: Mọi ghi vào 6 cột mã hóa đều qua EncryptData; mọi so sánh “chưa reset” đều qua giải mã + so sánh (có sampling).  
- **Performance**: Sampling (TOP 50) cho phân tích; chunk lớn cho bảng lớn; xử lý Multi-DB tuần tự; không full scan 50k–100k khi chỉ cần biết “còn sót bảng/cột chưa reset”.

File này có thể dùng làm tài liệu tham chiếu khi chỉnh sửa Restore, Other Information (Single/Multi) và Employee Info.
