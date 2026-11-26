# Đăng nhập và phân quyền

Cửa vào của cả web. Trang chủ (`HomeRole`) chỉ hiện thẻ chức năng user được phép.

## Đăng nhập

- Login, đăng ký, quên mật khẩu, đổi mật khẩu, account settings.
- Đăng ký giới hạn domain email được phép (cấu hình ở App Settings). User mới có thể kích hoạt thông báo Telegram hoặc email.
- Cookie remember (`UiRemember`, 30 ngày) tự đăng nhập lại khi phiên đã hết: `Global.asax.cs` khôi phục ở `Application_AcquireRequestState` (ở `BeginRequest` chưa có Session). Cookie ký bằng `RememberMeSecret` trong `Web.config`; để trống thì tính năng tắt. Đổi khóa này là hủy mọi cookie đã cấp. Đăng xuất (`UiAuthHelper.SignOut`) xóa cookie và chặn khôi phục trong phiên đó.
- Không đủ quyền thì `AccessDenied`.
- Ba trang Login, Register, ForgotPassword dùng chung `Content/login.css`. Cột phải (`.login-right`) có hai lớp ảnh: `Content/images/login-right.jpg` là bản mờ 480×270 (khoảng 5 KB) dựng từ ảnh chính, hiện trong lúc ảnh chính đang tải; ảnh chính `Content/images/login-overlay.png` (1920×1080, khoảng 2 MB, nội dung là JPEG dù đuôi `.png`) phủ kín lên trên cùng một lớp tối nhẹ. Đổi ảnh chính thì dựng lại bản mờ từ ảnh mới; cả hai file phải được khai báo trong `BADesign.csproj` thì Publish mới mang theo.

## Role và permission

Role điển hình: BA chuẩn (mã `BA`), BA dự án (mã `BA_PROJECT`), CONS, DEV, QC, CSS, Super Admin. Quyền hiệu lực = quyền của role cộng quyền gán riêng cho user (`UiAuthHelper.GetEffectivePermissionCodesForUser`).

Role do script tạo (`Scripts/AddUiRoles.sql`, `Scripts/AddUiRoleManagers.sql`), chưa có màn hình thêm role. Code chỉ so mã role ở trang chủ theo role (`HomeRole.aspx.cs`: `BA` và `BA_PROJECT` dùng chung trang chủ của BA); nơi hiện role cho người dùng (Users, Role Permission, thanh trên, hộp tài khoản, mẫu UI) lấy tên role trong database.

`HasFeature` kiểm tra trước khi hiện thẻ và trước khi chạy WebMethod. Super Admin thấy thêm User Management, Role Permission, Leave Manager.

**Page method tự kiểm đăng nhập.** `Page_Load` (nơi gọi `UiAuthHelper.RequireLogin()`) không chạy khi trình duyệt gọi một page method tĩnh (`Pages/<Trang>.aspx/<Hàm>`), và `Global.asax.cs` không có cổng kiểm tra chung. Vì vậy mỗi page method phải tự gọi `UiAuthHelper.GetCurrentUserIdOrThrow()` hoặc `HasFeature(...)` ở dòng đầu, và phải khai báo `[WebMethod(EnableSession = true)]`: thiếu `EnableSession` thì `Session` là `null` và mọi lời gọi bị từ chối kể cả khi đã đăng nhập. Hàm đọc dữ liệu cũng phải kiểm, không chỉ hàm ghi. Kiểm một hàm không đăng nhập: gửi POST JSON tới địa chỉ của hàm mà không kèm cookie; hàm đã chặn trả mã 500 (kiểu ném lỗi của UI Builder) hoặc trả `success = false` kèm câu báo (kiểu của trang Cấu hình, Mã hóa / Giải mã, Công cụ Database).

**Trang nào không cần đăng nhập.** Thanh bên và thanh trên (`BaSidebar.ascx`, `BaTopBar.ascx`) gọi `RequireLogin()`, trừ khi trang đặt `AllowAnonymous`. Hiện chỉ Công cụ PGP đặt cho cả hai thanh. Trợ lý HR và Công cụ Database không đặt: phải đăng nhập mới dùng được (người dùng quyết định ngày 25/11/2026). Page method không đi qua hai thanh này (ASP.NET gọi thẳng hàm tĩnh, không dựng trang, không chạy `Page_Load`), nên mỗi page method tự kiểm `UiAuthHelper.IsAnonymous` rồi quyền bằng `HasFeature(...)`: `PrepareConnect` (nơi cấp token kết nối từ chuỗi kết nối người dùng gõ) từ chối khách, còn các hàm của Trợ lý HR chỉ chạy khi phiên đã có token. Code cũ của chế độ khách ở hai trang này (`IsGuest`, các nhánh trả kết quả rỗng cho khách) đã bỏ ngày 26/11/2026; người chưa đăng nhập gọi page method nhận "Cần đăng nhập.". Muốn mở một trang cho khách thì đặt `AllowAnonymous` cho cả hai thanh và soát từng page method của trang đó. Muốn biết khách dùng được gì thì thử không cookie (GET trang, POST từng page method), không suy từ code.

Từ chối có chủ đích trong page method thì trả `{ success = false, message = "..." }` với mã 200, không ném lỗi: `Web.config` đặt `httpErrors existingResponse="Replace"` nên thân câu trả lời 500 bị thay bằng trang lỗi HTML và trình duyệt không đọc được câu báo.

## User Management

Super Admin thêm, sửa user, đổi mật khẩu, gán role và quyền lẻ. Quyền đến từ role không gỡ được ở user; chỉ thêm quyền đặc biệt (UI Builder, Database Tools, Encrypt, HR Helper, …).

## Role Permission

Ma trận role × permission: UI Builder, Database Tools, backup, restore, delete DB, bulk reset, manage servers, shrink log, settings, HR Helper, server access theo role.

Thẻ **Sếp của từng Role** (bảng `UiRoleManager`, `Helpers/UiRoleManagers.cs`): Super Admin chọn một user làm sếp của mỗi role (ô chọn một người, mỗi role đúng một sếp), lưu bằng nút **Lưu cấu hình**. Quy trình duyệt mẫu UI dùng người này cho bước "Sếp của role người gửi". Mỗi lần sếp của một role đổi, hệ thống ghi nhật ký `UiTemplate.SaveRoleManagers`.

Quyền `UITemplateAdmin` (Quản trị mẫu UI): định nghĩa quy trình duyệt mẫu, duyệt thay, gỡ mẫu khỏi thư viện chung. Người duyệt mẫu không cần quyền riêng: họ được chỉ định theo từng bước của quy trình. Xem [15-Thu-vien-mau-va-quy-trinh-duyet.md](15-Thu-vien-mau-va-quy-trinh-duyet.md).

## Ý tưởng

Mọi trang và mọi API phải hỏi cùng một tập permission. Ẩn nút trên UI không thay cho kiểm tra ở server. Connection string và mật khẩu SQL không được lộ cho role không có quyền server. Mật khẩu và chuỗi kết nối lưu trong database của tool có thể lưu ở dạng mã hóa: xem [06-App-Settings.md](06-App-Settings.md), mục Mã hóa dữ liệu nhạy cảm.
