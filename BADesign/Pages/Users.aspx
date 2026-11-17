<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Users.aspx.cs"
    Inherits="UiBuilderFull.Admin.Users" %>
<%@ Import Namespace="System.Web" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <title>Quản lý người dùng - HR Helper</title>
    
    <uc:BaHead runat="server" />

    <style>
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


        /* ===== Table ===== */
        /* Bảng dùng chung từ ba-layout.css (.ba-table-wrap, .ba-table); chỉ override sortable cho Users */
        .ba-table-wrap .ba-table th.admin-sortable { cursor: pointer; user-select: none; }
        .ba-table-wrap .ba-table th.admin-sortable:hover { background: var(--bg-hover); }
        .ba-table-wrap .ba-table th .sort-icon { margin-left: 4px; opacity: 0.6; }

        .users-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
        }
        .admin-users-search {
            margin-bottom: 0;
            max-width: 420px;
            flex: 1;
        }
        .admin-users-search input {
            width: 100%;
            padding: 0.25rem 0.5rem 0.25rem 2rem;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.8125rem;
            height: 30px;
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
            left: 0.5rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8125rem;
            opacity: 0.7;
        }

        /* ===== Form Elements ===== */
        .admin-input {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.25rem 0.5rem;
            color: var(--text-primary);
            font-size: 0.8125rem;
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

        /* Nút dùng chung từ ba-layout.css (.ba-btn, .ba-btn-primary, .ba-btn-secondary, .ba-btn-danger, .ba-btn-sm) */

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
        .admin-password-input {
            min-width: 140px;
        }

        /* Badge dùng chung từ ba-layout.css (.ba-badge, .ba-badge-ok, .ba-badge-fail) */

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
            border-radius: 8px;
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
            padding: 0.5rem 0.75rem 0.5rem 1rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .user-modal-title {
            margin: 0;
            font-size: 1rem;
            line-height: 1.3;
            font-weight: 600;
            color: var(--text-primary);
        }

        /* Nút × đóng modal dùng chung từ ba-layout.css */
        .user-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 0.75rem 1rem;
        }

        .user-modal-footer {
            padding: 0.5rem 1rem;
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
            gap: 0.25rem;
            margin-bottom: 0.5rem;
        }

        .user-form-label {
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .user-form-input {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.25rem 0.5rem;
            color: var(--text-primary);
            font-size: 0.8125rem;
            width: 100%;
            transition: all 0.2s ease;
            min-height: 30px;
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
            width: 15px;
            height: 15px;
            cursor: pointer;
            accent-color: var(--primary);
        }
        .user-permissions-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            user-select: none;
            padding: 0.25rem 0;
        }
        .user-permissions-header:hover { opacity: 0.9; }
        .permissions-toggle {
            color: var(--text-muted);
            font-size: 0.75rem;
            transition: transform 0.2s;
        }
        .user-permissions-body.collapsed { display: none !important; }
        .user-permissions-header .permissions-toggle.rotated { transform: rotate(-90deg); }
        .server-select-all-label {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            cursor: pointer;
            white-space: nowrap;
        }
        .user-server-access-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            user-select: none;
            padding: 0.25rem 0;
        }
        .user-server-access-header:hover { opacity: 0.9; }
        .server-access-badge {
            font-size: 0.75rem;
            color: var(--text-muted);
            background: var(--bg-hover);
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
        }
        .server-access-toggle {
            margin-left: auto;
            color: var(--text-muted);
            font-size: 0.75rem;
            transition: transform 0.2s;
        }
        .user-server-access-body.collapsed { display: none !important; }
        .user-server-access-header .server-access-toggle.rotated { transform: rotate(-90deg); }
        .modal-server-access-wrap {
            max-height: 180px;
            overflow-y: auto;
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.5rem;
            background: var(--bg-darker);
        }
        .modal-server-access-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 0.25rem 1rem;
        }
        .modal-server-access-grid .perm-item {
            padding: 0.2rem 0;
            font-size: 0.8125rem;
        }
        .perm-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.2rem 0;
            font-size: 0.8125rem;
        }
        .perm-item input:disabled + span { color: var(--text-muted); }
        .server-from-role-label {
            color: var(--primary-light);
            font-style: italic;
            margin-left: 0.25rem;
        }
        .user-form-row {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
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
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
            flex-shrink: 0;
        }
        .pw-toggle:hover { color: var(--text-primary); background: var(--bg-card); }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="admin-container ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <div class="admin-main ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content ba-fill">
                    <div class="ba-card">
                        <div class="users-toolbar">
                            <div class="admin-users-search">
                                <div class="admin-users-search-wrap">
                                    <input type="text" id="userSearchInput" placeholder="Search by Username, Full Name, Email, Role..." />
                                </div>
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" onclick="showUserModal(); return false;">+ Add New User</button>
                        </div>
                        <!-- Users Table: dùng chung ba-table-wrap, ba-table từ ba-layout.css -->
                        <div class="ba-table-wrap">
                            <table class="ba-table">
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
                                            <tr data-user-id="<%# Eval("UserId") %>" data-user-name="<%# HttpUtility.HtmlEncode((Eval("UserName") as string) ?? "") %>" data-full-name="<%# HttpUtility.HtmlEncode((Eval("FullName") as string) ?? "-") %>" data-email="<%# HttpUtility.HtmlEncode((Eval("Email") as string) ?? "-") %>" data-role="<%# HttpUtility.HtmlEncode(((Eval("RoleName") as string) ?? "") + " " + ((Eval("RoleCode") as string) ?? "-")) %>" data-super-admin="<%# (bool)Eval("IsSuperAdmin") ? "Yes" : "No" %>" data-active="<%# (bool)Eval("IsActive") ? "Active" : "Inactive" %>">
                                                <td><%# Eval("UserId") %></td>
                                                <td><strong><%# Eval("UserName") %></strong></td>
                                                <td><%# Eval("FullName") ?? "-" %></td>
                                                <td><%# Eval("Email") ?? "-" %></td>
                                                <td translate="no"><%# HttpUtility.HtmlEncode((Eval("RoleName") as string) ?? (Eval("RoleCode") as string) ?? "-") %></td>
                                                <td>
                                                    <span class="ba-badge <%# (bool)Eval("IsSuperAdmin") ? "ba-badge-ok" : "" %>">
                                                        <%# (bool)Eval("IsSuperAdmin") ? "Yes" : "No" %>
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="ba-badge <%# (bool)Eval("IsActive") ? "ba-badge-ok" : "ba-badge-fail" %>">
                                                        <%# (bool)Eval("IsActive") ? "Active" : "Inactive" %>
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="ba-actions">
                                                        <div class="ba-actions-dropdown-wrap">
                                                            <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-actions-trigger" aria-haspopup="true" aria-expanded="false" title="Thao tác">Action</button>
                                                            <div class="ba-actions-menu">
                                                                <div class="ba-actions-menu-header" title="<%# HttpUtility.HtmlAttributeEncode((Eval("UserName") as string) ?? "") %>"><strong><%# HttpUtility.HtmlEncode((Eval("UserName") as string) ?? "") %></strong></div>
                                                                <div class="ba-actions-menu-body">
                                                                    <button type="button" class="ba-btn ba-btn-primary ba-btn-sm" onclick="editUser(<%# Eval("UserId") %>); return false;"><span class="ba-action-icon">&#9998;</span> Edit</button>
                                                                    <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" onclick="resetPassword(<%# Eval("UserId") %>); return false;"><span class="ba-action-icon">&#128274;</span> Reset</button>
                                                                    <button type="button" class="ba-btn ba-btn-danger ba-btn-sm" onclick="toggleActive(<%# Eval("UserId") %>); return false;"><span class="ba-action-icon">&#128260;</span> Toggle</button>
                                                                </div>
                                                            </div>
                                                        </div>
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
        </div>

        <!-- Toast Container -->
        
        <!-- User Modal (Add/Edit) -->
        <div id="userModal" class="user-modal">
            <div class="user-modal-content">
                <div class="user-modal-header">
                    <h3 class="user-modal-title" id="userModalTitle">Add New User</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideUserModal(); return false;">×</button>
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
                        <div class="user-permissions-header" onclick="togglePermissionsSection(); return false;" title="Thu gọn / Mở rộng">
                            <span class="user-form-label" style="margin: 0;">Quyền riêng lẻ (thêm)</span>
                            <span class="permissions-toggle" id="permissionsToggle">▼</span>
                        </div>
                        <div class="user-permissions-body" id="permissionsBody">
                            <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.5rem;">Quyền từ Role không thể bỏ. Chỉ có thể thêm quyền cho user đặc biệt (Thiết kế giao diện, Công cụ Database, Mã hóa / Giải mã, Trợ lý HR…).</p>
                            <div id="modalPermissionsList"></div>
                            <div id="modalPermissionsLoading" style="display: none; font-size: 0.875rem; color: var(--text-muted);">Đang tải danh sách quyền…</div>
                        </div>
                    </div>
                    <div class="user-form-group" id="wrapServerAccess">
                        <div class="user-server-access-header" id="serverAccessHeader" onclick="toggleServerAccessSection(); return false;" title="Thu gọn / Mở rộng">
                            <span class="user-form-label" style="margin: 0;">Server Access (bổ sung cho role)</span>
                            <span class="server-access-badge" id="serverAccessBadge"></span>
                            <span class="server-access-toggle" id="serverAccessToggle">▼</span>
                        </div>
                        <div class="user-server-access-body" id="serverAccessBody">
                            <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.5rem;">Chọn server mà user được phép sử dụng (quét DB). Gộp với server từ Role. Nếu không chọn = chỉ dùng server từ Role.</p>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
                                <input type="text" id="modalServerSearch" class="admin-input" placeholder="Tìm server..." style="flex: 1; min-width: 120px; padding: 0.4rem 0.6rem; font-size: 0.8125rem;" />
                                <label class="server-select-all-label">
                                    <input type="checkbox" id="modalServerSelectAll" /> Chọn tất cả
                                </label>
                            </div>
                            <div class="modal-server-access-wrap" id="modalServerAccessWrap">
                                <div id="modalServerAccessList"></div>
                            </div>
                        </div>
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
                    <button type="button" class="ba-btn ba-btn-primary" onclick="saveUser(); return false;" id="btnSaveUser">Save</button>
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideUserModal(); return false;">Cancel</button>
                </div>
            </div>
        </div>
        
        <!-- Hidden label for server-side messages -->
        <asp:Label ID="lblMsg" runat="server" style="display: none;" />
    </form>

    <script>
        // ===== Toast Message Functions =====
        function showToast(message, type) { BaToast.show(message, type); }

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
            var msg = 'Reset password to "123456" for user ' + userId + '?';
            if (typeof baConfirm === 'function') baConfirm(msg, function() { doResetPassword(userId); }, null, 'Đồng ý', 'Thoát');
        }
        function doResetPassword(userId) {
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
        var roleServerAccessMap = {}; // roleId -> [serverId] (server access theo Role)
        var currentUserPermissionIds = [];
        var serversList = [];
        var currentUserServerIds = [];

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
                            $sel.append($('<option></option>').val(r.id).text(r.name || r.code || r.id));
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
            var reqRsa = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadRoleServerAccess") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.roleServerAccess) roleServerAccessMap = d.roleServerAccess;
            });
            return $.when(reqPerm, reqRp, reqRsa);
        }

        function loadServers() {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/Users.aspx/LoadServers") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}',
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.list) serversList = d.list;
                }
            });
        }

        function renderServerAccessCheckboxes(roleIdVal, userServerIds) {
            userServerIds = userServerIds || [];
            roleIdVal = roleIdVal || '0';
            var roleServerIds = roleServerAccessMap[String(roleIdVal)] || [];
            var $list = $('#modalServerAccessList');
            $list.empty();
            if (!serversList.length) {
                $list.html('<p style="font-size: 0.875rem; color: var(--text-muted);">Chưa có server. Thêm server trong Công cụ Database.</p>');
                updateServerAccessBadge(0, 0);
                return;
            }
            var $grid = $('<div class="modal-server-access-grid"></div>');
            var fromRoleCount = 0;
            var extraCount = 0;
            serversList.forEach(function(s) {
                var fromRole = roleServerIds.indexOf(s.id) >= 0;
                var fromUser = userServerIds.indexOf(s.id) >= 0;
                var checked = fromRole || fromUser;
                var disabled = fromRole;
                if (fromRole) fromRoleCount++;
                if (fromUser && !fromRole) extraCount++;
                var disp = (s.serverName || '') + (s.port != null ? ':' + s.port : '') + ' (' + (s.username || '') + ')';
                var searchText = disp.toLowerCase();
                var $item = $('<label class="perm-item" data-search="' + searchText.replace(/"/g, '&quot;') + '"></label>');
                $item.append('<input type="checkbox" class="perm-server-cb" data-sid="' + s.id + '" data-from-role="' + (fromRole ? '1' : '0') + '" ' + (checked ? 'checked' : '') + (disabled ? ' disabled' : '') + ' />');
                $item.append('<span>' + disp + (fromRole ? ' <small class="server-from-role-label">(từ Role)</small>' : '') + '</span>');
                $grid.append($item);
            });
            $list.append($grid);
            $('#modalServerSelectAll').prop('checked', false).prop('indeterminate', false);
            updateServerAccessBadge(fromRoleCount, extraCount);
            filterModalServerRows();
        }

        function togglePermissionsSection() {
            var $body = $('#permissionsBody');
            var $tog = $('#permissionsToggle');
            $body.toggleClass('collapsed');
            $tog.toggleClass('rotated', $body.hasClass('collapsed'));
        }

        function toggleServerAccessSection() {
            var $body = $('#serverAccessBody');
            var $tog = $('#serverAccessToggle');
            $body.toggleClass('collapsed');
            $tog.toggleClass('rotated', $body.hasClass('collapsed'));
        }

        function updateServerAccessBadge(fromRoleCount, extraCount) {
            var $badge = $('#serverAccessBadge');
            fromRoleCount = fromRoleCount || 0;
            extraCount = extraCount != null ? extraCount : 0;
            if (fromRoleCount > 0 && extraCount > 0)
                $badge.text(fromRoleCount + ' từ Role, ' + extraCount + ' bổ sung');
            else if (fromRoleCount > 0)
                $badge.text(fromRoleCount + ' từ Role');
            else if (extraCount > 0)
                $badge.text(extraCount + ' bổ sung');
            else
                $badge.text('');
        }

        function filterModalServerRows() {
            var q = ($('#modalServerSearch').val() || '').toLowerCase().trim();
            $('#modalServerAccessList .perm-item').each(function() {
                var match = !q || ($(this).attr('data-search') || '').indexOf(q) >= 0;
                $(this).css('display', match ? '' : 'none');
            });
            updateServerSelectAllState();
        }

        function updateServerSelectAllState() {
            var $all = $('#modalServerSelectAll');
            var $cbs = $('#modalServerAccessList .perm-server-cb');
            var $visible = $cbs.filter(function() { return $(this).closest('.perm-item').css('display') !== 'none'; });
            var $visibleExtra = $visible.filter(function() { return !$(this).prop('disabled'); });
            var checked = $visible.filter(':checked').length;
            var checkedExtra = $visibleExtra.filter(':checked').length;
            if (checkedExtra === 0) {
                $all.prop('checked', false);
                $all.prop('indeterminate', false);
            } else if (checkedExtra === $visibleExtra.length) {
                $all.prop('checked', true);
                $all.prop('indeterminate', false);
            } else {
                $all.prop('checked', false);
                $all.prop('indeterminate', true);
            }
            var fromRoleCount = $('#modalServerAccessList .perm-server-cb:disabled:checked').length;
            var extraCount = $('#modalServerAccessList .perm-server-cb:not(:disabled):checked').length;
            updateServerAccessBadge(fromRoleCount, extraCount);
        }

        $(document).on('change', '.perm-server-cb', function() {
            updateServerSelectAllState();
        });

        $('#modalServerSelectAll').on('change', function() {
            var checked = $(this).prop('checked');
            $('#modalServerAccessList .perm-item:visible .perm-server-cb:not(:disabled)').prop('checked', checked);
            updateServerSelectAllState();
        });

        function renderPermissionCheckboxes(roleIdVal, userPermissionIds) {
            userPermissionIds = userPermissionIds || [];
            var rolePids = rolePermissionsMap[String(roleIdVal)] || [];
            var $list = $('#modalPermissionsList');
            var $loading = $('#modalPermissionsLoading');
            $list.empty();
            $loading.hide();
            if (!permissionsList.length) {
                $loading.text('Chưa có quyền. Kiểm tra Phân quyền đã cấu hình chưa.').show();
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
            $wrapPerm.show();
            $('#wrapServerAccess').show();
            $('#serverAccessBody').removeClass('collapsed');
            $('#serverAccessToggle').removeClass('rotated');
            $('#permissionsBody').removeClass('collapsed');
            $('#permissionsToggle').removeClass('rotated');
            $('#modalServerSearch').val('');
            currentUserPermissionIds = [];
            currentUserServerIds = [];
            renderPermissionCheckboxes(0, []);
            renderServerAccessCheckboxes('0', []);

            if (userId) {
                $title.text('Edit User');
                $btnSave.text('Update');
                $username.prop('disabled', true);
                $passwordRequired.hide();
                $wrapPerm.show();
                $('#wrapServerAccess').show();
                $('#serverAccessBody').addClass('collapsed');
                $('#serverAccessToggle').addClass('rotated');
                $('#permissionsBody').addClass('collapsed');
                $('#permissionsToggle').addClass('rotated');
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
                                currentUserServerIds = result.userServerIds || [];
                                renderPermissionCheckboxes(rid, currentUserPermissionIds);
                                renderServerAccessCheckboxes(rid, currentUserServerIds);
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
                $('#serverAccessBody').removeClass('collapsed');
                $('#serverAccessToggle').removeClass('rotated');
                $('#permissionsBody').removeClass('collapsed');
                $('#permissionsToggle').removeClass('rotated');
                $('#modalPermissionsLoading').text('Đang tải danh sách quyền…').show();
                $('#modalPermissionsList').empty();
                var loadPerm = loadPermissionsAndRolePermissions();
                loadPerm.always(function() {
                    var rid = $('#modalRoleId').val() || '0';
                    renderPermissionCheckboxes(rid, []);
                    renderServerAccessCheckboxes(rid, []);
                    $('#modalPermissionsLoading').hide();
                });
            }

            $modal.addClass('show');
        }

        $('#modalServerSearch').on('input', filterModalServerRows);

        $(document).on('click', '#modalServerSelectAll', function(e) { e.stopPropagation(); });

        $('#modalRoleId').on('change', function() {
            var rid = $(this).val();
            var uPids = currentEditUserId ? currentUserPermissionIds : [];
            var uSrvIds = currentEditUserId ? currentUserServerIds : [];
            renderPermissionCheckboxes(rid, uPids);
            renderServerAccessCheckboxes(rid, uSrvIds);
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
                data.extraServerIds = [];
                $('#modalServerAccessList .perm-server-cb:checked:not(:disabled)').each(function() {
                    data.extraServerIds.push(parseInt($(this).data('sid'), 10));
                });
            } else {
                data.roleId = roleIdVal === 0 ? null : roleIdVal;
                data.extraPermissionIds = collectExtraPermissionIds();
                data.extraServerIds = [];
                $('#modalServerAccessList .perm-server-cb:checked:not(:disabled)').each(function() {
                    data.extraServerIds.push(parseInt($(this).data('sid'), 10));
                });
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
            loadServers();
            bindUserSearchAndSort();
            // Dropdown Action (mở/đóng menu theo ba-actions-dropdown-wrap)
            $(document).on('click', '#usersTableBody .ba-actions-trigger', function(e) {
                e.stopPropagation();
                var $wrap = $(this).closest('.ba-actions-dropdown-wrap');
                $('.ba-actions-dropdown-wrap').not($wrap).removeClass('ba-actions-open');
                $wrap.toggleClass('ba-actions-open');
                $(this).attr('aria-expanded', $wrap.hasClass('ba-actions-open'));
            });
            $(document).on('click', '#usersTableBody .ba-actions-menu .ba-btn', function() {
                $(this).closest('.ba-actions-dropdown-wrap').removeClass('ba-actions-open');
            });
            $(document).on('click.usersActionsClose', function(e) {
                if (!$(e.target).closest('.ba-actions-dropdown-wrap').length)
                    $('.ba-actions-dropdown-wrap').removeClass('ba-actions-open');
            });
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
