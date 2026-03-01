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
        /* Nút + modal dùng chung từ ba-layout.css */
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
        .ba-badge-reopen { background: rgba(168, 85, 247, 0.25); color: #a855f7; }
        .ba-badge-notabug { background: rgba(100, 116, 139, 0.25); color: #64748b; }
        /* Modal dùng chung từ ba-layout.css; override cho modal chi tiết rộng hơn */
        #feedbackDetailModal .ba-modal-content { max-width: 960px; width: 95%; }
        .ba-feedback-detail-title { font-weight: 600; margin-bottom: 0.5rem; }
        .ba-feedback-detail-meta { font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1rem; }
        .ba-feedback-detail-content { border: 1px solid var(--border); border-radius: 6px; padding: 1rem; background: var(--bg-darker); margin-bottom: 1rem; max-height: 50vh; overflow-y: auto; }
        .ba-feedback-detail-content img { max-width: 100%; height: auto; }
        .ba-feedback-detail-label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.35rem; }
        .ba-feedback-detail-note { margin-top: 1rem; }
        .ba-feedback-detail-note textarea { width: 100%; min-height: 180px; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-darker); color: var(--text-primary); font-size: 0.875rem; resize: vertical; }
        .ba-history-list, .ba-comments-list { list-style: none; padding: 0; margin: 0 0 0.75rem 0; font-size: 0.8125rem; }
        .ba-history-list li { padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
        .ba-comments-list li { padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
        .ba-comment-add { margin-top: 0.5rem; }
        .ba-comment-add textarea { width: 100%; min-height: 70px; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-darker); color: var(--text-primary); font-size: 0.875rem; resize: vertical; }
        /* Tabs trong modal */
        .ba-modal-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); flex-shrink: 0; background: var(--bg-darker); }
        .ba-modal-tab { padding: 0.6rem 1rem; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; }
        .ba-modal-tab:hover { color: var(--text-primary); }
        .ba-modal-tab.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--bg-card); }
        .ba-modal-pane { display: none; padding: 1rem 1.25rem; overflow-y: auto; flex: 1; min-height: 0; }
        .ba-modal-pane.active { display: flex; flex-direction: column; }
        #detailPaneView { overflow-y: auto; }
        .ba-detail-edit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .ba-detail-edit-grid .ba-form-group { margin-bottom: 0; }
        .ba-collapse-header { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; padding: 0.5rem 0; display: flex; align-items: center; gap: 0.35rem; user-select: none; }
        .ba-collapse-header:hover { color: var(--primary); }
        .ba-collapse-header::before { content: '▶'; font-size: 0.7rem; transition: transform 0.2s; }
        .ba-collapse-header.open::before { transform: rotate(90deg); }
        .ba-collapse-body { display: none; margin-bottom: 1rem; }
        .ba-collapse-body.open { display: block; }
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
                                <option value="Reopen">Mở lại</option>
                                <option value="Resolved">Đã xử lý</option>
                                <option value="Closed">Đóng</option>
                                <option value="NotABug">Đã đóng (không phải bug)</option>
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
                        <div class="ba-form-group" style="min-width: 160px;">
                            <label class="ba-form-label">Từ khóa</label>
                            <input type="text" id="filterKeyword" class="ba-input" placeholder="Tiêu đề, nội dung, ghi chú..." />
                        </div>
                        <div class="ba-form-group" style="min-width: 140px;">
                            <label class="ba-form-label">Tags</label>
                            <input type="text" id="filterTags" class="ba-input" placeholder="critical, ui, ..." />
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
                                    <th>Tags</th>
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
            <div class="ba-modal-content" style="max-height: 85vh;">
                <div class="ba-modal-header">
                    <span id="detailModalTitle" class="ba-feedback-detail-title"></span>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" id="detailModalClose">×</button>
                </div>
                <div class="ba-modal-tabs">
                    <button type="button" class="ba-modal-tab active" data-pane="view">Xem</button>
                    <button type="button" class="ba-modal-tab" data-pane="edit">Cập nhật</button>
                </div>
                <div class="ba-modal-body" style="display: flex; flex-direction: column; min-height: 0; flex: 1;">
                    <div id="detailPaneView" class="ba-modal-pane active">
                        <div id="feedbackDetailBody"></div>
                    </div>
                    <div id="detailPaneEdit" class="ba-modal-pane">
                        <div class="ba-detail-edit-grid">
                            <div class="ba-form-group">
                                <label class="ba-feedback-detail-label">Trạng thái</label>
                                <select id="detailStatus" class="ba-input">
                                    <option value="New">Mới</option>
                                    <option value="Read">Đã đọc</option>
                                    <option value="InProgress">Đang xử lý</option>
                                    <option value="Reopen">Mở lại</option>
                                    <option value="Resolved">Đã xử lý</option>
                                    <option value="Closed">Đóng</option>
                                    <option value="NotABug">Đã đóng (không phải bug)</option>
                                    </select>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-feedback-detail-label">Bắt đầu xử lý</label>
                                <input type="date" id="detailStartedAt" class="ba-input" />
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-feedback-detail-label">Dự kiến fix</label>
                                <input type="date" id="detailExpectedFixAt" class="ba-input" />
                            </div>
                            <div class="ba-form-group" style="grid-column: 1 / -1;">
                                <label class="ba-feedback-detail-label">Tags (phân cách bằng dấu phẩy)</label>
                                <input type="text" id="detailTags" class="ba-input" placeholder="critical, ui, backend" />
                            </div>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-feedback-detail-label">Ghi chú (phản hồi)</label>
                            <textarea id="detailAdminNote" class="ba-input" placeholder="Ghi chú hoặc phản hồi cho người gửi..." style="min-height: 100px;"></textarea>
                        </div>
                        <div style="margin-top: 1rem;">
                            <button type="button" id="btnSaveDetail" class="ba-btn ba-btn-primary">Lưu</button>
                            <button type="button" id="btnCloseDetail" class="ba-btn ba-btn-secondary">Đóng</button>
                        </div>
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
            var historyUrl = '<%= ResolveUrl("~/Pages/FeedbackManage.aspx/GetFeedbackStatusHistory") %>';
            var commentsUrl = '<%= ResolveUrl("~/Pages/FeedbackManage.aspx/GetFeedbackComments") %>';
            var addCommentUrl = '<%= ResolveUrl("~/Pages/FeedbackManage.aspx/AddFeedbackComment") %>';
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
                if (st === 'Reopen') return '<span class="' + c + 'ba-badge-reopen">Mở lại</span>';
                if (st === 'Resolved') return '<span class="' + c + 'ba-badge-resolved">Đã xử lý</span>';
                if (st === 'Closed') return '<span class="' + c + 'ba-badge-read">Đóng</span>';
                if (st === 'NotABug') return '<span class="' + c + 'ba-badge-notabug">Đã đóng (không phải bug)</span>';
                return '<span class="' + c + '">' + (st || '') + '</span>';
            }

            function loadList() {
                var status = $('#filterStatus').val() || '';
                var dateFrom = $('#filterDateFrom').val() || '';
                var dateTo = $('#filterDateTo').val() || '';
                var keyword = ($('#filterKeyword').val() || '').trim();
                var tags = ($('#filterTags').val() || '').trim();
                $.ajax({
                    url: listUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ status: status, dateFrom: dateFrom, dateTo: dateTo, keyword: keyword, tags: tags }),
                    success: function (res) {
                        var d = res.d || res;
                        if (!d || !d.success) {
                            $('#feedbackListBody').html('<tr><td colspan="8" style="padding:1.5rem;color:var(--text-muted);">Không tải được danh sách.</td></tr>');
                            return;
                        }
                        var rows = d.list || [];
                        if (rows.length === 0) {
                            $('#feedbackListBody').html('<tr><td colspan="8" style="padding:1.5rem;color:var(--text-muted);">Không có góp ý nào.</td></tr>');
                            return;
                        }
                        var html = '';
                        rows.forEach(function (r) {
                            var created = r.createdAt ? new Date(r.createdAt).toLocaleString() : '—';
                            var tagsStr = (r.tags || '').replace(/</g, '&lt;');
                            html += '<tr><td>' + (r.id || '') + '</td><td class="col-title">' + (r.title || '').replace(/</g, '&lt;') + '</td><td>' + (r.category || '—').replace(/</g, '&lt;') + '</td><td>' + statusBadge(r.status) + '</td><td style="max-width:120px;word-break:break-word;">' + tagsStr + '</td><td>' + (r.userName || '—').replace(/</g, '&lt;') + '</td><td class="col-date">' + created + '</td><td><a href="#" class="ba-link view-detail" data-id="' + (r.id || '') + '">Xem</a></td></tr>';
                        });
                        $('#feedbackListBody').html(html);
                    }
                });
            }

            function loadHistory(feedbackId) {
                $.ajax({
                    url: historyUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ id: feedbackId }),
                    success: function (res) {
                        var d = res.d || res;
                        var list = (d && d.success && d.list) ? d.list : [];
                        var html = '<ul class="ba-history-list">';
                        if (list.length === 0) html += '<li style="color:var(--text-muted);">Chưa có lịch sử.</li>';
                        else list.forEach(function (h) {
                            var t = h.changedAt ? new Date(h.changedAt).toLocaleString() : '';
                            html += '<li>' + (h.fromStatus || '—') + ' → ' + (h.toStatus || '').replace(/</g, '&lt;') + ' · ' + (h.changedByUserName || '—').replace(/</g, '&lt;') + ' · ' + t + (h.note ? ' · ' + (h.note || '').replace(/</g, '&lt;') : '') + '</li>';
                        });
                        html += '</ul>';
                        $('#detailHistorySection').html(html);
                    }
                });
            }
            function initCollapse() {
                $(document).off('click', '.ba-collapse-header').on('click', '.ba-collapse-header', function () {
                    var $h = $(this), $b = $h.next('.ba-collapse-body');
                    $h.toggleClass('open'); $b.toggleClass('open');
                });
            }
            function loadComments(feedbackId) {
                $.ajax({
                    url: commentsUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ id: feedbackId }),
                    success: function (res) {
                        var d = res.d || res;
                        var list = (d && d.success && d.list) ? d.list : [];
                        var html = '';
                        if (list.length === 0) html = '<li style="color:var(--text-muted);">Chưa có comment.</li>';
                        else list.forEach(function (c) {
                            var t = c.createdAt ? new Date(c.createdAt).toLocaleString() : '';
                            html += '<li><strong>' + (c.userName || '—').replace(/</g, '&lt;') + '</strong> ' + t + '<br/>' + (c.content || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</li>';
                        });
                        $('#detailCommentsList').html(html);
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
                        var bodyHtml = '<div class="ba-feedback-detail-meta">' + meta + '</div><div class="ba-feedback-detail-label">Nội dung</div><div class="ba-feedback-detail-content" style="max-height: 35vh;">' + (i.content || '') + '</div>';
                        bodyHtml += '<div class="ba-collapse-header" data-collapse="history">Lịch sử trạng thái</div><div id="detailHistorySection" class="ba-collapse-body"><ul class="ba-history-list"><li style="color:var(--text-muted);">Đang tải...</li></ul></div>';
                        bodyHtml += '<div class="ba-collapse-header open" data-collapse="comments">Comment</div><div class="ba-collapse-body open"><ul id="detailCommentsList" class="ba-comments-list"><li style="color:var(--text-muted);">Đang tải...</li></ul><div class="ba-comment-add"><textarea id="detailNewComment" placeholder="Thêm phản hồi..."></textarea><button type="button" id="btnAddComment" class="ba-btn ba-btn-primary" style="margin-top:6px;">Thêm comment</button></div></div>';
                        $('#feedbackDetailBody').html(bodyHtml);
                        initCollapse();
                        $('#detailStatus').val(i.status || 'New');
                        $('#detailAdminNote').val(i.adminNote || '');
                        $('#detailStartedAt').val(i.startedAt ? new Date(i.startedAt).toISOString().slice(0, 10) : '');
                        $('#detailExpectedFixAt').val(i.expectedFixAt ? new Date(i.expectedFixAt).toISOString().slice(0, 10) : '');
                        $('#detailTags').val(i.tags || '');
                        loadHistory(id);
                        loadComments(id);
                        $('#btnAddComment').off('click').on('click', function () {
                            var content = ($('#detailNewComment').val() || '').trim();
                            if (!content) return;
                            $.ajax({
                                url: addCommentUrl,
                                type: 'POST',
                                contentType: 'application/json',
                                dataType: 'json',
                                data: JSON.stringify({ feedbackId: id, content: content }),
                                success: function (res) {
                                    var r = res.d || res;
                                    if (r && r.success) { $('#detailNewComment').val(''); loadComments(id); }
                                }
                            });
                        });
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
            $('.ba-modal-tab').on('click', function () {
                var pane = $(this).data('pane');
                $('.ba-modal-tab').removeClass('active');
                $('.ba-modal-pane').removeClass('active');
                $(this).addClass('active');
                if (pane === 'view') $('#detailPaneView').addClass('active');
                else $('#detailPaneEdit').addClass('active');
            });
            $('#detailModalClose, #btnCloseDetail').on('click', function () {
                $('#feedbackDetailModal').removeClass('show');
            });
            $('#btnSaveDetail').on('click', function () {
                if (currentId == null) return;
                var status = $('#detailStatus').val() || 'New';
                var adminNote = ($('#detailAdminNote').val() || '').trim();
                var startedAt = $('#detailStartedAt').val() || '';
                var expectedFixAt = $('#detailExpectedFixAt').val() || '';
                var tags = ($('#detailTags').val() || '').trim();
                $.ajax({
                    url: updateUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ id: currentId, status: status, adminNote: adminNote, startedAt: startedAt, expectedFixAt: expectedFixAt, tags: tags }),
                    success: function (res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            loadHistory(currentId);
                            loadList();
                            $('#feedbackDetailModal').removeClass('show');
                        }
                    }
                });
            });
            setDefaultDateRange();
            loadList();
            var m = location.search.match(/[?&]id=(\d+)/);
            if (m) { var id = parseInt(m[1], 10); if (id) openDetail(id); }

            // Chuông thông báo (badge + panel) giống trang Feedback
            (function () {
                var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
                var cancelJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/CancelRestoreJob") %>';
                var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
                var functionQueueUrl = '<%= ResolveUrl("~/FunctionQueue") %>';
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
                            var currentUserId = (d.currentUserId != null) ? parseInt(d.currentUserId, 10) : 0;
                            $badge.text(totalCount).addClass('visible');
                            window.__notifJobsList = jobs;
                            var notifBugsCollapsed = sessionStorage.getItem('ba_notif_bugs_collapsed') === '1';
                            var notifJobsCollapsed = sessionStorage.getItem('ba_notif_jobs_collapsed') === '1';
                            var html = '';
                            if (newBugs.length > 0) {
                                html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifBugsCollapsed ? '▶' : '▼') + '</span> 🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs" style="' + (notifBugsCollapsed ? 'display:none;' : '') + '">';
                                newBugs.forEach(function (b) { var created = formatNotifTime(b.createdAt); var url = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + created + '</div><a class="ba-notif-detail-link" href="' + url + '" data-action="bug">Xem / Xử lý</a></div>'; });
                                html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">';
                            }
                            jobs.forEach(function (j, idx) {
                                var st = j.status || '', jobType = j.type || 'Restore', typeLabel = (j.typeLabel || (jobType === 'Backup' ? 'Backup' : jobType === 'HRHelperMultiDbAnalyze' ? 'Phân tích Multi-DB' : 'Restore'));
                                var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : 'ba-notif-type-restore';
                                var pct = (j.percentComplete != null) ? Number(j.percentComplete) : 0;
                                var phase = (j.message || (jobType === 'Restore' ? 'Restore' : '')).toString().trim();
                                var startedByUid = (j.startedByUserId != null) ? parseInt(j.startedByUserId, 10) : 0;
                                var canCancel = (jobType === 'Restore' || jobType === 'Backup' || jobType === 'HRHelperMultiDbAnalyze' || jobType === 'HRHelperMultiDbReset') && currentUserId && startedByUid === currentUserId;
                                var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + jobType + '"><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + (typeLabel.replace(/</g, '&lt;')) + '</span> ' + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + formatNotifTime(j.startTime) + '</div>';
                                if (st === 'Running') {
                                    var progressLabel = (jobType === 'Restore' && phase) ? (pct + '% - ' + phase) : (jobType === 'HRHelperMultiDbAnalyze' ? (pct + '% - Phân tích') : (pct + '%'));
                                    row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt,var(--bg-darker));height:6px;border-radius:3px;overflow:hidden;"><div class="ba-notif-progress-bar" style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span class="ba-notif-progress-pct">' + progressLabel + '</span></div>';
                                    row += '<a class="ba-notif-detail-link" href="' + functionQueueUrl + '">Xem chi tiết</a>';
                                    if (canCancel) row += ' <button type="button" class="ba-notif-cancel-btn" data-job-id="' + (j.id || '') + '" title="Chỉ người thực hiện job mới có thể hủy">Hủy</button>';
                                } else if (st === 'Completed') row += '<div style="margin-top:4px;"><span class="ba-notif-status-badge ba-notif-status-completed">Đã xong</span></div><a class="ba-notif-detail-link" href="' + functionQueueUrl + '">Xem chi tiết</a>';
                                else if (st === 'Failed') row += '<div style="margin-top:4px;"><span class="ba-notif-status-badge ba-notif-status-failed">Lỗi</span></div><div class="ba-notif-msg ba-notif-msg-error">' + (j.message || '').replace(/</g, '&lt;') + '</div><a class="ba-notif-detail-link" href="' + functionQueueUrl + '">Xem chi tiết</a>';
                                row += '</div>';
                                html += row;
                            });
                            if (newBugs.length > 0) html += '</div></div>';
                            else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                            $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                            $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function (e) { var g = $(this).data('group'); var $body = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); var $arrow = $(this).find('.ba-notif-group-arrow'); if ($body.is(':visible')) { $body.slideUp(200); $arrow.text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $body.slideDown(200); $arrow.text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                            $list.off('click.baNotifCancel').on('click.baNotifCancel', '.ba-notif-cancel-btn', function (e) { e.preventDefault(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($(this).data('job-id'), 10); if (!jobId) return; var idx = parseInt($item.data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || {}; var serverName = (job.serverName || '').trim(); var dbName = (job.databaseName || '').trim(); var jobType = (job.type || job.typeLabel || 'Restore').toString(); var jobDesc = (serverName || dbName) ? (serverName + ' → ' + dbName) : ('Job #' + jobId); var msg = 'Bạn có chắc muốn hủy job:\n' + jobDesc + '\nLoại: ' + jobType + '\n\nHành động không thể hoàn tác.'; var $btn = $(this); if (typeof baConfirm === 'function') baConfirm(msg, function () { $btn.prop('disabled', true); $.ajax({ url: cancelJobUrl, type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ jobId: jobId }), success: function (r) { var d = r.d || r; if (d && d.success) loadBellPanel(); else $btn.prop('disabled', false); }, error: function () { $btn.prop('disabled', false); } }); }, null, 'Đồng ý', 'Thoát'); });
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
