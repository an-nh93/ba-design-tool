<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DevShareView.aspx.cs" Inherits="BADesign.Pages.DevShareView" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Community Share - Xem bài</title>
    <link href="<%= ResolveUrl("~/Content/bootstrap.min.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/ba-layout.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/ba-notification-bell.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/devshare.css") %>" rel="stylesheet" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <script src="<%= ResolveUrl("~/Scripts/jquery-1.10.2.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/jquery.signalR.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/ba-signalr.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/bootstrap.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/ba-layout.js") %>"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup-templating.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-php.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-go.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-xml-doc.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.9/dist/purify.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"></script>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <div id="devshareViewLoading" class="devshare-loading">Đang tải...</div>
                <div id="devshareViewError" class="devshare-error" style="display:none;"></div>
                <div id="devshareViewContent" class="devshare-article" style="display:none;"></div>
                <div id="devshareCommentsSection" class="devshare-comments">
                    <h3>Bình luận</h3>
                    <div class="devshare-comments-sort">
                        <label>Sắp xếp:</label>
                        <select id="devshareCommentsSort">
                            <option value="time_asc">Mới nhất trước</option>
                            <option value="time_desc">Cũ nhất trước</option>
                            <option value="useful_desc">Hữu ích nhất</option>
                        </select>
                    </div>
                    <p class="devshare-comment-hint">Soạn như Word: in đậm, paste ảnh (Ctrl+V), chèn code block chọn ngôn ngữ (C#, SQL...)</p>
                    <div id="devshareCommentsList"></div>
                    <div class="devshare-comment-form">
                        <textarea id="devshareCommentBody"></textarea>
                        <div class="devshare-comment-toolbar">
                            <button type="button" id="devshareCommentSubmit" class="ba-btn ba-btn-primary">Gửi</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </form>
    <script>
        (function () {
            var postId = <%= PostId ?? 0 %>;
            var getPostUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/GetPost") %>';
            var incrementViewUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/IncrementViewCount") %>';
            var getCommentsUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/GetComments") %>';
            var addCommentUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/AddComment") %>';
            var toggleUsefulUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/ToggleUseful") %>';
            var toggleCommentUsefulUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/ToggleCommentUseful") %>';
            var deletePostUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/DeletePost") %>';
            var getAttachmentsUrl = '<%= ResolveUrl("~/Pages/DevShareView.aspx/GetAttachments") %>';
            var editUrl = '<%= ResolveUrl("~/DevShare/Edit") %>';
            var downloadUrl = '<%= ResolveUrl("~/Handlers/DownloadDevShareAttachment.ashx") %>';
            var imageUploadUrl = '<%= ResolveUrl("~/Handlers/UploadFeedbackImage.ashx") %>';
            var listUrl = '<%= ResolveUrl("~/DevShare") %>';
            var editUrl = '<%= ResolveUrl("~/DevShare/Edit/") %>';
            var currentUserId = <%= CurrentUserId %>;
            var isSuperAdmin = <%= IsSuperAdmin.ToString().ToLower() %>;
            var currentAuthorId = 0;

            function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
            function formatDate(iso) {
                if (!iso) return '';
                try { var d = new Date(iso); return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { return iso; }
            }
            function formatFileSize(bytes) {
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
                return (bytes/(1024*1024)).toFixed(1) + ' MB';
            }

            marked.setOptions({ gfm: true, breaks: true });

            var langDisplay = { csharp: 'C#', aspnet: 'ASP.NET', go: 'Go', javascript: 'JavaScript', js: 'JavaScript', jsx: 'React (JSX)', sql: 'SQL', postgresql: 'PostgreSQL', css: 'CSS', html: 'HTML', markup: 'HTML', php: 'PHP', json: 'JSON' };
            function wrapCodeBlocks(html) {
                var div = document.createElement('div');
                div.innerHTML = html;
                var codeEls = div.querySelectorAll('pre code');
                var arr = Array.prototype.slice.call(codeEls);
                var idx = 0;
                arr.forEach(function (code) {
                    idx++;
                    var pre = code.parentElement;
                    if (!pre || pre.tagName !== 'PRE') return;
                    var codeLang = (code.className || '').match(/language-(\S+)/);
                    var preLang = (pre.className || '').match(/language-(\S+)/);
                    var lang = (codeLang ? codeLang[1] : (preLang ? preLang[1] : 'text')).split(/\s+/)[0] || 'text';
                    var langLabel = langDisplay[lang.toLowerCase()] || (lang === 'text' || !lang ? 'Code' : lang);
                    var id = 'code-' + idx;
                    code.setAttribute('id', id);
                    var wrapper = document.createElement('div');
                    wrapper.className = 'devshare-code-block';
                    var header = document.createElement('div');
                    header.className = 'devshare-code-header';
                    header.innerHTML = '<span class="devshare-code-lang">' + escapeHtml(langLabel) + '</span><button type="button" class="ba-btn ba-btn-sm devshare-code-copy" data-target="' + id + '">Copy</button>';
                    wrapper.appendChild(header);
                    pre.parentNode.insertBefore(wrapper, pre);
                    wrapper.appendChild(pre);
                });
                return div.innerHTML;
            }

            function bindCopyButtons(container) {
                if (!container) container = document;
                $(container).find('.devshare-code-copy').off('click').on('click', function () {
                    var id = $(this).data('target');
                    var el = document.getElementById(id);
                    if (!el) return;
                    var text = el.textContent;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(function () { showToast('Đã copy'); });
                    } else {
                        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
                        try { document.execCommand('copy'); showToast('Đã copy'); } catch (e) { }
                        document.body.removeChild(ta);
                    }
                });
            }
            function showToast(msg) {
                var t = document.createElement('div');
                t.className = 'ba-toast';
                t.textContent = msg;
                t.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:10px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;font-size:0.875rem;z-index:9999;';
                document.body.appendChild(t);
                setTimeout(function () { t.remove(); }, 2000);
            }

            function loadPost() {
                if (!postId) {
                    $('#devshareViewLoading').hide();
                    $('#devshareViewError').text('Thiếu id bài viết.').show();
                    return;
                }
                $.ajax({
                    url: getPostUrl,
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ id: postId }),
                    dataType: 'json',
                    success: function (res) {
                        var data = res && res.d !== undefined ? res.d : res;
                        if (!data || !data.success || !data.post) {
                            $('#devshareViewLoading').hide();
                            $('#devshareViewError').text(data && data.message ? data.message : 'Không tải được bài viết.').show();
                            return;
                        }
                        var p = data.post;
                        currentAuthorId = p.authorId;
                        $.ajax({ url: incrementViewUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ id: postId }), dataType: 'json' });
                    var postHasVoted = !!(p.hasVoted);
                    var tags = (p.languageTags || '').split(',').filter(Boolean).map(function (t) { return t.trim(); });
                    var tagHtml = tags.map(function (t) { return '<span class="devshare-tag">' + escapeHtml(t) + '</span>'; }).join(' ');
                    var headerHtml = '<div class="devshare-header"><h1>' + escapeHtml(p.title) + '</h1><div class="devshare-meta">' + tagHtml + ' · ' + escapeHtml(p.authorName) + ' · ' + formatDate(p.updatedAt) + ' · ' + (p.viewCount || 0) + ' lượt xem · ' + (p.usefulCount || 0) + ' hữu ích</div></div>';
                    var rawBody = (p.body || '').trim();
                    var bodyHtml;
                    if (rawBody.indexOf('<') === 0 && rawBody.indexOf('>') !== -1) {
                        bodyHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawBody, { ADD_ATTR: ['target'] }) : rawBody;
                    } else {
                        bodyHtml = marked.parse(rawBody);
                    }
                    bodyHtml = wrapCodeBlocks(bodyHtml);
                    var thumbIcon = postHasVoted ? '👍' : '👍';
                    var usefulBtnClass = postHasVoted ? 'ba-btn ba-btn-primary devshare-useful-active' : 'ba-btn ba-btn-secondary';
                    var canEdit = currentUserId && (currentAuthorId === currentUserId || isSuperAdmin);
                    var actionsHtml = '<div class="devshare-actions"><a href="' + listUrl + '" class="ba-btn ba-btn-secondary">← Danh sách</a> <button type="button" id="devshareUsefulBtn" class="' + usefulBtnClass + '" data-useful="' + (postHasVoted ? '1' : '0') + '">' + thumbIcon + ' Hữu ích (' + (p.usefulCount || 0) + ')</button>';
                    if (canEdit)
                        actionsHtml = '<div class="devshare-actions"><a href="' + listUrl + '" class="ba-btn ba-btn-secondary">← Danh sách</a> <a href="' + editUrl + p.id + '" class="ba-btn ba-btn-primary">Chỉnh sửa</a> <button type="button" id="devshareUsefulBtn" class="' + usefulBtnClass + '" data-useful="' + (postHasVoted ? '1' : '0') + '">' + thumbIcon + ' Hữu ích (' + (p.usefulCount || 0) + ')</button> <button type="button" id="devshareDeleteBtn" class="ba-btn ba-btn-danger">Xóa</button></div>';
                    else
                        actionsHtml += '</div>';
                    $('#devshareViewContent').html(headerHtml + '<div class="devshare-body">' + bodyHtml + '</div>' + actionsHtml).show();
                    $('#devshareViewLoading').hide();
                    Prism.highlightAllUnder(document.getElementById('devshareViewContent'));
                    bindCopyButtons(document.getElementById('devshareViewContent'));
                    $(document).off('click.devshareDelete').on('click.devshareDelete', '#devshareDeleteBtn', function (e) {
                        e.preventDefault();
                        var $btn = $(this);
                        var msg = 'Bạn có chắc muốn xóa bài viết này? Hành động không thể hoàn tác.';
                        if (typeof baConfirm === 'function') baConfirm(msg, function () {
                            $btn.prop('disabled', true);
                            $.ajax({ url: deletePostUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ postId: postId }), dataType: 'json',
                                success: function (r) {
                                    var d = r && r.d !== undefined ? r.d : r;
                                    if (d && d.success) { window.location.href = listUrl; } else { if (typeof baAlert === 'function') baAlert(d && d.message ? d.message : 'Xóa thất bại.'); $btn.prop('disabled', false); }
                                },
                                error: function () { if (typeof baAlert === 'function') baAlert('Lỗi kết nối.'); $btn.prop('disabled', false); }
                            });
                        }, null, 'Đồng ý', 'Thoát');
                    });
                    $(document).off('click.devshareUseful').on('click.devshareUseful', '#devshareUsefulBtn', function (e) {
                        e.preventDefault();
                        var $btn = $(this);
                        if ($btn.prop('disabled')) return;
                        $btn.prop('disabled', true);
                        $.ajax({ url: toggleUsefulUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ postId: postId }), dataType: 'json',
                            success: function (r) {
                                var d = r && r.d !== undefined ? r.d : r;
                                if (d && d.success) {
                                    var n = d.usefulCount != null ? d.usefulCount : (parseInt($btn.text().replace(/\D/g, ''), 10) || 0);
                                    var voted = !!d.hasVoted;
                                    $btn.data('useful', voted ? 1 : 0).attr('data-useful', voted ? 1 : 0);
                                    $btn.removeClass('ba-btn-primary ba-btn-secondary devshare-useful-active').addClass(voted ? 'ba-btn-primary devshare-useful-active' : 'ba-btn-secondary');
                                    $btn.text('👍 Hữu ích (' + n + ')');
                                }
                                $btn.prop('disabled', false);
                            },
                            error: function () { $btn.prop('disabled', false); }
                        });
                    });
                        loadAttachments();
                        loadComments();
                        $('#devshareCommentsSection').show();
                    },
                    error: function () {
                        $('#devshareViewLoading').hide();
                        $('#devshareViewError').text('Lỗi kết nối.').show();
                    }
                });
            }

            function loadAttachments() {
                $.ajax({ url: getAttachmentsUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ postId: postId }), dataType: 'json',
                    success: function (res) {
                        var data = res && res.d !== undefined ? res.d : res;
                        if (!data || !data.success || !data.list || data.list.length === 0) return;
                        var html = '<div class="devshare-attachments"><h3>File đính kèm</h3>';
                        data.list.forEach(function (a) {
                            html += '<div class="devshare-attachment-item"><span class="devshare-attachment-name">' + escapeHtml(a.originalFileName) + '</span><span class="devshare-attachment-size">' + formatFileSize(a.fileSizeBytes) + '</span><a href="' + downloadUrl + '?id=' + a.id + '" class="ba-btn ba-btn-sm ba-btn-primary">Tải về</a></div>';
                        });
                        html += '</div>';
                        $('#devshareViewContent .devshare-body').after(html);
                    }
                });
            }

            function renderCommentBody(body) {
                if (!body) return '';
                var html;
                var t = (body || '').trim();
                if (t.indexOf('<') === 0 && t.indexOf('>') !== -1 && typeof DOMPurify !== 'undefined')
                    html = DOMPurify.sanitize(t, { ADD_ATTR: ['target'] });
                else
                    html = marked.parse(body);
                var div = document.createElement('div');
                div.innerHTML = html;
                var codeEls = div.querySelectorAll('pre code');
                var idx = 0;
                codeEls.forEach(function (code) {
                    idx++;
                    var pre = code.parentElement;
                    if (!pre || pre.tagName !== 'PRE') return;
                    var codeLang = (code.className || '').match(/language-(\S+)/);
                    var preLang = (pre.className || '').match(/language-(\S+)/);
                    var lang = (codeLang ? codeLang[1] : (preLang ? preLang[1] : 'text')).split(/\s+/)[0] || 'text';
                    var langLabel = langDisplay[lang.toLowerCase()] || (lang === 'text' || !lang ? 'Code' : lang);
                    var id = 'comment-code-' + idx + '-' + Date.now();
                    code.setAttribute('id', id);
                    var wrapper = document.createElement('div');
                    wrapper.className = 'devshare-code-block devshare-comment-code';
                    var header = document.createElement('div');
                    header.className = 'devshare-code-header';
                    header.innerHTML = '<span class="devshare-code-lang">' + escapeHtml(langLabel) + '</span><button type="button" class="ba-btn ba-btn-sm devshare-code-copy" data-target="' + id + '">Copy</button>';
                    wrapper.appendChild(header);
                    pre.parentNode.insertBefore(wrapper, pre);
                    wrapper.appendChild(pre);
                });
                return div.innerHTML;
            }
            var commentSort = 'time_asc';
            function loadComments() {
                $.ajax({ url: getCommentsUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ postId: postId, sort: commentSort }), dataType: 'json',
                    success: function (res) {
                        var data = res && res.d !== undefined ? res.d : res;
                        if (!data || !data.success) return;
                        var list = data.list || [];
                        var html = '';
                        list.forEach(function (c) {
                            var voted = !!(c.hasVoted);
                            var usefulBtnClass = voted ? 'ba-btn ba-btn-sm ba-btn-primary devshare-comment-useful-active' : 'ba-btn ba-btn-sm ba-btn-secondary';
                            html += '<div class="devshare-comment" data-id="' + c.id + '"><div class="devshare-comment-meta">' + escapeHtml(c.authorName) + ' · ' + formatDate(c.createdAt) + '<span class="devshare-comment-useful-wrap"><button type="button" class="devshare-comment-useful ' + usefulBtnClass + '" data-id="' + c.id + '" data-useful="' + (voted ? '1' : '0') + '" data-count="' + (c.usefulCount || 0) + '">👍 ' + (c.usefulCount || 0) + '</button></span></div><div class="devshare-comment-body">' + renderCommentBody(c.body) + '</div></div>';
                        });
                        $('#devshareCommentsList').html(html);
                        Prism.highlightAllUnder(document.getElementById('devshareCommentsList'));
                        bindCopyButtons(document.getElementById('devshareCommentsList'));
                        bindCommentUsefulButtons();
                    }
                });
            }
            function bindCommentUsefulButtons() {
                $(document).off('click.devshareCommentUseful').on('click.devshareCommentUseful', '.devshare-comment-useful', function (e) {
                    e.preventDefault();
                    var $btn = $(this);
                    var cid = $btn.data('id');
                    if (!$btn.data('id') || $btn.prop('disabled')) return;
                    $btn.prop('disabled', true);
                    $.ajax({ url: toggleCommentUsefulUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ commentId: cid }), dataType: 'json',
                        success: function (r) {
                            var d = r && r.d !== undefined ? r.d : r;
                            if (d && d.success) {
                                var n = d.usefulCount != null ? d.usefulCount : 0;
                                var voted = !!d.hasVoted;
                                $btn.data('useful', voted ? 1 : 0).attr('data-useful', voted ? 1 : 0).data('count', n);
                                $btn.removeClass('ba-btn-primary ba-btn-secondary devshare-comment-useful-active').addClass(voted ? 'ba-btn-primary devshare-comment-useful-active' : 'ba-btn-secondary');
                                $btn.text('👍 ' + n);
                            }
                            $btn.prop('disabled', false);
                        },
                        error: function () { $btn.prop('disabled', false); }
                    });
                });
            }

            function getCommentBody() {
                var ed = typeof tinymce !== 'undefined' ? tinymce.get('devshareCommentBody') : null;
                return ed ? ed.getContent() : ($('#devshareCommentBody').val() || '').trim();
            }
            function clearCommentBody() {
                var ed = typeof tinymce !== 'undefined' ? tinymce.get('devshareCommentBody') : null;
                if (ed) ed.setContent(''); else $('#devshareCommentBody').val('');
            }
            function initCommentEditor() {
                if (typeof tinymce === 'undefined') return;
                tinymce.init({
                    selector: '#devshareCommentBody',
                    base_url: 'https://cdn.jsdelivr.net/npm/tinymce@6',
                    suffix: '.min',
                    skin: 'oxide-dark',
                    content_css: 'dark',
                    branding: false,
                    promotion: false,
                    height: 280,
                    width: '100%',
                    plugins: 'lists link image codesample code',
                    toolbar: 'undo redo | bold italic | bullist numlist | link image | codesample code | removeformat',
                    paste_data_images: true,
                    automatic_uploads: true,
                    images_upload_handler: function (blobInfo, progress) {
                        return new Promise(function (resolve, reject) {
                            var formData = new FormData();
                            formData.append('upload', blobInfo.blob(), blobInfo.filename());
                            var xhr = new XMLHttpRequest();
                            xhr.open('POST', imageUploadUrl);
                            xhr.onload = function () {
                                if (xhr.status !== 200) { reject('Upload thất bại.'); return; }
                                try {
                                    var data = JSON.parse(xhr.responseText);
                                    if (data.url) resolve(data.url);
                                    else reject(data.error && data.error.message ? data.error.message : 'Upload thất bại.');
                                } catch (e) { reject('Upload thất bại.'); }
                            };
                            xhr.onerror = function () { reject('Upload thất bại.'); };
                            xhr.send(formData);
                        });
                    },
                    codesample_languages: [
                        { text: 'C#', value: 'csharp' }, { text: 'ASP.NET', value: 'csharp' },
                        { text: 'Go (Golang)', value: 'go' }, { text: 'JavaScript', value: 'javascript' },
                        { text: 'React (JSX)', value: 'jsx' }, { text: 'SQL', value: 'sql' }, { text: 'PostgreSQL', value: 'sql' },
                        { text: 'CSS', value: 'css' }, { text: 'HTML', value: 'markup' },
                        { text: 'PHP', value: 'php' }, { text: 'JSON', value: 'json' }
                    ],
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; }'
                });
            }

            $(function () {
                loadPost();
                initCommentEditor();
                $('#devshareCommentsSort').on('change', function () {
                    commentSort = $(this).val();
                    loadComments();
                });
                $('#devshareCommentSubmit').on('click', function () {
                    var body = getCommentBody();
                    if (!body) return;
                    $(this).prop('disabled', true);
                    $.ajax({ url: addCommentUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ postId: postId, body: body }), dataType: 'json',
                        success: function (res) {
                            $('#devshareCommentSubmit').prop('disabled', false);
                            var data = res && res.d !== undefined ? res.d : res;
                            if (data && data.success) {
                                clearCommentBody();
                                loadComments();
                            } else { alert(data && data.message ? data.message : 'Gửi thất bại.'); }
                        },
                        error: function () { $('#devshareCommentSubmit').prop('disabled', false); }
                    });
                });
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
