# Dev Share

`Pages/DevShareList.aspx`, `DevShareView.aspx`, `DevShareEdit.aspx`. Mọi user đăng nhập được đọc và viết bài hướng dẫn (C#, SQL, ASP.NET).

## Danh sách và bài

List lọc và mở bài. View hiện nội dung rich text, code có highlight và nút copy. Edit dùng editor (undo/redo trong editor là của trình soạn thảo, không phải undo canvas UI Builder).

## File đính kèm

Cho phép ZIP hoặc code mẫu, có giới hạn loại file. Không cho upload thứ thực thi tùy tiện. File không nằm trong thư mục chạy được của web.

## Ý tưởng

Đây là wiki nội bộ, không phải diễn đàn hỏi-đáp. Bài thuộc tác giả; sửa/xóa theo quyền tác giả hoặc admin. Thiết kế chi tiết UI ở `Docs/DevShare-Design.md`.
