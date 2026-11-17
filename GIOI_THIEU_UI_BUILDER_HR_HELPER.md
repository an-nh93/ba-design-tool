# Giới thiệu phần mềm UI Builder & HR Helper

> Tài liệu dùng để thiết lập slide giới thiệu. Có thể copy nội dung cho ChatGPT hoặc công cụ tạo slide.

---

## 1. Tên và định vị

**UI Builder** (BADesign) là nền tảng phần mềm nội bộ, kết hợp hai trụ cột chính:

- **UI Builder** — Thiết kế và quản lý giao diện người dùng.
- **HR Helper (Cadena Helper)** — Hỗ trợ thao tác dữ liệu HR, quản lý database và môi trường demo/test.

Hệ thống phục vụ BA, CONS, DEV, QC và quản trị trong quy trình làm sản phẩm và vận hành HR.

---

## 2. Ý nghĩa và “sinh mệnh” ra đời

### Vì sao phần mềm ra đời?

- **Giảm thao tác thủ công:** Thay cho việc mở SSMS, copy connection string, reset dữ liệu từng bước bằng tay.
- **Chuẩn hóa quy trình:** Backup/Restore, reset User/Employee/Company theo một luồng nhất quán, có kiểm soát.
- **Bảo mật dữ liệu nhạy cảm:** Mã hóa/giải mã SĐT, email, lương đúng chuẩn Cadena; hỗ trợ demo mà không lộ dữ liệu thật.
- **Tăng tốc phát triển và test:** Kết nối nhanh nhiều database, phân tích Multi-DB, reset hàng loạt theo kịch bản.
- **Một cửa cho cấu hình:** Email Server, SFTP, Telegram, Public URL, đăng ký user, số điện thoại mặc định… đặt tại App Settings, dùng chung cho Restore, HR Helper, thông báo.

### Ý nghĩa với tổ chức

- **Hiệu quả:** Ít lỗi do sai bước, tiết kiệm thời gian cho BA/DEV/QC.
- **An toàn:** Phân quyền rõ (Backup/Restore/Delete/Settings…), Audit Log lưu lại hành động.
- **Đồng bộ:** Một nơi cấu hình, nhiều tính năng (restore, reset, thông báo) dùng chung.

---

## 3. Các tính năng chính

### 3.1 Trang chủ (Home)

- Điểm vào theo role: chỉ hiện các chức năng user được cấp quyền.
- Thông báo job (Restore, Backup, HR Helper…) qua chuông và SignalR.

### 3.2 UI Builder

- Thiết kế giao diện: tạo controls, form, component UI.
- Phục vụ BA/DEV thiết kế màn hình sản phẩm.

### 3.3 Database Search

- Quét server, xem danh sách database, kết nối an toàn (connection string không hiển thị/copy tùy quyền).
- **Backup** database (tạo file .bak).
- **Restore** database (từ file .bak), tùy chọn tự động reset User/Employee/Company (email, phone, password) và đồng bộ Email Server từ App Settings.
- **Delete** database (có quyền riêng, thao tác nguy hiểm).
- **Shrink log** file database.
- **Bulk Reset:** Reset hàng loạt database theo kịch bản.
- Quản lý server: thêm/sửa/xóa server (quyền Database Manage Servers); phân quyền truy cập server theo Role.

### 3.4 HR Helper (Cadena Helper)

- Quản lý **User, Employee, Company** trong database HR (kết nối từ Database Search hoặc connection string).
- **Reset Email/Phone:** Theo cột (giống email), hỗ trợ cột mã hóa (Staffing_Employees: MobilePhone1/2, HomePhone1/2) — giải mã để kiểm tra “chưa reset”, số điện thoại mặc định lấy từ App Settings.
- **Update User Signature:** Cập nhật UserSignature theo đúng công thức Cadena (GetPlainSignature + SHA256) để sau khi update có thể login bình thường.
- **Phân tích Multi-DB:** Liệt kê database, hỗ trợ reset nhiều DB (email/phone/company…) theo cấu hình.
- **Delete Employee** (và các thao tác HR khác), đồng bộ Cadena Email Server từ App Settings.
- Job chạy nền, thông báo qua chuông, Function Queue, Audit Log.

### 3.5 Encrypt / Decrypt Data

- Mã hóa và giải mã dữ liệu nhạy cảm (SĐT, email, lương) theo cơ chế Cadena.
- Tạo script **Demo Reset** theo nhân viên (phone, email, mask lương…).

