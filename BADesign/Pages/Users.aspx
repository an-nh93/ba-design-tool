<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Users.aspx.cs"
    Inherits="UiBuilderFull.Admin.Users" %>

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
        }

        .admin-sidebar-header {
            padding: 0 1.5rem 1.5rem;
            border-bottom: 1px solid var(--border);
            margin-bottom: 1rem;
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
        }

        .admin-table {
            width: 100%;
            border-collapse: collapse;
        }

        .admin-table thead {
            background: var(--bg-darker);
            border-bottom: 1px solid var(--border);
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
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="admin-container">
            <!-- Sidebar -->
            <div class="admin-sidebar">
                <div class="admin-sidebar-header">
                    <div class="admin-sidebar-title">UI Builder</div>
                </div>
                <a href="~/DesignerHome" runat="server" class="admin-nav-item">
                    <span>← Back to Home</span>
                </a>
                <div class="admin-nav-item active">
                    <span>👥 User Management</span>
                </div>
            </div>

            <!-- Main Content -->
            <div class="admin-main">
                <!-- Top Bar -->
                <div class="admin-top-bar">
                    <div class="admin-top-bar-title">User Management</div>
                </div>

                <!-- Content -->
                <div class="admin-content">
                    <!-- Users Table -->
                    <div class="admin-table-container">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Super Admin</th>
                                    <th>Active</th>
                                    <th>New Password</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <asp:Repeater ID="rpUsers" runat="server">
                                    <ItemTemplate>
                                        <tr>
                                            <td><%# Eval("UserId") %></td>
                                            <td><strong><%# Eval("UserName") %></strong></td>
                                            <td><%# Eval("FullName") ?? "-" %></td>
                                            <td><%# Eval("Email") ?? "-" %></td>
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
                                                <input type="password" 
                                                       class="admin-input admin-password-input" 
                                                       id="txtRowNewPass_<%# Eval("UserId") %>"
                                                       placeholder="Enter new password" />
                                            </td>
                                            <td>
                                                <div class="admin-action-buttons">
                                                    <button type="button" 
                                                            class="admin-btn admin-btn-primary admin-btn-sm"
                                                            onclick="changePassword(<%# Eval("UserId") %>); return false;">
                                                        Change
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

                    <!-- Add New User Form -->
                    <div class="admin-form-card">
                        <div class="admin-form-title">Add New User</div>
                        <div class="admin-form-grid">
                            <div class="admin-form-group">
                                <label class="admin-form-label" for="txtNewUser">Username *</label>
                                <asp:TextBox ID="txtNewUser" runat="server" CssClass="admin-input" placeholder="Enter username" />
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label" for="txtNewPass">Password *</label>
                                <asp:TextBox ID="txtNewPass" runat="server" TextMode="Password" CssClass="admin-input" placeholder="Enter password" />
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label" for="txtNewFullName">Full Name</label>
                                <asp:TextBox ID="txtNewFullName" runat="server" CssClass="admin-input" placeholder="Enter full name" />
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label" for="txtNewEmail">Email</label>
                                <asp:TextBox ID="txtNewEmail" runat="server" CssClass="admin-input" placeholder="Enter email" />
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label">
                                    <asp:CheckBox ID="chkNewSuper" runat="server" CssClass="admin-checkbox" />
                                    <span style="margin-left: 0.5rem;">Super Admin</span>
                                </label>
                            </div>
                        </div>
                        <div class="admin-form-actions">
                            <asp:Button ID="btnAddUser" runat="server" Text="Add User" 
                                       CssClass="admin-btn admin-btn-primary"
                                       OnClick="btnAddUser_Click" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast Container -->
        <div id="toastContainer" class="toast-container"></div>
        
        <!-- Hidden label for server-side messages -->
        <asp:Label ID="lblMsg" runat="server" style="display: none;" />
    </form>

    <script>
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
