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
            overflow: auto;
            max-height: min(65vh, 600px);
        }
        .ba-table { width: 100%; border-collapse: collapse; }
        .ba-table thead { background: var(--bg-darker); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 2; }
        .ba-table th {
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
        }
        .ba-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.875rem;
            color: var(--text-primary);
            vertical-align: top;
        }
        .ba-table tbody tr:hover { background: var(--bg-hover); }
        .ba-table .col-time { width: 160px; }
        .ba-table .col-user { width: 120px; }
        .ba-table .col-action { width: 180px; }
        .ba-table .col-detail { max-width: 320px; word-break: break-word; }
        .ba-table .col-ip { width: 120px; }
        .ba-table .col-device { max-width: 280px; font-size: 0.8125rem; color: var(--text-muted); }
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
        .ba-audit-modal-content { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 560px; width: 100%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
        .ba-audit-modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .ba-audit-modal-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-audit-modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.25rem; cursor: pointer; padding: 0.25rem; line-height: 1; }
        .ba-audit-modal-close:hover { color: var(--text-primary); }
        .ba-audit-modal-body { padding: 1.25rem; overflow-y: auto; flex: 1; font-size: 0.875rem; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }
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
                <button type="button" class="ba-audit-modal-close" id="auditDetailModalClose" aria-label="Đóng">&times;</button>
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
                                    var full = r.detail || '';
                                    if (r.userAgent) full += '\n\nUser-Agent: ' + (r.userAgent || '');
                                    document.getElementById('auditDetailModalBody').textContent = full;
                                    document.getElementById('auditDetailModal').classList.add('show');
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
            function parseDateSafe(v) {
                if (v == null || v === '') return null;
                if (typeof v === 'number') return new Date(v);
                var s = (typeof v === 'string') ? v : String(v);
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
                var html = '<table><tbody><tr><th>Loại</th><td>' + typeLabel + '</td></tr><tr><th>Server</th><td>' + (job.serverName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Database</th><td>' + (job.databaseName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Thực hiện bởi</th><td>' + (job.startedByUserName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Trạng thái</th><td>' + (job.status === 'Running' ? 'Đang chạy' : (job.status === 'Completed' ? 'Thành công' : (job.status === 'Failed' ? 'Lỗi' : job.status))) + '</td></tr><tr><th>Bắt đầu</th><td>' + formatNotifTime(job.startTime) + '</td></tr><tr><th>Kết thúc</th><td>' + formatNotifTime(job.completedAt) + '</td></tr></tbody></table>';
                if (job.message) html += '<div class="ba-notif-full-msg">' + (job.message || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</div>';
                $('#notificationDetailBody').html(html);
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
                        if (!jobs.length) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); window.__notifJobsList = []; return; }
                        $badge.text(jobs.length).addClass('visible');
                        window.__notifJobsList = jobs;
                        var html = '';
                        jobs.forEach(function(j, idx) {
                            var st = j.status || '', msg = (j.message || '').trim(), msgShort = msg.length > NOTIF_MSG_MAX_LEN ? msg.substring(0, NOTIF_MSG_MAX_LEN) + '…' : msg;
                            var jobType = j.type || 'Restore';
                            var typeLabel = (j.typeLabel || jobType || 'Restore').replace(/</g, '&lt;');
                            var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : (jobType === 'HRHelperUpdateUser') ? 'ba-notif-type-hr-user' : (jobType === 'HRHelperUpdateEmployee') ? 'ba-notif-type-hr-employee' : (jobType === 'HRHelperUpdateOther') ? 'ba-notif-type-hr-other' : '';
                            var dbName = (j.databaseName || j.DatabaseName || '').trim();
                            var hasReset = (jobType === 'Restore' && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0);
                            var resetTag = (jobType === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag" title="Restore có tích hợp Reset thông tin">Có Reset' : 'ba-notif-no-reset-tag" title="Restore không reset">Không Reset') + '</span> ') : '';
                            var startTimeStr = formatNotifTime(j.startTime);
                            var endTimeStr = formatNotifTime(j.completedAt);
                            var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + (j.type || 'Restore') + '"><button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + typeLabel + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · Bắt đầu: ' + startTimeStr + (endTimeStr !== '—' ? ' · Kết thúc: ' + endTimeStr : '') + '</div>';
                            if (st === 'Running') { row += '<div style="margin-top:4px;color:var(--primary);">Đang chạy</div>'; }
                            else if (st === 'Failed') { row += '<div class="ba-notif-msg">' + msgShort.replace(/</g, '&lt;') + '</div>'; }
                            else if (st === 'Completed') { row += '<div style="margin-top:4px;color:var(--success);">Đã xong</div>'; if (msgShort) row += '<div class="ba-notif-msg" style="margin-top:2px;">' + msgShort.replace(/</g, '&lt;') + '</div>'; }
                            row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a></div>';
                            html += row;
                        });
                        $list.html(html);
                        $list.off('click.baNotif').on('click.baNotif', '.ba-notif-detail-link[data-action="detail"]', function(e) { e.preventDefault(); var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); if (window.__notifJobsList && window.__notifJobsList[idx]) showNotificationDetail(window.__notifJobsList[idx]); });
                        $list.off('click.baNotifDismiss').on('click.baNotifDismiss', '.ba-notif-dismiss', function(e) { e.preventDefault(); e.stopPropagation(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($item.data('job-id'), 10); var jobType = $item.data('job-type') || 'Restore'; if (jobId) { addDismissedJobId(jobId, jobType); $.ajax({ url: dismissJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobId }) }); $item.slideUp(200, function() { $(this).remove(); var left = $('#restoreJobsList .ba-notif-item').length; if (left) $badge.text(left).addClass('visible'); else { $badge.removeClass('visible'); $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } }); } });
                    }
                });
            }
            $(function() {
                if ($('#restoreJobsBellWrap').length) {
                    $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && d.jobs && d.jobs.length) { var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }); if (jobs.length) $('#restoreJobsBadge').text(jobs.length).addClass('visible'); } } });
                    $('#restoreJobsBellBtn').on('click', function(e) { e.stopPropagation(); var $p = $('#restoreJobsPanel'); if ($p.is(':visible')) { $p.hide(); } else { loadRestoreJobsPanel(); $p.show(); } });
                    $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
                    $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
                    if (typeof BA_SignalR !== 'undefined') { BA_SignalR.onJobsUpdated(function() { if ($('#restoreJobsPanel').is(':visible')) loadRestoreJobsPanel(); else { $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && d.jobs && d.jobs.length) { var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }); if (jobs.length) $('#restoreJobsBadge').text(jobs.length).addClass('visible'); } } }); } }); }
                }
            });
        })();
    </script>
</body>
</html>
