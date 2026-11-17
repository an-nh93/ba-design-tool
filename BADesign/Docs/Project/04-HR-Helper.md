# HR Helper

`Pages/HRHelper.aspx`. Làm việc trên một database HR Cadena đã connect từ Database Tools (hoặc connection đã chuẩn bị). Bốn tab: Users, Employee Info, Company Info, Other Information.

## Connect

Chọn server + database bên Database Tools rồi mở HR Helper với session kết nối đó. Không gõ connection string trên màn hình nếu user không có quyền xem.

## Users

Lưới user Cadena. Sửa thông tin, reset mật khẩu, cập nhật **User Signature** đúng công thức Cadena (plain signature + SHA256) để login sau khi đổi dữ liệu demo vẫn vào được.

## Employee

Lưới nhân viên. Reset email và số điện thoại theo cột được tick. Cột mã hóa (MobilePhone1/2, HomePhone1/2 trên Staffing_Employees) phải giải mã trước khi biết “đã reset chưa”. Số điện thoại mặc định lấy từ App Settings. Có thể copy câu SELECT của cột.

Load nhân viên dữ liệu lớn chạy nền, có cache số lượng và thanh tiến trình (`EmployeeLoadProgress`).

## Đối tượng áp dụng (Users, Employee)

Bảng nằm bên trái, khung thao tác nằm bên phải; cửa sổ hẹp hơn 1180px thì khung thao tác xếp xuống dưới bảng.

Đầu khung thao tác luôn có dòng tóm tắt đối tượng. Có dòng đang tick: hiện số lượng và tên (Users: User Name; Employee: Local ID - tên), dòng đang tick được tô nền trong bảng. Không tick dòng nào: hiện cảnh báo thao tác sẽ áp dụng cho tất cả dòng trong danh sách, tức danh sách sau khi tìm kiếm và lọc Company.

Dấu tick chỉ giữ trong trang đang xem. Đổi trang, tìm kiếm, sắp xếp hoặc đổi số dòng mỗi trang sẽ bỏ tick, dòng tóm tắt đổi theo ngay.

Hộp xác nhận của **Generate and Update** liệt kê nội dung cập nhật (tên option và giá trị mới, không hiện mật khẩu) và đối tượng áp dụng (tên các dòng đã chọn, hoặc "TẤT CẢ N"). Nút xác nhận ghi rõ số lượng.

## Company

Sửa thông tin công ty demo (email, điện thoại, tên hiển thị) cho môi trường test.

## Other Information

Các bảng khác cần reset hàng loạt. Cột email/phone đánh dấu cần reset. Thao tác lớn cũng nên là job, không khóa request.

## Delete employee

Xóa nhân viên demo và dữ liệu phát sinh theo danh sách FK. Script đi kèm repo là công cụ vận hành, không phải nút xóa bừa trên production.

## Ý tưởng

HR Helper là lớp nghiệp vụ Cadena ngồi trên database đã connect. Encrypt/decrypt và App Settings cung cấp quy tắc và giá trị mặc định. Mọi cập nhật hàng loạt ghi audit và có thể theo dõi ở Function Queue.
