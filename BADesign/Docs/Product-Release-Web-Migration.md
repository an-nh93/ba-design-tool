# Giới thiệu sản phẩm nội bộ — Từ Tool Window lên Tool Web

**Mục đích tài liệu:** Dùng để gửi ChatGPT (hoặc soạn thảo) soạn **văn bản giới thiệu** và **slide** cho buổi release sản phẩm nội bộ, giới thiệu đến mọi người trong công ty.

**Cấu trúc nội dung:**
- **Mục 1–4:** Lịch sử / nguồn gốc tool ra đời (từ Tool Window đến quyết định nâng cấp lên Web và điểm cải thiện).
- **Mục 5:** Giới thiệu tính năng sản phẩm (phiên bản Web) — dành cho người chưa biết tool, mô tả sản phẩm có những gì.
- **Mục 6–7:** Gợi ý cấu trúc slide và tóm tắt ngắn cho ChatGPT.

---

## 1. Bối cảnh & động lực phát triển (phiên bản Window)

### 1.1. Reset Password

- Trước đây khi **restore một database về server dev**, cần đi xin password để login vào database đó mới đổi tiếp được password của các user khác.
- **Động lực:** Phát triển **tool Window** kết nối vào database để cập nhật password user về đúng password chuẩn, tiện cho dev.

### 1.2. Reset thông tin nhân viên, company

- Một số **sự cố** xảy ra: khi lấy database về, **email, phone, lương** không được reset → **rò rỉ thông tin nhạy cảm** tới khách hàng trong quá trình phát triển và kiểm thử.
- **Động lực:** Nâng cấp tool thêm phần **reset thông tin nhân viên, company** để đảm bảo an toàn dữ liệu.

### 1.3. Hỗ trợ dev kiểm tra dữ liệu từ SQL

- Đa phần dữ liệu nhạy cảm liên quan nhân viên **được mã hóa** → không thể xem được từ SQL sau khi Select, kể cả dữ liệu mã hóa trong file.
- **Động lực:** Giúp dev tiện **kiểm tra dữ liệu từ SQL** trong quá trình phát triển (giải mã / xem có kiểm soát).

---

## 2. Vấn đề với phiên bản Tool Window

- Sau thời gian dài phát triển và sử dụng, có **nhiều feedback và góp ý** từ đồng nghiệp → nâng cấp nhiều version.
- **Khó khăn:** Việc để **tất cả đồng nghiệp dùng cùng một version mới** rất khó:
  - Không nắm được thông tin release / không biết cách update.
  - Nhiều lý do khách quan khác → **version tool của mỗi người không giống nhau**.
- **Hậu quả:**
  - **Rủi ro bug** và thiếu các bản cập nhật cần thiết.
  - **An toàn dữ liệu** và trải nghiệm làm việc không đồng nhất.

### 2.1. Bất tiện khi xử lý data lớn (VTI, TTI)

- Với tool Window: reset thông tin cho data lớn **mất nhiều thời gian** và **bất tiện**.
- **Máy tính bắt buộc phải mở** trong suốt quá trình chạy → không làm việc khác được.

---

## 3. Quyết định: Nâng cấp lên bản Web

- **Mục tiêu:** Giải quyết **bất đồng bộ version**.
- **Kết quả:** Khi release, **tất cả đồng nghiệp dùng cùng version mới nhất và ổn định nhất** — một nguồn, một bản.

---

## 4. Điểm nổi bật / Cải thiện (Web so với Tool Window)

### 4.1. Một version cho tất cả

| Trước (Window) | Sau (Web) |
|----------------|-----------|
| Mỗi người cài/update thủ công → version khác nhau | Một URL, release một lần → mọi người dùng bản mới nhất |
| Rủi ro bug, thiếu cập nhật bảo mật | Luôn đồng bộ, ổn định |

### 4.2. Restore + Reset tích hợp, chạy nền (Worker)

- **Trước:** Restore xong → nhớ chạy tool reset → ngồi đợi restore xong, rồi đợi tool reset xong → **dễ quên reset**, tốn thời gian chờ.
- **Sau (Web):**
  - **Tích hợp Restore + Reset** trong một luồng: đồng nghiệp chỉ cần thao tác restore (có tích hợp reset), **không cần nhớ chạy thêm bước reset**.
  - **Chạy nền (Worker):** Thao tác xong có thể **tắt trình duyệt, làm việc khác**; tool tiếp tục xử lý trên server.
  - **Không bắt buộc mở máy** trong suốt quá trình chạy — đặc biệt quan trọng với data lớn (VTI, TTI).

### 4.3. Tiện lợi với data lớn

