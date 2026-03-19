<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DevShareEdit.aspx.cs" Inherits="BADesign.Pages.DevShareEdit" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Dev Share - Viết bài</title>
    <link href="<%= ResolveUrl("~/Content/bootstrap.min.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/ba-layout.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/ba-notification-bell.css") %>" rel="stylesheet" />
    <link href="<%= ResolveUrl("~/Content/devshare.css") %>" rel="stylesheet" />
    <script src="<%= ResolveUrl("~/Scripts/jquery-1.10.2.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/jquery.signalR.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/ba-signalr.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/bootstrap.min.js") %>"></script>
    <script src="<%= ResolveUrl("~/Scripts/ba-layout.js") %>"></script>
    <script src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"></script>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <h1 class="devshare-page-title"><%= EditPostId.HasValue ? "Chỉnh sửa bài" : "Viết bài" %></h1>
                <div id="devshareEditError" class="devshare-error" style="display:none;"></div>
                <div id="devshareEditSuccess" style="display:none; color: var(--success); margin-bottom: 1rem;">Đã lưu.</div>
                <div class="ba-card devshare-edit-card">
                    <div class="ba-form-group">
                        <label class="ba-form-label">Tiêu đề (*)</label>
                        <input type="text" id="devshareTitle" class="ba-input" placeholder="Ví dụ: Group by report N cấp với C#" maxlength="500" style="max-width: 100%;" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Tóm tắt (hiển thị ở danh sách)</label>
                        <input type="text" id="devshareSummary" class="ba-input" placeholder="Mô tả ngắn 1-2 câu" maxlength="1000" style="max-width: 100%;" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Nội dung – soạn như Word: in đậm, màu chữ, paste ảnh (Ctrl+V), kéo to/nhỏ ảnh, chèn code block chọn ngôn ngữ (C#, SQL, JavaScript...)</label>
                        <textarea id="devshareBody"></textarea>
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Tag (C#, SQL, JavaScript,...) - phân cách bằng dấu phẩy</label>
                        <input type="text" id="devshareTags" class="ba-input" placeholder="C#, SQL, ASP.NET" maxlength="500" style="max-width: 100%;" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">File đính kèm (ZIP hoặc file code: .cs, .js, .sql,... tối đa 20MB/file)</label>
                        <input type="file" id="devshareFileInput" multiple accept=".zip,.cs,.js,.sql,.config,.html,.css,.php,.aspx,.json,.xml,.txt,.vb,.md" />
                        <div id="devshareExistingFiles" class="devshare-existing-files" style="margin-top: 0.5rem;"></div>
                        <div id="devsharePendingFiles" class="devshare-pending-files" style="margin-top: 0.5rem;"></div>
                    </div>
                    <div class="devshare-actions">
                        <button type="button" id="devshareSaveDraft" class="ba-btn ba-btn-secondary">Lưu nháp</button>
                        <button type="button" id="devsharePublish" class="ba-btn ba-btn-primary">Xuất bản</button>
                        <a href="<%= ResolveUrl("~/DevShare") %>" class="ba-btn ba-btn-secondary">Hủy</a>
                    </div>
                </div>
            </div>
        </main>
    </form>
    <script>
        (function () {
            var editPostId = <%= EditPostId ?? 0 %>;
            var getPostUrl = '<%= ResolveUrl("~/Pages/DevShareEdit.aspx/GetPost") %>';
            var savePostUrl = '<%= ResolveUrl("~/Pages/DevShareEdit.aspx/SavePost") %>';
            var getAttachmentsUrl = '<%= ResolveUrl("~/Pages/DevShareEdit.aspx/GetAttachments") %>';
            var uploadUrl = '<%= ResolveUrl("~/Handlers/UploadDevShareAttachment.ashx") %>';
            var downloadAttachmentUrl = '<%= ResolveUrl("~/Handlers/DownloadDevShareAttachment.ashx") %>';
            var viewUrl = '<%= ResolveUrl("~/DevShare/View/") %>';
            var listUrl = '<%= ResolveUrl("~/DevShare") %>';
            var imageUploadUrl = '<%= ResolveUrl("~/Handlers/UploadFeedbackImage.ashx") %>';
            var pendingFiles = [];
            var existingAttachments = [];
            var editorId = 'devshareBody';
            var inProgressUpload = null;

            function initEditor() {
                if (typeof tinymce === 'undefined') return;
                tinymce.init({
                    selector: '#' + editorId,
                    base_url: 'https://cdn.jsdelivr.net/npm/tinymce@6',
                    suffix: '.min',
                    skin: 'oxide-dark',
                    content_css: 'dark',
                    branding: false,
                    promotion: false,
                    height: 480,
                    width: '100%',
                    plugins: 'lists link image table code codesample charmap autosave',
                    toolbar: 'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link image | table codesample code | removeformat',
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
                        { text: 'C#', value: 'csharp' },
                        { text: 'ASP.NET', value: 'csharp' },
                        { text: 'Go (Golang)', value: 'go' },
                        { text: 'JavaScript', value: 'javascript' },
                        { text: 'React (JSX)', value: 'jsx' },
                        { text: 'SQL', value: 'sql' },
                        { text: 'PostgreSQL', value: 'sql' },
                        { text: 'CSS', value: 'css' },
                        { text: 'HTML', value: 'markup' },
                        { text: 'PHP', value: 'php' },
                        { text: 'JSON', value: 'json' }
                    ],
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; }',
                    init_instance_callback: function (ed) {
                        if (editPostId) loadPost();
                    }
                });
            }

            function getBody() {
                var ed = tinymce.get(editorId);
                return ed ? ed.getContent() : ($('#' + editorId).val() || '');
            }
            function setBody(v) {
                var ed = tinymce.get(editorId);
                if (ed) ed.setContent(v || '');
                else $('#' + editorId).val(v || '');
            }

            function loadPost() {
                if (!editPostId) return;
                $.ajax({
                    url: getPostUrl,
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ id: editPostId }),
                    dataType: 'json',
                    success: function (res) {
                        var data = res && res.d !== undefined ? res.d : res;
                        if (!data || !data.success || !data.post) {
                            $('#devshareEditError').text(data && data.message ? data.message : 'Không tải được bài.').show();
                            return;
                        }
                        var p = data.post;
                        $('#devshareTitle').val(p.title || '');
                        $('#devshareSummary').val(p.summary || '');
                        setBody(p.body || '');
                        $('#devshareTags').val(p.languageTags || '');
                        loadExistingAttachments();
                    },
                    error: function () { $('#devshareEditError').text('Lỗi kết nối.').show(); }
                });
            }

            function loadExistingAttachments() {
                if (!editPostId) return;
                $.ajax({
                    url: getAttachmentsUrl,
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ postId: editPostId }),
                    dataType: 'json',
                    success: function (res) {
                        var data = res && res.d !== undefined ? res.d : res;
                        if (data && data.success && data.list) {
                            existingAttachments = data.list;
                            renderExistingAttachments();
                        }
                    }
                });
            }
            function renderExistingAttachments() {
                var html = '';
                if (existingAttachments.length > 0) {
                    html += '<div class="devshare-attachments-label" style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:0.25rem;">Đã đính kèm (đã lưu):</div>';
                    existingAttachments.forEach(function (a) {
                        var sizeStr = (a.fileSizeBytes && a.fileSizeBytes < 1024) ? (a.fileSizeBytes + ' B') : (a.fileSizeBytes < 1024 * 1024) ? ((a.fileSizeBytes / 1024).toFixed(1) + ' KB') : ((a.fileSizeBytes / (1024 * 1024)).toFixed(1) + ' MB');
                        var downUrl = downloadAttachmentUrl + '?id=' + (a.id || '');
                        html += '<div class="devshare-attachment-item"><span>' + (a.originalFileName || '').replace(/</g, '&lt;') + '</span> <span>' + (sizeStr || '') + '</span> <a href="' + downUrl + '" class="ba-btn ba-btn-sm ba-btn-secondary" target="_blank">Tải về</a></div>';
                    });
                }
                $('#devshareExistingFiles').html(html);
            }

            function renderPendingFiles() {
                var html = '';
                if (pendingFiles.length > 0) {
                    html += '<div class="devshare-attachments-label" style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:0.25rem;">File mới thêm (sẽ lưu khi bấm Lưu nháp / Xuất bản):</div>';
                    pendingFiles.forEach(function (f, i) {
                        html += '<div class="devshare-attachment-item"><span>' + (f.originalFileName || f.fileKey).replace(/</g, '&lt;') + '</span> <span>' + (f.fileSizeBytes ? (f.fileSizeBytes < 1024 ? f.fileSizeBytes + ' B' : (f.fileSizeBytes < 1024*1024 ? (f.fileSizeBytes/1024).toFixed(1) + ' KB' : (f.fileSizeBytes/(1024*1024)).toFixed(1) + ' MB')) : '') + '</span> <button type="button" class="ba-btn ba-btn-sm ba-btn-danger" data-index="' + i + '">Xóa</button></div>';
                    });
                }
                $('#devsharePendingFiles').html(html);
                $('#devsharePendingFiles button').on('click', function () {
                    var i = parseInt($(this).data('index'), 10);
                    pendingFiles.splice(i, 1);
                    renderPendingFiles();
                });
            }

            function uploadFilesFromInput(inputEl, doneCallback) {
                var files = inputEl && inputEl.files;
                if (!files || !files.length) { if (doneCallback) doneCallback(true); return; }
                var formData = new FormData();
                formData.append('postId', editPostId || '0');
                for (var i = 0; i < Math.min(files.length, 5); i++) formData.append('file' + i, files[i]);
                $.ajax({
                    url: uploadUrl,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (res) {
                        var data = typeof res === 'string' ? JSON.parse(res) : res;
                        if (data && data.success && data.files) {
                            data.files.forEach(function (f) { pendingFiles.push(f); });
                            renderPendingFiles();
                        } else { if (typeof baAlert === 'function') baAlert(data && data.message ? data.message : 'Upload thất bại.'); }
                        if (inputEl) inputEl.value = '';
                        if (doneCallback) doneCallback(!!(data && data.success));
                    },
                    error: function () {
                        if (typeof baAlert === 'function') baAlert('Upload thất bại.');
                        if (doneCallback) doneCallback(false);
                    }
                });
            }

            $('#devshareFileInput').on('change', function () {
                var inputEl = this;
                var files = inputEl.files;
                if (!files || !files.length) return;
                inProgressUpload = $.ajax({
                    url: uploadUrl,
                    type: 'POST',
                    data: (function () {
                        var fd = new FormData();
                        fd.append('postId', editPostId || '0');
                        for (var i = 0; i < Math.min(files.length, 5); i++) fd.append('file' + i, files[i]);
                        return fd;
                    })(),
                    processData: false,
                    contentType: false
                });
                inProgressUpload.done(function (res) {
                    var data;
                    try { data = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) { if (typeof baAlert === 'function') baAlert('Phản hồi upload không hợp lệ. Kiểm tra kích thước file (tối đa 20MB) hoặc đăng nhập.'); inputEl.value = ''; return; }
                    if (data && data.success && data.files && data.files.length) {
                        data.files.forEach(function (f) { pendingFiles.push(f); });
                        renderPendingFiles();
                        inputEl.value = '';
                    } else {
                        if (typeof baAlert === 'function') baAlert(data && data.message ? data.message : 'Upload thất bại.');
                        inputEl.value = '';
                    }
                });
                inProgressUpload.fail(function (xhr) {
                    var msg = 'Upload thất bại.';
                    if (xhr && xhr.status === 413) msg = 'File quá lớn (tối đa 20MB/file).';
                    else if (xhr && xhr.status === 401) msg = 'Cần đăng nhập để đính kèm file.';
                    else if (xhr && xhr.responseText) { try { var j = JSON.parse(xhr.responseText); if (j && j.message) msg = j.message; } catch (e) {} }
                    if (typeof baAlert === 'function') baAlert(msg);
                });
                inProgressUpload.always(function () { inProgressUpload = null; });
            });

            function save(publish) {
                var title = $('#devshareTitle').val().trim();
                if (!title) { $('#devshareEditError').text('Vui lòng nhập tiêu đề.').show(); return; }
                var summary = $('#devshareSummary').val().trim();
                var tags = $('#devshareTags').val().trim();
                $('#devshareEditError').hide();
                $('#devshareEditSuccess').hide();
                var $draft = $('#devshareSaveDraft'), $pub = $('#devsharePublish');
                var draftText = $draft.text(), pubText = $pub.text();
                $draft.prop('disabled', true).text('Đang lưu...');
                $pub.prop('disabled', true).text('Đang lưu...');
                function restoreBtns() {
                    $draft.prop('disabled', false).text(draftText);
                    $pub.prop('disabled', false).text(pubText);
                }
                function doSave() {
                    var tempKeys = pendingFiles.map(function (f) { return f.fileKey; });
                    var tempAttachments = pendingFiles.map(function (f) { return { fileKey: f.fileKey, originalFileName: f.originalFileName || '', fileSizeBytes: f.fileSizeBytes || 0 }; });
                    var body = getBody();
                    $.ajax({
                        url: savePostUrl,
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        data: JSON.stringify({ id: editPostId || 0, title: title, summary: summary, body: body, languageTags: tags, publish: publish, tempFileKeysJson: JSON.stringify(tempKeys), tempAttachmentsJson: JSON.stringify(tempAttachments) }),
                        dataType: 'json',
                        success: function (res) {
                            restoreBtns();
                            var data = res && res.d !== undefined ? res.d : res;
                            if (!data || !data.success) {
                                $('#devshareEditError').text(data && data.message ? data.message : 'Lưu thất bại.').show();
                                $('#devshareEditError')[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                return;
                            }
                            var ed = tinymce.get(editorId);
                            if (ed && typeof ed.setDirty === 'function') ed.setDirty(false);
                            var now = new Date();
                            var timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            $('#devshareEditSuccess').text(publish ? 'Đã xuất bản lúc ' + timeStr + '. Đang chuyển...' : 'Đã lưu nháp lúc ' + timeStr + '.').show();
                            $('#devshareEditSuccess')[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            if (data.postId) editPostId = data.postId;
                            pendingFiles = [];
                            renderPendingFiles();
                            if (publish) {
                                setTimeout(function () { window.location.href = viewUrl + data.postId; }, 800);
                            }
                        },
                        error: function (xhr, status, err) {
                            restoreBtns();
                            var msg = 'Lỗi kết nối.';
                            try {
                                if (xhr.responseJSON && xhr.responseJSON.Message) msg = xhr.responseJSON.Message;
                                else if (xhr.responseText) { var j = JSON.parse(xhr.responseText); if (j && j.Message) msg = j.Message; }
                            } catch (e) {}
                            $('#devshareEditError').text(msg).show();
                            $('#devshareEditError')[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    });
                }
                // Đợi upload file đính kèm đang chạy xong rồi mới gửi lưu (để tempFileKeysJson có đủ file vừa chọn)
                if (inProgressUpload) {
                    inProgressUpload.always(function () {
                        inProgressUpload = null;
                        doSave();
                    });
                } else {
                    doSave();
                }
            }

            $(function () {
                initEditor();
                $('#devshareSaveDraft').on('click', function () { save(false); });
                $('#devsharePublish').on('click', function () { save(true); });
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
                        window.__notifJobsList = jobs;
                        var html = '';
                        if (newBugs.length > 0) { html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;">🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs">'; newBugs.forEach(function(b) { html += '<div class="ba-notif-item ba-notif-bug"><div><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><a class="ba-notif-detail-link" href="' + feedbackManageUrl + '">Xem</a></div>'; }); html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;">Job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs">'; }
                        jobs.forEach(function(j, idx) { var st = j.status || '', type = j.type || 'Restore', typeLabel = j.typeLabel || (type === 'Backup' ? 'Backup' : type === 'HRHelperMultiDbAnalyze' ? 'Phân tích' : 'Restore'); var badge = type === 'Backup' ? 'ba-notif-type-backup' : 'ba-notif-type-restore'; var dbName = (j.databaseName || j.DatabaseName || '').trim(); var hasReset = type === 'Restore' && (j.withAutoReset === true || (j.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0)); var resetTag = (type === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag">Có Reset' : 'ba-notif-no-reset-tag">Không Reset') + '</span> ') : ''; var pct = (j.percentComplete != null) ? Number(j.percentComplete) : 0; var phase = (j.message || '').toString().trim(); var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + type + '"><button type="button" class="ba-notif-dismiss" title="Đã đọc">×</button><div><span class="ba-notif-type-badge ' + badge + '">' + typeLabel.replace(/</g, '&lt;') + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);font-size:0.8125rem;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + fmtTime(j.startTime) + '</div>'; if (st === 'Running') row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt);height:6px;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span>' + (pct + '%' + (phase ? ' - ' + phase : '')) + '</span></div>'; else if (st === 'Completed') row += '<div style="color:var(--success);">Đã xong</div>'; row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a></div>'; html += row; });
                        if (newBugs.length > 0) html += '</div></div>'; else html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;">Job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs">' + html + '</div></div>';
                        $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                        $list.off('click.detail').on('click.detail', '.ba-notif-detail-link[data-action="detail"]', function(e) { e.preventDefault(); var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || null; if (job && typeof window.showNotificationDetail === 'function') window.showNotificationDetail(job); });
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
