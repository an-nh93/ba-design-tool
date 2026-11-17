# Leave Manager

`Pages/LeaveManager.aspx`. Lịch nghỉ của team nội bộ, không phải module nghỉ phép trên database HR khách hàng.

## Việc làm được

- Danh sách thành viên team.
- Đăng ký ngày nghỉ.
- Lịch tháng: ngày nào có bao nhiêu người nghỉ, ai còn làm.
- Khối “hôm nay” tóm tắt người nghỉ và người làm.

## Quyền

Super Admin (và role được gán) mới thấy thẻ trên trang chủ.

## Ý tưởng

Dữ liệu nghỉ nằm trên DB của chính BADesign, không ghi vào Staffing của database demo. Thiết kế màn ở `Docs/LeaveManager-Design.md`.