| Trước (Window) | Sau (Web) |
|----------------|-----------|
| Máy phải mở, không làm việc khác | Chỉ cần thao tác, sau đó tắt web / làm việc khác |
| Reset data lớn mất nhiều thời gian, bất tiện | Restore + reset chạy nền, theo dõi tiến độ qua chuông thông báo |

### 4.4. Cập nhật từ feedback đồng nghiệp

- Nhiều sự cố và góp ý từ đồng nghiệp đã thúc đẩy **bổ sung tính năng** và **hoàn thiện sản phẩm**.
- Phiên bản web là kết quả của quá trình lắng nghe và cải thiện liên tục.

---

## 5. Giới thiệu tính năng sản phẩm (phiên bản Web)

*Phần này dành cho người chưa biết tool — mô tả sản phẩm web có những gì để dùng trong văn bản / slide giới thiệu.*

### 5.1. Tên và định vị

**UI Builder (BADesign)** là nền tảng phần mềm nội bộ, kết hợp hai trụ cột:

- **UI Builder** — Thiết kế và quản lý giao diện người dùng.
- **HR Helper (Cadena Helper)** — Hỗ trợ thao tác dữ liệu HR, quản lý database và môi trường demo/test.

Hệ thống phục vụ BA, CONS, DEV, QC và quản trị trong quy trình làm sản phẩm và vận hành HR. Phiên bản **Web** thay thế tool Window trước đây: mọi người truy cập qua trình duyệt, luôn dùng cùng một version mới nhất.

### 5.2. Các tính năng chính

#### Trang chủ (Home)

- Điểm vào theo **role**: chỉ hiện chức năng user được cấp quyền.
- **Chuông thông báo** job (Restore, Backup, HR Helper…) — cập nhật realtime qua SignalR; theo dõi tiến độ % và trạng thái hoàn thành.

#### Database Search

- **Quét server**, xem danh sách database; kết nối an toàn (connection string không hiển thị/copy tùy quyền).
- **Backup** database (tạo file .bak), hỗ trợ backup chia nhiều file (striped).
- **Restore** database (từ file .bak, có thể chọn nhiều file cùng một lần backup); tùy chọn **tự động reset** User/Employee/Company (email, phone, password) và đồng bộ Email Server từ App Settings — **tích hợp trong một luồng**, chạy nền (Worker), không cần mở máy chờ.
- **Delete** database (quyền riêng).
- **Shrink log** file database.
- **Bulk Reset:** Reset hàng loạt database theo kịch bản.
- Quản lý server (thêm/sửa/xóa), phân quyền truy cập server theo Role.

#### HR Helper (Cadena Helper)

- Quản lý **User, Employee, Company** trong database HR (kết nối từ Database Search hoặc connection string).
- **Reset Email/Phone:** Theo cột (giống email), hỗ trợ cột mã hóa (Staffing_Employees: MobilePhone1/2, HomePhone1/2) — giải mã để kiểm tra “chưa reset”; số điện thoại mặc định lấy từ App Settings.
- **Update User Signature:** Cập nhật UserSignature đúng công thức Cadena (GetPlainSignature + SHA256) để sau khi update có thể login bình thường.
- **Phân tích Multi-DB:** Liệt kê database, hỗ trợ reset nhiều DB (email/phone/company…) theo cấu hình.
- **Delete Employee** và các thao tác HR khác; đồng bộ Cadena Email Server từ App Settings.
- Job chạy **nền**, thông báo qua **chuông**, Function Queue, Audit Log.

#### Encrypt / Decrypt Data

- Mã hóa và giải mã dữ liệu nhạy cảm (SĐT, email, lương) theo cơ chế Cadena.
- Tạo script **Demo Reset** theo nhân viên (phone, email, mask lương…).

#### App Settings

- **Email Ignore (HR Multi-DB):** Pattern email nội bộ (đã reset).
- **Public URL:** URL công khai cho link đăng ký / quên mật khẩu.
- **Đăng ký & Thông báo:** Domain email được phép đăng ký; khi có user đăng ký mới → thông báo qua **Telegram** hoặc **Email**.
- **Email Server Settings:** SMTP dùng cho Restore + reset (ghi Setting_EmailServers) và Cadena Email Server trong HR Helper.
- **Số điện thoại lúc reset:** Mặc định khi Restore/HR Helper reset phone (vd. 0987654321).
- **Telegram:** Bot token, Chat ID (thông báo đăng ký / notification).
- **SFTP Connection:** Cấu hình SFTP cho tự động restore + reset.

#### Các module khác

