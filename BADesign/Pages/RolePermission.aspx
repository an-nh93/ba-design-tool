<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="RolePermission.aspx.cs"
    Inherits="UiBuilderFull.Admin.RolePermission" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Phân quyền - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
        .rp-content { padding: 0; }
        .rp-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            margin-bottom: 0.75rem;
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
        .rp-card-header .rp-toggle { color: var(--text-muted); font-size: 0.75rem; transition: transform 0.2s; flex-shrink: 0; }
        .rp-card.collapsed .rp-card-header .rp-toggle { transform: rotate(-90deg); }
        .rp-card-header h2 { font-size: 0.9375rem; font-weight: 600; line-height: 1.4; margin: 0; color: var(--text-primary); }
        .rp-card-body { margin-top: 0.5rem; }
        .rp-table { width: 100%; border-collapse: collapse; }
        .rp-table-wrap { max-height: max(360px, calc(100vh - 320px)); overflow-y: auto; margin-bottom: 0.5rem; }
        .rp-table-wrap .rp-table th { position: sticky; top: 0; background: var(--bg-darker); z-index: 1; }
        .rp-table th.rp-sortable { cursor: pointer; user-select: none; }
        .rp-table th.rp-sortable:hover { background: var(--bg-hover); }
        .rp-table th .rp-sort-icon { margin-left: 4px; opacity: 0.6; }
        .rp-table th, .rp-table td { padding: 0.375rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.8125rem; }
        .rp-table th { background: var(--bg-darker); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; }
        .rp-table td { color: var(--text-primary); }
        .rp-table tbody tr:hover { background: var(--bg-hover); }
        .rp-table input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: var(--primary); }
        .rp-btn {
            padding: 0.3125rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8125rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .rp-toolbar { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 0.5rem; }
        .rp-search-wrap { margin-bottom: 0.5rem; }
        .rp-search { max-width: 280px; }
        .rp-btn-primary { background: var(--primary); color: white; }
        .rp-btn-primary:hover { background: var(--primary-hover); }
        .rp-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .rp-btn-secondary:hover { background: var(--bg-card); }        .rp-perm-info-btn {
            background: none; border: none; color: var(--primary); cursor: pointer; padding: 0 4px; margin-right: 6px;
            font-size: 1rem; line-height: 1; vertical-align: middle; border-radius: 4px;
        }
        .rp-perm-info-btn:hover { color: var(--primary-hover); background: rgba(0,120,212,0.15); }
        .rp-perm-info-btn:focus { outline: none; }
        .rp-modal { display: none; position: fixed; inset: 0; z-index: 10003; align-items: center; justify-content: center; padding: 1rem; background: rgba(0,0,0,0.6); }
        .rp-modal.show { display: flex; }
        .rp-modal-content { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-width: 480px; width: 100%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
        .rp-modal-header { padding: 0.5rem 0.75rem 0.5rem 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .rp-modal-title { font-size: 1rem; line-height: 1.3; font-weight: 600; color: var(--text-primary); margin: 0; }
        .rp-modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0 4px; }
        .rp-modal-close:hover { color: var(--text-primary); }
        .rp-modal-body { padding: 0.75rem 1rem; overflow-y: auto; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6; }
        .rp-mgr-none { color: var(--text-muted); }
        .rp-mgr-pick { display: flex; flex-wrap: wrap; gap: 0.375rem 0.75rem; align-items: center; }
        .rp-mgr-pick select { flex: 0 1 360px; min-width: 0; }
        .rp-mgr-note { color: var(--warning); font-size: 0.8125rem; }
        .rp-mgr-role { width: 200px; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="admin-container ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <div class="admin-main ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="admin-content ba-content">
                    <div class="rp-toolbar">
                        <button type="button" class="rp-btn rp-btn-primary" id="btnSave" onclick="saveRolePermissions(); return false;">Lưu cấu hình</button>
                    </div>
                    <div class="rp-content">
                    <div class="rp-card" id="cardPermissions">
                        <div class="rp-card-header" onclick="toggleRpCard('cardPermissions'); return false;">
                            <span class="rp-toggle" title="Thu gọn / Mở rộng">▼</span>
                            <h2>Định nghĩa quyền theo Role</h2>
                        </div>
                        <div class="rp-card-body">
                        <p class="ba-section-hint">
                            Chọn quyền cho từng role. User được gán role sẽ có đủ các quyền của role (không thể bỏ). Có thể thêm quyền riêng lẻ khi Edit User.
                        </p>
                        <div class="rp-search-wrap">
                            <input type="text" id="searchPermissionsRp" class="ba-input rp-input rp-search" placeholder="Tìm chức năng..." />
                        </div>
                        <div class="rp-table-wrap" id="permissionsTableWrap">
                        <table class="rp-table" id="tblRolePermission">
                            <thead>
                                <tr id="trRolePermissionHead">
                                    <th class="rp-sortable" data-col="name" id="thPermName"><span>Chức năng <span class="rp-sort-icon"></span></span></th>
                                    <!-- Cột role: render động trong render() theo đúng thứ tự roles (RoleId) — tránh lệch cột so với checkbox -->
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
                        <p class="ba-section-hint">
                            Chọn server mà mỗi role được phép sử dụng khi quét database. Nếu không chọn server nào, role đó không thấy server nào (trừ khi có quyền Database Manage Servers). Super Admin và user có Database Manage Servers thấy tất cả.
                        </p>
                        <div class="rp-search-wrap">
                            <input type="text" id="searchServersRp" class="ba-input rp-input rp-search" placeholder="Tìm server..." />
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
                    <div class="rp-card" id="cardRoleManagers">
                        <div class="rp-card-header" onclick="toggleRpCard('cardRoleManagers'); return false;">
                            <span class="rp-toggle" title="Thu gọn / Mở rộng">▼</span>
                            <h2>Sếp của từng Role</h2>
                        </div>
                        <div class="rp-card-body">
                        <p class="ba-section-hint">
                            Mỗi role có một sếp. Quy trình duyệt mẫu UI dùng người này cho bước "Sếp của role người gửi". Bấm Lưu cấu hình để ghi lại.
                        </p>
                        <div id="roleManagersWrap">
                        <table class="rp-table" id="tblRoleManagers">
                            <thead>
                                <tr>
                                    <th class="rp-mgr-role">Role</th>
                                    <th>Sếp</th>
                                </tr>
                            </thead>
                            <tbody id="tbodyRoleManagers"></tbody>
                        </table>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    <script>
        var permissions = [];
        var roles = [];
        var rolePermissions = {}; // roleId -> [permissionId]
        var servers = [];
        var roleServerAccess = {}; // roleId -> [serverId]
        var roleManagers = {};
        var managerUsers = [];
        var managersInstalled = true;
        var managersMessage = '';
        var serverSortCol = 'server';
        var serverSortDir = 1;
        var permSortCol = 'name';
        var permSortDir = 1;
        var permDescriptionFallback = {
            'UIBuilder': 'Thiết kế giao diện người dùng: tạo controls, forms và các component UI. Dùng cho BA/DEV để thiết kế màn hình.',
            'DatabaseTools': 'Quét server, xem danh sách database, copy connection string. Cho phép kết nối và thao tác với database (backup, restore, v.v. tùy quyền chi tiết).',
            'EncryptDecrypt': 'Mã hóa và giải mã dữ liệu nhạy cảm (SĐT, email, lương). Tạo script Demo Reset theo nhân viên.',
            'HRHelper': 'Truy cập Trợ lý HR: quản lý User, Employee, Company trong database HR. Dùng cho BA/CONS/DEV/QC khi cần thao tác dữ liệu HR.',
            'DatabaseBackup': 'Được phép thực hiện backup database từ trang Công cụ Database (tạo file .bak).',
            'DatabaseRestore': 'Được phép thực hiện restore database từ trang Công cụ Database (khôi phục từ file .bak).',
            'DatabaseDelete': 'Được phép xóa database từ trang Công cụ Database. Thao tác nguy hiểm, cần cẩn trọng.',
            'DatabaseBulkReset': 'Được phép chạy Bulk Reset: reset dữ liệu hàng loạt database (theo kịch bản).',
            'DatabaseManageServers': 'Quản lý cấu hình server: thêm, sửa, xóa server trong Công cụ Database; thấy tất cả server (bỏ qua Server Access theo Role). Dùng cho manager.',
            'DatabaseConnectAny': 'Được Connect và dùng Trợ lý HR trên mọi database (không chỉ database do mình restore). Dùng cho BA/QC/DEV cần truy cập nhiều DB.',
            'DatabaseShrinkLog': 'Được phép Shrink log file của database từ trang Công cụ Database.',
            'Settings': 'Truy cập Cài đặt ứng dụng: cấu hình Email Server, SFTP, Telegram, Public URL và các thiết lập hệ thống khác.',
            'PGPTool': 'Sử dụng Công cụ PGP: xuất key .asc, mã hóa và giải mã file PGP.',
            'FeedbackManage': 'Quản lý góp ý: xem và cập nhật trạng thái, ghi chú, comment cho feedback/bug từ người dùng.',
            'LeaveManager': 'Quản lý nghỉ phép: xem và phê duyệt đơn nghỉ của nhân viên.'
        };

        function toggleRpCard(id) {
            $('#' + id).toggleClass('collapsed');
            var key = 'rpCard_' + id;
            localStorage.setItem(key, $('#' + id).hasClass('collapsed') ? '1' : '0');
        }

        function showToast(msg, type) { BaToast.show(msg, type); }

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
            var reqMgr = $.ajax({
                url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/LoadRoleManagers") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                dataType: 'json'
            }).done(function(res) {
                var d = res.d || res;
                if (d && d.success) {
                    roleManagers = d.roleManagers || {};
                    managerUsers = d.users || [];
                    managersInstalled = true;
                } else {
                    managersInstalled = false;
                    managersMessage = d && d.message ? d.message : 'Không tải được danh sách sếp của role.';
                }
            }).fail(function() {
                managersInstalled = false;
                managersMessage = 'Không tải được danh sách sếp của role.';
            });
            $.when(reqPerm, reqRoles, reqRp, reqServers, reqRsa, reqMgr).always(function() {
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
            // Header cột Role phải khớp thứ tự với checkbox (roles từ DB). Header cố định BA|CONS|DEV... dễ gây nhầm khi RoleId không theo thứ tự đó.
            var $trPermHead = $('#trRolePermissionHead');
            $trPermHead.find('th:not(:first)').remove();
            roles.forEach(function(r) {
                var code = (r.name || r.code || String(r.id)).replace(/&/g, '&amp;').replace(/</g, '&lt;');
                $trPermHead.append('<th class="rp-role-col-head" title="RoleId ' + r.id + '">' + code + '</th>');
            });
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
                $trHead.append($('<th></th>').text(r.name || r.code || r.id));
            });
            var sorted = servers.slice().sort(function(a, b) {
                var va = ((a.serverName || '') + (a.port != null ? ':' + a.port : '') + (a.username || '')).toLowerCase();
                var vb = ((b.serverName || '') + (b.port != null ? ':' + b.port : '') + (b.username || '')).toLowerCase();
                return serverSortDir * va.localeCompare(vb);
            });
            var $tbSrv = $('#tbodyRoleServerAccess');
            $tbSrv.empty();
            if (!servers.length) {
                $tbSrv.append('<tr><td colspan="' + (roles.length + 1) + '" style="color: var(--text-muted);">Chưa có server. Thêm server trong Công cụ Database.</td></tr>');
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
            renderRoleManagers();
        }

        function managerUser(id) {
            for (var i = 0; i < managerUsers.length; i++) if (managerUsers[i].id === id) return managerUsers[i];
            return null;
        }

        function renderRoleManagers() {
            var $tb = $('#tbodyRoleManagers');
            $tb.empty();
            if (!managersInstalled) {
                $tb.append($('<tr></tr>').append($('<td colspan="2" class="rp-mgr-none"></td>').text(managersMessage)));
                return;
            }
            roles.forEach(function(r) {
                var current = roleManagers[String(r.id)] || 0;
                var user = current ? managerUser(current) : null;
                var $tr = $('<tr></tr>').attr('data-role-id', r.id);
                $tr.append($('<td translate="no"></td>').text(r.name || r.code || r.id));
                var $select = $('<select class="ba-input rp-input rp-mgr-select" translate="no"></select>');
                $select.append($('<option value="" translate="yes"></option>').text('Chưa khai sếp'));
                managerUsers.forEach(function(item) {
                    $select.append($('<option></option>').val(item.id).text(item.name + (item.roleName ? ' (' + item.roleName + ')' : '')));
                });
                if (current && !user) $select.append($('<option translate="yes"></option>').val(current).text('Tài khoản đã khóa (#' + current + ')'));
                $select.val(current ? String(current) : '');
                var $pick = $('<div class="rp-mgr-pick"></div>').append($select);
                if (current && !user) $pick.append($('<span class="rp-mgr-note"></span>').text('Tài khoản này đã bị khóa nên không duyệt được.'));
                else if (user && !user.hasEmail) $pick.append($('<span class="rp-mgr-note"></span>').text('Người này chưa có email nên sẽ không nhận được thư báo.'));
                $tr.append($('<td></td>').append($pick));
                $tb.append($tr);
            });
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

            var per = managersInstalled ? 3 : 2;
            var total = roles.length * per;
            var done = 0;
            function next() {
                if (done >= total) {
                    showToast(managersInstalled ? 'Đã lưu cấu hình quyền, server access và sếp theo Role.' : 'Đã lưu cấu hình quyền và server access theo Role.', 'success');
                    load();
                    return;
                }
                var idx = done;
                var r = roles[Math.floor(idx / per)];
                var kind = idx % per;
                if (kind === 0) {
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
                } else if (kind === 1) {
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
                } else {
                    $.ajax({
                        url: '<%= ResolveUrl("~/Pages/RolePermission.aspx/SaveRoleManagers") %>',
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        data: JSON.stringify({ roleId: r.id, userId: roleManagers[String(r.id)] || 0 }),
                        dataType: 'json'
                    }).done(function(res) {
                        var d = res.d || res;
                        if (!d || !d.success) showToast(d && d.message ? d.message : 'Lỗi lưu sếp của role ' + r.code, 'error');
                    }).fail(function() { showToast('Lỗi lưu sếp của role ' + r.code, 'error'); })
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
            if (localStorage.getItem('rpCard_cardRoleManagers') === '1') $('#cardRoleManagers').addClass('collapsed');
            $('#tbodyRoleManagers').on('change', '.rp-mgr-select', function() {
                var key = String($(this).closest('tr').attr('data-role-id'));
                var id = parseInt($(this).val(), 10);
                if (id > 0) roleManagers[key] = id;
                else delete roleManagers[key];
                renderRoleManagers();
            });
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
</body>
</html>
