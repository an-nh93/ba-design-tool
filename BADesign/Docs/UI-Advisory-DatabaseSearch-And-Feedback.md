# Tư vấn giao diện: Database Search & Góp ý

Tài liệu gợi ý điều chỉnh giao diện hai trang **Database Search** và **Góp ý** để chuyên nghiệp và dễ dùng hơn.

---

## 1. Database Search

### 1.1 Cấu trúc trang hiện tại
- **Card 1:** Kết nối bằng Connection String (ô dán + nút Connect)
- **Card 2:** Cấu hình Server (tìm server, + Thêm server, bảng server, phân trang)
- **Card 3:** Danh sách Database (tìm DB, nút Backup/Restore/Lấy log, bảng kết quả, phân trang)

Nhiều modal: Thêm/sửa server, Log quét, Chi tiết lỗi, Restore, Backup, Shrink log, overlay loading…

### 1.2 Điều chỉnh đề xuất

| Hạng mục | Đề xuất | Lý do |
|----------|---------|--------|
| **Tiêu đề trang** | Thêm mô tả ngắn dưới title (vd: "Quét server, xem database, kết nối HR Helper, Backup/Restore") | User mới biết trang dùng để làm gì. |
| **Connection String** | Thu gọn mặc định (collapsible) hoặc đặt xuống dưới "Cấu hình Server" | Phần đa user dùng server đã cấu hình; dán connection string là luồng phụ. |
| **Cấu hình Server** | Card luôn mở, nút "Quét & load" đặt nổi bật (primary), có thể thêm icon 🔍 hoặc "Quét tất cả" | Hành động chính của trang là quét và xem database. |
| **Bảng Server** | Cột "Thao tác": dùng nhóm nút rõ (Quét, Sửa, Xóa) thay vì chỉ text/link; có thể thêm trạng thái "Đã quét" / "Chưa quét" | Giảm nhầm lẫn, thao tác rõ ràng hơn. |
| **Danh sách Database** | Mặc định thu gọn nếu chưa có dữ liệu; khi đã quét thì mở và highlight nhẹ card | Tránh "bảng trống" chiếm chỗ; sau quét user thấy kết quả ngay. |
| **Nút Backup / Restore / Lấy log** | Đặt trong một hàng có label "Thao tác hàng loạt" hoặc "Hành động"; dùng `ba-btn-sm` và tách nhóm (Backup | Restore | Log) | Phân biệt với thao tác theo dòng (Connect). |
| **Bảng Database** | Cột "Thao tác" chỉ còn 1–2 nút: **Connect** (primary) và tùy chọn "Log" (icon hoặc chữ nhỏ) | Gọn, ưu tiên Connect. |
| **Empty state** | Bảng trống: icon + dòng chữ "Chưa quét. Bấm **Quét & load danh sách Database** ở trên." (chữ **Quét...** có thể là link scroll lên) | Hướng dẫn rõ bước tiếp theo. |
| **Loading** | Overlay "Đang quét database..." giữ; có thể thêm % hoặc "Đang quét server X/Y" nếu API hỗ trợ | Giảm cảm giác treo, user biết đang xử lý. |
| **Modal** | Thống nhất: nút đóng × dùng `.ba-btn-secondary` (nền tối, không trắng); không đóng khi click ra ngoài (đã fix ở Góp ý, nên áp dụng chung) | Đồng bộ với Feedback/Feedback Manage. |
| **Lỗi quét** | Nếu 1 server lỗi: hiển thị badge/warning trên dòng server đó + nút "Xem lỗi" mở modal chi tiết; không chỉ toast | Dễ biết server nào lỗi, xem log tập trung. |

### 1.3 Thứ tự ưu tiên triển khai
1. **Cao:** Empty state rõ ràng + mô tả trang; nút đóng modal thống nhất; Connection String collapsible.
2. **Trung bình:** Nhóm "Thao tác hàng loạt" (Backup/Restore/Log); thao tác bảng Server (Quét, Sửa, Xóa) rõ ràng.
3. **Thấp:** Loading chi tiết (server X/Y); trạng thái "Đã quét" trên từng server.

---

## 2. Trang Góp ý (Feedback)

### 2.1 Cấu trúc hiện tại
- **Nhóm 1 (collapsible):** Danh sách góp ý & bug — lọc (từ/đến ngày, Chỉ của tôi), Tải lại, ô tìm, bảng (Tiêu đề, Hạng mục, Trạng thái, Ngày gửi, Người gửi, Thao tác), empty/error.
- **Nhóm 2 (collapsible):** Gửi góp ý mới — Tiêu đề, Hạng mục, Nội dung (Summernote), Gửi góp ý.
- Modal: Chi tiết góp ý (Xem), Timeline (trạng thái + Reopen).

