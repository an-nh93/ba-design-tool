<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DevShareList.aspx.cs" Inherits="BADesign.Pages.DevShareList" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Community Share - Chia sẻ kỹ năng code</title>
    <link href="<%= ResolveUrl("~/Content/bootstrap.min.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/ba-layout.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/ba-notification-bell.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/devshare.css") %>" rel="stylesheet" />
    <script src="<%= ResolveUrl("~/Scripts/jquery-1.10.2.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/jquery.signalR.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/ba-signalr.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/bootstrap.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/ba-layout.js") %>"></script>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <div class="devshare-hero">
                    <h1 class="devshare-page-title">Community Share</h1>
                    <p class="devshare-page-desc">Chia sẻ bài hướng dẫn code, ví dụ C#, SQL, ASP.NET, Go(Golang)…</p>
                </div>

                <div class="devshare-toolbar">
                    <input type="text" id="devshareSearch" class="ba-input devshare-search" placeholder="Tìm theo tiêu đề, tag, tóm tắt..." />
                    <select id="devshareTag" class="ba-input devshare-tag-select">
                        <option value="">Tất cả tag</option>
                    </select>
                    <select id="devshareSort" class="ba-input devshare-sort-select">
                        <option value="newest">Mới nhất</option>
                        <option value="views">Nhiều lượt xem</option>
                        <option value="useful">Hữu ích</option>
                    </select>
                    <a href="<%= ResolveUrl("~/DevShare/Edit") %>" class="ba-btn ba-btn-primary">Viết bài</a>
                </div>

                <div id="devshareListWrap" class="devshare-list">
                    <div id="devshareListLoading" class="devshare-loading">Đang tải...</div>
                    <div id="devshareListBody"></div>
                    <div id="devshareListLoadMore" class="devshare-load-more" style="display:none; margin-top: 1rem; text-align: center;">
                        <button type="button" id="devshareLoadMoreBtn" class="ba-btn ba-btn-secondary">Xem thêm</button>
                    </div>
                    <div id="devshareListEmpty" class="devshare-empty" style="display:none;">
                        Chưa có bài nào. Bạn có thể <a href="<%= ResolveUrl("~/DevShare/Edit") %>">Viết bài</a> đầu tiên.
                    </div>
                    <div id="devshareListError" class="devshare-error" style="display:none;"></div>
                </div>
            </div>
        </main>
    </form>
    <script>
        (function () {
            var getListUrl = '<%= ResolveUrl("~/Pages/DevShareList.aspx/GetPostList") %>';
            var getTagsUrl = '<%= ResolveUrl("~/Pages/DevShareList.aspx/GetTagList") %>';
            var deletePostUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/DeletePost") %>';
            var viewBaseUrl = '<%= ResolveUrl("~/DevShare/View/") %>';
            var currentUserId = <%= CurrentUserId %>;
            var isSuperAdmin = <%= IsSuperAdmin.ToString().ToLower() %>;

            function loadTags() {
                $.ajax({
                    type: 'POST',
                    url: getTagsUrl,
                    contentType: 'application/json',
                    data: '{}',
                    success: function (res) {
                        var data = typeof res === 'string' ? JSON.parse(res) : res;
                        if (data && data.d !== undefined) data = data.d;
                        if (data && data.success && data.tags) {
                            var $sel = $('#devshareTag');
                            $sel.find('option:not(:first)').remove();
                            data.tags.forEach(function (t) { $sel.append($('<option></option>').val(t).text(t)); });
                        }
                    }
                });
            }

            var pageSize = 20;
            var currentSkip = 0;
            var appendMode = false;

            function loadList(append) {
                appendMode = !!append;
                var search = $('#devshareSearch').val().trim();
                var tag = $('#devshareTag').val() || '';
                var sort = $('#devshareSort').val() || 'newest';
                if (!append) {
                    currentSkip = 0;
                    $('#devshareListLoading').show();
                    $('#devshareListBody').empty();
                    $('#devshareListLoadMore').hide();
                } else {
                    $('#devshareLoadMoreBtn').prop('disabled', true).text('Đang tải...');
                }
                $('#devshareListEmpty').hide();
                $('#devshareListError').hide();
                var skip = append ? currentSkip : 0;
                $.ajax({
                    type: 'POST',
                    url: getListUrl,
                    contentType: 'application/json',
                    data: JSON.stringify({ search: search, tag: tag, sort: sort, top: pageSize, skip: skip }),
                    success: function (res) {
                        $('#devshareListLoading').hide();
                        $('#devshareLoadMoreBtn').prop('disabled', false).text('Xem thêm');
                        var data = typeof res === 'string' ? JSON.parse(res) : res;
                        if (data && data.d !== undefined) data = data.d;
                        if (!data || !data.success) {
                            $('#devshareListError').text(data && data.message ? data.message : 'Lỗi tải danh sách.').show();
                            return;
                        }
                        var list = data.list || [];
                        if (list.length === 0 && !append) {
                            $('#devshareListEmpty').show();
                            return;
                        }
                        if (append) currentSkip += list.length;
                        else currentSkip = list.length;
                        list.forEach(function (p) {
                            var url = viewBaseUrl + p.id;
                            var canDelete = currentUserId && (p.authorId === currentUserId || isSuperAdmin);
                            var tags = (p.languageTags || '').split(',').filter(Boolean).map(function (t) { return t.trim(); });
                            var tagHtml = tags.map(function (t) { return '<span class="devshare-tag">' + escapeHtml(t) + '</span>'; }).join(' ');
                            var dateStr = p.updatedAt || p.publishedAt || p.createdAt || '';
                            if (dateStr) {
                                try { var d = new Date(dateStr); dateStr = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { if (dateStr.length >= 10) dateStr = dateStr.substring(0, 10); }
                            }
                            var headerBtns = '<div class="devshare-card-btns"><a href="' + url + '" class="ba-btn ba-btn-sm ba-btn-primary devshare-card-view">Xem</a>';
                            if (canDelete) headerBtns += ' <button type="button" class="ba-btn ba-btn-sm ba-btn-danger devshare-delete-post" data-id="' + p.id + '" data-title="' + escapeHtml(p.title) + '">Xóa</button>';
                            headerBtns += '</div>';
                            var metaStats = '<span class="devshare-meta-stat" data-icon="👁">' + (p.viewCount || 0) + ' lượt xem</span><span class="devshare-meta-stat" data-icon="👍">' + (p.usefulCount || 0) + ' hữu ích</span><span class="devshare-meta-stat" data-icon="💬">' + (p.commentCount || 0) + ' bình luận</span>';
                            var card = $('<div class="devshare-card"></div>');
                            card.append($('<div class="devshare-card-header"><a class="devshare-card-title" href="' + url + '">' + escapeHtml(p.title) + '</a>' + headerBtns + '</div>'));
                            if (p.summary) card.append($('<p class="devshare-card-summary">' + escapeHtml(p.summary) + '</p>'));
                            card.append($('<div class="devshare-card-meta">' + tagHtml + ' <span class="devshare-meta-sep">|</span> <span>' + escapeHtml(p.authorName || '') + '</span> <span class="devshare-meta-sep">|</span> <span>' + dateStr + '</span> <span class="devshare-meta-extra">' + metaStats + '</span></div>'));
                            $('#devshareListBody').append(card);
                        });
                        if (list.length >= pageSize) $('#devshareListLoadMore').show();
                        else $('#devshareListLoadMore').hide();
                        bindDeleteButtons();
                    },
                    error: function () {
                        $('#devshareListLoading').hide();
                        $('#devshareLoadMoreBtn').prop('disabled', false).text('Xem thêm');
                        $('#devshareListError').text('Lỗi kết nối.').show();
                    }
                });
            }

            function escapeHtml(s) {
                if (!s) return '';
                var d = document.createElement('div');
                d.textContent = s;
                return d.innerHTML;
            }

            function bindDeleteButtons() {
                $(document).off('click.devshareListDelete').on('click.devshareListDelete', '.devshare-delete-post', function (e) {
                    e.preventDefault(); e.stopPropagation();
                    var $btn = $(this); var pid = $btn.data('id'); var title = $btn.data('title') || 'bài viết này';
                    var msg = 'Bạn có chắc muốn xóa "' + title + '"? Hành động không thể hoàn tác.';
                    if (typeof baConfirm === 'function') baConfirm(msg, function () {
                        $btn.prop('disabled', true);
                        $.ajax({ url: deletePostUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ postId: pid }), dataType: 'json',
                            success: function (r) {
                                var d = r && r.d !== undefined ? r.d : r;
                                if (d && d.success) { $btn.closest('.devshare-card').fadeOut(300, function () { $(this).remove(); }); } else { if (typeof baAlert === 'function') baAlert(d && d.message ? d.message : 'Xóa thất bại.'); $btn.prop('disabled', false); }
                            },
                            error: function () { if (typeof baAlert === 'function') baAlert('Lỗi kết nối.'); $btn.prop('disabled', false); }
                        });
                    }, null, 'Đồng ý', 'Thoát');
                });
            }

            $(function () {
                loadTags();
                loadList(false);
                $('#devshareSearch').on('keyup', function (e) { if (e.which === 13) loadList(false); });
                $('#devshareTag, #devshareSort').on('change', function () { loadList(false); });
                $('#devshareSearch').on('input', function () { clearTimeout(window._devshareSearchT); window._devshareSearchT = setTimeout(function () { loadList(false); }, 400); });
                $('#devshareLoadMoreBtn').on('click', function () { loadList(true); });
            });
        })();
    </script>
    <script>
        (function() {
            var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
            var dismissJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissJob") %>';
            var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
            var functionQueueUrl = '<%= ResolveUrl("~/FunctionQueue") %>';
            var DISMISSED_KEY = 'baDismissedJobIds';
            function getDismissed() { try { var r = localStorage.getItem(DISMISSED_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } }
            function addDismissed(id, type) { var k = (type === 'Backup' ? 'b:' : 'r:') + id; var a = getDismissed(); if (a.indexOf(k) < 0) { a.push(k); localStorage.setItem(DISMISSED_KEY, JSON.stringify(a)); } }
            function isDismissed(j) { return getDismissed().indexOf((j.type === 'Backup' ? 'b:' : 'r:') + (j.id || '')) >= 0; }
            function parseDateSafe(v) { if (v == null || v === '') return null; if (typeof v === 'number') return new Date(v); var s = String(v); var m = s.match(/\/Date\((\d+)\)\//); if (m) return new Date(parseInt(m[1], 10)); return isNaN(Date.parse(s)) ? null : new Date(s); }
            function fmtTime(v) { var d = parseDateSafe(v); return d ? d.toLocaleString() : '—'; }
            function loadBellPanel() {
                var $list = $('#restoreJobsList'), $badge = $('#restoreJobsBadge');
                if (!$list.length) return;
                $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (!d) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                        var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isDismissed(j); }).sort(function(a,b) { var ta = parseDateSafe(a.startTime); var tb = parseDateSafe(b.startTime); return (tb && ta) ? (tb - ta) : 0; });
                        var newBugs = d.newBugs || [], total = jobs.length + newBugs.length;
                        if (!total) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                        $badge.text(total).addClass('visible');
                        var html = '';
                        if (newBugs.length > 0) { html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;">🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs">'; newBugs.forEach(function(b) { html += '<div class="ba-notif-item ba-notif-bug"><div><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><a class="ba-notif-detail-link" href="' + feedbackManageUrl + '">Xem</a></div>'; }); html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;">Job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs">'; }
                        jobs.forEach(function(j) { var st = j.status || '', type = j.type || 'Restore', typeLabel = j.typeLabel || (type === 'Backup' ? 'Backup' : type === 'HRHelperMultiDbAnalyze' ? 'Phân tích' : 'Restore'); var badge = type === 'Backup' ? 'ba-notif-type-backup' : 'ba-notif-type-restore'; var row = '<div class="ba-notif-item" data-job-id="' + (j.id || '') + '" data-job-type="' + type + '"><button type="button" class="ba-notif-dismiss" title="Đã đọc">×</button><div><span class="ba-notif-type-badge ' + badge + '">' + typeLabel.replace(/</g, '&lt;') + '</span> ' + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);font-size:0.8125rem;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + fmtTime(j.startTime) + '</div>'; if (st === 'Running') row += '<div style="color:var(--primary);">Đang chạy</div>'; else if (st === 'Completed') row += '<div style="color:var(--success);">Đã xong</div>'; row += '<a class="ba-notif-detail-link" href="' + functionQueueUrl + '">Xem chi tiết</a></div>'; html += row; });
                        if (newBugs.length > 0) html += '</div></div>'; else html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;">Job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs">' + html + '</div></div>';
                        $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                        $list.off('click.dismiss').on('click.dismiss', '.ba-notif-dismiss', function(e) { e.preventDefault(); e.stopPropagation(); var $i = $(this).closest('.ba-notif-item'); var id = parseInt($i.data('job-id'), 10); var typ = $i.data('job-type') || 'Restore'; if (id) { addDismissed(id, typ); $.ajax({ url: dismissJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: id }) }); $i.slideUp(200); var n = $list.find('.ba-notif-item').length; if (n > 0) $badge.text(n).addClass('visible'); else { $badge.removeClass('visible'); $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } } });
                    }
                });
            }
            $(function() {
                if (!$('#restoreJobsBellWrap').length) return;
                $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); }); var total = jobs.length + (d.newBugs || []).length; if (total) $('#restoreJobsBadge').text(total).addClass('visible'); } } });
                $('#restoreJobsBellBtn').on('click', function(e) { e.stopPropagation(); var $p = $('#restoreJobsPanel'); if ($p.is(':visible')) $p.hide(); else { loadBellPanel(); $p.show(); } });
                $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
                $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
            });
        })();
    </script>
</body>
</html>
