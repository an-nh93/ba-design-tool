<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="FunctionQueue.aspx.cs" Inherits="BADesign.Pages.FunctionQueue" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Function Queue - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        .ba-content { padding: 0.5rem; }
        .ba-th-sort { cursor: pointer; user-select: none; }
        .ba-th-sort:hover { color: var(--primary-light, #0D9EFF); }
        .ba-sort-icon { font-size: 0.75rem; opacity: 0.8; }
        .ba-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
        .ba-card-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem; }
        .ba-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1rem; align-items: end; }
        .ba-form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .ba-form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); }
        .ba-input { background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; color: var(--text-primary); font-size: 0.875rem; width: 100%; }
        .ba-input:focus { outline: none; border-color: var(--primary); }
        .ba-btn { padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 0.5rem; }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-danger { background: var(--danger, #ef4444); color: white; }
        .ba-btn-danger:hover { opacity: 0.9; }
        .ba-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
        .ba-btn-sm { font-size: 0.8rem; padding: 0.35rem 0.6rem; }
        .ba-table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; overflow: auto; max-height: min(85vh, 900px); }
        .ba-table { width: 100%; border-collapse: collapse; }
        .ba-table thead { background: var(--bg-darker); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 2; }
        .ba-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap; }
        .ba-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.875rem; color: var(--text-primary); vertical-align: middle; }
        .ba-table tbody tr:hover { background: var(--bg-hover, rgba(255,255,255,0.03)); }
        .ba-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .ba-badge-running { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .ba-badge-completed { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .ba-badge-failed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .ba-badge-cancelled { background: rgba(113, 113, 122, 0.3); color: var(--text-muted); }
        .ba-detail-cell { max-width: 220px; word-break: break-all; font-size: 0.8125rem; }
        .ba-msg-cell { max-width: 280px; word-break: break-word; font-size: 0.8125rem; color: var(--text-muted); }
        .ba-progress-mini { width: 60px; height: 6px; background: var(--surface-alt); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 6px; }
        .ba-progress-mini div { height: 100%; background: var(--primary); }
        #queueBody tr.empty-row td { text-align: center; color: var(--text-muted); padding: 2rem; }
        .ba-msg-cell.clickable { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; }
        .ba-msg-cell.clickable:hover { color: var(--primary); }
        #queueDetailModal { display: none; position: fixed; inset: 0; z-index: 10002; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
        #queueDetailModal.show { display: flex; }
        #queueDetailModal .modal-inner { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 520px; width: 90%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
        #queueDetailModal .modal-title { padding: 12px 16px; border-bottom: 1px solid var(--border); font-weight: 600; }
        #queueDetailModal .modal-body { padding: 16px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; font-size: 0.875rem; }
        #queueDetailModal .modal-footer { padding: 10px 16px; border-top: 1px solid var(--border); text-align: right; }
        .ba-queue-pagination { display: flex; align-items: center; gap: 1rem; margin-top: 0.75rem; flex-wrap: wrap; }
        .ba-pagination-label { font-size: 0.875rem; color: var(--text-secondary); }
        .ba-pagination-select { width: auto; min-width: 70px; }
        .ba-pagination-info { font-size: 0.875rem; color: var(--text-muted); }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <div class="ba-card">
                    <h1 class="ba-card-title">Function Queue</h1>
                    <p class="ba-card-desc">Xem các job chạy nền (Restore, Backup, Update User/Employee/Other). Lịch sử 7 ngày. Chỉ người tạo job mới có thể hủy khi đang chạy.</p>
                    <div class="ba-form-grid">
                        <div class="ba-form-group">
                            <label class="ba-form-label">Từ ngày</label>
                            <input type="date" id="dateFrom" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Đến ngày</label>
                            <input type="date" id="dateTo" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Loại job</label>
                            <select id="jobTypeFilter" class="ba-input">
                                <option value="">-- Tất cả --</option>
                                <option value="Restore">Restore</option>
                                <option value="Backup">Backup</option>
                                <option value="HRHelperUpdateUser">Update User</option>
                                <option value="HRHelperUpdateEmployee">Update Employee</option>
                                <option value="HRHelperUpdateOther">Update Company/Other</option>
                            </select>
                        </div>
                        <div class="ba-form-group" style="grid-column: 1 / -1;">
                            <label class="ba-form-label">Tìm kiếm</label>
                            <input type="text" id="queueSearch" class="ba-input" placeholder="Tìm theo loại, chi tiết, trạng thái, người thực hiện, lỗi/chi tiết..." style="max-width: 400px;" />
                        </div>
                        <div class="ba-form-group">
                            <button type="button" id="btnLoad" class="ba-btn ba-btn-primary">Tải lại</button>
                        </div>
                    </div>
                    <div class="ba-table-wrap">
                        <table class="ba-table">
                            <thead>
                                <tr>
                                    <th class="ba-th-sort" data-sort="typeLabel">Loại <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-sort="_detail">Chi tiết <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-sort="percentComplete">Tiến độ <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-sort="status">Trạng thái <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-sort="startedByUserName">Thực hiện bởi <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-sort="startTime">Bắt đầu <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-sort="completedAt">Kết thúc <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-sort="message">Lỗi / Chi tiết <span class="ba-sort-icon"></span></th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody id="queueBody"></tbody>
                        </table>
                    </div>
                    <div class="ba-queue-pagination">
                        <label class="ba-pagination-label">Số dòng/trang:</label>
                        <select id="queuePageSize" class="ba-input ba-pagination-select">
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100" selected>100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                        </select>
                        <span id="queuePaginationInfo" class="ba-pagination-info"></span>
                        <button type="button" id="queuePagePrev" class="ba-btn ba-btn-secondary ba-btn-sm">Trang trước</button>
                        <button type="button" id="queuePageNext" class="ba-btn ba-btn-secondary ba-btn-sm">Trang sau</button>
                    </div>
                </div>
            </div>
        </main>
        <div id="queueDetailModal">
            <div class="modal-inner">
                <div class="modal-title">Chi tiết / Lỗi</div>
                <div id="queueDetailBody" class="modal-body"></div>
                <div class="modal-footer"><button type="button" class="ba-btn ba-btn-secondary" id="queueDetailClose">Đóng</button></div>
            </div>
        </div>
    </form>
    <script>
        (function () {
            var apiUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetFunctionQueueJobs") %>';
            var cancelUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/CancelJob") %>';

            function fmtDate(s) {
                if (!s) return '—';
                try {
                    var d = new Date(s);
                    return isNaN(d.getTime()) ? s : d.toLocaleString();
                } catch (e) { return s; }
            }

            function statusBadge(st) {
                var c = 'ba-badge';
                if (st === 'Running') return '<span class="' + c + ' ba-badge-running">Đang chạy</span>';
                if (st === 'Completed') return '<span class="' + c + ' ba-badge-completed">Xong</span>';
                if (st === 'Failed') return '<span class="' + c + ' ba-badge-failed">Lỗi</span>';
                if (st === 'Cancelled') return '<span class="' + c + ' ba-badge-cancelled">Đã hủy</span>';
                return '<span class="' + c + '">' + (st || '') + '</span>';
            }

            function detailText(j) {
                var t = j.type || '';
                if (t === 'Backup' || t === 'Restore') {
                    var s = (j.serverName || '') + (j.databaseName ? ' → ' + j.databaseName : '');
                    if (j.backupFileName) s += ' | ' + j.backupFileName;
                    return s || '—';
                }
                return (j.serverName || '') + (j.databaseName ? ' → ' + j.databaseName : '') || '—';
            }

            var sortCol = null, sortDir = 1;
            function matchSearch(j) {
                var q = (window.__queueSearch || '').trim().toLowerCase();
                if (!q) return true;
                var typeLabel = (j.typeLabel || j.type || '');
                var detail = (j._detail != null ? j._detail : detailText(j));
                var statusLabels = { 'Running': 'Đang chạy', 'Completed': 'Xong', 'Failed': 'Lỗi', 'Cancelled': 'Đã hủy' };
                var statusText = statusLabels[j.status] || (j.status || '');
                var by = (j.startedByUserName || '');
                var msg = (j.message || '');
                var text = [typeLabel, detail, statusText, by, msg].join(' ').toLowerCase();
                return text.indexOf(q) !== -1;
            }
            function getVisibleJobs() {
                var jobs = window.__queueJobs;
                if (!jobs) return [];
                return jobs.filter(matchSearch);
            }
            var queuePage = 1;
            function getQueuePageSize() { return Math.max(1, parseInt($('#queuePageSize').val(), 10) || 100); }
            function getPagedJobs() {
                var visible = getVisibleJobs();
                var size = getQueuePageSize();
                var start = (queuePage - 1) * size;
                return visible.slice(start, start + size);
            }
            function updatePaginationBar(total) {
                var size = getQueuePageSize();
                var totalPages = Math.max(1, Math.ceil(total / size));
                if (queuePage > totalPages) queuePage = totalPages;
                if (queuePage < 1) queuePage = 1;
                var start = total === 0 ? 0 : (queuePage - 1) * size + 1;
                var end = Math.min(queuePage * size, total);
                $('#queuePaginationInfo').text(total === 0 ? 'Không có bản ghi' : 'Hiển thị ' + start + '–' + end + ' / ' + total);
                $('#queuePagePrev').prop('disabled', queuePage <= 1);
                $('#queuePageNext').prop('disabled', queuePage >= totalPages || total === 0);
            }
            function refreshQueueView() {
                var visible = getVisibleJobs();
                var size = getQueuePageSize();
                var totalPages = Math.max(1, Math.ceil(visible.length / size));
                if (queuePage > totalPages) queuePage = totalPages;
                if (queuePage < 1) queuePage = 1;
                var paged = getPagedJobs();
                renderQueue(paged, window.__queueCurrentUserId);
                updatePaginationBar(visible.length);
                document.querySelectorAll('.ba-th-sort').forEach(function (th) {
                    var icon = th.querySelector('.ba-sort-icon');
                    if (!icon) return;
                    icon.textContent = '';
                    icon.classList.remove('asc', 'desc');
                    if (th.getAttribute('data-sort') === sortCol) {
                        icon.classList.add(sortDir === 1 ? 'asc' : 'desc');
                        icon.textContent = sortDir === 1 ? ' ▲' : ' ▼';
                    }
                });
            }
            function renderQueue(jobs, currentUserId) {
                var tbody = document.getElementById('queueBody');
                if (!jobs || jobs.length === 0) {
                    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Không có job nào.</td></tr>';
                    return;
                }
                currentUserId = (currentUserId != null) ? parseInt(currentUserId, 10) : 0;
                var html = '';
                jobs.forEach(function (j) {
                    var startedBy = (j.startedByUserId != null) ? parseInt(j.startedByUserId, 10) : 0;
                    var canCancel = (j.status === 'Running' && currentUserId && startedBy === currentUserId);
                    var pct = (j.percentComplete != null) ? parseInt(j.percentComplete, 10) : (j.status === 'Completed' ? 100 : 0);
                    var phase = (j.message || '').trim();
                    var progressLabel = (j.status === 'Running' && phase && (phase === 'Restore' || phase === 'Reset Information')) ? (pct + '% - ' + phase) : (j.status === 'Running' ? (pct + '%') : (j.status === 'Completed' ? '100%' : '—'));
                    var progressHtml = '<span class="ba-progress-mini"><div style="width:' + pct + '%"></div></span> ' + (progressLabel || '—').replace(/</g, '&lt;');
                    var msg = phase;
                    var msgEsc = msg.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    var msgCell = msg ? ('<span class="ba-msg-cell clickable" data-msg="' + msgEsc + '" title="Bấm xem đầy đủ">' + (msg.length > 80 ? msg.substring(0, 80) + '…' : msg).replace(/</g, '&lt;') + '</span>') : '—';
                    html += '<tr data-job-id="' + (j.id || '') + '">';
                    html += '<td>' + (j.typeLabel || j.type || '').replace(/</g, '&lt;') + '</td>';
                    html += '<td class="ba-detail-cell">' + (j._detail != null ? j._detail : detailText(j)).replace(/</g, '&lt;') + '</td>';
                    html += '<td>' + progressHtml + '</td>';
                    html += '<td>' + statusBadge(j.status) + '</td>';
                    html += '<td>' + (j.startedByUserName || '—').replace(/</g, '&lt;') + '</td>';
                    html += '<td>' + fmtDate(j.startTime) + '</td>';
                    html += '<td>' + fmtDate(j.completedAt) + '</td>';
                    html += '<td>' + msgCell + '</td>';
                    html += '<td>' + (canCancel ? '<button type="button" class="ba-btn ba-btn-danger ba-btn-sm queue-cancel-btn" data-id="' + j.id + '">Hủy</button>' : '—') + '</td>';
                    html += '</tr>';
                });
                tbody.innerHTML = html;
            }

            function compareVal(a, b, key) {
                var va = a[key], vb = b[key];
                if (key === 'percentComplete') {
                    var na = (va != null) ? parseInt(va, 10) : 0, nb = (vb != null) ? parseInt(vb, 10) : 0;
                    return na - nb;
                }
                if (key === 'startTime' || key === 'completedAt') {
                    var ta = va ? new Date(va).getTime() : 0, tb = vb ? new Date(vb).getTime() : 0;
                    return ta - tb;
                }
                var sa = (va == null ? '' : String(va)).toLowerCase(), sb = (vb == null ? '' : String(vb)).toLowerCase();
                return sa.localeCompare(sb);
            }

            function applySort() {
                var jobs = window.__queueJobs;
                if (!jobs || !sortCol) return;
                jobs = jobs.slice().sort(function (a, b) {
                    return sortDir * (compareVal(a, b, sortCol) || 0);
                });
                window.__queueJobs = jobs;
                refreshQueueView();
            }

            function load() {
                var dateFrom = document.getElementById('dateFrom').value || null;
                var dateTo = document.getElementById('dateTo').value || null;
                var jobType = document.getElementById('jobTypeFilter').value || null;
                $.ajax({
                    url: apiUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ dateFrom: dateFrom, dateTo: dateTo, jobTypeFilter: jobType }),
                    success: function (r) {
                        var d = r.d || r;
                        var tbody = document.getElementById('queueBody');
                        if (!d || !d.success) {
                            tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Lỗi: ' + (d && d.message ? d.message : 'Không tải được') + '</td></tr>';
                            return;
                        }
                        var jobs = d.jobs || [];
                        window.__queueCurrentUserId = d.currentUserId;
                        jobs.forEach(function (j) { j._detail = detailText(j); });
                        window.__queueJobs = jobs;
                        if (sortCol) {
                            jobs = jobs.slice().sort(function (a, b) { return sortDir * (compareVal(a, b, sortCol) || 0); });
                            window.__queueJobs = jobs;
                        }
                        queuePage = 1;
                        refreshQueueView();
                        window.__queueHasRunning = jobs.some(function(j) { return j.status === 'Running'; });
                    }
                });
            }

            function showDetailModal(msg) {
                var text = (msg || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                document.getElementById('queueDetailBody').innerHTML = text || '—';
                document.getElementById('queueDetailModal').classList.add('show');
            }

            $(function () {
                var now = new Date();
                var pad = function (n) { return n < 10 ? '0' + n : n; };
                var d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                document.getElementById('dateFrom').value = d7.getFullYear() + '-' + pad(d7.getMonth() + 1) + '-' + pad(d7.getDate());
                document.getElementById('dateTo').value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
                load();
                $('#btnLoad').on('click', load);
                $('#queueSearch').on('input', function() {
                    window.__queueSearch = $(this).val();
                    queuePage = 1;
                    refreshQueueView();
                });
                $('#queuePageSize').on('change', function() {
                    queuePage = 1;
                    refreshQueueView();
                });
                $('#queuePagePrev').on('click', function() {
                    if (queuePage > 1) { queuePage--; refreshQueueView(); }
                });
                $('#queuePageNext').on('click', function() {
                    var visible = getVisibleJobs();
                    var size = getQueuePageSize();
                    if (queuePage < Math.ceil(visible.length / size)) { queuePage++; refreshQueueView(); }
                });
                $(document).on('click', '.ba-th-sort', function() {
                    var col = $(this).attr('data-sort');
                    if (!col) return;
                    if (sortCol === col) sortDir = -sortDir; else { sortCol = col; sortDir = 1; }
                    applySort();
                });
                $(document).on('click', '.ba-msg-cell.clickable', function() {
                    var msg = $(this).data('msg');
                    if (msg) showDetailModal(msg);
                });
                $('#queueDetailModal').on('click', function(e) {
                    if (e.target.id === 'queueDetailModal') document.getElementById('queueDetailModal').classList.remove('show');
                });
                $('#queueDetailClose').on('click', function() { document.getElementById('queueDetailModal').classList.remove('show'); });
                var queueRefreshTimer = null;
                function startQueueRefresh() {
                    if (queueRefreshTimer) return;
                    queueRefreshTimer = setInterval(function() {
                        if (window.__queueHasRunning) load();
                    }, 3000);
                }
                function stopQueueRefresh() {
                    if (queueRefreshTimer) { clearInterval(queueRefreshTimer); queueRefreshTimer = null; }
                }
                $(document).on('visibilitychange', function() {
                    if (document.hidden) stopQueueRefresh(); else if (window.__queueHasRunning) startQueueRefresh();
                });
                setTimeout(function() { if (window.__queueHasRunning) startQueueRefresh(); }, 500);
                $(document).on('click', '.queue-cancel-btn', function () {
                    var id = $(this).data('id');
                    if (!id) return;
                    var $btn = $(this).prop('disabled', true);
                    $.ajax({
                        url: cancelUrl,
                        type: 'POST',
                        contentType: 'application/json',
                        dataType: 'json',
                        data: JSON.stringify({ jobId: id }),
                        success: function (r) {
                            var d = r.d || r;
                            if (d && d.success) { load(); if (window.__queueHasRunning) startQueueRefresh(); }
                            else alert(d && d.message ? d.message : 'Không thể hủy.');
                        },
                        complete: function () { $btn.prop('disabled', false); }
                    });
                });
            });
        })();
    </script>
</body>
</html>