### 2.2 Điều chỉnh đề xuất

| Hạng mục | Đề xuất | Lý do |
|----------|---------|--------|
| **Thứ tự khối** | Mặc định mở **Danh sách** trước, **Gửi góp ý mới** thu gọn; hoặc đặt "Gửi góp ý mới" lên trên dạng CTA (1 dòng + nút "Gửi góp ý") rồi mới tới danh sách | User vào thường xem list trước; form gửi mới không chiếm màn hình. |
| **Mô tả đầu trang** | Một dòng dưới title: "Xem phản hồi của bạn và gửi góp ý, báo bug hoặc đề xuất tính năng." | Giúp người dùng hiểu ngay mục đích trang. |
| **Bộ lọc** | Gộp Từ ngày, Đến ngày, Chỉ của tôi, Tải lại vào một hàng; ô tìm để cùng hàng hoặc hàng dưới (full width) | Gọn, nhất quán với Database Search / Feedback Manage. |
| **Bảng** | Giữ sort theo cột; có thể thêm "Số thứ tự" (stt) nếu cần; cột "Thao tác" chỉ "Xem" + (trạng thái click → Timeline) rõ là "Timeline" | Giảm ambiguity giữa Xem nội dung vs xem timeline. |
| **Empty state** | Icon + "Chưa có góp ý nào. Thử mở rộng khoảng ngày hoặc bỏ chọn **Chỉ của tôi**." + nút "Gửi góp ý mới" (scroll đến form) | Hướng dẫn và kêu gọi hành động. |
| **Form gửi góp ý** | Label "Gửi góp ý mới" kèm mô tả ngắn; nút "Gửi góp ý" primary, có thể thêm icon ✉️ | CTA rõ, chuyên nghiệp. |
| **Sau khi gửi** | Giữ thông báo "Đã gửi góp ý"; có thể tự refresh list và scroll lên danh sách (hoặc mở tab "Danh sách" nếu dùng tab) | User thấy góp ý vừa gửi xuất hiện trong list. |
| **Modal** | Đã xử lý: không đóng khi click ra ngoài; nút × dùng style secondary (đã áp dụng) | Nhất quán, tránh đóng nhầm. |

### 2.3 Thứ tự ưu tiên triển khai
1. **Cao:** Mô tả đầu trang; empty state có hướng dẫn + link/nút "Gửi góp ý mới".
2. **Trung bình:** Bộ lọc gọn một hàng; Thao tác bảng rõ "Xem" vs "Timeline".
3. **Thấp:** Đổi thứ tự/CTA "Gửi góp ý mới" (lên trên hoặc thu gọn mặc định).

---

## 3. Đồng bộ chung (cả hai trang)

| Nội dung | Đề xuất |
|----------|---------|
| **Nút secondary / đóng** | Dùng chung `.ba-btn-secondary` (nền `var(--bg-hover)`, viền, chữ `var(--text-primary)`). Trang Feedback đã bổ sung; Database Search/Modal nên kiểm tra tương tự. |
| **Modal click ra ngoài** | Không đóng khi click overlay (chỉ đóng bằng nút × / Hủy / Đóng). Đã làm cho Feedback & Feedback Manage; áp dụng cho Database Search nếu chưa. |
| **Card collapsible** | Mũi tên ▼/▶ nhất quán; aria-expanded nếu cần a11y. |
| **Toast / thông báo** | Giữ toast "Đã copy" / "Lỗi..."; có thể thống nhất vị trí (góc trên phải) và thời gian tự ẩn. |

---

## 4. Tóm tắt nhanh

- **Database Search:** Làm rõ mục đích trang, thu gọn Connection String, empty state và loading rõ ràng, thao tác bảng và nhóm Backup/Restore/Log rõ ràng, modal thống nhất.
- **Góp ý:** Mô tả đầu trang, empty state + CTA "Gửi góp ý mới", bộ lọc gọn, thao tác "Xem" vs "Timeline" rõ.
- **Chung:** Nút đóng và secondary thống nhất, modal không đóng khi click ra ngoài.

Bạn có thể chọn theo từng mức ưu tiên (cao → trung bình → thấp) để triển khai từng bước. Nếu cần, có thể bắt đầu bằng Database Search (empty state + mô tả + Connection String collapsible) và Góp ý (mô tả + empty state).
