<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Users.aspx.cs"
    Inherits="UiBuilderFull.Admin.Users" %>
<%@ Import Namespace="System.Web" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>User Management - UI Builder</title>
    
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>

    <style>
        :root {
            /* Dark theme (default) */
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

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* ===== Layout ===== */
        .admin-container {
            display: flex;
            min-height: 100vh;
        }

        /* ===== Sidebar ===== */
        .admin-sidebar {
            width: 240px;
            background: var(--bg-darker);
            border-right: 1px solid var(--border);
            padding: 1.5rem 0;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            transition: width 0.25s ease;
        }
        .admin-sidebar.collapsed {
            width: 64px;
            padding: 1rem 0;
        }
        .admin-sidebar.collapsed .admin-sidebar-header { padding: 0 0.75rem 1rem; }
        .admin-sidebar.collapsed .admin-sidebar-title,
        .admin-sidebar.collapsed .admin-nav-item span { display: none; }
        .admin-sidebar.collapsed .admin-nav-item { justify-content: center; padding: 0.75rem; text-align: center; font-size: 1.25rem; }
        .admin-sidebar.collapsed .admin-nav-item::before { content: attr(data-icon); }
        .admin-sidebar-toggle {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.25rem;
            font-size: 1rem;
            line-height: 1;
            transition: color 0.2s;
        }
        .admin-sidebar-toggle:hover { color: var(--text-primary); }
        .admin-sidebar.collapsed .admin-sidebar-toggle { transform: rotate(180deg); }

        .admin-sidebar-header {
            padding: 0 1.5rem 1.5rem;
            border-bottom: 1px solid var(--border);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        }

        .admin-sidebar-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .admin-nav-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .admin-nav-item:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .admin-nav-item.active {
            background: var(--primary-soft);
            color: var(--primary-light);
            border-left: 3px solid var(--primary);
        }

        /* ===== Main Content ===== */
        .admin-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .admin-top-bar {
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .admin-top-bar-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .admin-content {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
        }

        /* ===== Table ===== */
        .admin-table-container {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 2rem;
            max-height: 480px;
            overflow-y: auto;
        }

        .admin-table {
            width: 100%;
            border-collapse: collapse;
        }

        .admin-table thead {
            background: var(--bg-darker);
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 1;
        }

        .admin-table thead th {
            background: var(--bg-darker);
        }

        .admin-table th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .admin-table td {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.875rem;
            color: var(--text-primary);
        }

        .admin-table tbody tr:hover {
            background: var(--bg-hover);
        }

        .admin-table tbody tr:last-child td {
            border-bottom: none;
        }

        .admin-table th.admin-sortable {
            cursor: pointer;
            user-select: none;
        }
        .admin-table th.admin-sortable:hover { background: var(--bg-hover); }
        .admin-table th .sort-icon { margin-left: 4px; opacity: 0.6; }

        .admin-users-search {
            margin-bottom: 1rem;
            max-width: 400px;
        }
        .admin-users-search input {
            width: 100%;
            padding: 0.5rem 0.75rem 0.5rem 2.25rem;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.875rem;
        }
        .admin-users-search input:focus {
            outline: none;
            border-color: var(--primary);
        }
        .admin-users-search-wrap {
            position: relative;
        }
        .admin-users-search-wrap::before {
            content: "🔍";
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.875rem;
            opacity: 0.7;
        }

        /* ===== Form Elements ===== */
        .admin-input {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            width: 100%;
            transition: all 0.2s ease;
        }

        .admin-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-soft);
        }

        .admin-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--primary);
        }

        .admin-btn {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .admin-btn-primary {
            background: var(--primary);
            color: white;
        }

        .admin-btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .admin-btn-secondary {
            background: var(--bg-hover);
            color: var(--text-primary);
            border: 1px solid var(--border);
        }

        .admin-btn-secondary:hover {
            background: var(--bg-card);
        }

        .admin-btn-danger {
            background: var(--danger);
            color: white;
        }

        .admin-btn-danger:hover {
            background: #dc2626;
        }

        .admin-btn-sm {
            padding: 0.375rem 0.75rem;
            font-size: 0.8125rem;
        }

        /* ===== Add User Form ===== */
        .admin-form-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
        }

        .admin-form-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 1.5rem;
        }

        .admin-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .admin-form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .admin-form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .admin-form-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 1rem;
        }

        /* ===== Toast Message ===== */
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10002;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            pointer-events: none;
        }

        .toast {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.75rem 1rem 0.25rem 1rem;
            min-width: 280px;
            max-width: 360px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }

        .toast.hide {
            opacity: 0;
            transform: translateX(100%);
        }

        .toast-header {
            display: flex !important;
            align-items: center;
            gap: 0.625rem;
            margin-bottom: 0.375rem;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
        }

        .toast-icon {
            font-size: 1rem;
            flex-shrink: 0;
            line-height: 1;
        }

        .toast.success .toast-icon {
            color: var(--success);
        }

        .toast.error .toast-icon {
            color: var(--danger);
        }

        .toast.info .toast-icon {
            color: var(--primary);
        }

        .toast-content {
            flex: 1;
        }

        .toast-title {
            font-weight: 600;
            font-size: 0.875rem;
            color: var(--text-primary);
            margin-bottom: 0.125rem;
            line-height: 1.3;
        }

        .toast-message {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            line-height: 1.4;
        }

        .toast-close {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 1rem;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: color 0.2s ease;
            line-height: 1;
        }

        .toast-close:hover {
            color: var(--text-primary);
        }

        .toast-progress {
            height: 2px;
            margin-top: 0.5rem;
            background: rgba(255, 255, 255, 0.1);
            overflow: hidden;
            border-radius: 0 0 6px 6px;
            margin-left: -1rem;
            margin-right: -1rem;
            margin-bottom: -0.25rem;
        }

        .toast-progress-bar {
            height: 100%;
            width: 100%;
            background: rgba(255, 255, 255, 0.25);
            transform-origin: left center;
            transform: scaleX(1);
            transition: transform linear;
        }

        /* ===== Action Buttons ===== */
        .admin-action-buttons {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .admin-password-input {
            min-width: 140px;
        }

        /* ===== Status Badge ===== */
        .admin-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .admin-badge-success {
            background: rgba(16, 185, 129, 0.2);
            color: var(--success);
        }

        .admin-badge-danger {
            background: rgba(239, 68, 68, 0.2);
            color: var(--danger);
        }

        /* ===== User Modal (Figma Style) ===== */
        .user-modal {
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

        .user-modal.show {
            display: flex;
        }

        .user-modal-content {
            background: var(--bg-card);
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: modalSlideIn 0.2s ease-out;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .user-modal-header {
            padding: 1.5rem 2rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .user-modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .user-modal-close {
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

        .user-modal-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .user-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
        }

        .user-modal-footer {
            padding: 1.5rem 2rem;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
        }

        .user-form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .user-form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .user-form-input {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            width: 100%;
            transition: all 0.2s ease;
        }

        .user-form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-soft);
        }

        .user-form-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .user-form-checkbox-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .user-form-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--primary);
        }
        .perm-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.35rem 0;
            font-size: 0.875rem;
        }
        .perm-item input:disabled + span { color: var(--text-muted); }
        .user-form-row {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .user-form-row .user-form-group { flex: 1; margin-bottom: 0; }
        .password-wrap {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .password-wrap .user-form-input { flex: 1; }
        .pw-toggle {
            background: var(--bg-hover);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0.5rem 0.6rem;
            font-size: 1rem;
            flex-shrink: 0;
        }
        .pw-toggle:hover { color: var(--text-primary); background: var(--bg-card); }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="admin-container">
            <!-- Sidebar -->
            <div class="admin-sidebar" id="adminSidebar">
                <div class="admin-sidebar-header">
                    <div class="admin-sidebar-title">UI Builder</div>
                    <button type="button" class="admin-sidebar-toggle" id="adminSidebarToggle" title="Thu nhỏ menu">◀</button>
                </div>
                <a href="~/HomeRole" runat="server" class="admin-nav-item" data-icon="←" title="Back to Home">
                    <span>← Back to Home</span>
                </a>
                <div class="admin-nav-item active" data-icon="👥" title="User Management">
                    <span>👥 User Management</span>
                </div>
                <a href="~/RolePermission" runat="server" class="admin-nav-item" data-icon="🛡" title="Role Permission">
                    <span>🛡 Role Permission</span>
                </a>
            </div>

            <!-- Main Content -->
            <div class="admin-main">
                <!-- Top Bar -->
                <div class="admin-top-bar">
                    <div class="admin-top-bar-title">User Management</div>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="showUserModal(); return false;">
                        + Add New User
                    </button>
                </div>

                <!-- Content -->
                <div class="admin-content">
                    <div class="admin-users-search">
                        <div class="admin-users-search-wrap">
                            <input type="text" id="userSearchInput" placeholder="Search by Username, Full Name, Email, Role..." />
                        </div>
                    </div>
                    <!-- Users Table -->
                    <div class="admin-table-container">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th class="admin-sortable" data-col="userId"><span>ID <span class="sort-icon"></span></span></th>
                                    <th class="admin-sortable" data-col="userName"><span>Username <span class="sort-icon"></span></span></th>
                                    <th class="admin-sortable" data-col="fullName"><span>Full Name <span class="sort-icon"></span></span></th>
                                    <th class="admin-sortable" data-col="email"><span>Email <span class="sort-icon"></span></span></th>
                                    <th class="admin-sortable" data-col="role"><span>Role <span class="sort-icon"></span></span></th>
                                    <th class="admin-sortable" data-col="superAdmin"><span>Super Admin <span class="sort-icon"></span></span></th>
                                    <th class="admin-sortable" data-col="active"><span>Active <span class="sort-icon"></span></span></th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody">
                                <asp:Repeater ID="rpUsers" runat="server">
                                    <ItemTemplate>
                                        <tr data-user-id="<%# Eval("UserId") %>" data-user-name="<%# HttpUtility.HtmlEncode((Eval("UserName") as string) ?? "") %>" data-full-name="<%# HttpUtility.HtmlEncode((Eval("FullName") as string) ?? "-") %>" data-email="<%# HttpUtility.HtmlEncode((Eval("Email") as string) ?? "-") %>" data-role="<%# HttpUtility.HtmlEncode((Eval("RoleCode") as string) ?? "-") %>" data-super-admin="<%# (bool)Eval("IsSuperAdmin") ? "Yes" : "No" %>" data-active="<%# (bool)Eval("IsActive") ? "Active" : "Inactive" %>">
                                            <td><%# Eval("UserId") %></td>
                                            <td><strong><%# Eval("UserName") %></strong></td>
                                            <td><%# Eval("FullName") ?? "-" %></td>
                                            <td><%# Eval("Email") ?? "-" %></td>
                                            <td><%# Eval("RoleCode") ?? "-" %></td>
                                            <td>
                                                <span class="admin-badge <%# (bool)Eval("IsSuperAdmin") ? "admin-badge-success" : "" %>">
                                                    <%# (bool)Eval("IsSuperAdmin") ? "Yes" : "No" %>
                                                </span>
                                            </td>
                                            <td>
                                                <span class="admin-badge <%# (bool)Eval("IsActive") ? "admin-badge-success" : "admin-badge-danger" %>">
                                                    <%# (bool)Eval("IsActive") ? "Active" : "Inactive" %>
                                                </span>
                                            </td>
                                            <td>
                                                <div class="admin-action-buttons">
                                                    <button type="button" 
                                                            class="admin-btn admin-btn-primary admin-btn-sm"
                                                            onclick="editUser(<%# Eval("UserId") %>); return false;">
                                                        Edit
                                                    </button>
                                                    <button type="button" 
                                                            class="admin-btn admin-btn-secondary admin-btn-sm"
                                                            onclick="resetPassword(<%# Eval("UserId") %>); return false;">
                                                        Reset
                                                    </button>
                                                    <button type="button" 
                                                            class="admin-btn admin-btn-danger admin-btn-sm"
                                                            onclick="toggleActive(<%# Eval("UserId") %>); return false;">
                                                        Toggle
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>

        <!-- Toast Container -->
        <div id="toastContainer" class="toast-container"></div>
        
        <!-- User Modal (Add/Edit) -->
        <div id="userModal" class="user-modal">
            <div class="user-modal-content">
                <div class="user-modal-header">
                    <h3 class="user-modal-title" id="userModalTitle">Add New User</h3>
                    <button type="button" class="user-modal-close" onclick="hideUserModal(); return false;">×</button>
                </div>
                <div class="user-modal-body">
                    <div class="user-form-row">
                        <div class="user-form-group">
                            <label class="user-form-label" for="modalUsername">Username *</label>
                            <input type="text" id="modalUsername" class="user-form-input" placeholder="Enter username" />
                        </div>
                        <div class="user-form-group">
                            <label class="user-form-label" for="modalPassword">Password <span id="passwordRequired">*</span></label>
                            <div class="password-wrap">
                                <input type="password" id="modalPassword" class="user-form-input" placeholder="Enter password" />
                                <button type="button" class="pw-toggle" id="pwToggle" title="Show password" aria-label="Show password">👁</button>
                            </div>
                        </div>
                    </div>
                    <div class="user-form-group">
                        <label class="user-form-label" for="modalFullName">Full Name</label>
                        <input type="text" id="modalFullName" class="user-form-input" placeholder="Enter full name" />
                    </div>
                    <div class="user-form-group">
                        <label class="user-form-label" for="modalEmail">Email</label>
                        <input type="email" id="modalEmail" class="user-form-input" placeholder="Enter email" />
                    </div>
                    <div class="user-form-group">
                        <label class="user-form-label" for="modalRoleId">Role</label>
                        <select id="modalRoleId" class="user-form-input">
                            <option value="0">-- No role --</option>
                        </select>
                    </div>
                    <div class="user-form-group" id="wrapPermissions">
                        <div class="user-form-label">Quyền riêng lẻ (thêm)</div>
                        <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.5rem;">Quyền từ Role không thể bỏ. Chỉ có thể thêm quyền cho user đặc biệt (UI Builder, Database Search, Encrypt/Decrypt, HR Helper…).</p>
                        <div id="modalPermissionsList"></div>
                        <div id="modalPermissionsLoading" style="display: none; font-size: 0.875rem; color: var(--text-muted);">Đang tải danh sách quyền…</div>
                    </div>
                    <div class="user-form-group">
                        <div class="user-form-checkbox-group">
                            <input type="checkbox" id="modalIsSuperAdmin" class="user-form-checkbox" />
                            <label class="user-form-label" for="modalIsSuperAdmin" style="margin: 0;">Super Admin</label>
                        </div>
                    </div>
                    <div class="user-form-group">
                        <div class="user-form-checkbox-group">
                            <input type="checkbox" id="modalIsActive" class="user-form-checkbox" />
                            <label class="user-form-label" for="modalIsActive" style="margin: 0;">Active</label>
                        </div>
                    </div>
                </div>
                <div class="user-modal-footer">
                    <button type="button" class="admin-btn admin-btn-primary" onclick="saveUser(); return false;" id="btnSaveUser">Save</button>
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="hideUserModal(); return false;">Cancel</button>
                </div>
            </div>
        </div>
        
        <!-- Hidden label for server-side messages -->
        <asp:Label ID="lblMsg" runat="server" style="display: none;" />
    </form>

    <script>
        // ===== Sidebar collapse =====
        (function() {
            var key = 'adminSidebarCollapsed';
            var $sb = $('#adminSidebar');
            var $btn = $('#adminSidebarToggle');
            if (localStorage.getItem(key) === '1') $sb.addClass('collapsed');
            $btn.on('click', function() {
                $sb.toggleClass('collapsed');
                localStorage.setItem(key, $sb.hasClass('collapsed') ? '1' : '0');
            });
        })();
        // ===== Toast Message Functions =====
        function showToast(message, type) {
            type = type || 'info';
            var icons = {
                success: '✓',
                error: '✕',
                info: 'ℹ'
            };
            var titles = {
                success: 'Success',
                error: 'Error',
                info: 'Info'
            };
            
            var timeout = 5000; // 5 seconds
            
            var $toast = $('<div class="toast ' + type + '">' +
                '<div class="toast-header">' +
                '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
                '<div class="toast-content">' +
                '<div class="toast-title">' + (titles[type] || titles.info) + '</div>' +
                '<div class="toast-message">' + message + '</div>' +
                '</div>' +
                '<button type="button" class="toast-close">&times;</button>' +
                '</div>' +
                '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' +
                '</div>');
            
            var $bar = $toast.find('.toast-progress-bar');
            var $close = $toast.find('.toast-close');
            
            $('#toastContainer').append($toast);
            
            // Trigger reflow to ensure initial state
            $toast[0].offsetHeight;
            
            // Show toast with animation
            setTimeout(function() {
                $toast.addClass('show');
            }, 10);
            
            // Start progress bar animation
            setTimeout(function() {
                $bar.css('transition', 'transform ' + timeout + 'ms linear');
                $bar.css('transform', 'scaleX(0)');
            }, 100);
            
            // Remove toast function
            function removeToast() {
                $toast.removeClass('show').addClass('hide');
                setTimeout(function() {
                    $toast.remove();
                }, 300);
            }
            
            // Close button click
            $close.on('click', removeToast);
            
            // Auto remove after timeout
            var autoHide = setTimeout(removeToast, timeout);
            
            // Pause on hover
            $toast.on('mouseenter', function() {
                clearTimeout(autoHide);
                var remaining = $bar[0].getBoundingClientRect().width / $bar.parent().width() * timeout;
                $bar.css('transition', 'none');
                $bar.css('transform', 'scaleX(' + ($bar[0].getBoundingClientRect().width / $bar.parent().width()) + ')');
            });
            
            $toast.on('mouseleave', function() {
                var remaining = $bar[0].getBoundingClientRect().width / $bar.parent().width() * timeout;
                $bar.css('transition', 'transform ' + remaining + 'ms linear');
                $bar.css('transform', 'scaleX(0)');
                autoHide = setTimeout(removeToast, remaining);
            });
        }

        // ===== User Actions =====
        function changePassword(userId) {
            var passwordInput = document.getElementById('txtRowNewPass_' + userId);
            var newPass = passwordInput ? passwordInput.value.trim() : '';
            
            if (!newPass) {
                showToast('Please enter a new password.', 'error');
                return;
            }
            
            // Call server-side method via AJAX
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/Users.aspx/ChangePassword") %>',
                method: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({ userId: userId, newPassword: newPass }),
                success: function(res) {
                    var result = res.d;
                    if (result && result.success) {
                        showToast('Password changed successfully.', 'success');
                        if (passwordInput) passwordInput.value = '';
                    } else {
                        showToast(result && result.message ? result.message : 'Error changing password.', 'error');
                    }
                },
                error: function() {
                    showToast('Error changing password.', 'error');
                }
            });
        }

        function resetPassword(userId) {
            if (!confirm('Reset password to "123456" for user ' + userId + '?')) {
                return;
            }
            
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/Users.aspx/ResetPassword") %>',
                method: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({ userId: userId }),
                success: function(res) {
                    var result = res.d;
                    if (result && result.success) {
                        showToast('Password reset to "123456" for user ' + userId + '.', 'success');
                    } else {
                        showToast(result && result.message ? result.message : 'Error resetting password.', 'error');
                    }
                },
                error: function() {
                    showToast('Error resetting password.', 'error');
                }
            });
        }

        function toggleActive(userId) {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/Users.aspx/ToggleActive") %>',
                method: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({ userId: userId }),
                success: function(res) {
                    var result = res.d;
                    if (result && result.success) {
                        showToast('User status updated successfully.', 'success');
                        // Reload page after a short delay
                        setTimeout(function() {
                            window.location.reload();
                        }, 1000);
                    } else {
                        showToast(result && result.message ? result.message : 'Error updating user status.', 'error');
                    }
                },
                error: function() {
                    showToast('Error updating user status.', 'error');
                }
            });
        }

        // ===== User Modal Functions =====
        var currentEditUserId = null;
        var rolesList = [];
        var permissionsList = [];
        var rolePermissionsMap = {};
        var currentUserPermissionIds = [];

        function loadRoles() {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/Users.aspx/LoadRoles") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}',
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.list) {
                        rolesList = d.list;
                        var $sel = $('#modalRoleId');
                        $sel.find('option:not([value="0"])').remove();
                        d.list.forEach(function(r) {
                            $sel.append('<option value="' + r.id + '">' + (r.code || r.name || r.id) + '</option>');
                        });
                    }
                }
            });
        }

        function loadPermissionsAndRolePermissions() {
            var reqPerm = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadPermissions") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.list) permissionsList = d.list;
            });
            var reqRp = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadRolePermissions") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.rolePermissions) rolePermissionsMap = d.rolePermissions;
            });
            return $.when(reqPerm, reqRp);
        }

        function renderPermissionCheckboxes(roleIdVal, userPermissionIds) {
            userPermissionIds = userPermissionIds || [];
            var rolePids = rolePermissionsMap[String(roleIdVal)] || [];
            var $list = $('#modalPermissionsList');
            var $loading = $('#modalPermissionsLoading');
            $list.empty();
            $loading.hide();
            if (!permissionsList.length) {
                $loading.text('Chưa có quyền. Kiểm tra Role Permission đã cấu hình chưa.').show();
                return;
            }
            permissionsList.forEach(function(p) {
                var fromRole = rolePids.indexOf(p.id) >= 0;
                var fromUser = userPermissionIds.indexOf(p.id) >= 0;
                var checked = fromRole || fromUser;
                var disabled = fromRole;
                var $item = $('<label class="perm-item"></label>');
                $item.append('<input type="checkbox" class="perm-cb" data-pid="' + p.id + '" ' + (checked ? 'checked' : '') + (disabled ? ' disabled' : '') + ' />');
                $item.append('<span>' + (p.name || p.code) + (fromRole ? ' <small>(từ Role)</small>' : '') + '</span>');
                $list.append($item);
            });
        }

        function showUserModal(userId) {
            currentEditUserId = userId || null;
            var $modal = $('#userModal');
            var $title = $('#userModalTitle');
            var $username = $('#modalUsername');
            var $password = $('#modalPassword');
            var $fullName = $('#modalFullName');
            var $email = $('#modalEmail');
            var $roleId = $('#modalRoleId');
            var $isSuperAdmin = $('#modalIsSuperAdmin');
            var $isActive = $('#modalIsActive');
            var $btnSave = $('#btnSaveUser');
            var $passwordRequired = $('#passwordRequired');
            var $wrapPerm = $('#wrapPermissions');

            $username.val('');
            $password.val('');
            $fullName.val('');
            $email.val('');
            $roleId.val('0');
            $isSuperAdmin.prop('checked', false);
            $isActive.prop('checked', true);
            $username.prop('disabled', false);
            $passwordRequired.show();
            $wrapPerm.hide();
            currentUserPermissionIds = [];
            renderPermissionCheckboxes(0, []);

            if (userId) {
                $title.text('Edit User');
                $btnSave.text('Update');
                $username.prop('disabled', true);
                $passwordRequired.hide();
                $wrapPerm.show();
                $('#modalPermissionsLoading').text('Đang tải danh sách quyền…').show();
                $('#modalPermissionsList').empty();

                var loadPerm = loadPermissionsAndRolePermissions();
                loadPerm.always(function() {
                    $.ajax({
                        url: '<%= ResolveUrl("~/Pages/Users.aspx/GetUserInfo") %>',
                        type: "POST",
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        data: JSON.stringify({ userId: userId }),
                        success: function(res) {
                            var result = res.d || res;
                            if (result && result.success) {
                                $username.val(result.userName || '');
                                $fullName.val(result.fullName || '');
                                $email.val(result.email || '');
                                $isSuperAdmin.prop('checked', result.isSuperAdmin || false);
                                $isActive.prop('checked', result.isActive !== false);
                                var rid = result.roleId && result.roleId !== 0 ? result.roleId : '0';
                                $roleId.val(rid);
                                currentUserPermissionIds = result.userPermissionIds || [];
                                renderPermissionCheckboxes(rid, currentUserPermissionIds);
                            } else {
                                $('#modalPermissionsLoading').hide();
                                showToast(result && result.message ? result.message : 'Error loading user data.', 'error');
                            }
                        },
                        error: function() {
                            $('#modalPermissionsLoading').hide();
                            showToast('Error loading user data.', 'error');
                        }
                    });
                });
            } else {
                $title.text('Add New User');
                $btnSave.text('Save');
            }

            $modal.addClass('show');
        }

        $('#modalRoleId').on('change', function() {
            if (!currentEditUserId) return;
            var rid = $(this).val();
            renderPermissionCheckboxes(rid, currentUserPermissionIds);
        });

        $('#pwToggle').on('click', function() {
            var $pw = $('#modalPassword');
            var $btn = $(this);
            if ($pw.attr('type') === 'password') {
                $pw.attr('type', 'text');
                $btn.text('🙈').attr('title', 'Hide password');
            } else {
                $pw.attr('type', 'password');
                $btn.text('👁').attr('title', 'Show password');
            }
        });

        function hideUserModal() {
            $('#userModal').removeClass('show');
            currentEditUserId = null;
            var $pw = $('#modalPassword');
            var $btn = $('#pwToggle');
            $pw.attr('type', 'password');
            $btn.text('👁').attr('title', 'Show password');
        }

        function collectExtraPermissionIds() {
            var roleIdVal = $('#modalRoleId').val();
            var rolePids = rolePermissionsMap[String(roleIdVal)] || [];
            var extra = [];
            $('#modalPermissionsList .perm-cb:not(:disabled):checked').each(function() {
                extra.push(parseInt($(this).data('pid'), 10));
            });
            return extra;
        }

        function saveUser() {
            var username = $('#modalUsername').val().trim();
            var password = $('#modalPassword').val();
            var fullName = $('#modalFullName').val().trim();
            var email = $('#modalEmail').val().trim();
            var roleIdVal = parseInt($('#modalRoleId').val(), 10) || 0;
            var isSuperAdmin = $('#modalIsSuperAdmin').is(':checked');
            var isActive = $('#modalIsActive').is(':checked');

            if (!username) {
                showToast('Username is required.', 'error');
                return;
            }

            if (!currentEditUserId && !password) {
                showToast('Password is required for new users.', 'error');
                return;
            }

            var data = {
                userId: currentEditUserId,
                userName: username,
                password: password,
                fullName: fullName,
                email: email,
                isSuperAdmin: isSuperAdmin,
                isActive: isActive
            };
            if (currentEditUserId) {
                data.roleId = roleIdVal;
                data.extraPermissionIds = collectExtraPermissionIds();
            } else {
                data.roleId = roleIdVal === 0 ? null : roleIdVal;
            }

            var url = currentEditUserId 
                ? '<%= ResolveUrl("~/Pages/Users.aspx/UpdateUser") %>'
                : '<%= ResolveUrl("~/Pages/Users.aspx/CreateUser") %>';

            $.ajax({
                url: url,
                type: "POST",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                data: JSON.stringify(data),
                success: function(res) {
                    var result = res.d || res;
                    if (result && result.success) {
                        showToast(result.message || (currentEditUserId ? 'User updated successfully.' : 'User created successfully.'), 'success');
                        hideUserModal();
                        setTimeout(function() {
                            window.location.reload();
                        }, 1000);
                    } else {
                        showToast(result && result.message ? result.message : 'Error saving user.', 'error');
                    }
                },
                error: function() {
                    showToast('Error saving user.', 'error');
                }
            });
        }

        function editUser(userId) {
            showUserModal(userId);
        }

        // ===== Users Table Search & Sort (dùng hide/show, không xóa rows) =====
        var userSortCol = 'userId';
        var userSortDir = 1;

        function rowMatchesQuery($r, q) {
            if (!q) return true;
            var rowText = ($r.text() || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (rowText.indexOf(q) >= 0) return true;
            var un = ($r.attr('data-user-name') || '').toLowerCase();
            var fn = ($r.attr('data-full-name') || '').toLowerCase();
            var em = ($r.attr('data-email') || '').toLowerCase();
            var rl = ($r.attr('data-role') || '').toLowerCase();
            return un.indexOf(q) >= 0 || fn.indexOf(q) >= 0 || em.indexOf(q) >= 0 || rl.indexOf(q) >= 0;
        }

        function filterAndSortUsers() {
            var q = ($('#userSearchInput').val() || '').toLowerCase().trim();
            var $tbody = $('#usersTableBody').length ? $('#usersTableBody') : $('.admin-table tbody');
            var $rows = $tbody.find('tr');
            $rows.each(function() {
                var match = rowMatchesQuery($(this), q);
                $(this).css('display', match ? '' : 'none');
            });
            var visibleArr = [];
            var hiddenArr = [];
            $rows.each(function() {
                if ($(this).css('display') !== 'none') visibleArr.push(this);
                else hiddenArr.push(this);
            });
            var sorted = visibleArr.slice().sort(function(a, b) {
                var $a = $(a), $b = $(b);
                var va, vb;
                switch (userSortCol) {
                    case 'userId': va = parseInt($a.attr('data-user-id'), 10) || 0; vb = parseInt($b.attr('data-user-id'), 10) || 0; return userSortDir * (va - vb);
                    case 'userName': va = ($a.attr('data-user-name') || '').toLowerCase(); vb = ($b.attr('data-user-name') || '').toLowerCase(); return userSortDir * va.localeCompare(vb);
                    case 'fullName': va = ($a.attr('data-full-name') || '').toLowerCase(); vb = ($b.attr('data-full-name') || '').toLowerCase(); return userSortDir * va.localeCompare(vb);
                    case 'email': va = ($a.attr('data-email') || '').toLowerCase(); vb = ($b.attr('data-email') || '').toLowerCase(); return userSortDir * va.localeCompare(vb);
                    case 'role': va = ($a.attr('data-role') || '').toLowerCase(); vb = ($b.attr('data-role') || '').toLowerCase(); return userSortDir * va.localeCompare(vb);
                    case 'superAdmin': va = ($a.attr('data-super-admin') || '').toLowerCase(); vb = ($b.attr('data-super-admin') || '').toLowerCase(); return userSortDir * va.localeCompare(vb);
                    case 'active': va = ($a.attr('data-active') || '').toLowerCase(); vb = ($b.attr('data-active') || '').toLowerCase(); return userSortDir * va.localeCompare(vb);
                    default: return 0;
                }
            });
            $tbody.empty();
            $.each(sorted, function(_, el) { $tbody.append(el); });
            $.each(hiddenArr, function(_, el) { $tbody.append(el); });
            $('.admin-table th .sort-icon').text('');
            var $active = $('.admin-table th.admin-sortable[data-col="' + userSortCol + '"] .sort-icon');
            if ($active.length) $active.text(userSortDir === 1 ? '↑' : '↓');
        }

        function bindUserSearchAndSort() {
            $('#userSearchInput').on('input keyup', filterAndSortUsers);
            $('.admin-table').on('click', 'th.admin-sortable', function() {
                var col = $(this).data('col');
                if (!col) return;
                if (userSortCol === col) userSortDir = -userSortDir; else { userSortCol = col; userSortDir = 1; }
                filterAndSortUsers();
            });
        }

        $(function() {
            loadRoles();
            loadPermissionsAndRolePermissions();
            bindUserSearchAndSort();
        });

        $(document).on('click', '.user-modal', function(e) {
            if (e.target === this) {
                hideUserModal();
            }
        });

        // Show server-side messages as toast
        <% if (!string.IsNullOrEmpty(lblMsg.Text)) { %>
        $(document).ready(function() {
            var msg = '<%= lblMsg.Text.Replace("'", "\\'") %>';
            if (msg) {
                var type = msg.toLowerCase().indexOf('error') >= 0 || msg.toLowerCase().indexOf('lỗi') >= 0 ? 'error' : 'success';
                showToast(msg, type);
            }
        });
        <% } %>
    </script>
</body>
</html>
