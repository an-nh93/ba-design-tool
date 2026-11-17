<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="BaSidebar.ascx.cs" Inherits="BADesign.BaSidebar" %>
<aside class="ba-sidebar" id="baSidebar">
    <div class="ba-sidebar-header">
        <asp:HyperLink ID="lnkSidebarTitle" runat="server" CssClass="ba-sidebar-title" NavigateUrl="~/HomeRole" title="Về trang chủ">HR Helper</asp:HyperLink>
        <button type="button" class="ba-sidebar-toggle" id="baSidebarToggle" title="Thu nhỏ hoặc mở rộng menu">◀</button>
    </div>
    <nav class="ba-nav">
        <div class="ba-nav-group">
            <div class="ba-nav-label">Công việc</div>
            <asp:HyperLink ID="lnkNavHome" runat="server" CssClass="ba-nav-item" NavigateUrl="~/HomeRole" data-icon="🏠" title="Trang chủ"><span>Trang chủ</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavDatabaseSearch" runat="server" CssClass="ba-nav-item" NavigateUrl="~/DatabaseSearch" data-icon="🔍" title="Công cụ Database: server, backup, restore, làm sạch"><span>Công cụ Database</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavHRHelper" runat="server" CssClass="ba-nav-item" NavigateUrl="~/HRHelper" data-icon="👥" title="Trợ lý HR: cần chọn database ở Công cụ Database trước"><span>Trợ lý HR</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavFunctionQueue" runat="server" CssClass="ba-nav-item" NavigateUrl="~/FunctionQueue" data-icon="📋" title="Hàng đợi xử lý: các job đang chạy và đã chạy"><span>Hàng đợi xử lý</span></asp:HyperLink>
        </div>
        <div class="ba-nav-group">
            <div class="ba-nav-label">Công cụ</div>
            <asp:PlaceHolder ID="phNavEncryptDecrypt" runat="server" Visible="false">
                <asp:HyperLink ID="lnkNavEncryptDecrypt" runat="server" CssClass="ba-nav-item" NavigateUrl="~/EncryptDecrypt" data-icon="🔐" title="Mã hóa / Giải mã"><span>Mã hóa / Giải mã</span></asp:HyperLink>
            </asp:PlaceHolder>
            <asp:PlaceHolder ID="phNavPgpTool" runat="server" Visible="false">
                <asp:HyperLink ID="lnkNavPgpTool" runat="server" CssClass="ba-nav-item" NavigateUrl="~/PgpTool" data-icon="🧰" title="Công cụ PGP"><span>Công cụ PGP</span></asp:HyperLink>
            </asp:PlaceHolder>
            <asp:PlaceHolder ID="phNavLicenseKey" runat="server" Visible="false">
                <asp:HyperLink ID="lnkNavLicenseKey" runat="server" CssClass="ba-nav-item" NavigateUrl="~/LicenseKey" data-icon="🔑" title="Khóa bản quyền"><span>Khóa bản quyền</span></asp:HyperLink>
            </asp:PlaceHolder>
            <asp:HyperLink ID="lnkNavUIBuilder" runat="server" CssClass="ba-nav-item" NavigateUrl="~/Home" data-icon="🛠" title="Thiết kế giao diện"><span>Thiết kế giao diện</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavTemplateRequests" runat="server" CssClass="ba-nav-item" NavigateUrl="~/TemplateRequests" data-icon="🧩" title="Mẫu UI dùng chung: gửi mẫu, duyệt mẫu và thư viện chung" Visible="false"><span>Mẫu UI dùng chung</span><asp:Literal ID="litTemplateTodo" runat="server" /></asp:HyperLink>
        </div>
        <div class="ba-nav-group">
            <div class="ba-nav-label">Cộng đồng</div>
            <asp:HyperLink ID="lnkNavDevShare" runat="server" CssClass="ba-nav-item" NavigateUrl="~/DevShare" data-icon="📝" title="Chia sẻ cộng đồng"><span>Chia sẻ cộng đồng</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavFeedback" runat="server" CssClass="ba-nav-item" NavigateUrl="~/Feedback" data-icon="💬" title="Góp ý"><span>Góp ý</span></asp:HyperLink>
        </div>
        <div class="ba-nav-group">
            <div class="ba-nav-label">Quản trị</div>
            <asp:PlaceHolder ID="phNavAppSettings" runat="server" Visible="false">
                <asp:HyperLink ID="lnkNavAppSettings" runat="server" CssClass="ba-nav-item" NavigateUrl="~/AppSettings" data-icon="⚙" title="Cài đặt ứng dụng"><span>Cài đặt ứng dụng</span></asp:HyperLink>
            </asp:PlaceHolder>
            <asp:PlaceHolder ID="phNavTemplateAdmin" runat="server" Visible="false">
                <asp:HyperLink ID="lnkNavTemplateWorkflow" runat="server" CssClass="ba-nav-item" NavigateUrl="~/TemplateWorkflow" data-icon="🧭" title="Quy trình duyệt mẫu UI"><span>Quy trình duyệt mẫu UI</span></asp:HyperLink>
                <asp:HyperLink ID="lnkNavHrModules" runat="server" CssClass="ba-nav-item" NavigateUrl="~/HrModules" data-icon="🗃" title="Phân hệ HR: nhóm màn hình chuẩn theo phân hệ"><span>Phân hệ HR</span></asp:HyperLink>
            </asp:PlaceHolder>
            <asp:PlaceHolder ID="phNavSuperAdmin" runat="server" Visible="false">
                <asp:HyperLink ID="lnkNavUserManagement" runat="server" CssClass="ba-nav-item" NavigateUrl="~/Users" data-icon="👤" title="Quản lý người dùng"><span>Quản lý người dùng</span></asp:HyperLink>
                <asp:HyperLink ID="lnkNavRolePermission" runat="server" CssClass="ba-nav-item" NavigateUrl="~/RolePermission" data-icon="🛡" title="Phân quyền"><span>Phân quyền</span></asp:HyperLink>
                <asp:HyperLink ID="lnkNavAuditLog" runat="server" CssClass="ba-nav-item" NavigateUrl="~/AuditLog" data-icon="📜" title="Nhật ký thao tác"><span>Nhật ký thao tác</span></asp:HyperLink>
                <asp:HyperLink ID="lnkNavServerMonitor" runat="server" CssClass="ba-nav-item" NavigateUrl="~/ServerMonitor" data-icon="📊" title="Giám sát máy chủ"><span>Giám sát máy chủ</span></asp:HyperLink>
                <asp:HyperLink ID="lnkNavFeedbackManage" runat="server" CssClass="ba-nav-item" NavigateUrl="~/FeedbackManage" data-icon="🗂" title="Quản lý góp ý"><span>Quản lý góp ý</span></asp:HyperLink>
                <asp:HyperLink ID="lnkNavLeaveManager" runat="server" CssClass="ba-nav-item" NavigateUrl="~/LeaveManager" data-icon="📅" title="Quản lý nghỉ phép"><span>Quản lý nghỉ phép</span></asp:HyperLink>
            </asp:PlaceHolder>
        </div>
    </nav>
</aside>
