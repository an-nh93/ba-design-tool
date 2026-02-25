<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="FeedbackManage.aspx.cs" Inherits="BADesign.Pages.FeedbackManage" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Quản lý góp ý - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        .ba-content { padding: 0.5rem; }
        .ba-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; }
        .ba-card-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem; }
        .ba-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1rem; align-items: end; }
        .ba-form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .ba-form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); }
        .ba-input { background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; color: var(--text-primary); font-size: 0.875rem; width: 100%; }
        .ba-btn { padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-table-wrap { overflow: auto; max-height: 60vh; border: 1px solid var(--border); border-radius: 8px; }
        .ba-table { width: 100%; border-collapse: collapse; }
        .ba-table thead { background: var(--bg-darker); position: sticky; top: 0; z-index: 2; }
        .ba-table th, .ba-table td { padding: 0.6rem 0.75rem; text-align: left; font-size: 0.875rem; border-bottom: 1px solid var(--border); }
        .ba-table tbody tr:hover { background: var(--bg-hover); }
        .ba-table .col-title { max-width: 220px; word-break: break-word; }
        .ba-table .col-date { white-space: nowrap; width: 140px; }
        .ba-link { color: var(--primary); cursor: pointer; text-decoration: none; }
        .ba-link:hover { text-decoration: underline; }
        .ba-badge-status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .ba-badge-new { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .ba-badge-read { background: rgba(113, 113, 122, 0.2); color: var(--text-muted); }
        .ba-badge-inprogress { background: rgba(245, 158, 11, 0.25); color: #f59e0b; }
        .ba-badge-resolved { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .ba-modal { display: none; position: fixed; inset: 0; z-index: 10002; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); padding: 1rem; }
        .ba-modal.show { display: flex; }
        .ba-modal-content { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 960px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
        .ba-modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .ba-modal-body { padding: 1rem 1.25rem; overflow-y: auto; flex: 1; }
        .ba-modal-footer { padding: 0.75rem 1.25rem; border-top: 1px solid var(--border); flex-shrink: 0; }
        .ba-feedback-detail-title { font-weight: 600; margin-bottom: 0.5rem; }
        .ba-feedback-detail-meta { font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1rem; }
        .ba-feedback-detail-content { border: 1px solid var(--border); border-radius: 6px; padding: 1rem; background: var(--bg-darker); margin-bottom: 1rem; max-height: 50vh; overflow-y: auto; }
        .ba-feedback-detail-content img { max-width: 100%; height: auto; }
        .ba-feedback-detail-label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.35rem; }
        .ba-feedback-detail-note { margin-top: 1rem; }
        .ba-feedback-detail-note textarea { width: 100%; min-height: 180px; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-darker); color: var(--text-primary); font-size: 0.875rem; resize: vertical; }
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
                    <h1 class="ba-card-title">Quản lý góp ý</h1>
                    <p class="ba-card-desc">Xem và cập nhật trạng thái các góp ý từ người dùng.</p>
                    <div class="ba-form-grid">
                        <div class="ba-form-group">
                            <label class="ba-form-label">Trạng thái</label>
                            <select id="filterStatus" class="ba-input">
                                <option value="">-- Tất cả --</option>
                                <option value="New">Mới</option>
                                <option value="Read">Đã đọc</option>
                                <option value="InProgress">Đang xử lý</option>
                                <option value="Resolved">Đã xử lý</option>
                                <option value="Closed">Đóng</option>
                            </select>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Từ ngày</label>
                            <input type="date" id="filterDateFrom" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Đến ngày</label>
                            <input type="date" id="filterDateTo" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <button type="button" id="btnLoad" class="ba-btn ba-btn-primary">Tải lại</button>
                        </div>
                    </div>
                    <div class="ba-table-wrap">
                        <table class="ba-table">
                            <thead>
                                <tr>
                                    <th>Id</th>
                                    <th class="col-title">Tiêu đề</th>
                                    <th>Loại</th>
                                    <th>Trạng thái</th>
                                    <th>Người gửi</th>
                                    <th class="col-date">Ngày gửi</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="feedbackListBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
        <div id="feedbackDetailModal" class="ba-modal">
            <div class="ba-modal-content">
                <div class="ba-modal-header">
                    <span id="detailModalTitle" class="ba-feedback-detail-title"></span>
                    <button type="button" class="ba-btn ba-btn-secondary" id="detailModalClose">×</button>
                </div>
                <div class="ba-modal-body" id="feedbackDetailBody"></div>
                <div class="ba-modal-footer">
                    <label class="ba-feedback-detail-label">Trạng thái</label>
                    <select id="detailStatus" class="ba-input" style="max-width: 160px; margin-bottom: 8px;">
                        <option value="New">Mới</option>
                        <option value="Read">Đã đọc</option>
                        <option value="InProgress">Đang xử lý</option>
                        <option value="Resolved">Đã xử lý</option>
                        <option value="Closed">Đóng</option>
                    </select>
                    <div class="ba-form-group" style="margin-bottom: 8px;">
                        <label class="ba-feedback-detail-label">Bắt đầu xử lý</label>
                        <input type="date" id="detailStartedAt" class="ba-input" style="max-width: 180px;" />
                    </div>
                    <div class="ba-form-group" style="margin-bottom: 8px;">
                        <label class="ba-feedback-detail-label">Dự kiến fix</label>
                        <input type="date" id="detailExpectedFixAt" class="ba-input" style="max-width: 180px;" />
                    </div>
                    <div class="ba-feedback-detail-note">
                        <label class="ba-feedback-detail-label">Ghi chú (phản hồi)</label>
                        <textarea id="detailAdminNote" class="ba-input" placeholder="Ghi chú hoặc phản hồi cho người gửi..."></textarea>
                    </div>
                    <div style="margin-top: 10px;">
                        <button type="button" id="btnSaveDetail" class="ba-btn ba-btn-primary">Lưu</button>
                        <button type="button" id="btnCloseDetail" class="ba-btn ba-btn-secondary">Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <script>
        (function () {
            var listUrl = '<%= ResolveUrl("~/Pages/FeedbackManage.aspx/GetFeedbackList") %>';
            var detailUrl = '<%= ResolveUrl("~/Pages/FeedbackManage.aspx/GetFeedbackDetail") %>';
            var updateUrl = '<%= ResolveUrl("~/Pages/FeedbackManage.aspx/UpdateFeedback") %>';
            var currentId = null;

            function setDefaultDateRange() {
                var now = new Date();
                var first = new Date(now.getFullYear(), now.getMonth(), 1);
                var last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                var y = first.getFullYear(), m = String(first.getMonth() + 1).padStart(2, '0'), d1 = String(first.getDate()).padStart(2, '0');
                var d2 = String(last.getDate()).padStart(2, '0'), m2 = String(last.getMonth() + 1).padStart(2, '0');
                $('#filterDateFrom').val(y + '-' + m + '-' + d1);
                $('#filterDateTo').val(y + '-' + m2 + '-' + d2);
            }

            function statusBadge(st) {
                var c = 'ba-badge-status ';
                if (st === 'New') return '<span class="' + c + 'ba-badge-new">Mới</span>';
                if (st === 'Read') return '<span class="' + c + 'ba-badge-read">Đã đọc</span>';
                if (st === 'InProgress') return '<span class="' + c + 'ba-badge-inprogress">Đang xử lý</span>';
                if (st === 'Resolved') return '<span class="' + c + 'ba-badge-resolved">Đã xử lý</span>';
                if (st === 'Closed') return '<span class="' + c + 'ba-badge-read">Đóng</span>';
                return '<span class="' + c + '">' + (st || '') + '</span>';
            }

            function loadList() {
                var status = $('#filterStatus').val() || '';
                var dateFrom = $('#filterDateFrom').val() || '';
                var dateTo = $('#filterDateTo').val() || '';
                $.ajax({
                    url: listUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ status: status, dateFrom: dateFrom, dateTo: dateTo }),
                    success: function (res) {
                        var d = res.d || res;
                        if (!d || !d.success) {
                            $('#feedbackListBody').html('<tr><td colspan="7" style="padding:1.5rem;color:var(--text-muted);">Không tải được danh sách.</td></tr>');
                            return;
                        }
                        var rows = d.list || [];
                        if (rows.length === 0) {
                            $('#feedbackListBody').html('<tr><td colspan="7" style="padding:1.5rem;color:var(--text-muted);">Không có góp ý nào.</td></tr>');
                            return;
                        }
                        var html = '';
                        rows.forEach(function (r) {
                            var created = r.createdAt ? new Date(r.createdAt).toLocaleString() : '—';
                            html += '<tr><td>' + (r.id || '') + '</td><td class="col-title">' + (r.title || '').replace(/</g, '&lt;') + '</td><td>' + (r.category || '—').replace(/</g, '&lt;') + '</td><td>' + statusBadge(r.status) + '</td><td>' + (r.userName || '—').replace(/</g, '&lt;') + '</td><td class="col-date">' + created + '</td><td><a href="#" class="ba-link view-detail" data-id="' + (r.id || '') + '">Xem</a></td></tr>';
                        });
                        $('#feedbackListBody').html(html);
                    }
                });
            }

            function openDetail(id) {
                currentId = id;
                $.ajax({
                    url: detailUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ id: id }),
                    success: function (res) {
                        var d = res.d || res;
                        if (!d || !d.success || !d.item) {
                            return;
                        }
                        var i = d.item;
                        $('#detailModalTitle').text((i.title || '').replace(/</g, '&lt;'));
                        var meta = 'Gửi bởi: ' + (i.userName || '—').replace(/</g, '&lt;') + ' · ' + (i.createdAt ? new Date(i.createdAt).toLocaleString() : '') + (i.pageUrl ? ' · <a href="' + (i.pageUrl || '').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '" target="_blank" rel="noopener">Trang gửi</a>' : '');
                        $('#feedbackDetailBody').html('<div class="ba-feedback-detail-meta">' + meta + '</div><div class="ba-feedback-detail-label">Nội dung</div><div class="ba-feedback-detail-content">' + (i.content || '') + '</div>');
                        $('#detailStatus').val(i.status || 'New');
                        $('#detailAdminNote').val(i.adminNote || '');
                        $('#detailStartedAt').val(i.startedAt ? new Date(i.startedAt).toISOString().slice(0, 10) : '');
                        $('#detailExpectedFixAt').val(i.expectedFixAt ? new Date(i.expectedFixAt).toISOString().slice(0, 10) : '');
                        $('#feedbackDetailModal').addClass('show');
                    }
                });
            }

            $('#btnLoad').on('click', loadList);
            $(document).on('click', '.view-detail', function (e) {
                e.preventDefault();
                var id = $(this).data('id');
                if (id) openDetail(id);
            });
            $('#detailModalClose, #btnCloseDetail').on('click', function () {
                $('#feedbackDetailModal').removeClass('show');
            });
            $('#feedbackDetailModal').on('click', function (e) {
                if (e.target === this) $(this).removeClass('show');
            });
            $('#btnSaveDetail').on('click', function () {
                if (currentId == null) return;
                var status = $('#detailStatus').val() || 'New';
                var adminNote = ($('#detailAdminNote').val() || '').trim();
                var startedAt = $('#detailStartedAt').val() || '';
                var expectedFixAt = $('#detailExpectedFixAt').val() || '';
                $.ajax({
                    url: updateUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ id: currentId, status: status, adminNote: adminNote, startedAt: startedAt, expectedFixAt: expectedFixAt }),
                    success: function (res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            loadList();
                            $('#feedbackDetailModal').removeClass('show');
                        }
                    }
                });
            });

            setDefaultDateRange();
            loadList();

            // Chuông thông báo (badge + panel) giống trang Feedback
            (function () {
                var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
                var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
                var DISMISSED_JOBS_KEY = 'baDismissedJobIds';
                function getDismissedJobIds() { try { var raw = localStorage.getItem(DISMISSED_JOBS_KEY); if (!raw) return []; var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; } }
                function isJobDismissed(job) { var key = (job.type === 'Backup' ? 'b:' : 'r:') + (job.id || ''); return getDismissedJobIds().indexOf(key) >= 0; }
                function parseDateSafe(v) { if (v == null || v === '') return null; if (typeof v === 'number') return new Date(v); var s = (typeof v === 'string') ? v : String(v); var m = s.match(/\/Date\((\d+)\)\//); if (m) return new Date(parseInt(m[1], 10)); var n = Date.parse(s); return isNaN(n) ? null : new Date(n); }
                function formatNotifTime(v) { var dt = parseDateSafe(v); return dt ? dt.toLocaleString() : '—'; }
                function loadBellBadge() {
                    if (!$('#restoreJobsBellWrap').length) return;
                    $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                        success: function (res) {
                            var d = res.d || res;
                            if (d && (d.jobs || d.newBugs)) {
                                var jobs = (d.jobs || []).map(function (j) { j.type = j.type || 'Restore'; return j; }).filter(function (j) { return j.id != null && !isJobDismissed(j); });
                                var newBugs = d.newBugs || [];
                                var total = jobs.length + newBugs.length;
                                if (total > 0) $('#restoreJobsBadge').text(total).addClass('visible');
                            }
                        }
                    });
                }
                function loadBellPanel() {
                    var $list = $('#restoreJobsList'), $badge = $('#restoreJobsBadge');
                    if (!$list.length) return;
                    $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                        success: function (res) {
                            var d = res.d || res;
                            if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                            var jobs = (d.jobs || []).map(function (j) { j.type = j.type || 'Restore'; return j; }).filter(function (j) { return j.id != null && !isJobDismissed(j); }).sort(function (a, b) { var ta = parseDateSafe(a.startTime); var tb = parseDateSafe(b.startTime); return (tb && ta) ? (tb - ta) : 0; });
                            var newBugs = d.newBugs || [];
                            var totalCount = jobs.length + newBugs.length;
                            if (totalCount === 0) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                            $badge.text(totalCount).addClass('visible');
                            var html = '';
                            if (newBugs.length > 0) {
                                html += '<div class="ba-notif-section-title" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">🐛 Bugs mới (' + newBugs.length + ')</div>';
                                newBugs.forEach(function (b) { var created = formatNotifTime(b.createdAt); html += '<div class="ba-notif-item ba-notif-bug"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + created + '</div><a class="ba-notif-detail-link" href="' + feedbackManageUrl + '">Xem / Xử lý</a></div>'; });
                                html += '<div class="ba-notif-section-title" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">Thông báo job</div>';
                            }
                            jobs.forEach(function (j) {
                                var st = j.status || '', jobType = j.type || 'Restore', typeLabel = (j.typeLabel || (jobType === 'Backup' ? 'Backup' : 'Restore'));
                                var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : 'ba-notif-type-restore';
                                var row = '<div class="ba-notif-item" data-job-id="' + (j.id || '') + '" data-job-type="' + jobType + '"><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + (typeLabel.replace(/</g, '&lt;')) + '</span> ' + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + formatNotifTime(j.startTime) + '</div>';
                                if (st === 'Running') row += '<div style="margin-top:4px;"><span class="ba-notif-status-badge ba-notif-status-running">Đang chạy</span></div>';
                                else if (st === 'Completed') row += '<div style="margin-top:4px;"><span class="ba-notif-status-badge ba-notif-status-completed">Đã xong</span></div>';
                                else if (st === 'Failed') row += '<div style="margin-top:4px;"><span class="ba-notif-status-badge ba-notif-status-failed">Lỗi</span></div><div class="ba-notif-msg ba-notif-msg-error">' + (j.message || '').replace(/</g, '&lt;') + '</div>';
                                row += '<a class="ba-notif-detail-link" href="<%= ResolveUrl("~/FunctionQueue") %>">Xem chi tiết</a></div>';
                                html += row;
                            });
                            $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                        }
                    });
                }
                $(function () {
                    loadBellBadge();
                    $('#restoreJobsBellBtn').on('click', function (e) {
                        e.stopPropagation();
                        var $p = $('#restoreJobsPanel');
                        if ($p.is(':visible')) { $p.hide(); } else { loadBellPanel(); $p.show(); }
                    });
                    $(document).on('click', function () { $('#restoreJobsPanel').hide(); });
                    $('#restoreJobsPanel').on('click', function (e) { e.stopPropagation(); });
                });
            })();
        })();
    </script>
</body>
</html>