### 3.6 App Settings

- **Email Ignore (HR Multi-DB):** Pattern email nội bộ (đã reset); HR Helper load từ đây.
- **Public URL:** URL công khai cho link đăng ký / quên mật khẩu.
- **Đăng ký & Thông báo:** Domain email được phép đăng ký; khi có user đăng ký mới → thông báo qua **Telegram** hoặc **Email** (danh sách email nhận, mặc định an.nh@cadena.com.sg).
- **Email Server Settings:** SMTP dùng cho Restore + reset (ghi Setting_EmailServers) và nút Cadena Email Server trong HR Helper.
- **Số điện thoại lúc reset:** Mặc định khi Restore/HR Helper reset phone (mặc định 0987654321).
- **Telegram:** Bot token, Chat ID (dùng trong thông báo đăng ký hoặc notification).
- **SFTP Connection:** Cấu hình SFTP cho tự động restore + reset.

### 3.7 PGP Tool

- Xuất key .asc, mã hóa và giải mã file PGP.

### 3.8 Function Queue

- Xem và theo dõi job (Restore, Backup, HR Helper…) đang chạy hoặc đã hoàn thành.

### 3.9 Feedback

- Gửi ý kiến, báo lỗi, đề xuất cải tiến cho UI Builder và HR Helper.
- Super Admin: quản lý feedback (Feedback Manage) — trạng thái, ghi chú, comment.

### 3.10 Community Share

- Chia sẻ bài hướng dẫn code, ví dụ C#, SQL, ASP.NET… Mọi người có thể viết và đọc.

### 3.11 User Management (Super Admin)

- Quản lý user: thêm, sửa, đổi mật khẩu, gán role và quyền riêng lẻ.

### 3.12 Role Permission

- Định nghĩa quyền theo Role (BA, CONS, DEV, QC…).
- Cấu hình từng quyền: UIBuilder, DatabaseSearch, EncryptDecrypt, HRHelper, Backup, Restore, Delete, BulkReset, ManageServers, ShrinkLog, Settings, PGPTool, FeedbackManage, LeaveManager.
- Phân quyền truy cập server theo Role (Server Access).

### 3.13 Audit Log

- Lịch sử hành động: Restore, Backup, Delete database, Update User/Employee/Other (HR Helper).
- Thông tin: IP, thiết bị (User-Agent), user, thời gian, chi tiết.

### 3.14 Leave Manager

- Quản lý lịch nghỉ phép team: xem hôm nay bao nhiêu nhân viên nghỉ, ai đi làm.

---

## 4. Tiện ích tổng hợp

| Nhóm | Tiện ích |
|------|----------|
| **Kết nối & Database** | Một lần quét server → chọn DB → Connect HR Helper; Backup/Restore có tích hợp reset và cấu hình từ App Settings. |
| **Bảo mật & Demo** | Encrypt/Decrypt đúng Cadena; Demo Reset script; User Signature đúng công thức để login. |
| **Thông báo** | Chuông + Function Queue + Audit Log; Restore/Backup/HR job push SignalR; đăng ký user → Telegram hoặc Email. |
| **Cấu hình tập trung** | App Settings: Email, SFTP, Telegram, Public URL, số điện thoại reset, thông báo đăng ký — dùng chung cho nhiều tính năng. |
| **Phân quyền** | Role + Permission chi tiết; Server Access theo role; chỉ user có quyền mới thấy và thực hiện thao tác tương ứng. |

---

## 5. Gợi ý cấu trúc slide

1. **Slide 1:** Tên phần mềm — UI Builder & HR Helper.
2. **Slide 2:** Vì sao ra đời? (giảm thao tác tay, chuẩn hóa, bảo mật, tăng tốc, một cửa cấu hình).
3. **Slide 3:** Ý nghĩa với tổ chức (hiệu quả, an toàn, đồng bộ).
4. **Slide 4–5:** Các tính năng chính (Database Search, HR Helper, Encrypt/Decrypt, App Settings…).
5. **Slide 6:** Bảng tiện ích tổng hợp (như bảng trên).
6. **Slide 7:** Kết luận / Call to action (dùng cho demo, training, onboarding).

---

*Tài liệu có thể chỉnh sửa tên công ty, ví dụ email, số điện thoại mặc định cho phù hợp với nội bộ.*
