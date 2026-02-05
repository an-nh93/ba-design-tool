<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="RolePermission.aspx.cs"
    Inherits="UiBuilderFull.Admin.RolePermission" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Role Permission - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <style>
        :root {
            --primary: #0078d4;
            --primary-hover: #006bb3;
            --bg-main: #1e1e1e;
            --bg-card: #2d2d30;
            --bg-darker: #161616;
            --bg-hover: #3e3e42;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #969696;
            --border: #3e3e42;
            --success: #10b981;
            --danger: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.6;
        }
        .rp-container { display: flex; min-height: 100vh; }
        .rp-sidebar {
            width: 240px;
            background: var(--bg-darker);
            border-right: 1px solid var(--border);
            padding: 1.5rem 0;
        }
        .rp-sidebar-header { padding: 0 1.5rem 1rem; border-bottom: 1px solid var(--border); }
        .rp-sidebar-title { font-size: 1.125rem; font-weight: 600; }
        .rp-nav-item {
            display: block;
            padding: 0.75rem 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .rp-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .rp-nav-item.active { background: var(--bg-hover); color: var(--primary); border-left: 3px solid var(--primary); }
        .rp-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .rp-top { padding: 1rem 2rem; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .rp-title { font-size: 1.5rem; font-weight: 600; }
        .rp-content { flex: 1; overflow-y: auto; padding: 2rem; }
        .rp-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .rp-card h2 { font-size: 1.25rem; margin-bottom: 1rem; color: var(--text-primary); }
        .rp-table { width: 100%; border-collapse: collapse; }
        .rp-table th, .rp-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
        .rp-table th { background: var(--bg-darker); color: var(--text-secondary); font-weight: 600; }
        .rp-table td { color: var(--text-primary); }
        .rp-table tbody tr:hover { background: var(--bg-hover); }
        .rp-table input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); }
        .rp-btn {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .rp-btn-primary { background: var(--primary); color: white; }
        .rp-btn-primary:hover { background: var(--primary-hover); }
        .rp-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .rp-btn-secondary:hover { background: var(--bg-card); }
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 10002; display: flex; flex-direction: column; gap: 0.5rem; }
        .toast {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.75rem 1rem;
            min-width: 260px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s, transform 0.3s;
        }
        .toast.show { opacity: 1; transform: translateX(0); }
        .toast.success { border-left: 4px solid var(--success); }
        .toast.error { border-left: 4px solid var(--danger); }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="rp-container">
            <aside class="rp-sidebar">
                <div class="rp-sidebar-header">
                    <div class="rp-sidebar-title">UI Builder</div>
                </div>
                <a href="~/HomeRole" runat="server" class="rp-nav-item">← Back to Home</a>
                <a href="~/Users" runat="server" class="rp-nav-item">👥 User Management</a>
                <div class="rp-nav-item active">🛡 Role Permission</div>
            </aside>
            <main class="rp-main">
                <div class="rp-top">
                    <h1 class="rp-title">Role Permission</h1>
                    <button type="button" class="rp-btn rp-btn-primary" id="btnSave" onclick="saveRolePermissions(); return false;">Lưu cấu hình</button>
                </div>
                <div class="rp-content">
                    <div class="rp-card">
                        <h2>Định nghĩa quyền theo Role</h2>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                            Chọn quyền cho từng role. User được gán role sẽ có đủ các quyền của role (không thể bỏ). Có thể thêm quyền riêng lẻ khi Edit User.
                        </p>
                        <table class="rp-table" id="tblRolePermission">
                            <thead>
                                <tr>
                                    <th>Chức năng</th>
                                    <th id="thRoleBa">BA</th>
                                    <th id="thRoleCons">CONS</th>
                                    <th id="thRoleDev">DEV</th>
                                    <th id="thRoleQC">QC</th>
                                </tr>
                            </thead>
                            <tbody id="tbodyRolePermission"></tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
        <div id="toastContainer" class="toast-container"></div>
    </form>
    <script>
        var permissions = [];
        var roles = [];
        var rolePermissions = {}; // roleId -> [permissionId]

        function showToast(msg, type) {
            type = type || 'info';
            var $t = $('<div class="toast ' + type + '">' + msg + '</div>');
            $('#toastContainer').append($t);
            $t[0].offsetHeight;
            setTimeout(function() { $t.addClass('show'); }, 10);
            setTimeout(function() {
                $t.removeClass('show');
                setTimeout(function() { $t.remove(); }, 300);
            }, 4000);
        }

        function load() {
            var reqPerm = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadPermissions") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                dataType: 'json'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.list) permissions = d.list;
            });
            var reqRoles = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadRoles") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                dataType: 'json'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.list) roles = d.list;
            });
            var reqRp = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadRolePermissions") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                dataType: 'json'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.rolePermissions) rolePermissions = d.rolePermissions;
            });
            $.when(reqPerm, reqRoles, reqRp).always(function() {
                render();
            }).fail(function() {
                showToast('Không tải được dữ liệu.', 'error');
            });
        }

        function render() {
            var $tb = $('#tbodyRolePermission');
            $tb.empty();
            permissions.forEach(function(p) {
                var $tr = $('<tr></tr>');
                $tr.append('<td>' + (p.name || p.code) + '</td>');
                roles.forEach(function(r) {
                    var rp = rolePermissions[String(r.id)] || [];
                    var chk = rp.indexOf(p.id) >= 0;
                    var $td = $('<td></td>');
                    $td.append('<input type="checkbox" class="rp-role-cb" data-role-id="' + r.id + '" data-permission-id="' + p.id + '" ' + (chk ? 'checked' : '') + ' />');
                    $tr.append($td);
                });
                $tb.append($tr);
            });
        }

        function saveRolePermissions() {
            var byRole = {};
            roles.forEach(function(r) { byRole[String(r.id)] = []; });
            $('#tbodyRolePermission .rp-role-cb:checked').each(function() {
                var r = parseInt($(this).data('role-id'), 10);
                var p = parseInt($(this).data('permission-id'), 10);
                var rk = String(r);
                if (!byRole[rk]) byRole[rk] = [];
                byRole[rk].push(p);
            });

            var total = roles.length;
            var done = 0;
            function next() {
                if (done >= total) {
                    showToast('Đã lưu cấu hình quyền theo Role.', 'success');
                    load();
                    return;
                }
                var r = roles[done];
                var pids = byRole[String(r.id)] || [];
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/SaveRolePermissions") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ roleId: r.id, permissionIds: pids }),
                    dataType: 'json'
                }).done(function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) showToast(d && d.message ? d.message : 'Lỗi lưu role ' + r.code, 'error');
                }).fail(function() { showToast('Lỗi lưu role ' + r.code, 'error'); })
                  .always(function() { done++; next(); });
            }
            next();
        }

        $(function() { load(); });
    </script>
</body>
</html>
