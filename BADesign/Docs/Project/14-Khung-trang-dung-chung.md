# Khung trang dùng chung

Mọi trang có sidebar dùng chung ba khối. Sửa một chỗ là áp cho cả chương trình; không chép phần nào trong ba khối này vào từng trang.

| Khối | File | Chứa gì |
|---|---|---|
| Head | `BaHead.ascx` | Toàn bộ CSS và script dùng chung, theo đúng thứ tự nạp |
| Sidebar | `BaSidebar.ascx` | Menu trái, ẩn hiện theo quyền |
| Thanh trên | `BaTopBar.ascx` | Tiêu đề trang, chuông, đổi ngôn ngữ, sáng/tối, tài khoản |

## Trang mới

```aspx
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
...
<head runat="server">
    <meta charset="utf-8" />
    <title>Tên trang - HR Helper</title>
    <uc:BaHead runat="server" />
    <!-- chỉ thêm CSS/script riêng của trang ở đây -->
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" ActiveSection="..." />
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content">...</div>
            </main>
        </div>
    </form>
</body>
```

Tiêu đề: đặt `ucBaTopBar.PageTitle` trong code-behind, hoặc thuộc tính `PageTitle` ngay trên thẻ.

## BaHead.ascx

- Không có code-behind: sửa xong là chạy, không cần build.
- Nạp theo thứ tự: `bootstrap.min.css`, `ba-layout.css`, `ba-notification-bell.css`, jQuery 1.10, `ba-i18n.js`, `ba-toast.js`, SignalR, `ba-signalr.js`, `bootstrap.min.js`, `ba-layout.js`, rồi bốn file của chuông (`ba-notification-jobs.js`, `ba-notification-detail.js`, `ba-job-progress.js`, `ba-notification-bell.js`).
- Số phiên bản `?v=` tự lấy theo giờ sửa file, không phải tăng tay. `ba-i18n.js` lấy giờ mới nhất giữa engine và từ điển `Scripts/i18n/ba-i18n.en.js`, vì engine nạp từ điển bằng chính tham số đó.
- Trang dùng Bootstrap JS bản khác (Góp ý dùng bản 3.4.1 cho Summernote) thì đặt `<uc:BaHead runat="server" BootstrapScript="false" />` và tự nạp bản của mình.
- Thêm file dùng chung mới: thêm một dòng vào `BaHead.ascx`, không thêm vào từng trang.

## BaTopBar.ascx

- Chuông: xem [11-Job-nen-va-thong-bao.md](11-Job-nen-va-thong-bao.md), mục Chuông.
- Ngôn ngữ: `<span data-ba-lang-switch>`, do `ba-i18n.js` dựng.
- Sáng/tối, menu tài khoản, hộp xác nhận `baConfirm`/`baAlert`: `Scripts/ba-layout.js`.
- Hộp "Cài đặt tài khoản" và đổi mật khẩu nằm ngay trong `BaTopBar.ascx`.
- `AllowAnonymous="true"` (hoặc gán trong code-behind) cho trang khách dùng được, hiện chỉ có Công cụ PGP: khách thấy tiêu đề, ngôn ngữ, sáng/tối và nút Đăng nhập; không có chuông và menu tài khoản.

## Style

Style nền nằm trong `Content/ba-layout.css` (thẻ, tab, bảng, nút, ô nhập, khối thu gọn, gợi ý). Trang chỉ giữ CSS của riêng mình trong `<style>`, không khai báo lại `:root`, `body`, `.ba-container`, `.ba-main`, `.ba-content`, `.ba-card`, `.ba-btn`, `.ba-input`, `.ba-table`, `.ba-tabs`.

## Trang chưa theo khung

- `Pages/LeaveManager.aspx`: thanh trên riêng (chưa đổi theo yêu cầu).
- `Pages/Builder.aspx`, `Pages/Preview.aspx`: màn thiết kế toàn màn hình, không dùng khung.
- Trang đăng nhập, đăng ký, quên mật khẩu, đổi mật khẩu, từ chối truy cập: trang đứng riêng.
