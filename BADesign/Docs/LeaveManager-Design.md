# Leave Manager - Thiết kế trang quản lý nghỉ phép

## Mục đích
Trang dành cho Super Admin (manager) để:
- Quản lý lịch nghỉ của team (6 người)
- Xem nhanh: ngày hôm nay có bao nhiêu NV nghỉ, ai trực
- Chụp hình danh sách trực gửi sếp

## Phân quyền
- Chỉ Super Admin: `UiAuthHelper.IsSuperAdmin`

## Tính năng

### 1. Quản lý thành viên team
- Danh sách member (tên)
- Thêm / Sửa / Xóa member
- Mỗi member có id + tên

### 2. Đăng ký nghỉ
- Chọn member → chọn ngày (hoặc khoảng ngày)
- Thêm / Xóa lịch nghỉ

### 3. Xem lịch tháng (Calendar)
- Ô mỗi ngày hiển thị:
  - Số người nghỉ (badge)
  - Danh sách tên nghỉ
  - Danh sách người trực (không nghỉ)
- Highlight hôm nay
- Chọn tháng trước/sau

### 4. Tóm tắt hôm nay (Today Summary)
- Card nổi bật: "Hôm nay"
- Số NV nghỉ + danh sách
- Danh sách trực (để chụp hình gửi sếp)

## Lưu trữ
- Client: localStorage (đơn giản, không cần DB)
- Key: `LeaveManager_<userId>_members`, `LeaveManager_<userId>_leaves`
- Format: JSON

## UI/UX
- Giao diện sạch, dễ nhìn
- Theme dark/light giống các trang khác
- Calendar dạng grid rõ ràng
- Card "Hôm nay" nổi bật ở đầu
- Sidebar nav thống nhất
