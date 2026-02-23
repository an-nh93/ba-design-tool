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
            transition: width 0.25s ease;
        }
        .rp-sidebar.collapsed { width: 64px; padding: 1rem 0; }
        .rp-sidebar.collapsed .rp-sidebar-header { padding: 0 0.75rem 1rem; }
        .rp-sidebar.collapsed .rp-sidebar-title { display: none; }
        .rp-sidebar.collapsed .rp-nav-item { padding: 0.75rem; text-align: center; font-size: 1.25rem; }
        .rp-sidebar.collapsed .rp-nav-item span { display: none; }
        .rp-sidebar.collapsed .rp-nav-item::before { content: attr(data-icon); }
        .rp-sidebar-toggle { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; font-size: 1rem; }
        .rp-sidebar-toggle:hover { color: var(--text-primary); }
        .rp-sidebar.collapsed .rp-sidebar-toggle { transform: rotate(180deg); }
        .rp-sidebar-header { padding: 0 1.5rem 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
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
        .rp-card { position: relative; }
        .rp-card.collapsed .rp-card-body { display: none; }
        .rp-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            user-select: none;
        }
        .rp-card-header:hover { opacity: 0.9; }
        .rp-card-header .rp-toggle { color: var(--text-muted); font-size: 1rem; transition: transform 0.2s; }
        .rp-card.collapsed .rp-card-header .rp-toggle { transform: rotate(-90deg); }
        .rp-card h2 { font-size: 1.25rem; margin: 0; color: var(--text-primary); }
        .rp-card-body { margin-top: 1rem; }
        .rp-table { width: 100%; border-collapse: collapse; }
        .rp-table-wrap { max-height: 360px; overflow-y: auto; margin-bottom: 0.5rem; }
        .rp-table-wrap .rp-table th { position: sticky; top: 0; background: var(--bg-darker); z-index: 1; }
        .rp-table th.rp-sortable { cursor: pointer; user-select: none; }
        .rp-table th.rp-sortable:hover { background: var(--bg-hover); }
        .rp-table th .rp-sort-icon { margin-left: 4px; opacity: 0.6; }
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
            <aside class="rp-sidebar" id="rpSidebar">
                <div class="rp-sidebar-header">
                    <div class="rp-sidebar-title">UI Builder</div>
                    <button type="button" class="rp-sidebar-toggle" id="rpSidebarToggle" title="Thu nhỏ menu">◀</button>
                </div>
                <a href="~/HomeRole" runat="server" class="rp-nav-item" data-icon="←" title="Back to Home"><span>← Back to Home</span></a>
                <a href="~/Users" runat="server" class="rp-nav-item" data-icon="👥" title="User Management"><span>👥 User Management</span></a>
                <div class="rp-nav-item active" data-icon="🛡" title="Role Permission"><span>🛡 Role Permission</span></div>
            </aside>
            <main class="rp-main">
                <div class="rp-top">
                    <h1 class="rp-title">Role Permission</h1>
                    <button type="button" class="rp-btn rp-btn-primary" id="btnSave" onclick="saveRolePermissions(); return false;">Lưu cấu hình</button>
                </div>
                <div class="rp-content">
                    <div class="rp-card" id="cardPermissions">
                        <div class="rp-card-header" onclick="toggleRpCard('cardPermissions'); return false;">
                            <h2>Định nghĩa quyền theo Role</h2>
                            <span class="rp-toggle" title="Thu gọn / Mở rộng">▼</span>
                        </div>
                        <div class="rp-card-body">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem;">
                            Chọn quyền cho từng role. User được gán role sẽ có đủ các quyền của role (không thể bỏ). Có thể thêm quyền riêng lẻ khi Edit User.
                        </p>
                        <div class="rp-search-wrap" style="margin-bottom: 0.75rem;">
                            <input type="text" id="searchPermissionsRp" class="rp-input" placeholder="Tìm chức năng..." style="max-width: 280px; padding: 0.5rem 0.75rem; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.875rem;" />
                        </div>
                        <div class="rp-table-wrap" id="permissionsTableWrap" style="max-height: 360px; overflow-y: auto; margin-bottom: 0.5rem;">
                        <table class="rp-table" id="tblRolePermission">
                            <thead>
                                <tr>
                                    <th class="rp-sortable" data-col="name" id="thPermName"><span>Chức năng <span class="rp-sort-icon"></span></span></th>
                                    <th id="thRoleBa">BA</th>
                                    <th id="thRoleCons">CONS</th>
                                    <th id="thRoleDev">DEV</th>
                                    <th id="thRoleQC">QC</th>
                                    <th id="thRoleCSS">CSS</th>
                                    <th id="thRoleOther">Other</th>
                                </tr>
                            </thead>
                            <tbody id="tbodyRolePermission"></tbody>
                        </table>
                        </div>
                        </div>
                    </div>
                    <div class="rp-card" id="cardServerAccess">
                        <div class="rp-card-header" onclick="toggleRpCard('cardServerAccess'); return false;">
                            <h2>Server Access theo Role</h2>
                            <span class="rp-toggle" title="Thu gọn / Mở rộng">▼</span>
                        </div>
                        <div class="rp-card-body">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem;">
                            Chọn server mà mỗi role được phép sử dụng khi quét database. Nếu không chọn server nào, role đó không thấy server nào (trừ khi có quyền Database Manage Servers). Super Admin và user có Database Manage Servers thấy tất cả.
                        </p>
                        <div class="rp-search-wrap" style="margin-bottom: 0.75rem;">
                            <input type="text" id="searchServersRp" class="rp-input" placeholder="Tìm server..." style="max-width: 280px; padding: 0.5rem 0.75rem; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.875rem;" />
                        </div>
                        <div class="rp-table-wrap" id="serverAccessTableWrap">
                        <table class="rp-table" id="tblRoleServerAccess">
                            <thead>
                                <tr id="trRoleServerAccessHead">
                                    <th class="rp-sortable" data-col="server"><span>Server <span class="rp-sort-icon"></span></span></th>
                                </tr>
                            </thead>
                            <tbody id="tbodyRoleServerAccess"></tbody>
                        </table>
                        </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <div id="toastContainer" class="toast-container"></div>
    </form>
    <script>
        (function() {
            var key = 'rpSidebarCollapsed';
            var $sb = $('#rpSidebar');
            var $btn = $('#rpSidebarToggle');
            if (localStorage.getItem(key) === '1') $sb.addClass('collapsed');
            $btn.on('click', function() {
                $sb.toggleClass('collapsed');
                localStorage.setItem(key, $sb.hasClass('collapsed') ? '1' : '0');
            });
        })();
        var permissions = [];
        var roles = [];
        var rolePermissions = {}; // roleId -> [permissionId]
        var servers = [];
        var roleServerAccess = {}; // roleId -> [serverId]
        var serverSortCol = 'server';
        var serverSortDir = 1;
        var permSortCol = 'name';
        var permSortDir = 1;

        function toggleRpCard(id) {
            $('#' + id).toggleClass('collapsed');
            var key = 'rpCard_' + id;
            localStorage.setItem(key, $('#' + id).hasClass('collapsed') ? '1' : '0');
        }

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
            var reqServers = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadServers") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                dataType: 'json'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.list) servers = d.list;
            });
            var reqRsa = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadRoleServerAccess") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                dataType: 'json'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success && d.roleServerAccess) roleServerAccess = d.roleServerAccess;
            });
            $.when(reqPerm, reqRoles, reqRp, reqServers, reqRsa).always(function() {
                render();
            }).fail(function() {
                showToast('Không tải được dữ liệu.', 'error');
            });
        }

        function filterPermissionRows() {
            var q = ($('#searchPermissionsRp').val() || '').toLowerCase().trim();
            $('#tbodyRolePermission tr').each(function() {
                var $r = $(this);
                var match = !q || ($r.attr('data-search') || '').indexOf(q) >= 0;
                $r.css('display', match ? '' : 'none');
            });
        }

        function render() {
            var $tb = $('#tbodyRolePermission');
            $tb.empty();
            var sortedPerms = permissions.slice().sort(function(a, b) {
                var va = ((a.name || a.code) || '').toLowerCase();
                var vb = ((b.name || b.code) || '').toLowerCase();
                return permSortDir * va.localeCompare(vb);
            });
            sortedPerms.forEach(function(p) {
                var searchText = ((p.name || '') + ' ' + (p.code || '')).toLowerCase().replace(/"/g, '&quot;');
                var $tr = $('<tr data-search="' + searchText + '"></tr>');
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
            filterPermissionRows();
            $('#tblRolePermission th.rp-sortable .rp-sort-icon').text('');
            $('#tblRolePermission th.rp-sortable[data-col="' + permSortCol + '"] .rp-sort-icon').text(permSortDir === 1 ? '↑' : '↓');
            var $trHead = $('#trRoleServerAccessHead');
            $trHead.find('th:not(:first)').remove();
            $trHead.find('th:first').replaceWith('<th class="rp-sortable" data-col="server"><span>Server <span class="rp-sort-icon"></span></span></th>');
            roles.forEach(function(r) {
                $trHead.append('<th>' + (r.code || r.name || r.id) + '</th>');
            });
            var sorted = servers.slice().sort(function(a, b) {
                var va = ((a.serverName || '') + (a.port != null ? ':' + a.port : '') + (a.username || '')).toLowerCase();
                var vb = ((b.serverName || '') + (b.port != null ? ':' + b.port : '') + (b.username || '')).toLowerCase();
                return serverSortDir * va.localeCompare(vb);
            });
            var $tbSrv = $('#tbodyRoleServerAccess');
            $tbSrv.empty();
            if (!servers.length) {
                $tbSrv.append('<tr><td colspan="' + (roles.length + 1) + '" style="color: var(--text-muted);">Chưa có server. Thêm server trong Database Search.</td></tr>');
            } else {
                sorted.forEach(function(s) {
                    var disp = (s.serverName || '') + (s.port != null ? ':' + s.port : '') + ' (' + (s.username || '') + ')';
                    var searchText = disp.toLowerCase();
                    var $tr = $('<tr data-server-id="' + s.id + '" data-search="' + searchText.replace(/"/g, '&quot;') + '"></tr>');
                    $tr.append('<td>' + disp + '</td>');
                    roles.forEach(function(r) {
                        var rsa = roleServerAccess[String(r.id)] || [];
                        var chk = rsa.indexOf(s.id) >= 0;
                        var $td = $('<td></td>');
                        $td.append('<input type="checkbox" class="rp-role-server-cb" data-role-id="' + r.id + '" data-server-id="' + s.id + '" ' + (chk ? 'checked' : '') + ' />');
                        $tr.append($td);
                    });
                    $tbSrv.append($tr);
                });
            }
            $('#tblRoleServerAccess th.rp-sortable .rp-sort-icon').text('');
            $('#tblRoleServerAccess th.rp-sortable[data-col="' + serverSortCol + '"] .rp-sort-icon').text(serverSortDir === 1 ? '↑' : '↓');
            filterServerRows();
        }

        function syncRoleServerAccessFromDom() {
            roleServerAccess = {};
            $('.rp-role-server-cb').each(function() {
                var rid = $(this).data('role-id'), sid = $(this).data('server-id');
                if (!rid || !sid) return;
                if (!roleServerAccess[String(rid)]) roleServerAccess[String(rid)] = [];
                if ($(this).prop('checked') && roleServerAccess[String(rid)].indexOf(sid) < 0)
                    roleServerAccess[String(rid)].push(sid);
            });
        }

        function filterServerRows() {
            var q = ($('#searchServersRp').val() || '').toLowerCase().trim();
            $('#tbodyRoleServerAccess tr').each(function() {
                var $r = $(this);
                if ($r.find('td').length === 0) return;
                var match = !q || ($r.attr('data-search') || '').indexOf(q) >= 0;
                $r.css('display', match ? '' : 'none');
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
            var byRoleServer = {};
            roles.forEach(function(r) { byRoleServer[String(r.id)] = []; });
            $('#tbodyRoleServerAccess .rp-role-server-cb:checked').each(function() {
                var r = parseInt($(this).data('role-id'), 10);
                var s = parseInt($(this).data('server-id'), 10);
                var rk = String(r);
                if (!byRoleServer[rk]) byRoleServer[rk] = [];
                byRoleServer[rk].push(s);
            });

            var total = roles.length * 2;
            var done = 0;
            function next() {
                if (done >= total) {
                    showToast('Đã lưu cấu hình quyền và server access theo Role.', 'success');
                    load();
                    return;
                }
                var idx = done;
                var r = roles[Math.floor(idx / 2)];
                if (idx % 2 === 0) {
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
                } else {
                    var sids = byRoleServer[String(r.id)] || [];
                    $.ajax({
                        url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/SaveRoleServerAccess") %>',
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        data: JSON.stringify({ roleId: r.id, serverIds: sids }),
                        dataType: 'json'
                    }).done(function(res) {
                        var d = res.d || res;
                        if (!d || !d.success) showToast(d && d.message ? d.message : 'Lỗi lưu server access role ' + r.code, 'error');
                    }).fail(function() { showToast('Lỗi lưu server access role ' + r.code, 'error'); })
                      .always(function() { done++; next(); });
                }
            }
            next();
        }

        $(function() {
            if (localStorage.getItem('rpCard_cardPermissions') === '1') $('#cardPermissions').addClass('collapsed');
            if (localStorage.getItem('rpCard_cardServerAccess') === '1') $('#cardServerAccess').addClass('collapsed');
            $('#searchServersRp').on('input', filterServerRows);
            $('#searchPermissionsRp').on('input', filterPermissionRows);
            $('#tblRolePermission').on('click', 'th.rp-sortable', function() {
                var col = $(this).data('col');
                if (col === permSortCol) permSortDir = -permSortDir; else { permSortCol = col; permSortDir = 1; }
                render();
            });
            $('#tblRoleServerAccess').on('click', 'th.rp-sortable', function() {
                syncRoleServerAccessFromDom();
                var col = $(this).data('col');
                if (col === serverSortCol) serverSortDir = -serverSortDir; else { serverSortCol = col; serverSortDir = 1; }
                render();
            });
            load();
        });
    </script>
</body>
</html>
