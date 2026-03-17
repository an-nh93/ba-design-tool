<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="AuditLog.aspx.cs"
    Inherits="BADesign.Pages.AuditLog" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Audit Log - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/jquery.signalR.min.js"></script>
    <script src="../Scripts/ba-signalr.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        .ba-content { padding: 0.5rem; }
        .ba-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .ba-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1rem; align-items: end; }
        .ba-form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .ba-form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); }
        .ba-input {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            width: 100%;
        }
        .ba-input:focus { outline: none; border-color: var(--primary); }
        .ba-btn {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-secondary:hover { background: var(--bg-card); }
        .ba-table-wrap {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow-x: auto;
            overflow-y: auto;
            max-height: min(65vh, 600px);
        }
        .ba-table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            min-width: 900px;
        }
        .ba-table thead { border-bottom: 1px solid var(--border); }
        .ba-table thead th {
            background: var(--bg-darker);
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
            box-sizing: border-box;
        }
        .ba-table tbody td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.875rem;
            color: var(--text-primary);
            vertical-align: top;
            box-sizing: border-box;
        }
        .ba-table tbody tr:hover { background: var(--bg-hover); }
        .ba-table .col-time { width: 11%; min-width: 100px; }
        .ba-table .col-user { width: 8%; min-width: 80px; }
        .ba-table .col-action { width: 12%; min-width: 120px; }
        .ba-table .col-detail { width: 32%; min-width: 200px; word-break: break-word; }
        .ba-table .col-ip { width: 7%; min-width: 90px; }
        .ba-table .col-device { width: 30%; min-width: 200px; font-size: 0.8125rem; color: var(--text-muted); word-break: break-word; }
        /* Ghi đè ba-layout.css: không ép cột cuối 1%, giữ đúng % và màu header */
        .ba-table-wrap .ba-table thead th:last-child { width: 30% !important; min-width: 200px !important; white-space: nowrap; background: var(--bg-darker) !important; }
        .ba-table-wrap .ba-table td:last-child { width: 30% !important; min-width: 200px !important; white-space: normal; word-break: break-word; }
        .ba-empty { text-align: center; padding: 2rem; color: var(--text-muted); }
        .ba-pager { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
        .ba-pager-info { font-size: 0.875rem; color: var(--text-secondary); }
        .ba-badge-action { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; background: var(--bg-hover); color: var(--text-primary); }
        .ba-detail-cell { display: flex; align-items: center; gap: 0.5rem; }
        .ba-detail-text { flex: 1; min-width: 0; word-break: break-word; }
        .ba-detail-view-btn { flex-shrink: 0; padding: 0.25rem 0.5rem; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 4px; color: var(--text-secondary); cursor: pointer; font-size: 0.8125rem; }
        .ba-detail-view-btn:hover { color: var(--primary); border-color: var(--primary); }
        .ba-audit-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1050; align-items: center; justify-content: center; padding: 1rem; box-sizing: border-box; }
        .ba-audit-modal.show { display: flex; }
        .ba-audit-modal-content { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 760px; width: 95%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
        .ba-audit-modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .ba-audit-modal-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        /* Nút × đóng dùng chung từ ba-layout.css (class ba-modal-close) */
        .ba-audit-modal-body { padding: 1.25rem; overflow-y: auto; flex: 1; font-size: 0.875rem; color: var(--text-primary); }
        .ba-audit-detail-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .ba-audit-detail-table th { text-align: left; padding: 0.5rem 1rem 0.5rem 0; font-weight: 600; color: var(--text-secondary); width: 140px; vertical-align: top; white-space: nowrap; }
        .ba-audit-detail-table td { padding: 0.5rem 0; word-break: break-word; }
        .ba-audit-detail-table tr { border-bottom: 1px solid var(--border); }
        .ba-audit-detail-table tr:last-child { border-bottom: none; }
        .ba-audit-detail-plain { white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
    </style>
</head>
<body class="ba-body">
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <div class="ba-card">
                    <h1 class="ba-card-title">Audit Log</h1>
                    <p class="ba-card-desc" style="margin-bottom:1rem;">Xem lịch sử hành động: Restore/Backup/Delete database, Update User/Employee/Other. Thông tin client: IP, thiết bị (User-Agent), user, thời gian.</p>
                    <div class="ba-form-grid">
                        <div class="ba-form-group">
                            <label class="ba-form-label">Từ ngày</label>
                            <input type="datetime-local" id="dateFrom" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Đến ngày</label>
                            <input type="datetime-local" id="dateTo" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Hành động</label>
                            <select id="actionCode" class="ba-input">
                                <option value="">-- Tất cả --</option>
                            </select>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">User / IP</label>
                            <input type="text" id="filterUserOrIp" class="ba-input" placeholder="Username hoặc IP" />
                        </div>
                        <div class="ba-form-group">
                            <button type="button" id="btnSearch" class="ba-btn ba-btn-primary">Tìm kiếm</button>
                        </div>
                    </div>
                    <div class="ba-table-wrap">
                        <table class="ba-table">
                            <thead>
                                <tr>
                                    <th class="col-time">Thời gian</th>
                                    <th class="col-user">User</th>
                                    <th class="col-action">Hành động</th>
                                    <th class="col-detail">Chi tiết</th>
                                    <th class="col-ip">IP</th>
                                    <th class="col-device">Thiết bị (User-Agent)</th>
                                </tr>
                            </thead>
                            <tbody id="auditBody"></tbody>
                        </table>
                    </div>
                    <div id="auditEmpty" class="ba-empty" style="display:none;">Chưa có bản ghi hoặc không tìm thấy.</div>
                    <div class="ba-pager">
                        <span class="ba-pager-info" id="pagerInfo"></span>
                        <button type="button" id="btnPrev" class="ba-btn ba-btn-secondary" style="display:none;">Trước</button>
                        <button type="button" id="btnNext" class="ba-btn ba-btn-secondary" style="display:none;">Sau</button>
                    </div>
                </div>
            </div>
        </main>
    </form>
    <div id="auditDetailModal" class="ba-audit-modal">
        <div class="ba-audit-modal-content">
            <div class="ba-audit-modal-header">
                <span class="ba-audit-modal-title">Chi tiết</span>
                <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" id="auditDetailModalClose" aria-label="Đóng">×</button>
            </div>
            <div class="ba-audit-modal-body" id="auditDetailModalBody"></div>
        </div>
    </div>
    <script>
        (function () {
            var pageSize = 50;
            var pageIndex = 0;
            var totalCount = 0;
            var getActionCodesUrl = '<%= ResolveUrl("~/Pages/AuditLog.aspx/GetActionCodes") %>';
            var getAuditLogsUrl = '<%= ResolveUrl("~/Pages/AuditLog.aspx/GetAuditLogs") %>';

            function setDefaultDates() {
                var now = new Date();
                var gmt7Ms = now.getTime() + (7 * 60 * 60 * 1000);
                var gmt7 = new Date(gmt7Ms);
                var pad = function (n) { return n < 10 ? '0' + n : n; };
                var dayOfWeek = gmt7.getUTCDay();
                var offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                var startOfWeek = new Date(Date.UTC(gmt7.getUTCFullYear(), gmt7.getUTCMonth(), gmt7.getUTCDate() - offsetToMonday, 0, 0, 0, 0));
                var endOfWeek = new Date(Date.UTC(startOfWeek.getUTCFullYear(), startOfWeek.getUTCMonth(), startOfWeek.getUTCDate() + 6, 23, 59, 59, 999));
                var fmt = function (dt) {
                    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
                };
                document.getElementById('dateFrom').value = fmt(startOfWeek) + 'T00:00';
                document.getElementById('dateTo').value = fmt(endOfWeek) + 'T23:59';
            }

            function loadActionCodes() {
                $.ajax({ url: getActionCodesUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function (r) {
                        var d = r.d || r;
                        if (!d || !d.success || !d.codes) return;
                        var sel = document.getElementById('actionCode');
                        sel.innerHTML = '<option value="">-- Tất cả --</option>';
                        d.codes.forEach(function (c) { var opt = document.createElement('option'); opt.value = c.code; opt.textContent = c.label || c.code; sel.appendChild(opt); });
                    }
                });
            }

            function loadPage() {
                var dateFrom = document.getElementById('dateFrom').value;
                var dateTo = document.getElementById('dateTo').value;
                var actionCode = document.getElementById('actionCode').value;
                var userOrIp = document.getElementById('filterUserOrIp').value.trim();

                $.ajax({ url: getAuditLogsUrl, type: 'POST', contentType: 'application/json', dataType: 'json',
                    data: JSON.stringify({ pageIndex: pageIndex, pageSize: pageSize, dateFrom: dateFrom || null, dateTo: dateTo || null, actionCode: actionCode || null, userOrIp: userOrIp || null }),
                    success: function (r) {
                    var d = r.d || r;
                    if (!d || !d.success) {
                        document.getElementById('auditBody').innerHTML = '<tr><td colspan="6">Lỗi: ' + (d && d.message ? d.message : 'Không tải được') + '</td></tr>';
                        document.getElementById('auditEmpty').style.display = 'none';
                        return;
                    }
                    totalCount = d.total || 0;
                    var rows = d.rows || [];
                    var tbody = document.getElementById('auditBody');
                    if (rows.length === 0) {
                        tbody.innerHTML = '';
                        document.getElementById('auditEmpty').style.display = 'block';
                    } else {
                        document.getElementById('auditEmpty').style.display = 'none';
                        window._auditLogRows = rows;
                        tbody.innerHTML = rows.map(function (x, idx) {
                                var shortDetail = (x.detail || '').length > 80 ? (x.detail || '').substring(0, 80) + '…' : (x.detail || '');
                                shortDetail = shortDetail.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                return '<tr>' +
                                    '<td class="col-time">' + (x.at || '') + '</td>' +
                                    '<td class="col-user">' + (x.userName || ('#' + (x.userId || ''))) + '</td>' +
                                    '<td class="col-action"><span class="ba-badge-action">' + (x.actionLabel || x.actionCode || '') + '</span></td>' +
                                    '<td class="col-detail"><div class="ba-detail-cell"><span class="ba-detail-text">' + shortDetail + '</span><button type="button" class="ba-detail-view-btn" data-idx="' + idx + '" title="Xem đầy đủ">&#128269; Xem</button></div></td>' +
                                    '<td class="col-ip">' + (x.ipAddress || '') + '</td>' +
                                    '<td class="col-device" title="' + (x.userAgent || '').replace(/"/g, '&quot;') + '">' + (x.userAgentShort || x.userAgent || '') + '</td>' +
                                    '</tr>';
                            }).join('');
                            tbody.querySelectorAll('.ba-detail-view-btn').forEach(function(btn) {
                                btn.onclick = function() {
                                    var idx = parseInt(this.getAttribute('data-idx'), 10);
                                    var r = (window._auditLogRows || [])[idx];
                                    if (!r) return;
                                    var detail = r.detail || '';
                                    var userAgent = r.userAgent || '';
                                    var parts = [];
                                    var s = detail.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                                    var chunks = s.split(/\s+->\s+|\n+/);
                                    chunks.forEach(function(chunk) {
                                        chunk = chunk.trim();
                                        if (!chunk) return;
                                        var sub = chunk.split(/\s+(?=[a-zA-Z_][a-zA-Z0-9_]*[=:])/);
                                        sub.forEach(function(seg) {
                                            seg = seg.trim();
                                            if (!seg) return;
                                            var eq = seg.indexOf('=');
                                            var col = seg.indexOf(':');
                                            if (eq > 0 && (col < 0 || eq < col)) {
                                                parts.push({ label: seg.substring(0, eq).trim(), value: seg.substring(eq + 1).trim() });
                                            } else if (col > 0) {
                                                parts.push({ label: seg.substring(0, col).trim(), value: seg.substring(col + 1).trim() });
                                            } else {
                                                parts.push({ label: '', value: seg });
                                            }
                                        });
                                    });
                                    if (userAgent) parts.push({ label: 'User-Agent', value: userAgent });
                                    var jobIdPart = parts.find(function(p) { return (p.label || '').toLowerCase() === 'jobid'; });
                                    var jobIdVal = jobIdPart ? parseInt(jobIdPart.value, 10) : 0;
                                    var actionCode = (r.actionCode || '').toString();
                                    var isMultiDbReset = (actionCode === 'HRHelper.MultiDbReset') && jobIdVal > 0;
                                    var html = parts.length > 0
                                        ? '<table class="ba-audit-detail-table"><tbody>' + parts.map(function(p) {
                                            var lbl = (p.label || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                            var val = (p.value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                            return '<tr><th>' + (lbl || '—') + '</th><td>' + val + '</td></tr>';
                                        }).join('') + (isMultiDbReset ? '<tr id="auditDbListRow"><th>Danh sách database</th><td id="auditDbListCell">Đang tải...</td></tr>' : '') + '</tbody></table>'
                                        : '<div class="ba-audit-detail-plain">' + (detail || '—').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') + '</div>';
                                    document.getElementById('auditDetailModalBody').innerHTML = html;
                                    document.getElementById('auditDetailModal').classList.add('show');
                                    if (isMultiDbReset) {
                                        $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobPayload") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobIdVal }),
                                            success: function(res) {
                                                var d = res.d || res;
                                                var payload = (d && d.success && d.payload) ? d.payload : null;
                                                var $cell = $('#auditDbListCell');
                                                if (!$cell.length) return;
                                                try {
                                                    var pl = payload ? (typeof payload === 'string' ? JSON.parse(payload) : payload) : null;
                                                    var dbArr = (pl && pl.databaseNames) ? pl.databaseNames : [];
                                                    var nDb = dbArr.length || (pl && pl.databaseCount) || 0;
                                                    var cell = nDb + ' Database';
                                                    if (dbArr.length > 0) {
                                                        var esc = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                                                        cell = nDb + ' Database <button type="button" class="ba-db-list-toggle" data-dbs="' + esc(JSON.stringify(dbArr)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button><div class="ba-db-list-popover"></div>';
                                                        $cell.html(cell);
                                                        $('#auditDetailModalBody').off('click.baDbList').on('click.baDbList', '.ba-db-list-toggle', function() {
                                                        var $btn = $(this), $pop = $btn.siblings('.ba-db-list-popover').first();
                                                        var raw = $btn.attr('data-dbs');
                                                        if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
                                                        try {
                                                            var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                                                            var grid = '<div class="ba-db-list-grid">' + (arr.map(function(name) { return '<span>' + (name || '').replace(/</g, '&lt;') + '</span>'; }).join('')) + '</div>';
                                                            $pop.html(grid).addClass('show');
                                                        } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
                                                    });
                                                    } else { $cell.text('—'); }
                                                } catch (e) { $cell.text('—'); }
                                            },
                                            error: function() { $('#auditDbListCell').text('—'); }
                                        });
                                    }
                                };
                            });
                    }
                    var start = pageIndex * pageSize + 1;
                    var end = Math.min((pageIndex + 1) * pageSize, totalCount);
                    document.getElementById('pagerInfo').textContent = totalCount === 0 ? '0 bản ghi' : 'Hiển thị ' + start + '–' + end + ' / ' + totalCount;
                    document.getElementById('btnPrev').style.display = pageIndex > 0 ? 'inline-flex' : 'none';
                    document.getElementById('btnNext').style.display = (pageIndex + 1) * pageSize < totalCount ? 'inline-flex' : 'none';
                    },
                    error: function (xhr, status, err) {
                        var msg = status ? ('Lỗi: Không tải được (' + status + ').') : 'Lỗi: Không tải được.';
                        document.getElementById('auditBody').innerHTML = '<tr><td colspan="6">' + msg + ' Thử lại hoặc kiểm tra console.</td></tr>';
                        document.getElementById('auditEmpty').style.display = 'none';
                    }
                });
            }

            setDefaultDates();
            loadActionCodes();

            document.getElementById('btnSearch').onclick = function () { pageIndex = 0; loadPage(); };
            document.getElementById('btnPrev').onclick = function () { if (pageIndex > 0) { pageIndex--; loadPage(); } };
            document.getElementById('btnNext').onclick = function () { if ((pageIndex + 1) * pageSize < totalCount) { pageIndex++; loadPage(); } };

            var auditDetailModal = document.getElementById('auditDetailModal');
            var auditDetailModalClose = document.getElementById('auditDetailModalClose');
            if (auditDetailModalClose) auditDetailModalClose.onclick = function () { auditDetailModal.classList.remove('show'); };
            if (auditDetailModal) auditDetailModal.onclick = function (e) { if (e.target === auditDetailModal) auditDetailModal.classList.remove('show'); };

            if (typeof BA_SignalR !== 'undefined') {
                BA_SignalR.start('<%= ResolveUrl("~/signalr") %>', '<%= ResolveUrl("~/signalr/hubs") %>');
            }

            loadPage();
        })();

        // Chuông thông báo (dùng chung header BaTopBar + NotificationBell): load số thông báo khi vào trang, bấm chuông mở panel.
        (function() {
            var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
            var dismissJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissJob") %>';
            var cancelJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/CancelRestoreJob") %>';
            function parseDateSafe(v) {
                if (v == null || v === '') return null;
                if (typeof v === 'number') return new Date(v);
                var s = (typeof v === 'string') ? v : String(v);
                var m = s.match(/\/Date\((\d+)\)\//);
                if (m) return new Date(parseInt(m[1], 10));
                var n = Date.parse(s);
                return isNaN(n) ? null : new Date(n);
            }
            var DISMISSED_JOBS_KEY = 'baDismissedJobIds';
            function getDismissedJobIds() { try { var raw = localStorage.getItem(DISMISSED_JOBS_KEY); if (!raw) return []; var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; } }
            function addDismissedJobId(id, type) { var key = (type === 'Backup' ? 'b:' : 'r:') + id; var arr = getDismissedJobIds(); if (arr.indexOf(key) < 0) { arr.push(key); localStorage.setItem(DISMISSED_JOBS_KEY, JSON.stringify(arr)); } }
            function isJobDismissed(job) { var key = (job.type === 'Backup' ? 'b:' : 'r:') + (job.id || ''); return getDismissedJobIds().indexOf(key) >= 0; }
            function formatNotifTime(v) { var dt = parseDateSafe(v); return dt ? dt.toLocaleString() : '—'; }
            function showNotificationDetail(job) {
                var typeLabel = (job.typeLabel || job.type || 'Restore').replace(/</g, '&lt;');
                var dbName = (job.databaseName || job.DatabaseName || '').trim();
                var isRestore = (job.type === 'Restore' || !job.type);
                var hasReset = isRestore && (job.withAutoReset === true || (job.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
                var resetBadge = '';
                if (isRestore) {
                    resetBadge = hasReset ? '<span class="ba-notif-type-badge ba-notif-reset-tag">Có Reset</span>' : '<span class="ba-notif-type-badge ba-notif-no-reset-tag">Không Reset</span>';
                    if (hasReset) {
                        var srvId = job.serverId != null ? job.serverId : (job.ServerId != null ? job.ServerId : 0);
                        resetBadge += ' <button type="button" class="ba-notif-reset-info-btn" title="Xem thông tin reset (email, phone, password)" data-server-id="' + srvId + '" data-database-name="' + (dbName.replace(/"/g, '&quot;')) + '">ℹ</button>';
                    }
                }
                var payloadRows = '';
                if ((job.type || '') === 'HRHelperMultiDbReset' && job.payload) {
                    try {
                        var pl = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                        if (pl) {
                            payloadRows += '<tr><th>Email reset</th><td>' + (pl.email || '—').replace(/</g, '&lt;') + '</td></tr>';
                            payloadRows += '<tr><th>Phone reset</th><td>' + (pl.phone || '—').replace(/</g, '&lt;') + '</td></tr>';
                            var dbArr = pl.databaseNames || [];
                            var nDb = dbArr.length || pl.databaseCount || 0;
                            var dbCell = nDb + ' Database';
                            if (dbArr.length > 0) {
                                var esc = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                                dbCell += ' <button type="button" class="ba-db-list-toggle" data-dbs="' + esc(JSON.stringify(dbArr)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button>';
                                dbCell += '<div class="ba-db-list-popover"></div>';
                            }
                            payloadRows += '<tr><th>Danh sách database</th><td>' + dbCell + '</td></tr>';
                        }
                    } catch (e) {}
                }
                if ((job.type || '') === 'HRHelperDeleteEmployee' && job.payload) {
                    try {
                        var pl = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                        var empList = Array.isArray(pl) ? pl : (pl && pl.employees) ? pl.employees : [];
                        if (empList.length > 0) {
                            var esc = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                            var empCell = empList.length + ' nhân viên';
                            empCell += ' <button type="button" class="ba-emp-list-toggle" data-emps="' + esc(JSON.stringify(empList)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button>';
                            empCell += '<div class="ba-db-list-popover ba-emp-list-popover"></div>';
                            payloadRows += '<tr><th>Danh sách nhân viên đã xóa</th><td>' + empCell + '</td></tr>';
                        }
                    } catch (e) {}
                }
                var resetRow = ((job.type || '') === 'HRHelperMultiDbReset') ? ('<tr><th>Loại reset</th><td>' + (resetBadge || '—') + '</td></tr>') : '';
                var html = '<table><tbody><tr><th>Loại</th><td>' + typeLabel + '</td></tr><tr><th>Server</th><td>' + (job.serverName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Database</th><td>' + (job.databaseName || '—').replace(/</g, '&lt;') + '</td></tr>' + resetRow + '<tr><th>Thực hiện bởi</th><td>' + (job.startedByUserName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Trạng thái</th><td>' + (job.status === 'Running' ? 'Đang chạy' : (job.status === 'Completed' ? 'Thành công' : (job.status === 'Failed' ? 'Lỗi' : job.status))) + '</td></tr><tr><th>Bắt đầu</th><td>' + formatNotifTime(job.startTime) + '</td></tr><tr><th>Kết thúc</th><td>' + formatNotifTime(job.completedAt) + '</td></tr>' + payloadRows + '</tbody></table>';
                if (job.message) html += '<div class="ba-notif-full-msg">' + (job.message || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</div>';
                html += '<div id="baResetInfoPopup" class="ba-reset-info-popup" style="display:none;"></div>';
                $('#notificationDetailBody').html(html);
                $('#notificationDetailBody').off('click.baDbList').on('click.baDbList', '.ba-db-list-toggle', function() {
                    var $btn = $(this), $pop = $btn.siblings('.ba-db-list-popover').first();
                    var raw = $btn.attr('data-dbs');
                    if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
                    try {
                        var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                        var grid = '<div class="ba-db-list-grid">' + (arr.map(function(name) { return '<span>' + (name || '').replace(/</g, '&lt;') + '</span>'; }).join('')) + '</div>';
                        $pop.html(grid).addClass('show');
                    } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
                });
                $('#notificationDetailBody').off('click.baEmpList').on('click.baEmpList', '.ba-emp-list-toggle', function() {
                    var $btn = $(this), $pop = $btn.siblings('.ba-emp-list-popover').first();
                    var raw = $btn.attr('data-emps');
                    if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
                    try {
                        var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                        var esc = function(s){ return (s||'').replace(/</g, '&lt;').replace(/&/g, '&amp;'); };
                        var grid = '<div class="ba-db-list-grid">' + (arr.map(function(o) { var lid = o.localId != null ? o.localId : o.LocalId || ''; var name = o.name != null ? o.name : o.Name || ''; return '<span>' + esc(lid) + (name ? ' – ' + esc(name) : '') + '</span>'; }).join('')) + '</div>';
                        $pop.html(grid).addClass('show');
                    } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
                });
                $('#notificationDetailBody').off('click.baResetInfo').on('click.baResetInfo', '.ba-notif-reset-info-btn', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    var $btn = $(this), serverId = $btn.data('server-id'), dbName = $btn.data('database-name');
                    var $popup = $('#baResetInfoPopup');
                    if ($popup.length && serverId != null && dbName) {
                        $popup.html('<span class="ba-reset-info-loading">Đang tải...</span>').show();
                        $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreResetInfo") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ serverId: serverId, databaseName: dbName }) })
                            .done(function(res) {
                                var d = res.d || res;
                                if (d && d.success && d.resetDetail) {
                                    var raw = d.resetDetail.replace(/^Reset:\s*/i, '').trim();
                                    var rows = [];
                                    raw.split(/\s*,\s*/).forEach(function(pair) {
                                        var idx = pair.indexOf('=');
                                        if (idx > 0) {
                                            var label = pair.substring(0, idx).trim();
                                            var value = pair.substring(idx + 1).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                            var lbl = label === 'Email' ? 'Email' : label === 'Phone' ? 'Phone' : label === 'Password' ? 'Password' : label;
                                            rows.push('<div class="ba-reset-info-row"><span class="ba-reset-info-label">' + lbl + '</span><span class="ba-reset-info-value">' + value + '</span></div>');
                                        }
                                    });
                                    $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">' + (rows.length ? rows.join('') : raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</div>');
                                } else
                                    $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không có thông tin reset.</div>');
                            })
                            .fail(function() { $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không tải được thông tin.</div>'); });
                    }
                });
                $(document).off('click.baResetInfoClose').on('click.baResetInfoClose', function(ev) { if ($(ev.target).closest('#baResetInfoPopup').length === 0 && !$(ev.target).hasClass('ba-notif-reset-info-btn')) $('#baResetInfoPopup').hide(); });
                $('#notificationDetailModal').addClass('show');
            }
            $(function() {
                $('#notificationDetailModal').on('click', function(e) { if (e.target === this) $(this).removeClass('show'); });
                $('#notificationDetailClose').on('click', function(e) { e.preventDefault(); $('#notificationDetailModal').removeClass('show'); });
            });
            var NOTIF_MSG_MAX_LEN = 120;
            function loadRestoreJobsPanel() {
                var $list = $('#restoreJobsList'), $badge = $('#restoreJobsBadge');
                if (!$list.length) return;
                $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); window.__notifJobsList = []; return; }
                        var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }).sort(function(a,b) { var ta = parseDateSafe(a.startTime); var tb = parseDateSafe(b.startTime); return (tb && ta) ? (tb - ta) : 0; });
                        var newBugs = d.newBugs || [];
                        var totalCount = jobs.length + newBugs.length;
                        if (totalCount === 0) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); window.__notifJobsList = []; return; }
                        $badge.text(totalCount).addClass('visible');
                        window.__notifJobsList = jobs;
                        var currentUserId = (d.currentUserId != null) ? parseInt(d.currentUserId, 10) : 0;
                        var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
                        var notifBugsCollapsed = sessionStorage.getItem('ba_notif_bugs_collapsed') === '1';
                        var notifJobsCollapsed = sessionStorage.getItem('ba_notif_jobs_collapsed') === '1';
                        var html = '';
                        if (newBugs.length > 0) {
                            html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifBugsCollapsed ? '▶' : '▼') + '</span> 🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs" style="' + (notifBugsCollapsed ? 'display:none;' : '') + '">';
                            newBugs.forEach(function(b) { var created = formatNotifTime(b.createdAt); var bugUrl = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug" data-bug-id="' + (b.id || '') + '"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + created + '</div><a class="ba-notif-detail-link" href="' + bugUrl + '" data-action="bug">Xem / Xử lý</a></div>'; });
                            html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">';
                        }
                        jobs.forEach(function(j, idx) {
                            var st = j.status || '', msg = (j.message || '').trim(), msgShort = msg.length > NOTIF_MSG_MAX_LEN ? msg.substring(0, NOTIF_MSG_MAX_LEN) + '…' : msg;
                            var jobType = j.type || 'Restore';
                            var typeLabel = (j.typeLabel || jobType || 'Restore').replace(/</g, '&lt;');
                            var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : (jobType === 'HRHelperUpdateUser') ? 'ba-notif-type-hr-user' : (jobType === 'HRHelperUpdateEmployee') ? 'ba-notif-type-hr-employee' : (jobType === 'HRHelperUpdateOther') ? 'ba-notif-type-hr-other' : '';
                            var dbName = (j.databaseName || j.DatabaseName || '').trim();
                            var hasReset = jobType === 'Restore' && (j.withAutoReset === true || (j.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
                            var resetTag = (jobType === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag" title="Restore có tích hợp Reset thông tin">Có Reset' : 'ba-notif-no-reset-tag" title="Restore không reset">Không Reset') + '</span> ') : '';
                            var startTimeStr = formatNotifTime(j.startTime);
                            var endTimeStr = formatNotifTime(j.completedAt);
                            var pct = (j.percentComplete != null) ? Number(j.percentComplete) : 0;
                            var phase = (msg || (jobType === 'Restore' ? 'Restore' : '')).toString().trim();
                            var startedByUid = (j.startedByUserId != null) ? parseInt(j.startedByUserId, 10) : 0;
                            var canCancel = (jobType === 'Restore' || jobType === 'Backup' || jobType === 'HRHelperMultiDbAnalyze' || jobType === 'HRHelperMultiDbReset') && currentUserId && startedByUid === currentUserId;
                            var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + (j.type || 'Restore') + '"><button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + typeLabel + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · Bắt đầu: ' + startTimeStr + (endTimeStr !== '—' ? ' · Kết thúc: ' + endTimeStr : '') + '</div>';
                            if (st === 'Running') {
                                var progressLabel = (jobType === 'Restore' && phase) ? (pct + '% - ' + phase) : (jobType === 'HRHelperMultiDbAnalyze' ? (pct + '% - Phân tích') : (pct + '%'));
                                row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt,var(--bg-darker));height:6px;border-radius:3px;overflow:hidden;"><div class="ba-notif-progress-bar" style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span class="ba-notif-progress-pct">' + progressLabel + '</span></div>';
                                row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                                if (canCancel) row += ' <button type="button" class="ba-notif-cancel-btn" data-job-id="' + (j.id || '') + '" title="Chỉ người thực hiện job mới có thể hủy">Hủy</button>';
                            } else if (st === 'Failed') { row += '<div class="ba-notif-msg ba-notif-msg-error">' + msgShort.replace(/</g, '&lt;') + '</div>'; row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>'; }
                            else if (st === 'Completed') { row += '<div style="margin-top:4px;color:var(--success);">Đã xong</div>'; if (msgShort) row += '<div class="ba-notif-msg" style="margin-top:2px;">' + msgShort.replace(/</g, '&lt;') + '</div>'; row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>'; }
                            row += '</div>';
                            html += row;
                        });
                        if (newBugs.length > 0) html += '</div></div>';
                        else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                        $list.html(html);
                        $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function(e) { var g = $(this).data('group'); var $body = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); var $arrow = $(this).find('.ba-notif-group-arrow'); if ($body.is(':visible')) { $body.slideUp(200); $arrow.text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $body.slideDown(200); $arrow.text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                        $list.off('click.baNotif').on('click.baNotif', '.ba-notif-detail-link[data-action="detail"]', function(e) { e.preventDefault(); var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); if (window.__notifJobsList && window.__notifJobsList[idx]) showNotificationDetail(window.__notifJobsList[idx]); });
                        $list.off('click.baNotifDismiss').on('click.baNotifDismiss', '.ba-notif-dismiss', function(e) { e.preventDefault(); e.stopPropagation(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($item.data('job-id'), 10); var jobType = $item.data('job-type') || 'Restore'; if (jobId) { addDismissedJobId(jobId, jobType); var $listEl = $('#restoreJobsList'), $badgeEl = $('#restoreJobsBadge'); var newCount = Math.max(0, $listEl.find('.ba-notif-item').length - 1); if (newCount > 0) { $badgeEl.text(newCount).addClass('visible'); } else { $badgeEl.removeClass('visible'); } $.ajax({ url: dismissJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobId }) }); $item.slideUp(200, function() { $(this).remove(); var $listEl = $('#restoreJobsList'); var left = $listEl.find('.ba-notif-item').length; var $badgeEl = $('#restoreJobsBadge'); if (left > 0) { $badgeEl.text(left).addClass('visible'); var bugsCount = $listEl.find('.ba-notif-group-body[data-group="bugs"] .ba-notif-item').length; var jobsCount = $listEl.find('.ba-notif-group-body[data-group="jobs"] .ba-notif-item').length; $listEl.find('.ba-notif-group-toggle[data-group="bugs"]').html(function(i, h) { return (h || '').replace(/(🐛 )?Bugs mới \(\d+\)/, '🐛 Bugs mới (' + bugsCount + ')'); }); $listEl.find('.ba-notif-group-toggle[data-group="jobs"]').html(function(i, h) { return (h || '').replace(/Thông báo job \(\d+\)/, 'Thông báo job (' + jobsCount + ')'); }); } else { $badgeEl.removeClass('visible'); $listEl.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } }); } });
                        $list.off('click.baNotifCancel').on('click.baNotifCancel', '.ba-notif-cancel-btn', function(e) { e.preventDefault(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($(this).data('job-id'), 10); if (!jobId) return; var idx = parseInt($item.data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || {}; var serverName = (job.serverName || job.ServerName || '').trim(); var dbName = (job.databaseName || job.DatabaseName || '').trim(); var jobType = (job.type || job.typeLabel || 'Restore').toString(); var jobDesc = (serverName || dbName) ? (serverName + ' → ' + dbName) : ('Job #' + jobId); var msg = 'Bạn có chắc muốn hủy job:\n' + jobDesc + '\nLoại: ' + jobType + '\n\nHành động không thể hoàn tác.'; var $btn = $(this); if (typeof baConfirm === 'function') baConfirm(msg, function() { $btn.prop('disabled', true); $.ajax({ url: cancelJobUrl, type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ jobId: jobId }), success: function(r) { var d = r.d || r; if (d && d.success) loadRestoreJobsPanel(); else $btn.prop('disabled', false); }, error: function() { $btn.prop('disabled', false); } }); }, null, 'Đồng ý', 'Thoát'); });
                    }
                });
            }
            $(function() {
                if ($('#restoreJobsBellWrap').length) {
                    $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }); var newBugs = d.newBugs || []; var total = jobs.length + newBugs.length; if (total > 0) $('#restoreJobsBadge').text(total).addClass('visible'); } } });
                    $('#restoreJobsBellBtn').on('click', function(e) { e.stopPropagation(); var $p = $('#restoreJobsPanel'); if ($p.is(':visible')) { $p.hide(); } else { loadRestoreJobsPanel(); $p.show(); } });
                    $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
                    $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
                    if (typeof BA_SignalR !== 'undefined') { BA_SignalR.onJobsUpdated(function() { if ($('#restoreJobsPanel').is(':visible')) loadRestoreJobsPanel(); else { $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }); var newBugs = d.newBugs || []; var total = jobs.length + newBugs.length; if (total > 0) $('#restoreJobsBadge').text(total).addClass('visible'); } } }); } }); }
                }
            });
        })();
    </script>
</body>
</html>
