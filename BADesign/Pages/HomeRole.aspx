<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="HomeRole.aspx.cs"
    Inherits="BADesign.Pages.HomeRole" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Home - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <style>
        :root {
            --primary: #0078d4;
            --primary-hover: #006bb3;
            --primary-light: #0D9EFF;
            --primary-soft: rgba(0, 120, 212, 0.1);
            --bg-main: #1e1e1e;
            --bg-dark: #1e1e1e;
            --bg-darker: #161616;
            --bg-card: #2d2d30;
            --bg-hover: #3e3e42;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #969696;
            --border: #3e3e42;
            --border-light: #464647;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
        }
        /* Light theme */
        body.light-theme {
            --bg-main: #ffffff;
            --bg-dark: #f3f4f6;
            --bg-darker: #f9fafb;
            --bg-card: #ffffff;
            --bg-hover: #f3f4f6;
            --text-primary: #111827;
            --text-secondary: #4b5563;
            --text-muted: #6b7280;
            --border: #e5e7eb;
            --border-light: #d1d5db;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        .ba-container { 
            display: flex; 
            min-height: 100vh;
            overflow: hidden;
        }
        .ba-sidebar {
            width: 240px;
            background: var(--bg-darker);
            border-right: 1px solid var(--border);
            padding: 1.5rem 0;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 1000;
        }
        .ba-sidebar-header {
            padding: 0 1.5rem 1rem;
            border-bottom: 1px solid var(--border);
        }
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-nav { padding: 1rem 0; }
        .ba-nav-item {
            display: block;
            padding: 0.75rem 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            transition: all 0.2s;
        }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--bg-hover); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin-left: 240px;
        }
        .ba-top-bar {
            padding: 1rem 2rem;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.75rem;
            flex-shrink: 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
        .ba-top-bar-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .theme-switcher {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 0.75rem;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }
        .theme-switcher:hover { background: var(--bg-hover); }
        .theme-switcher-icon { font-size: 1rem; }
        .user-menu { position: relative; }
        .user-menu-trigger {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 0.75rem;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            border: none;
        }
        .user-menu-trigger:hover { background: var(--bg-hover); }
        .user-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-sizing: border-box;
            overflow: hidden;
        }
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        .user-menu-dropdown {
            position: absolute;
            top: calc(100% + 0.5rem);
            right: 0;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            min-width: 200px;
            z-index: 1000;
            display: none;
            overflow: hidden;
        }
        .user-menu-dropdown.show { display: block; }
        .user-menu-dropdown .menu-item {
            display: block;
            padding: 0.75rem 1rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            border-bottom: 1px solid var(--border);
        }
        .user-menu-dropdown .menu-item:last-child { border-bottom: none; }
        .user-menu-dropdown .menu-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-content { 
            flex: 1; 
            overflow-y: auto; 
            overflow-x: hidden; 
            padding: 2rem;
        }
        .ba-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 1.5rem;
        }
        .ba-card-title { 
            font-size: 1.5rem; 
            font-weight: 600; 
            color: var(--text-primary); 
            margin-bottom: 1rem;
        }
        .ba-card-desc {
            color: var(--text-secondary);
            font-size: 0.9375rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .ba-feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
        }
        .ba-feature-card {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.2s;
            text-decoration: none;
            display: block;
            color: inherit;
        }
        .ba-feature-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
        }
        .ba-feature-card.disabled {
            opacity: 0.6;
            cursor: default;
            pointer-events: none;
        }
        .ba-feature-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        .ba-feature-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        .ba-feature-desc {
            color: var(--text-muted);
            font-size: 0.875rem;
            line-height: 1.5;
        }
        /* Account Settings Modal */
        .account-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            overflow-y: auto;
            padding: 2rem;
            box-sizing: border-box;
        }
        .account-modal.show { display: flex; }
        .account-modal-content {
            background: var(--bg-card);
            border-radius: 12px;
            width: 90%;
            max-width: 640px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: modalSlideIn 0.2s ease-out;
        }
        @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .account-modal-header {
            padding: 1.5rem 2rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        .account-modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .account-modal-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        .account-modal-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        .account-modal-tabs {
            display: flex;
            border-bottom: 1px solid var(--border);
            padding: 0 2rem;
            flex-shrink: 0;
        }
        .account-modal-tab {
            padding: 1rem 1.5rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
            position: relative;
            top: 1px;
        }
        .account-modal-tab:hover { color: var(--text-primary); }
        .account-modal-tab.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }
        .account-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
        }
        .account-section {
            margin-bottom: 2rem;
        }
        .account-section:last-child { margin-bottom: 0; }
        .account-section-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        .account-field {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 0;
            border-bottom: 1px solid var(--border);
        }
        .account-field:last-child { border-bottom: none; }
        .account-field-label {
            font-size: 0.875rem;
            color: var(--text-primary);
            font-weight: 500;
        }
        .account-field-value {
            font-size: 0.875rem;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .account-profile-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .account-avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            font-weight: 600;
            flex-shrink: 0;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-sizing: border-box;
            overflow: hidden;
        }
        .account-avatar[style*="background-image"] {
            background-color: transparent !important;
        }
        .account-profile-info { flex: 1; }
        .account-profile-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }
        .account-form-group { margin-bottom: 1.5rem; }
        .account-form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        .account-form-input {
            width: 100%;
            padding: 0.75rem;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }
        .account-form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
        }
        .account-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .account-badge-success {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }
        .account-badge-default {
            background: rgba(107, 114, 128, 0.2);
            color: var(--text-secondary);
        }
        .account-badge-danger {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        .account-avatar-container {
            position: relative;
            display: inline-block;
        }
        .account-avatar-upload-btn {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 24px;
            height: 24px;
            background: var(--primary);
            border: 2px solid var(--bg-card);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.75rem;
        }
        .account-tab-content { display: block; }
        .btn {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn-primary {
            background: var(--primary);
            color: white;
        }
        .btn-primary:hover { background: var(--primary-hover); }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <aside class="ba-sidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">UI Builder</div>
                </div>
                <nav class="ba-nav">
                    <asp:HyperLink ID="lnkNavUIBuilder" runat="server" CssClass="ba-nav-item" NavigateUrl="~/DesignerHome">
                        <span>🛠️ UI Builder</span>
                    </asp:HyperLink>
                    <asp:HyperLink ID="lnkNavDatabaseSearch" runat="server" CssClass="ba-nav-item" NavigateUrl="~/DatabaseSearch">
                        <span>🔍 Database Search</span>
                    </asp:HyperLink>
                    <asp:PlaceHolder ID="phNavEncryptDecrypt" runat="server" Visible="false">
                        <asp:HyperLink ID="lnkNavEncryptDecrypt" runat="server" CssClass="ba-nav-item" NavigateUrl="~/EncryptDecrypt">
                            <span>🔐 Encrypt/Decrypt</span>
                        </asp:HyperLink>
                    </asp:PlaceHolder>
                    <asp:PlaceHolder ID="phNavSuperAdmin" runat="server" Visible="false">
                        <div class="ba-nav-item" style="color: var(--text-muted); font-size: 0.75rem; padding-top: 1rem; padding-bottom: 0.25rem;">Super Admin</div>
                        <asp:HyperLink ID="lnkNavUserManagement" runat="server" CssClass="ba-nav-item" NavigateUrl="~/Users">
                            <span>👥 User Management</span>
                        </asp:HyperLink>
                        <asp:HyperLink ID="lnkNavRolePermission" runat="server" CssClass="ba-nav-item" NavigateUrl="~/RolePermission">
                            <span>🔐 Role Permission</span>
                        </asp:HyperLink>
                        <asp:HyperLink ID="lnkNavLeaveManager" runat="server" CssClass="ba-nav-item" NavigateUrl="~/LeaveManager">
                            <span>📅 Leave Manager</span>
                        </asp:HyperLink>
                        <asp:PlaceHolder ID="phNavPgpTool" runat="server" Visible="false">
                            <asp:HyperLink ID="lnkNavPgpTool" runat="server" CssClass="ba-nav-item" NavigateUrl="~/PgpTool">
                                <span>🔐 PGP Tool</span>
                            </asp:HyperLink>
                        </asp:PlaceHolder>
                    </asp:PlaceHolder>
                </nav>
            </aside>
            <main class="ba-main">
                <div class="ba-top-bar">
                    <h1 class="ba-top-bar-title">
                        <asp:Literal ID="litPageTitle" runat="server" />
                    </h1>
                    <div class="ba-top-bar-actions">
                        <button class="theme-switcher" id="themeSwitcher" onclick="toggleTheme(event); return false;">
                            <span class="theme-switcher-icon" id="themeIcon">🌙</span>
                            <span id="themeText">Dark</span>
                        </button>
                        <div class="user-menu">
                            <button class="user-menu-trigger" type="button" id="userMenuTrigger" onclick="toggleUserMenu(event); return false;">
                                <div class="user-avatar">
                                    <asp:Literal ID="litUserInitial" runat="server" />
                                </div>
                                <span><asp:Literal ID="litUserName" runat="server" /></span><asp:Literal ID="litRoleBadge" runat="server" Visible="false" />
                                <span>▼</span>
                            </button>
                            <div class="user-menu-dropdown" id="userMenuDropdown">
                                <a href="#" class="menu-item" onclick="closeUserMenu(); showAccountModal('security'); return false;">🔒 Change Password</a>
                                <a href="#" class="menu-item" onclick="closeUserMenu(); showAccountModal('account'); return false;">⚙️ Account Settings</a>
                                <div class="menu-item" style="border-top: 1px solid var(--border); margin-top: 0.25rem; padding-top: 0.75rem;">
                                    <a href="~/Login" runat="server" style="color: inherit; text-decoration: none;" onclick="closeUserMenu();">🚪 Logout</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ba-content">
                    <div class="ba-card">
                        <h2 class="ba-card-title">
                            <asp:Literal ID="litWelcomeTitle" runat="server" />
                        </h2>
                        <p class="ba-card-desc">
                            <asp:Literal ID="litWelcomeDesc" runat="server" />
                        </p>
                        <div class="ba-feature-grid">
                            <asp:HyperLink ID="lnkFeatureUIBuilder" runat="server" CssClass="ba-feature-card" NavigateUrl="~/DesignerHome">
                                <div class="ba-feature-icon">🛠️</div>
                                <div class="ba-feature-title">UI Builder</div>
                                <div class="ba-feature-desc">Thiết kế và tạo giao diện người dùng. Tạo controls, forms, và các component UI.</div>
                            </asp:HyperLink>
                            <asp:HyperLink ID="lnkFeatureDbSearch" runat="server" CssClass="ba-feature-card" NavigateUrl="~/DatabaseSearch">
                                <div class="ba-feature-icon">🔍</div>
                                <div class="ba-feature-title">Database Search</div>
                                <div class="ba-feature-desc">Tìm kiếm và quản lý database connections. Quét server, xem danh sách database, copy connection string.</div>
                            </asp:HyperLink>
                            <asp:PlaceHolder ID="phFeatureEncryptDecrypt" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureEncryptDecrypt" runat="server" CssClass="ba-feature-card" NavigateUrl="~/EncryptDecrypt">
                                    <div class="ba-feature-icon">🔐</div>
                                    <div class="ba-feature-title">Encrypt/Decrypt Data</div>
                                    <div class="ba-feature-desc">Mã hóa / giải mã đơn, tạo script Demo Reset (phone, email, lương) theo nhân viên.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phNoFeatures" runat="server" Visible="false">
                                <div class="ba-feature-card disabled" style="grid-column: 1 / -1; text-align: center; opacity: 1;">
                                    <div class="ba-feature-icon">📋</div>
                                    <div class="ba-feature-title">Chưa có quyền chức năng</div>
                                    <div class="ba-feature-desc">Bạn chưa được gán quyền nào. Liên hệ Super Admin để được cấp quyền (Role hoặc quyền riêng lẻ trong Edit User).</div>
                                </div>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phSuperAdminCards" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureUserManagement" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Users">
                                    <div class="ba-feature-icon">👥</div>
                                    <div class="ba-feature-title">User Management</div>
                                    <div class="ba-feature-desc">Quản lý user: thêm, sửa, đổi mật khẩu, gán role và quyền riêng lẻ.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureRolePermission" runat="server" CssClass="ba-feature-card" NavigateUrl="~/RolePermission">
                                    <div class="ba-feature-icon">🔐</div>
                                    <div class="ba-feature-title">Role Permission</div>
                                    <div class="ba-feature-desc">Định nghĩa quyền theo Role (BA, CONS, DEV). Cấu hình UI Builder, Database Search, Encrypt/Decrypt, HR Helper.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureLeaveManager" runat="server" CssClass="ba-feature-card" NavigateUrl="~/LeaveManager">
                                    <div class="ba-feature-icon">📅</div>
                                    <div class="ba-feature-title">Leave Manager</div>
                                    <div class="ba-feature-desc">Quản lý lịch nghỉ phép team. Xem hôm nay bao nhiêu NV nghỉ, ai trực (chụp hình gửi sếp).</div>
                                </asp:HyperLink>
                                <asp:PlaceHolder ID="phFeaturePgpTool" runat="server" Visible="false">
                                    <asp:HyperLink ID="lnkFeaturePgpTool" runat="server" CssClass="ba-feature-card" NavigateUrl="~/PgpTool">
                                        <div class="ba-feature-icon">🔐</div>
                                        <div class="ba-feature-title">PGP Tool</div>
                                        <div class="ba-feature-desc">Xuất key .asc, mã hóa và giải mã file PGP (tương tự tool cũ).</div>
                                    </asp:HyperLink>
                                </asp:PlaceHolder>
                            </asp:PlaceHolder>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <!-- Account Settings Modal -->
        <div class="account-modal" id="accountModal">
            <div class="account-modal-content">
                <div class="account-modal-header">
                    <h3 class="account-modal-title">Account Settings</h3>
                    <button type="button" class="account-modal-close" onclick="hideAccountModal(); return false;">×</button>
                </div>
                <div class="account-modal-tabs">
                    <button class="account-modal-tab active" data-tab="account" onclick="switchAccountTab(event, 'account'); return false;">Account</button>
                    <button class="account-modal-tab" data-tab="security" onclick="switchAccountTab(event, 'security'); return false;">Security</button>
                </div>
                <div class="account-modal-body">
                    <div id="accountTabContent" class="account-tab-content">
                        <div class="account-profile-header">
                            <div class="account-avatar-container">
                                <div class="account-avatar" id="accountAvatar">
                                    <img id="accountAvatarImg" src="" alt="Avatar" style="display: none; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
                                </div>
                                <label for="avatarUpload" class="account-avatar-upload-btn" title="Upload avatar">
                                    <input type="file" id="avatarUpload" accept="image/*" style="display: none;" />
                                    <span>📷</span>
                                </label>
                            </div>
                            <div class="account-profile-info">
                                <div class="account-profile-name" id="accountFullName"></div>
                                <div class="account-field-value" id="accountEmail"></div>
                            </div>
                        </div>
                        <div class="account-section">
                            <div class="account-section-title">Account Information</div>
                            <div class="account-field">
                                <span class="account-field-label">User ID</span>
                                <span class="account-field-value" id="accountUserId"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Username</span>
                                <span class="account-field-value" id="accountUserName"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Full Name</span>
                                <span class="account-field-value" id="accountFullName2"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Email</span>
                                <span class="account-field-value" id="accountEmail2"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Role</span>
                                <span class="account-field-value" id="accountRole"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Status</span>
                                <span class="account-field-value" id="accountStatus"></span>
                            </div>
                        </div>
                    </div>
                    <div id="securityTabContent" class="account-tab-content" style="display: none;">
                        <div class="account-section">
                            <div class="account-section-title">Change Password</div>
                            <form id="changePasswordForm">
                                <div class="account-form-group">
                                    <label class="account-form-label" for="txtModalCurrentPassword">Current Password</label>
                                    <input type="password" id="txtModalCurrentPassword" class="account-form-input" />
                                </div>
                                <div class="account-form-group">
                                    <label class="account-form-label" for="txtModalNewPassword">New Password</label>
                                    <input type="password" id="txtModalNewPassword" class="account-form-input" />
                                </div>
                                <div class="account-form-group">
                                    <label class="account-form-label" for="txtModalConfirmPassword">Confirm New Password</label>
                                    <input type="password" id="txtModalConfirmPassword" class="account-form-input" />
                                </div>
                                <div class="account-form-group">
                                    <button type="button" class="btn btn-primary" onclick="changePassword(); return false;">Change Password</button>
                                </div>
                                <div id="passwordMessage" style="margin-top: 1rem; display: none;"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <script>
        function toggleUserMenu(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var dropdown = document.getElementById('userMenuDropdown');
            dropdown.classList.toggle('show');
            return false;
        }
        function closeUserMenu() {
            document.getElementById('userMenuDropdown').classList.remove('show');
        }
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.user-menu').length) {
                closeUserMenu();
            }
        });
        function initTheme() {
            var savedTheme = localStorage.getItem('theme') || 'dark';
            applyTheme(savedTheme);
        }
        function applyTheme(theme) {
            if (theme === 'dark') {
                document.body.classList.remove('light-theme');
                if (document.getElementById('themeIcon')) {
                    document.getElementById('themeIcon').textContent = '☀️';
                    document.getElementById('themeText').textContent = 'Light';
                }
            } else {
                document.body.classList.add('light-theme');
                if (document.getElementById('themeIcon')) {
                    document.getElementById('themeIcon').textContent = '🌙';
                    document.getElementById('themeText').textContent = 'Dark';
                }
            }
            localStorage.setItem('theme', theme);
        }
        function toggleTheme(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var currentTheme = localStorage.getItem('theme') || 'dark';
            var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            return false;
        }
        initTheme();
        function showAccountModal(tab) {
            var modal = document.getElementById('accountModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            if (!tab) tab = 'account';
            switchAccountTab(null, tab);
        }
        function loadAccountInfo(retryCount) {
            var modal = document.getElementById('accountModal');
            if (!modal || !modal.classList.contains('show')) return;
            retryCount = retryCount || 0;
            var maxRetries = 5;
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HomeRole.aspx/GetAccountInfo") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                success: function(response) {
                    if (response.d && response.d.success) {
                        var data = response.d;
                        var userName = data.userName || '';
                        var avatarEl = document.getElementById('accountAvatar');
                        if (!avatarEl) {
                            if (retryCount < maxRetries) {
                                setTimeout(function() { loadAccountInfo(retryCount + 1); }, 100);
                            }
                            return;
                        }
                        if (data.avatarPath) {
                            var avatarUrl = data.avatarPath + '?t=' + new Date().getTime();
                            avatarEl.style.backgroundImage = 'url(' + avatarUrl + ')';
                            avatarEl.style.backgroundSize = 'cover';
                            avatarEl.style.backgroundPosition = 'center';
                            avatarEl.style.backgroundRepeat = 'no-repeat';
                            avatarEl.style.backgroundColor = 'transparent';
                            avatarEl.textContent = '';
                            var avatarImg = document.getElementById('accountAvatarImg');
                            if (avatarImg) avatarImg.style.display = 'none';
                        } else {
                            avatarEl.style.backgroundImage = '';
                            avatarEl.style.backgroundColor = 'var(--primary)';
                            avatarEl.textContent = userName.length > 0 ? userName.substring(0, 1).toUpperCase() : '';
                            var avatarImg = document.getElementById('accountAvatarImg');
                            if (avatarImg) avatarImg.style.display = 'none';
                        }
                        var accountFullName = document.getElementById('accountFullName');
                        var accountEmail = document.getElementById('accountEmail');
                        if (accountFullName) accountFullName.textContent = data.fullName || data.userName || '';
                        if (accountEmail) accountEmail.innerHTML = data.email || '<em>Not set</em>';
                        var accountUserId = document.getElementById('accountUserId');
                        var accountUserName = document.getElementById('accountUserName');
                        var accountFullName2 = document.getElementById('accountFullName2');
                        var accountEmail2 = document.getElementById('accountEmail2');
                        if (accountUserId) accountUserId.textContent = data.userId || '';
                        if (accountUserName) accountUserName.textContent = data.userName || '';
                        if (accountFullName2) accountFullName2.innerHTML = data.fullName2 || '<em>Not set</em>';
                        if (accountEmail2) accountEmail2.innerHTML = data.email || '<em>Not set</em>';
                        var roleBadge = data.isSuperAdmin 
                            ? '<span class="account-badge account-badge-success">Super Admin</span>' 
                            : (data.roleCode ? '<span class="account-badge account-badge-default">' + data.roleCode + '</span>' : '<span class="account-badge account-badge-default">User</span>');
                        var accountRole = document.getElementById('accountRole');
                        if (accountRole) accountRole.innerHTML = roleBadge;
                        var statusBadge = data.isActive 
                            ? '<span class="account-badge account-badge-success">Active</span>' 
                            : '<span class="account-badge account-badge-danger">Inactive</span>';
                        var accountStatus = document.getElementById('accountStatus');
                        if (accountStatus) accountStatus.innerHTML = statusBadge;
                    }
                },
                error: function() {
                    console.error('Failed to load account info');
                }
            });
        }
        function hideAccountModal(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var modal = document.getElementById('accountModal');
            modal.classList.remove('show');
            document.body.style.overflow = '';
            return false;
        }
        function switchAccountTab(e, tab) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            document.querySelectorAll('.account-modal-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            document.querySelector('.account-modal-tab[data-tab="' + tab + '"]').classList.add('active');
            document.getElementById('accountTabContent').style.display = tab === 'account' ? 'block' : 'none';
            document.getElementById('securityTabContent').style.display = tab === 'security' ? 'block' : 'none';
            if (tab === 'account') {
                loadAccountInfo();
            }
            return false;
        }
        document.getElementById('accountModal').addEventListener('click', function(e) {
            if (e.target === this) {
                hideAccountModal();
            }
        });
        document.getElementById('avatarUpload').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB.');
                return;
            }
            var formData = new FormData();
            formData.append('file', file);
            $.ajax({
                url: '/Handlers/UploadAvatar.ashx',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function(response) {
                    if (response && response.success) {
                        var avatarUrl = response.avatarPath + '?t=' + new Date().getTime();
                        var modal = document.getElementById('accountModal');
                        if (modal && modal.classList.contains('show')) {
                            var avatarEl = document.getElementById('accountAvatar');
                            if (avatarEl) {
                                avatarEl.style.backgroundImage = 'url(' + avatarUrl + ')';
                                avatarEl.style.backgroundSize = 'cover';
                                avatarEl.style.backgroundPosition = 'center';
                                avatarEl.style.backgroundRepeat = 'no-repeat';
                                avatarEl.style.backgroundColor = 'transparent';
                                avatarEl.textContent = '';
                                var avatarImg = document.getElementById('accountAvatarImg');
                                if (avatarImg) avatarImg.style.display = 'none';
                            }
                            loadAccountInfo();
                        }
                        var topBarAvatars = document.querySelectorAll('.user-avatar');
                        topBarAvatars.forEach(function(avatarEl) {
                            avatarEl.innerHTML = '<img src="' + avatarUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />';
                        });
                        var litUserInitialEl = document.querySelector('#<%= litUserInitial.ClientID %>');
                        if (litUserInitialEl) {
                            var parentAvatar = litUserInitialEl.closest('.user-avatar');
                            if (parentAvatar) {
                                parentAvatar.innerHTML = '<img src="' + avatarUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />';
                            }
                        }
                    } else {
                        alert(response && response.message ? response.message : 'Failed to upload avatar.');
                    }
                },
                error: function(xhr) {
                    var errorMsg = 'Failed to upload avatar.';
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.message) errorMsg = response.message;
                    } catch(e) {
                        if (xhr.responseText) {
                            errorMsg += ' ' + xhr.responseText.substring(0, 200);
                        }
                    }
                    alert(errorMsg);
                }
            });
        });
        function changePassword() {
            var currentPassword = document.getElementById('txtModalCurrentPassword').value;
            var newPassword = document.getElementById('txtModalNewPassword').value;
            var confirmPassword = document.getElementById('txtModalConfirmPassword').value;
            var messageDiv = document.getElementById('passwordMessage');
            if (!currentPassword || !newPassword || !confirmPassword) {
                messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">Please fill in all fields.</div>';
                messageDiv.style.display = 'block';
                return;
            }
            if (newPassword !== confirmPassword) {
                messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">New password and confirmation do not match.</div>';
                messageDiv.style.display = 'block';
                return;
            }
            if (newPassword.length < 6) {
                messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">Password must be at least 6 characters.</div>';
                messageDiv.style.display = 'block';
                return;
            }
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HomeRole.aspx/ChangePassword") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                }),
                success: function(response) {
                    if (response.d && response.d.success) {
                        messageDiv.innerHTML = '<div style="color: #10b981; font-size: 0.875rem;">Password changed successfully!</div>';
                        messageDiv.style.display = 'block';
                        document.getElementById('txtModalCurrentPassword').value = '';
                        document.getElementById('txtModalNewPassword').value = '';
                        document.getElementById('txtModalConfirmPassword').value = '';
                        setTimeout(function() {
                            hideAccountModal();
                        }, 1500);
                    } else {
                        messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">' + (response.d && response.d.message ? response.d.message : 'Failed to change password.') + '</div>';
                        messageDiv.style.display = 'block';
                    }
                },
                error: function(xhr) {
                    var errorMsg = 'Failed to change password.';
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.Message) errorMsg = response.Message;
                        else if (response.d && response.d.message) errorMsg = response.d.message;
                    } catch(e) {}
                    messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">' + errorMsg + '</div>';
                    messageDiv.style.display = 'block';
                }
            });
        }
    </script>
</body>
</html>
