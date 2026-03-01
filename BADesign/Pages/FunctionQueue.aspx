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
    <script src="../Scripts/jquery.signalR.min.js"></script>
    <script src="../Scripts/ba-signalr.js"></script>
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
        .ba-table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; overflow: auto; max-height: min(85vh, 900px); }
        .ba-table { width: 100%; border-collapse: collapse; }
        .ba-table thead { background: var(--bg-darker); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 2; }
        .ba-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap; }
        .ba-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.875rem; color: var(--text-primary); vertical-align: middle; }
        .ba-table tbody tr:hover { background: var(--bg-hover, rgba(255,255,255,0.03)); }
        .ba-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; line-height: 1.2; }
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
        #queueDetailModal .modal-inner { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 720px; width: 92%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
        #queueDetailModal .modal-title { padding: 12px 16px; border-bottom: 1px solid var(--border); font-weight: 600; }
        #queueDetailModal .modal-body { padding: 16px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; font-size: 0.875rem; }
        .ba-restore-detail table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .ba-restore-detail th { text-align: left; padding: 4px 12px 4px 0; font-weight: 600; color: var(--text-secondary); width: 140px; min-width: 140px; white-space: nowrap; }
        .ba-restore-detail td { padding: 4px 0; }
        .ba-restore-reset-info { border-top: 1px solid var(--border); padding-top: 12px; }
        .ba-reset-info-title { font-weight: 600; margin-bottom: 8px; font-size: 0.8125rem; color: var(--text-secondary); }
        .ba-reset-info-content { display: table; width: 100%; }
        .ba-reset-info-row { display: table-row; font-size: 0.875rem; }
        .ba-reset-info-label { display: table-cell; width: 120px; min-width: 120px; padding: 4px 16px 4px 0; color: var(--text-muted); font-weight: 500; white-space: nowrap; vertical-align: top; }
        .ba-reset-info-value { display: table-cell; padding: 4px 0; word-break: break-word; vertical-align: top; }
        #queueDetailModal .modal-footer { padding: 10px 16px; border-top: 1px solid var(--border); text-align: right; }
        .ba-pagination {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.75rem;
            flex-wrap: wrap;
        }
        .ba-pagination span { color: var(--text-muted); font-size: 0.875rem; }
        .ba-pagination button {
            padding: 0.35rem 0.6rem;
            font-size: 0.8125rem;
            border-radius: 4px;
            border: 1px solid var(--border);
            background: var(--bg-darker);
            color: var(--text-primary);
            cursor: pointer;
        }
        .ba-pagination button:hover:not(:disabled) { background: var(--bg-hover); }
        .ba-pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .ba-pagination .ba-pager-size { min-width: 80px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 0.25rem 0.5rem; }
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
                                <option value="HRHelperMultiDbAnalyze">Phân tích Multi-DB</option>
                                <option value="HRHelperMultiDbReset">Reset Multi-DB</option>
                            </select>
                        </div>
                        <div class="ba-form-group" style="grid-column: 1 / -1; display: flex; flex-direction: row; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <button type="button" id="btnLoad" class="ba-btn ba-btn-primary">Tải lại</button>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: auto;">
                                <label class="ba-form-label" for="queueSearch" style="margin: 0; white-space: nowrap;">Tìm kiếm</label>
                                <input type="text" id="queueSearch" class="ba-input" placeholder="Tìm theo loại, chi tiết, trạng thái, người thực hiện, lỗi/chi tiết..." style="width: 360px; flex: none;" />
                            </div>
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
                    <div class="ba-pagination" id="queuePagination">
                        <span id="queuePaginationInfo">Trang 1 / 1 (0 job)</span>
                        <select id="queuePageSize" class="ba-pager-size">
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100" selected>100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                        </select>
                        <button type="button" id="queuePagePrev">Trước</button>
                        <button type="button" id="queuePageNext">Sau</button>
                    </div>
                </div>
            </div>
        </main>
        <div id="queueDetailModal">
            <div class="modal-inner">
                <div class="ba-queue-modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);">
                    <span class="modal-title">Chi tiết / Lỗi</span>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" id="queueDetailClose" aria-label="Đóng">×</button>
                </div>
                <div id="queueDetailBody" class="modal-body"></div>
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
                    if (t === 'Restore') {
                        var dbName = (j.databaseName || '').trim();
                        var hasReset = j.withAutoReset === true || (j.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0);
                        s += ' · ' + (hasReset ? 'Có Reset' : 'Không Reset');
                    }
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
                $('#queuePaginationInfo').text(total === 0 ? 'Trang 1 / 1 (0 job)' : 'Trang ' + queuePage + ' / ' + totalPages + ' (' + total + ' job)');
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
                    var actionHtml = '';
                    if ((j.type || '') === 'Restore') actionHtml += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm queue-view-restore-btn" data-server-id="' + (j.serverId || 0) + '" data-database-name="' + (j.databaseName || '').replace(/"/g, '&quot;') + '" data-with-reset="' + (j.withAutoReset === true ? '1' : '0') + '" data-with-replace="' + (j.withReplace === true ? '1' : '0') + '" data-with-shrink-log="' + (j.withShrinkLog === true ? '1' : '0') + '" data-server-name="' + (j.serverName || '').replace(/"/g, '&quot;') + '" data-backup-file="' + (j.backupFileName || '').replace(/"/g, '&quot;') + '">Xem chi tiết</button>';
                    if ((j.type || '') === 'HRHelperMultiDbReset') {
                        var payloadEsc = (j.payload || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        actionHtml += (actionHtml ? ' ' : '') + '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm queue-view-reset-multidb-btn" data-server-name="' + (j.serverName || '').replace(/"/g, '&quot;') + '" data-payload="' + payloadEsc + '">Xem chi tiết</button>';
                    }
                    if (canCancel) actionHtml += (actionHtml ? ' ' : '') + '<button type="button" class="ba-btn ba-btn-danger ba-btn-sm queue-cancel-btn" data-id="' + j.id + '">Hủy</button>';
                    html += '<td>' + (actionHtml || '—') + '</td>';
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

            function showDetailModal(msg, title) {
                var text = (msg || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                document.getElementById('queueDetailBody').innerHTML = text || '—';
                var $title = $('#queueDetailModal .modal-title');
                if ($title.length) $title.text(title || 'Chi tiết / Lỗi');
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
                    if (msg) showDetailModal(msg, 'Chi tiết / Lỗi');
                });
                $(document).on('click', '.queue-view-restore-btn', function() {
                    var $btn = $(this), serverId = $btn.data('server-id'), dbName = ($btn.data('database-name') || '').trim();
                    var serverName = $btn.data('server-name') || '', backupFile = $btn.data('backup-file') || '';
                    var withReset = $btn.data('with-reset') === 1 || $btn.data('with-reset') === '1';
                    var withReplace = $btn.data('with-replace') === 1 || $btn.data('with-replace') === '1';
                    var withShrinkLog = $btn.data('with-shrink-log') === 1 || $btn.data('with-shrink-log') === '1';
                    var html = '<div class="ba-restore-detail"><table><tbody>';
                    html += '<tr><th>Server</th><td>' + (serverName || '—').replace(/</g, '&lt;') + '</td></tr>';
                    html += '<tr><th>Database</th><td>' + (dbName || '—').replace(/</g, '&lt;') + '</td></tr>';
                    html += '<tr><th>File backup</th><td>' + (backupFile || '—').replace(/</g, '&lt;') + '</td></tr>';
                    html += '<tr><th>WITH REPLACE</th><td>' + (withReplace ? 'Có' : 'Không') + '</td></tr>';
                    html += '<tr><th>Shrink log</th><td>' + (withShrinkLog ? 'Có' : 'Không') + '</td></tr>';
                    html += '<tr><th>Reset thông tin</th><td>' + (withReset ? 'Có' : 'Không') + '</td></tr></tbody></table>';
                    if (withReset && serverId && dbName) {
                        html += '<div id="baRestoreResetInfo" class="ba-restore-reset-info" style="margin-top:12px;"><span class="ba-reset-info-loading">Đang tải thông tin reset...</span></div></div>';
                        $('#queueDetailModal .modal-title').text('Chi tiết Restore');
                        document.getElementById('queueDetailBody').innerHTML = html;
                        document.getElementById('queueDetailModal').classList.add('show');
                        $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreResetInfo") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ serverId: serverId, databaseName: dbName }) })
                            .done(function(res) {
                                var d = res.d || res;
                                var $wrap = $('#baRestoreResetInfo');
                                if (d && d.success && d.resetDetail) {
                                    var raw = (d.resetDetail || '').replace(/^Reset:\s*/i, '').trim();
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
                                    $wrap.html('<div class="ba-reset-info-title">Thông tin reset (Email, Phone, Password đã nhập)</div><div class="ba-reset-info-content">' + (rows.length ? rows.join('') : raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</div>');
                                } else {
                                    $wrap.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không có thông tin reset (hoặc chưa lưu từ BaDatabaseRestoreLog).</div>');
                                }
                            })
                            .fail(function() {
                                $('#baRestoreResetInfo').html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không tải được.</div>');
                            });
                    } else {
                        html += '</div>';
                        $('#queueDetailModal .modal-title').text('Chi tiết Restore');
                        document.getElementById('queueDetailBody').innerHTML = html;
                        document.getElementById('queueDetailModal').classList.add('show');
                    }
                });
                $(document).on('click', '.queue-view-reset-multidb-btn', function() {
                    var $btn = $(this), serverName = ($btn.data('server-name') || '').replace(/&quot;/g, '"'), rawPayload = $btn.attr('data-payload');
                    if (!rawPayload) { showDetailModal('Không có dữ liệu payload.', 'Chi tiết Reset Multi-DB'); return; }
                    try {
                        var pl = JSON.parse((rawPayload || '').replace(/&quot;/g, '"'));
                    } catch (e) { showDetailModal('Không parse được payload.', 'Chi tiết Reset Multi-DB'); return; }
                    var html = '<div class="ba-restore-detail"><table class="ba-restore-detail"><tbody>';
                    html += '<tr><th>Server</th><td>' + (serverName || '—').replace(/</g, '&lt;') + '</td></tr>';
                    html += '<tr><th>Email reset</th><td>' + (pl.email || '—').replace(/</g, '&lt;') + '</td></tr>';
                    html += '<tr><th>Phone reset</th><td>' + (pl.phone || '—').replace(/</g, '&lt;') + '</td></tr>';
                    var dbArr = pl.databaseNames || [];
                    var nDb = dbArr.length || pl.databaseCount || 0;
                    var dbCell = nDb + ' Database';
                    if (dbArr.length > 0) {
                        var esc = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                        dbCell += ' <button type="button" class="ba-db-list-toggle" data-dbs="' + esc(JSON.stringify(dbArr)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button>';
                        dbCell += '<div class="ba-db-list-popover"></div>';
                    }
                    html += '<tr><th>Danh sách database</th><td>' + dbCell + '</td></tr></tbody></table></div>';
                    $('#queueDetailModal .modal-title').text('Chi tiết Reset Multi-DB');
                    document.getElementById('queueDetailBody').innerHTML = html;
                    document.getElementById('queueDetailModal').classList.add('show');
                    $('#queueDetailBody').off('click.baDbList').on('click.baDbList', '.ba-db-list-toggle', function() {
                        var $t = $(this), $pop = $t.siblings('.ba-db-list-popover').first();
                        var raw = $t.attr('data-dbs');
                        if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
                        try {
                            var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                            var grid = '<div class="ba-db-list-grid">' + (arr.map(function(name) { return '<span>' + (name || '').replace(/</g, '&lt;') + '</span>'; }).join('')) + '</div>';
                            $pop.html(grid).addClass('show');
                        } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
                    });
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
                if (typeof BA_SignalR !== 'undefined') {
                    BA_SignalR.start('<%= ResolveUrl("~/signalr") %>', '<%= ResolveUrl("~/signalr/hubs") %>');
                }

                // Chuông thông báo (giống các trang khác): bấm chuông mở panel job Backup/Restore/HR Helper
                (function() {
                    var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
                    var dismissJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissJob") %>';
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
                        var html = '<table><tbody><tr><th>Loại</th><td>' + typeLabel + '</td></tr><tr><th>Server</th><td>' + (job.serverName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Database</th><td>' + (job.databaseName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Loại reset</th><td>' + (resetBadge || '—') + '</td></tr><tr><th>Thực hiện bởi</th><td>' + (job.startedByUserName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Trạng thái</th><td>' + (job.status === 'Running' ? 'Đang chạy' : (job.status === 'Completed' ? 'Thành công' : (job.status === 'Failed' ? 'Lỗi' : job.status))) + '</td></tr><tr><th>Bắt đầu</th><td>' + formatNotifTime(job.startTime) + '</td></tr><tr><th>Kết thúc</th><td>' + formatNotifTime(job.completedAt) + '</td></tr>' + payloadRows + '</tbody></table>';
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
                        $('#notificationDetailBody').off('click.baResetInfo').on('click.baResetInfo', '.ba-notif-reset-info-btn', function(e) {
                            e.preventDefault(); e.stopPropagation();
                            var $btn = $(this), serverId = $btn.data('server-id'), dbName = $btn.data('database-name');
                            var $popup = $('#baResetInfoPopup');
                            if ($popup.length && serverId != null && dbName) {
                                $popup.html('<span class="ba-reset-info-loading">Đang tải...</span>').show();
                                $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreResetInfo") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ serverId: serverId, databaseName: dbName }) })
                                    .done(function(res) { var d = res.d || res; if (d && d.success && d.resetDetail) { var raw = d.resetDetail.replace(/^Reset:\s*/i, '').trim(); var rows = []; raw.split(/\s*,\s*/).forEach(function(pair) { var idx = pair.indexOf('='); if (idx > 0) { var label = pair.substring(0, idx).trim(); var value = pair.substring(idx + 1).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); var lbl = label === 'Email' ? 'Email' : label === 'Phone' ? 'Phone' : label === 'Password' ? 'Password' : label; rows.push('<div class="ba-reset-info-row"><span class="ba-reset-info-label">' + lbl + '</span><span class="ba-reset-info-value">' + value + '</span></div>'); } }); $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">' + (rows.length ? rows.join('') : raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</div>'); } else $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không có thông tin reset.</div>'); })
                                    .fail(function() { $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không tải được thông tin.</div>'); });
                            }
                        });
                        $(document).off('click.baResetInfoClose').on('click.baResetInfoClose', function(ev) { if ($(ev.target).closest('#baResetInfoPopup').length === 0 && !$(ev.target).hasClass('ba-notif-reset-info-btn')) $('#baResetInfoPopup').hide(); });
                        $('#notificationDetailModal').addClass('show');
                    }
                    $('#notificationDetailModal').on('click', function(e) { if (e.target === this) $(this).removeClass('show'); });
                    $('#notificationDetailClose').on('click', function(e) { e.preventDefault(); $('#notificationDetailModal').removeClass('show'); });
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
                                var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
                                var hrHelperUrl = '<%= ResolveUrl("~/Pages/HRHelper.aspx") %>';
                                var getMultiConnTokenUrl = '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMultiConnTokenForJob") %>';
                                var notifBugsCollapsed = sessionStorage.getItem('ba_notif_bugs_collapsed') === '1';
                                var notifJobsCollapsed = sessionStorage.getItem('ba_notif_jobs_collapsed') === '1';
                                var html = '';
                                if (newBugs.length > 0) {
                                    html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow">' + (notifBugsCollapsed ? '▶' : '▼') + '</span> 🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs" style="' + (notifBugsCollapsed ? 'display:none;' : '') + '">';
                                    newBugs.forEach(function(b) { var created = formatNotifTime(b.createdAt); var url = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug" data-bug-id="' + (b.id || '') + '"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + created + '</div><a class="ba-notif-detail-link" href="' + url + '" data-action="bug">Xem / Xử lý</a></div>'; });
                                    html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">';
                                }
                                jobs.forEach(function(j, idx) {
                                    var st = j.status || '', msg = (j.message || '').trim(), msgShort = msg.length > NOTIF_MSG_MAX_LEN ? msg.substring(0, NOTIF_MSG_MAX_LEN) + '…' : msg;
                                    var jobType = j.type || 'Restore';
                                    var typeLabel = (j.typeLabel || jobType || 'Restore').replace(/</g, '&lt;');
                                    var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : (jobType === 'HRHelperUpdateUser') ? 'ba-notif-type-hr-user' : (jobType === 'HRHelperUpdateEmployee') ? 'ba-notif-type-hr-employee' : (jobType === 'HRHelperUpdateOther') ? 'ba-notif-type-hr-other' : (jobType === 'HRHelperMultiDbAnalyze') ? 'ba-notif-type-hr-analyze' : (jobType === 'HRHelperMultiDbReset') ? 'ba-notif-type-hr-analyze' : '';
                                    var dbName = (j.databaseName || j.DatabaseName || '').trim();
                                    var hasReset = jobType === 'Restore' && (j.withAutoReset === true || (j.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
                                    var resetTag = (jobType === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag" title="Restore có tích hợp Reset thông tin">Có Reset' : 'ba-notif-no-reset-tag" title="Restore không reset">Không Reset') + '</span> ') : '';
                                    var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + (j.type || 'Restore') + '"><button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + typeLabel + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · Bắt đầu: ' + formatNotifTime(j.startTime) + '</div>';
                                    if (st === 'Running') row += '<div style="margin-top:4px;color:var(--primary);">Đang chạy</div>';
                                    else if (st === 'Failed') row += '<div class="ba-notif-msg ba-notif-msg-error">' + msgShort.replace(/</g, '&lt;') + '</div>';
                                    else if (st === 'Completed') { row += '<div style="margin-top:4px;color:var(--success);">Đã xong</div>'; if (msgShort) row += '<div class="ba-notif-msg" style="margin-top:2px;">' + msgShort.replace(/</g, '&lt;') + '</div>'; }
                                    row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a></div>';
                                    html += row;
                                });
                                if (newBugs.length > 0) html += '</div></div>';
                                else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                                $list.html(html);
                                $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function() { var g = $(this).data('group'); var $body = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); var $arrow = $(this).find('.ba-notif-group-arrow'); if ($body.is(':visible')) { $body.slideUp(200); $arrow.text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $body.slideDown(200); $arrow.text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                                $list.off('click.baNotif').on('click.baNotif', '.ba-notif-detail-link[data-action="detail"]', function(e) {
                                    e.preventDefault();
                                    var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10);
                                    var job = window.__notifJobsList && window.__notifJobsList[idx];
                                    if (!job) return;
                                    if ((job.type || '') === 'HRHelperMultiDbAnalyze' && (job.status || '') === 'Completed') {
                                        var jobId = job.id || 0;
                                        if (!jobId) { showNotificationDetail(job); return; }
                                        $.ajax({ url: getMultiConnTokenUrl, type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ jobId: jobId }), success: function(r) {
                                            var d = r.d || r;
                                            if (d && d.success && d.token) { window.location.href = hrHelperUrl + '?k=' + encodeURIComponent(d.token) + '&jobId=' + jobId; }
                                            else { showNotificationDetail(job); }
                                        }, error: function() { showNotificationDetail(job); } });
                                        return;
                                    }
                                    showNotificationDetail(job);
                                });
                                $list.off('click.baNotifDismiss').on('click.baNotifDismiss', '.ba-notif-dismiss', function(e) { e.preventDefault(); e.stopPropagation(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($item.data('job-id'), 10); var jobType = $item.data('job-type') || 'Restore'; if (jobId) { addDismissedJobId(jobId, jobType); var $listEl = $('#restoreJobsList'), $badgeEl = $('#restoreJobsBadge'); var newCount = Math.max(0, $listEl.find('.ba-notif-item').length - 1); if (newCount > 0) { $badgeEl.text(newCount).addClass('visible'); } else { $badgeEl.removeClass('visible'); } $.ajax({ url: dismissJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobId }) }); $item.slideUp(200, function() { $(this).remove(); var $listEl = $('#restoreJobsList'); var left = $listEl.find('.ba-notif-item').length; var $badgeEl = $('#restoreJobsBadge'); if (left > 0) { $badgeEl.text(left).addClass('visible'); var bugsCount = $listEl.find('.ba-notif-group-body[data-group="bugs"] .ba-notif-item').length; var jobsCount = $listEl.find('.ba-notif-group-body[data-group="jobs"] .ba-notif-item').length; $listEl.find('.ba-notif-group-toggle[data-group="bugs"]').html(function(i, h) { return (h || '').replace(/(🐛 )?Bugs mới \(\d+\)/, '🐛 Bugs mới (' + bugsCount + ')'); }); $listEl.find('.ba-notif-group-toggle[data-group="jobs"]').html(function(i, h) { return (h || '').replace(/Thông báo job \(\d+\)/, 'Thông báo job (' + jobsCount + ')'); }); } else { $badgeEl.removeClass('visible'); $listEl.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } }); } });
                            }
                        });
                    }
                    if ($('#restoreJobsBellWrap').length) {
                        $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }); var newBugs = d.newBugs || []; var total = jobs.length + newBugs.length; if (total > 0) $('#restoreJobsBadge').text(total).addClass('visible'); } } });
                        $('#restoreJobsBellBtn').on('click', function(e) { e.stopPropagation(); var $p = $('#restoreJobsPanel'); if ($p.is(':visible')) { $p.hide(); } else { loadRestoreJobsPanel(); $p.show(); } });
                        $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
                        $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
                        if (typeof BA_SignalR !== 'undefined') { BA_SignalR.onJobsUpdated(function() { if ($('#restoreJobsPanel').is(':visible')) loadRestoreJobsPanel(); else { $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }); var newBugs = d.newBugs || []; var total = jobs.length + newBugs.length; if (total > 0) $('#restoreJobsBadge').text(total).addClass('visible'); } } }); } }); }
                    }
                })();

                $(document).on('click', '.queue-cancel-btn', function () {
                    var id = $(this).data('id');
                    if (!id) return;
                    var job = (window.__queueJobs || []).find(function (j) { return j.id == id; }) || {};
                    var serverName = (job.serverName || '').trim();
                    var dbName = (job.databaseName || '').trim();
                    var jobType = (job.type || job.typeLabel || 'Restore').toString();
                    var jobDesc = (serverName || dbName) ? (serverName + ' → ' + dbName) : ('Job #' + id);
                    var msg = 'Bạn có chắc muốn hủy job:\n' + jobDesc + '\nLoại: ' + jobType + '\n\nHành động không thể hoàn tác.';
                    var $btn = $(this);
                    if (typeof baConfirm === 'function') baConfirm(msg, function () {
                        $btn.prop('disabled', true);
                        $.ajax({
                            url: cancelUrl,
                            type: 'POST',
                            contentType: 'application/json',
                            dataType: 'json',
                            data: JSON.stringify({ jobId: id }),
                            success: function (r) {
                                var d = r.d || r;
                                if (d && d.success) { load(); if (window.__queueHasRunning) startQueueRefresh(); }
                                else { $btn.prop('disabled', false); if (typeof baAlert === 'function') baAlert(d && d.message ? d.message : 'Không thể hủy.'); }
                            },
                            complete: function () { $btn.prop('disabled', false); }
                        });
                    }, null, 'Đồng ý', 'Thoát');
                });
            });
        })();
    </script>
</body>
</html>
