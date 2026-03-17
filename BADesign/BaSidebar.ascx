<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="BaSidebar.ascx.cs" Inherits="BADesign.BaSidebar" %>
<aside class="ba-sidebar" id="baSidebar">
    <div class="ba-sidebar-header">
        <asp:HyperLink ID="lnkSidebarTitle" runat="server" CssClass="ba-sidebar-title" NavigateUrl="~/HomeRole" title="Về trang chủ">UI Builder</asp:HyperLink>
        <button type="button" class="ba-sidebar-toggle" id="baSidebarToggle" title="Thu nhỏ menu">◀</button>
    </div>
    <nav class="ba-nav">
        <asp:HyperLink ID="lnkNavHome" runat="server" CssClass="ba-nav-item" NavigateUrl="~/HomeRole" data-icon="🏠" title="Trang chủ"><span>🏠 Trang chủ</span></asp:HyperLink>
        <asp:HyperLink ID="lnkNavUIBuilder" runat="server" CssClass="ba-nav-item" NavigateUrl="~/Home" data-icon="🛠" title="UI Builder"><span>🛠️ UI Builder</span></asp:HyperLink>
        <asp:HyperLink ID="lnkNavDatabaseSearch" runat="server" CssClass="ba-nav-item" NavigateUrl="~/DatabaseSearch" data-icon="🔍" title="Database Search"><span>🔍 Database Search</span></asp:HyperLink>
        <asp:HyperLink ID="lnkNavPgpTool" runat="server" CssClass="ba-nav-item" NavigateUrl="~/PgpTool" data-icon="🧰" title="PGP Tool"><span>🧰 PGP Tool</span></asp:HyperLink>
        <asp:PlaceHolder ID="phNavEncryptDecrypt" runat="server" Visible="false">
            <asp:HyperLink ID="lnkNavEncryptDecrypt" runat="server" CssClass="ba-nav-item" NavigateUrl="~/EncryptDecrypt" data-icon="🔐" title="Encrypt/Decrypt"><span>🔐 Encrypt/Decrypt</span></asp:HyperLink>
        </asp:PlaceHolder>
        <asp:HyperLink ID="lnkNavFunctionQueue" runat="server" CssClass="ba-nav-item" NavigateUrl="~/FunctionQueue" data-icon="📋" title="Function Queue"><span>📋 Function Queue</span></asp:HyperLink>
        <asp:HyperLink ID="lnkNavFeedback" runat="server" CssClass="ba-nav-item" NavigateUrl="~/Feedback" data-icon="💬" title="Feedback"><span>💬 Feedback</span></asp:HyperLink>
        <asp:PlaceHolder ID="phNavAppSettings" runat="server" Visible="false">
            <asp:HyperLink ID="lnkNavAppSettings" runat="server" CssClass="ba-nav-item" NavigateUrl="~/AppSettings" data-icon="⚙" title="App Settings"><span>⚙️ App Settings</span></asp:HyperLink>
        </asp:PlaceHolder>
        <asp:HyperLink ID="lnkNavDevShare" runat="server" CssClass="ba-nav-item" NavigateUrl="~/DevShare" data-icon="📝" title="Community Share"><span>📝 Community Share</span></asp:HyperLink>
        <asp:PlaceHolder ID="phNavSuperAdmin" runat="server" Visible="false">
            <div class="ba-nav-item ba-nav-label">Super Admin</div>
            <asp:HyperLink ID="lnkNavUserManagement" runat="server" CssClass="ba-nav-item" NavigateUrl="~/Users" data-icon="👥" title="User Management"><span>👥 User Management</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavRolePermission" runat="server" CssClass="ba-nav-item" NavigateUrl="~/RolePermission" data-icon="🛡" title="Role Permission"><span>🛡 Role Permission</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavAuditLog" runat="server" CssClass="ba-nav-item" NavigateUrl="~/AuditLog" data-icon="📋" title="Audit Log"><span>📋 Audit Log</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavFeedbackManage" runat="server" CssClass="ba-nav-item" NavigateUrl="~/FeedbackManage" data-icon="💬" title="Feedback Manage"><span>💬 Feedback Manage</span></asp:HyperLink>
            <asp:HyperLink ID="lnkNavLeaveManager" runat="server" CssClass="ba-nav-item" NavigateUrl="~/LeaveManager" data-icon="📅" title="Leave Manager"><span>📅 Leave Manager</span></asp:HyperLink>
        </asp:PlaceHolder>
    </nav>
</aside>