- **PGP Tool:** Xuất key .asc, mã hóa và giải mã file PGP.
- **Function Queue:** Xem và theo dõi job (Restore, Backup, HR Helper…) đang chạy hoặc đã hoàn thành.
- **Feedback:** Gửi ý kiến, báo lỗi, đề xuất cải tiến; Super Admin quản lý feedback (Feedback Manage).
- **Community Share:** Chia sẻ bài hướng dẫn code, ví dụ C#, SQL, ASP.NET…
- **User Management (Super Admin):** Quản lý user, gán role và quyền.
- **Role Permission:** Định nghĩa quyền theo Role (BA, CONS, DEV, QC…); Backup, Restore, Delete, BulkReset, ManageServers, ShrinkLog, Settings, HRHelper, …; phân quyền truy cập server (Server Access).
- **Audit Log:** Lịch sử hành động (Restore, Backup, Delete database, Update User/Employee/Other); IP, User-Agent, user, thời gian, chi tiết.
- **Leave Manager:** Quản lý lịch nghỉ phép team.

### 5.3. Tiện ích tổng hợp (Web)

| Nhóm | Tiện ích |
|------|----------|
| **Kết nối & Database** | Một lần quét server → chọn DB → Connect HR Helper; Backup/Restore có tích hợp reset và cấu hình từ App Settings; Restore + Reset chạy nền (Worker). |
| **Bảo mật & Demo** | Encrypt/Decrypt đúng Cadena; Demo Reset script; User Signature đúng công thức để login. |
| **Thông báo** | Chuông + Function Queue + Audit Log; Restore/Backup/HR job push SignalR; đăng ký user → Telegram hoặc Email. |
| **Cấu hình tập trung** | App Settings: Email, SFTP, Telegram, Public URL, số điện thoại reset, thông báo đăng ký — dùng chung cho nhiều tính năng. |
| **Phân quyền** | Role + Permission chi tiết; Server Access theo role; chỉ user có quyền mới thấy và thực hiện thao tác tương ứng. |

---

## 6. Gợi ý bullet cho Slide / Văn bản (gửi ChatGPT)

**Phần lịch sử / nguồn gốc (có thể gộp 1–2 slide):**

- **Slide 1 — Bối cảnh:** Tool Window ra đời vì nhu cầu reset password sau restore, sau đó mở rộng reset thông tin nhân viên/company và hỗ trợ dev xem dữ liệu mã hóa.
- **Slide 2 — Vấn đề:** Version không đồng bộ giữa đồng nghiệp → rủi ro bug, bảo mật; data lớn phải ngồi chờ, máy luôn mở.
- **Slide 3 — Giải pháp:** Chuyển sang Web — một version cho tất cả; Restore + Reset tích hợp; chạy nền (Worker), không cần mở máy.

**Phần giới thiệu sản phẩm (cho người chưa biết tool):**

- **Slide 4 — Tên & định vị:** UI Builder & HR Helper (BADesign) — nền tảng nội bộ, hai trụ cột: UI Builder + HR Helper; phục vụ BA, CONS, DEV, QC.
- **Slide 5 — Tính năng chính:** Trang chủ (role, chuông thông báo); Database Search (quét server, Backup, Restore+Reset tích hợp, Delete, Shrink log, Bulk Reset); HR Helper (User/Employee/Company, Reset Email/Phone, Update User Signature, Multi-DB, job nền); Encrypt/Decrypt; App Settings; Function Queue; Feedback; Audit Log; Leave Manager… (lấy chi tiết từ mục 5.2).
- **Slide 6 — Tiện ích tổng hợp:** Bảng tóm tắt (Kết nối & Database, Bảo mật & Demo, Thông báo, Cấu hình tập trung, Phân quyền) — như mục 5.3.

**Kết:**

- **Slide 7 — Lợi ích Web so với Window:** Luôn dùng bản mới nhất; an toàn dữ liệu; tiết kiệm thời gian; thuận tiện với data lớn (VTI, TTI).
- **Slide 8 — Cảm ơn:** Sản phẩm hoàn thiện nhờ feedback và góp ý của đồng nghiệp.

---

## 7. Tóm tắt ngắn (elevator pitch)

**Tool trước đây là ứng dụng Windows:** reset password, reset thông tin nhân viên/company, hỗ trợ dev xem dữ liệu mã hóa. **Vấn đề:** mỗi người một version, khó cập nhật, data lớn phải ngồi chờ. **Phiên bản Web (UI Builder & HR Helper)** giải quyết: **một version cho tất cả**, **Restore + Reset tích hợp** và **chạy nền** — thao tác xong có thể tắt web, làm việc khác; đặc biệt tiện cho data lớn và đảm bảo không quên reset thông tin nhạy cảm. Sản phẩm web gồm Database Search (Backup, Restore+Reset, Bulk Reset, quản lý server), HR Helper (User/Employee/Company, Reset Email/Phone, Multi-DB, job nền), Encrypt/Decrypt, App Settings, chuông thông báo, Function Queue, Feedback, Audit Log, phân quyền và các module khác — chi tiết xem mục 5.
