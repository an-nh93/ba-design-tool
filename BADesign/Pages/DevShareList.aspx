<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DevShareList.aspx.cs" Inherits="BADesign.Pages.DevShareList" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Chia sẻ cộng đồng - Chia sẻ kỹ năng code</title>
    <uc:BaHead runat="server" />
    <link href="<%= ResolveUrl("~/Content/devshare.css") %>?v=20261123" rel="stylesheet" />
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <div class="devshare-hero">
                    <h1 class="devshare-page-title">Chia sẻ cộng đồng</h1>
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

                <div id="devshareDraftsWrap" class="devshare-drafts-section" style="display:none; margin-bottom: 1.5rem;">
                    <h2 class="devshare-drafts-title" style="font-size: 1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">📝 Bài nháp của tôi</h2>
                    <p class="devshare-drafts-desc" style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.75rem;">Các bài đã lưu nháp chưa xuất bản. Bấm "Sửa" để tiếp tục hoặc "Xuất bản" trên trang sửa.</p>
                    <div id="devshareDraftsList" class="devshare-drafts-list"></div>
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
            var getMyDraftsUrl = '<%= ResolveUrl("~/Pages/DevShareList.aspx/GetMyDrafts") %>';
            var deletePostUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/DeletePost") %>';
            var viewBaseUrl = '<%= ResolveUrl("~/DevShare/View/") %>';
            var editBaseUrl = '<%= ResolveUrl("~/DevShare/Edit") %>';
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

            function loadDrafts() {
                $.ajax({
                    type: 'POST',
                    url: getMyDraftsUrl,
                    contentType: 'application/json',
                    data: '{}',
                    success: function (res) {
                        var data = typeof res === 'string' ? JSON.parse(res) : res;
                        if (data && data.d !== undefined) data = data.d;
                        if (!data || !data.success || !data.list || data.list.length === 0) {
                            $('#devshareDraftsWrap').hide();
                            return;
                        }
                        var list = data.list;
                        $('#devshareDraftsWrap').show();
                        var html = '';
                        list.forEach(function (p) {
                            var editUrl = editBaseUrl + (editBaseUrl.indexOf('?') >= 0 ? '&' : '?') + 'id=' + p.id;
                            var tags = (p.languageTags || '').split(',').filter(Boolean).map(function (t) { return t.trim(); });
                            var tagHtml = tags.map(function (t) { return '<span class="devshare-tag">' + (t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</span>'; }).join(' ');
                            var dateStr = p.updatedAt || '';
                            if (dateStr) { try { var d = new Date(dateStr); dateStr = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { if (dateStr.length >= 10) dateStr = dateStr.substring(0, 10); } }
                            var titleEsc = (p.title || '(Chưa có tiêu đề)').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            var summaryEsc = (p.summary || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            html += '<div class="devshare-card devshare-draft-card"><div class="devshare-card-header"><span class="devshare-card-title" style="cursor:default;">' + titleEsc + '</span> <span class="devshare-draft-badge" style="font-size:0.7rem;background:var(--text-muted);color:var(--bg-card);padding:2px 6px;border-radius:4px;">Nháp</span> <div class="devshare-card-btns"><a href="' + editUrl + '" class="ba-btn ba-btn-sm ba-btn-primary">Sửa</a> <button type="button" class="ba-btn ba-btn-sm ba-btn-danger devshare-delete-post" data-id="' + p.id + '" data-title="' + titleEsc + '">Xóa</button></div></div>';
                            if (summaryEsc) html += '<p class="devshare-card-summary" translate="no">' + summaryEsc + '</p>';
                            html += '<div class="devshare-card-meta">' + tagHtml + ' <span class="devshare-meta-sep">|</span> <span>Cập nhật: ' + dateStr + '</span></div></div>';
                        });
                        $('#devshareDraftsList').html(html);
                        bindDeleteButtons();
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
                            card.append($('<div class="devshare-card-header"><a class="devshare-card-title" translate="no" href="' + url + '">' + escapeHtml(p.title) + '</a>' + headerBtns + '</div>'));
                            if (p.summary) card.append($('<p class="devshare-card-summary" translate="no">' + escapeHtml(p.summary) + '</p>'));
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
                loadDrafts();
                loadList(false);
                $('#devshareSearch').on('keyup', function (e) { if (e.which === 13) loadList(false); });
                $('#devshareTag, #devshareSort').on('change', function () { loadList(false); });
                $('#devshareSearch').on('input', function () { clearTimeout(window._devshareSearchT); window._devshareSearchT = setTimeout(function () { loadList(false); }, 400); });
                $('#devshareLoadMoreBtn').on('click', function () { loadList(true); });
            });
        })();
    </script>
</body>
</html>
