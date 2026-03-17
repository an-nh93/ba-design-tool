<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="RolePermission.aspx.cs"
    Inherits="UiBuilderFull.Admin.RolePermission" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Role Permission - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
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
        .rp-content { padding: 0; }
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
            gap: 0.5rem;
            cursor: pointer;
            user-select: none;
        }
        .rp-card-header:hover { opacity: 0.9; }
        .rp-card-header .rp-toggle { color: var(--text-muted); font-size: 1rem; transition: transform 0.2s; flex-shrink: 0; }
        .rp-card.collapsed .rp-card-header .rp-toggle { transform: rotate(-90deg); }
        .rp-card-header h2 { font-size: 1.25rem; margin: 0; color: var(--text-primary); }
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
        .toast { position: relative; padding-right: 2rem; padding-top: 0.25rem; }
        .toast .toast-close { position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0 4px; margin: 0; font-size: 1.25rem; line-height: 1; }
        .toast .toast-close:hover { color: var(--text-primary); }
        .toast.success { border-left: 4px solid var(--success); }
        .toast.error { border-left: 4px solid var(--danger); }
        .rp-perm-info-btn {
            background: none; border: none; color: var(--primary); cursor: pointer; padding: 0 4px; margin-right: 6px;
            font-size: 1rem; line-height: 1; vertical-align: middle; border-radius: 4px;
        }
        .rp-perm-info-btn:hover { color: var(--primary-hover); background: rgba(0,120,212,0.15); }
        .rp-perm-info-btn:focus { outline: none; }
        .rp-modal { display: none; position: fixed; inset: 0; z-index: 10003; align-items: center; justify-content: center; padding: 1rem; background: rgba(0,0,0,0.6); }
        .rp-modal.show { display: flex; }
        .rp-modal-content { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-width: 480px; width: 100%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
        .rp-modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .rp-modal-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin: 0; }
        .rp-modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0 4px; }
        .rp-modal-close:hover { color: var(--text-primary); }
        .rp-modal-body { padding: 1.25rem; overflow-y: auto; font-size: 0.9375rem; color: var(--text-secondary); line-height: 1.6; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="admin-container ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <div class="admin-main ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="admin-content ba-content">
                    <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:1rem;">
                        <button type="button" class="rp-btn rp-btn-primary" id="btnSave" onclick="saveRolePermissions(); return false;">Lưu cấu hình</button>
                    </div>
                    <div class="rp-content">
                    <div class="rp-card" id="cardPermissions">
                        <div class="rp-card-header" onclick="toggleRpCard('cardPermissions'); return false;">
                            <span class="rp-toggle" title="Thu gọn / Mở rộng">▼</span>
                            <h2>Định nghĩa quyền theo Role</h2>
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
                            <span class="rp-toggle" title="Thu gọn / Mở rộng">▼</span>
                            <h2>Server Access theo Role</h2>
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
            </div>
        </div>
        <div id="toastContainer" class="toast-container"></div>
        <div id="rpPermDetailModal" class="rp-modal">
            <div class="rp-modal-content">
                <div class="rp-modal-header">
                    <h3 class="rp-modal-title" id="rpPermDetailTitle">Chức năng</h3>
                    <button type="button" class="rp-modal-close" id="rpPermDetailClose" aria-label="Đóng">&times;</button>
                </div>
                <div class="rp-modal-body" id="rpPermDetailBody"></div>
            </div>
        </div>
    </form>
    <script src="../Scripts/ba-layout.js"></script>
    <script>
        var permissions = [];
        var roles = [];
        var rolePermissions = {}; // roleId -> [permissionId]
        var servers = [];
        var roleServerAccess = {}; // roleId -> [serverId]
        var serverSortCol = 'server';
        var serverSortDir = 1;
        var permSortCol = 'name';
        var permSortDir = 1;
        var permDescriptionFallback = {
            'UIBuilder': 'Thiết kế giao diện người dùng: tạo controls, forms và các component UI. Dùng cho BA/DEV để thiết kế màn hình.',
            'DatabaseSearch': 'Quét server, xem danh sách database, copy connection string. Cho phép kết nối và thao tác với database (backup, restore, v.v. tùy quyền chi tiết).',
            'EncryptDecrypt': 'Mã hóa và giải mã dữ liệu nhạy cảm (SĐT, email, lương). Tạo script Demo Reset theo nhân viên.',
            'HRHelper': 'Truy cập HR Helper: quản lý User, Employee, Company trong database HR. Dùng cho BA/CONS/DEV/QC khi cần thao tác dữ liệu HR.',
            'DatabaseBackup': 'Được phép thực hiện backup database từ trang Database Search (tạo file .bak).',
            'DatabaseRestore': 'Được phép thực hiện restore database từ trang Database Search (khôi phục từ file .bak).',
            'DatabaseDelete': 'Được phép xóa database từ trang Database Search. Thao tác nguy hiểm, cần cẩn trọng.',
            'DatabaseBulkReset': 'Được phép chạy Bulk Reset: reset dữ liệu hàng loạt database (theo kịch bản).',
            'DatabaseManageServers': 'Thêm, sửa, xóa server trong cấu hình Database Search. User có quyền này thấy tất cả server (bỏ qua Server Access theo Role).',
            'DatabaseShrinkLog': 'Được phép Shrink log file của database từ trang Database Search.',
            'Settings': 'Truy cập App Settings: cấu hình Email Server, SFTP, Telegram, Public URL và các thiết lập hệ thống khác.',
            'PGPTool': 'Sử dụng PGP Tool: xuất key .asc, mã hóa và giải mã file PGP.',
            'FeedbackManage': 'Quản lý góp ý: xem và cập nhật trạng thái, ghi chú, comment cho feedback/bug từ người dùng.',
            'LeaveManager': 'Quản lý nghỉ phép: xem và phê duyệt đơn nghỉ của nhân viên.'
        };

        function toggleRpCard(id) {
            $('#' + id).toggleClass('collapsed');
            var key = 'rpCard_' + id;
            localStorage.setItem(key, $('#' + id).hasClass('collapsed') ? '1' : '0');
        }

        function showToast(msg, type) {
            type = type || 'info';
            var $t = $('<div class="toast ' + type + '"><button type="button" class="toast-close" title="Đóng">&times;</button>' + msg + '</div>');
            $('#toastContainer').append($t);
            $t[0].offsetHeight;
            setTimeout(function() { $t.addClass('show'); }, 10);
            var tmr = setTimeout(function() { $t.removeClass('show'); setTimeout(function() { $t.remove(); }, 300); }, 4000);
            $t.find('.toast-close').on('click', function() { clearTimeout(tmr); $t.removeClass('show'); setTimeout(function() { $t.remove(); }, 300); });
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
                var desc = (p.description || '').trim() || (permDescriptionFallback[p.code] || 'Chưa có mô tả.');
                var nameEsc = (p.name || p.code || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                var descEsc = desc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
                var $tr = $('<tr data-search="' + searchText + '" data-perm-name="' + nameEsc + '" data-perm-desc="' + descEsc.replace(/"/g, '&quot;') + '"></tr>');
                var $tdName = $('<td></td>');
                $tdName.append('<button type="button" class="rp-perm-info-btn" title="Xem mô tả quyền">ℹ️</button>');
                $tdName.append(document.createTextNode(p.name || p.code || ''));
                $tr.append($tdName);
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

        function showPermDetailModal(name, descHtml) {
            $('#rpPermDetailTitle').text(name || 'Chức năng');
            $('#rpPermDetailBody').html(descHtml || 'Chưa có mô tả.');
            $('#rpPermDetailModal').addClass('show');
        }
        function hidePermDetailModal() {
            $('#rpPermDetailModal').removeClass('show');
        }
        $(function() {
            if (localStorage.getItem('rpCard_cardPermissions') === '1') $('#cardPermissions').addClass('collapsed');
            if (localStorage.getItem('rpCard_cardServerAccess') === '1') $('#cardServerAccess').addClass('collapsed');
            $('#searchServersRp').on('input', filterServerRows);
            $('#searchPermissionsRp').on('input', filterPermissionRows);
            $('#tblRolePermission').on('click', '.rp-perm-info-btn', function(e) {
                e.preventDefault();
                var $tr = $(this).closest('tr');
                var name = $tr.attr('data-perm-name');
                var descHtml = $tr.attr('data-perm-desc');
                if (name) name = name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
                showPermDetailModal(name, descHtml);
            });
            $('#rpPermDetailClose, #rpPermDetailModal').on('click', function(e) {
                if (e.target === this || $(e.target).hasClass('rp-modal-close')) hidePermDetailModal();
            });
            $('#rpPermDetailModal .rp-modal-content').on('click', function(e) { e.stopPropagation(); });
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
    <script>
    (function() {
        if (!$('#restoreJobsBellWrap').length) return;
        var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
        var dismissJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissJob") %>';
        var cancelJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/CancelRestoreJob") %>';
        var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
        var functionQueueUrl = '<%= ResolveUrl("~/FunctionQueue") %>';
        function parseDateSafe(v) { if (v == null || v === '') return null; if (typeof v === 'number') return new Date(v); var s = (typeof v === 'string') ? v : String(v); var m = s.match(/\/Date\((\d+)\)\//); if (m) return new Date(parseInt(m[1], 10)); return isNaN(Date.parse(s)) ? null : new Date(s); }
        var DISMISSED_KEY = 'baDismissedJobIds';
        function getDismissed() { try { var r = localStorage.getItem(DISMISSED_KEY); return r ? (JSON.parse(r) || []) : []; } catch (e) { return []; } }
        function addDismissed(id, type) { var k = (type === 'Backup' ? 'b:' : 'r:') + id; var a = getDismissed(); if (a.indexOf(k) < 0) { a.push(k); localStorage.setItem(DISMISSED_KEY, JSON.stringify(a)); } }
        function isDismissed(j) { return getDismissed().indexOf((j.type === 'Backup' ? 'b:' : 'r:') + (j.id || '')) >= 0; }
        function fmtTime(v) { var d = parseDateSafe(v); return d ? d.toLocaleString() : '—'; }
        function loadPanel() {
            var $list = $('#restoreJobsList'), $badge = $('#restoreJobsBadge');
            if (!$list.length) return;
            $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                    var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isDismissed(j); }).sort(function(a,b) { var ta = parseDateSafe(a.startTime); var tb = parseDateSafe(b.startTime); return (tb && ta) ? (tb - ta) : 0; });
                    var newBugs = d.newBugs || [];
                    var total = jobs.length + newBugs.length;
                    if (!total) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                    var currentUserId = (d.currentUserId != null) ? parseInt(d.currentUserId, 10) : 0;
                    $badge.text(total).addClass('visible');
                    window.__notifJobsList = jobs;
                    var bugsCollapsed = sessionStorage.getItem('ba_notif_bugs_collapsed') === '1';
                    var jobsCollapsed = sessionStorage.getItem('ba_notif_jobs_collapsed') === '1';
                    var html = '';
                    if (newBugs.length > 0) {
                        html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;"><span class="ba-notif-group-arrow">' + (bugsCollapsed ? '▶' : '▼') + '</span> 🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs" style="' + (bugsCollapsed ? 'display:none;' : '') + '">';
                        newBugs.forEach(function(b) { var bugUrl = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + fmtTime(b.createdAt) + '</div><a class="ba-notif-detail-link" href="' + bugUrl + '">Xem / Xử lý</a></div>'; });
                        html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;"><span class="ba-notif-group-arrow">' + (jobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (jobsCollapsed ? 'display:none;' : '') + '">';
                    }
                    jobs.forEach(function(j, idx) {
                        var st = j.status || '', type = j.type || 'Restore', typeLabel = j.typeLabel || (type === 'Backup' ? 'Backup' : type === 'HRHelperMultiDbAnalyze' ? 'Phân tích Multi-DB' : 'Restore');
                        var badge = (type === 'Backup') ? 'ba-notif-type-backup' : (type === 'Restore') ? 'ba-notif-type-restore' : 'ba-notif-type-hr-analyze';
                        var pct = (j.percentComplete != null) ? Number(j.percentComplete) : 0;
                        var phase = (j.message || (type === 'Restore' ? 'Restore' : '')).toString().trim();
                        var startedByUid = (j.startedByUserId != null) ? parseInt(j.startedByUserId, 10) : 0;
                        var canCancel = (type === 'Restore' || type === 'Backup' || type === 'HRHelperMultiDbAnalyze' || type === 'HRHelperMultiDbReset') && currentUserId && startedByUid === currentUserId;
                        var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + type + '"><button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badge + '">' + (typeLabel.replace(/</g, '&lt;')) + '</span> ' + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + fmtTime(j.startTime) + '</div>';
                        if (st === 'Running') {
                            var progressLabel = (type === 'Restore' && phase) ? (pct + '% - ' + phase) : (type === 'HRHelperMultiDbAnalyze' ? (pct + '% - Phân tích') : (pct + '%'));
                            row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt,var(--bg-darker));height:6px;border-radius:3px;overflow:hidden;"><div class="ba-notif-progress-bar" style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span class="ba-notif-progress-pct">' + progressLabel + '</span></div><a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                            if (canCancel) row += ' <button type="button" class="ba-notif-cancel-btn" data-job-id="' + (j.id || '') + '" title="Chỉ người thực hiện job mới có thể hủy">Hủy</button>';
                        } else if (st === 'Completed') row += '<div style="margin-top:4px;color:var(--success);">Đã xong</div><a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                        else if (st === 'Failed') row += '<div class="ba-notif-msg ba-notif-msg-error">' + (j.message || '').replace(/</g, '&lt;') + '</div><a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                        row += '</div>';
                        html += row;
                    });
                    if (newBugs.length > 0) html += '</div></div>';
                    else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;"><span class="ba-notif-group-arrow">' + (jobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (jobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                    $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                    $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function() { var g = $(this).data('group'); var $b = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); if ($b.is(':visible')) { $b.slideUp(200); $(this).find('.ba-notif-group-arrow').text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $b.slideDown(200); $(this).find('.ba-notif-group-arrow').text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                    $list.off('click.detail').on('click.detail', '.ba-notif-detail-link[data-action="detail"]', function(e) { e.preventDefault(); var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || null; if (job && typeof window.showNotificationDetail === 'function') window.showNotificationDetail(job); });
                    $list.off('click.dismiss').on('click.dismiss', '.ba-notif-dismiss', function(e) { e.preventDefault(); e.stopPropagation(); var $i = $(this).closest('.ba-notif-item'); var id = parseInt($i.data('job-id'), 10); var typ = $i.data('job-type') || 'Restore'; if (id) { addDismissed(id, typ); $.ajax({ url: dismissJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: id }) }); $i.slideUp(200, function() { $(this).remove(); var n = $('#restoreJobsList').find('.ba-notif-item').length; if (n > 0) $('#restoreJobsBadge').text(n).addClass('visible'); else { $('#restoreJobsBadge').removeClass('visible'); $('#restoreJobsList').html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } }); } });
                    $list.off('click.baNotifCancel').on('click.baNotifCancel', '.ba-notif-cancel-btn', function(e) { e.preventDefault(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($(this).data('job-id'), 10); if (!jobId) return; var idx = parseInt($item.data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || {}; var serverName = (job.serverName || '').trim(); var dbName = (job.databaseName || '').trim(); var jobType = (job.type || job.typeLabel || 'Restore').toString(); var jobDesc = (serverName || dbName) ? (serverName + ' → ' + dbName) : ('Job #' + jobId); var msg = 'Bạn có chắc muốn hủy job:\n' + jobDesc + '\nLoại: ' + jobType + '\n\nHành động không thể hoàn tác.'; var $btn = $(this); if (typeof baConfirm === 'function') baConfirm(msg, function() { $btn.prop('disabled', true); $.ajax({ url: cancelJobUrl, type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ jobId: jobId }), success: function(r) { var d = r.d || r; if (d && d.success) loadPanel(); else $btn.prop('disabled', false); }, error: function() { $btn.prop('disabled', false); } }); }, null, 'Đồng ý', 'Thoát'); });
                }
            });
        }
        $(function() {
            $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); }); var total = jobs.length + (d.newBugs || []).length; if (total > 0) $('#restoreJobsBadge').text(total).addClass('visible'); } } });
            $('#restoreJobsBellBtn').on('click', function(e) { e.stopPropagation(); var $p = $('#restoreJobsPanel'); if ($p.is(':visible')) $p.hide(); else { loadPanel(); $p.show(); } });
            $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
            $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
        });
    })();
    </script>
</body>
</html>
