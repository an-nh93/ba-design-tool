<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Feedback.aspx.cs" Inherits="BADesign.Pages.Feedback" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Góp ý - HR Helper</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/summernote@0.8.20/dist/summernote.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <!-- Trang Feedback dùng Bootstrap 3 để Summernote dropdown/popover (font, cỡ chữ, màu...) mở được. Các trang khác vẫn dùng Bootstrap 5. -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/js/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        .ba-content { padding: 0.5rem; }
        .ba-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
        .ba-card-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem; }
        .ba-form-group { margin-bottom: 1rem; }
        .ba-form-label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.35rem; }
        .ba-input { background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; color: var(--text-primary); font-size: 0.875rem; width: 100%; max-width: 480px; }
        .ba-input:focus { outline: none; border-color: var(--primary); }
        /* Nút + modal dùng chung từ ba-layout.css */
        .ba-feedback-success { padding: 12px; background: rgba(16, 185, 129, 0.15); border-radius: 6px; color: var(--success, #10b981); margin-bottom: 1rem; display: none; flex-shrink: 0; }
        .ba-feedback-error { padding: 12px; background: rgba(239, 68, 68, 0.15); border-radius: 6px; color: var(--danger, #ef4444); margin-bottom: 1rem; display: none; flex-shrink: 0; }
        .ba-card .ba-form-group:not(:has(.note-editor)) { flex-shrink: 0; }
        .ba-card .ba-form-group:last-child { flex-shrink: 0; }
        .note-editor { background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; overflow: visible; flex: 1; min-height: 420px; display: flex; flex-direction: column; }
        .ba-card .ba-form-group:has(.note-editor),
        .ba-card .ba-form-group:has(#feedbackContent) { flex: 1; min-height: 420px; display: flex; flex-direction: column; }
        .ba-card .ba-form-group:has(.note-editor) > div { flex: 1; min-height: 400px; display: flex; flex-direction: column; }
        .note-editor .note-editing-area { background: var(--bg-card); color: var(--text-primary); flex: 1; min-height: 380px !important; height: 100% !important; }
        .note-toolbar { background: var(--bg-darker); border-bottom: 1px solid var(--border); overflow: visible; position: relative; }
        .note-btn { color: var(--text-primary); border-color: var(--border); }
        .note-btn:hover { background: var(--bg-hover); }
        /* Menu font/màu/cỡ chữ: Summernote dùng .note-btn-group chứa .dropdown-menu. */
        .note-editor .dropdown.open .dropdown-menu,
        .note-editor .note-btn-group.open .dropdown-menu { display: block !important; visibility: visible !important; opacity: 1 !important; position: absolute !important; }
        .note-editor .dropdown-menu { z-index: 1060; min-width: 160px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        /* CSS bên trong dropdown & color picker cho theme tối */
        .note-editor .dropdown-menu li a,
        .note-editor .dropdown-menu .dropdown-item { color: var(--text-primary) !important; background: transparent !important; }
        .note-editor .dropdown-menu li a:hover,
        .note-editor .dropdown-menu .dropdown-item:hover { background: var(--bg-hover) !important; color: var(--text-primary) !important; }
        .note-editor .note-palette,
        .note-editor .note-color-palette { background: var(--bg-card) !important; border: 1px solid var(--border) !important; }
        .note-editor .note-palette .note-color-btn,
        .note-editor .note-color-palette .note-color-btn { border-color: var(--border) !important; }
        .note-editor .note-palette .note-select-btn,
        .note-editor .note-color-palette .note-select-btn { background: var(--primary) !important; color: #fff !important; border: none !important; }
        /* Caption / title và nút Transparent, Reset: không để nền đen */
        .note-editor .note-palette-title,
        .note-editor .note-color-palette .note-palette-title { background: var(--bg-card) !important; color: var(--text-primary) !important; border: none !important; }
        .note-editor .note-color-reset,
        .note-editor .note-palette button[data-value="transparent"],
        .note-editor .note-color-palette button[data-value="transparent"] { background: var(--bg-darker) !important; color: var(--text-primary) !important; border: 1px solid var(--border) !important; }
        .note-editor .note-palette .note-palette-row,
        .note-editor .note-color-palette .note-palette-row { background: var(--bg-card) !important; }
        .ba-card .ba-form-group:has(#feedbackContent) { overflow: visible; }
        /* Modal dùng chung từ ba-layout.css */
        .ba-feedback-detail-content { border: 1px solid var(--border); border-radius: 6px; padding: 1rem; background: var(--bg-darker); max-height: 50vh; overflow-y: auto; }
        .ba-feedback-detail-content img { max-width: 100%; height: auto; }
        .ba-feedback-group { margin-bottom: 1rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-card); overflow: hidden; }
        .ba-feedback-group-header { padding: 0.75rem 1rem; font-weight: 600; font-size: 1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 0.5rem; user-select: none; }
        .ba-feedback-group-header:hover { background: var(--bg-hover); }
        .ba-feedback-group-header .ba-feedback-group-toggle { font-size: 0.75rem; transition: transform 0.2s; }
        .ba-feedback-group.collapsed .ba-feedback-group-toggle { transform: rotate(-90deg); }
        .ba-feedback-group-body { padding: 1rem; border-top: 1px solid var(--border); }
        .ba-feedback-group.collapsed .ba-feedback-group-body { display: none; }
        .ba-feedback-group-form .ba-card { margin-bottom: 0; }
        .ba-feedback-group-form .note-editor { min-height: 320px; }
        .ba-feedback-group-form .note-editor .note-editing-area { min-height: 280px !important; }
        .ba-feedback-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; }
        .ba-feedback-filter-item { display: inline-flex; flex-direction: column; gap: 2px; font-size: 0.8125rem; color: var(--text-muted); }
        .ba-feedback-filter-item span { font-weight: 500; }
        .ba-feedback-grid { font-size: 0.875rem; }
        .ba-feedback-grid th { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--text-muted); font-weight: 600; }
        .ba-feedback-grid th.ba-th-sort { cursor: pointer; user-select: none; white-space: nowrap; }
        .ba-feedback-grid th.ba-th-sort:hover { color: var(--text-primary); }
        .ba-feedback-grid th.ba-th-sort .ba-sort-icon { opacity: 0.4; font-size: 0.7em; }
        .ba-feedback-grid th.ba-th-sort.asc .ba-sort-icon::after { content: ' ▲'; opacity: 1; }
        .ba-feedback-grid th.ba-th-sort.desc .ba-sort-icon::after { content: ' ▼'; opacity: 1; }
        .ba-feedback-grid td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .ba-timeline-v2 { padding: 0.75rem 0; position: relative; }
        .ba-timeline-v2::before { content: ''; position: absolute; left: 11px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(180deg, var(--primary,#3b82f6) 0%, rgba(59,130,246,0.3) 100%); border-radius: 1px; }
        .ba-timeline-v2-item { position: relative; display: flex; gap: 0; padding-left: 36px; margin-bottom: 20px; min-height: 36px; }
        .ba-timeline-v2-item:last-child { margin-bottom: 0; }
        .ba-timeline-v2-dot { position: absolute; left: 0; top: 4px; width: 24px; height: 24px; border-radius: 50%; background: var(--bg-card); border: 2px solid var(--primary, #3b82f6); box-sizing: border-box; z-index: 1; }
        .ba-timeline-v2-item.done .ba-timeline-v2-dot { background: var(--primary, #3b82f6); }
        .ba-timeline-v2-body { flex: 1; }
        .ba-timeline-v2-time { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px; }
        .ba-timeline-v2-title { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); margin-bottom: 4px; }
        .ba-timeline-v2-desc { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }
        .ba-timeline-v2-comment-toggle { font-size: 0.8125rem; color: var(--primary); cursor: pointer; margin-top: 4px; }
        .ba-timeline-v2-comment-toggle:hover { text-decoration: underline; }
        .ba-timeline-v2-comment-box { margin-top: 8px; padding: 10px; background: var(--bg-darker); border-radius: 6px; border-left: 3px solid var(--primary); font-size: 0.8125rem; color: var(--text-primary); white-space: pre-wrap; }
        .ba-timeline-reopen { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border); }
        .ba-timeline-reopen-btn { margin-top: 8px; }
        /* Badge Mở lại (Reopen) - màu tím phân biệt với Mới (xanh) */
        .ba-feedback-status-reopen { background: rgba(168, 85, 247, 0.25); color: #a855f7; }
        /* Nút Gửi góp ý - không dãn full width, text căn giữa */
        #btnSubmitFeedback { width: auto; align-self: flex-start; min-width: 140px; justify-content: center; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <h1 class="ba-card-title" style="margin-bottom: 1rem;">Góp ý</h1>

                <!-- 1. Danh sách góp ý & bug (gộp chung) - filter + lưới, expand/collapse -->
                <div id="groupList" class="ba-feedback-group">
                    <div class="ba-feedback-group-header"><span class="ba-feedback-group-toggle">▼</span> Danh sách góp ý &amp; bug</div>
                    <div class="ba-feedback-group-body">
                        <p class="ba-card-desc" style="margin-bottom: 0.75rem;">Lọc theo ngày gửi và chọn &quot;Chỉ của tôi&quot; để xem những góp ý bạn đã báo. Bấm trạng thái để xem timeline, bấm <strong>Xem</strong> để đọc nội dung.</p>
                        <div class="ba-feedback-filters">
                            <label class="ba-feedback-filter-item"><span>Từ ngày</span><input type="date" id="filterFromDate" class="ba-input" style="max-width:140px;" /></label>
                            <label class="ba-feedback-filter-item"><span>Đến ngày</span><input type="date" id="filterToDate" class="ba-input" style="max-width:140px;" /></label>
                            <label class="ba-feedback-filter-item" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="filterOnlyMine" /> <span>Chỉ của tôi</span>
                            </label>
                            <button type="button" id="btnLoadFeedbackList" class="ba-btn ba-btn-primary" style="margin-left:8px;">Tải lại</button>
                        </div>
                        <div class="ba-feedback-search-wrap" style="margin-top:0.75rem;">
                            <input type="text" id="feedbackSearch" class="ba-input" placeholder="Tìm theo tiêu đề, hạng mục, người gửi..." style="max-width:320px;" />
                        </div>
                        <div id="feedbackListTableWrap" style="overflow-x:auto;margin-top:0.5rem;">
                            <table class="ba-table ba-feedback-grid" style="width:100%;min-width:640px;">
                                <thead><tr>
                                    <th class="ba-th-sort" data-col="title" data-type="text">Tiêu đề <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-col="category" data-type="text">Hạng mục <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-col="status" data-type="text">Trạng thái <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-col="createdAt" data-type="date">Ngày gửi <span class="ba-sort-icon"></span></th>
                                    <th class="ba-th-sort" data-col="userName" data-type="text">Người gửi <span class="ba-sort-icon"></span></th>
                                    <th>Thao tác</th>
                                </tr></thead>
                                <tbody id="feedbackListBody"></tbody>
                            </table>
                        </div>
                        <div id="feedbackListEmpty" style="display:none;color:var(--text-muted);font-size:0.875rem;padding:1rem;">Chưa có dữ liệu. Chọn khoảng ngày hoặc bỏ chọn &quot;Chỉ của tôi&quot;.</div>
                        <div id="feedbackListError" style="display:none;color:var(--danger,#ef4444);font-size:0.875rem;padding:1rem;background:rgba(239,68,68,0.1);border-radius:6px;margin-top:0.5rem;"></div>
                    </div>
                </div>

                <!-- 2. Gửi góp ý (form) - expand/collapse -->
                <div id="groupForm" class="ba-feedback-group ba-feedback-group-form">
                    <div class="ba-feedback-group-header"><span class="ba-feedback-group-toggle">▼</span> Gửi góp ý mới</div>
                    <div class="ba-feedback-group-body">
                        <p class="ba-card-desc" style="margin-bottom: 1rem;">Gửi góp ý, báo lỗi hoặc đề xuất tính năng. Bạn có thể dán ảnh chụp màn hình, kéo thả ảnh vào nội dung để mô tả rõ hơn.</p>
                        <div id="feedbackSuccess" class="ba-feedback-success">Đã gửi góp ý. Cảm ơn bạn!</div>
                        <div id="feedbackError" class="ba-feedback-error"></div>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="feedbackTitle">Tiêu đề (*)</label>
                            <input type="text" id="feedbackTitle" class="ba-input" placeholder="Tóm tắt ngắn gọn" maxlength="256" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="feedbackCategory">Hạng mục</label>
                            <select id="feedbackCategory" class="ba-input" style="max-width: 280px;">
                                <option value="">-- Chọn hạng mục --</option>
                                <option value="Bug">🐛 Báo bug</option>
                                <option value="Góp ý chung">💬 Góp ý chung</option>
                                <option value="Báo lỗi">⚠️ Báo lỗi (sự cố)</option>
                                <option value="Đề xuất tính năng">✨ Đề xuất tính năng</option>
                                <option value="Khác">📌 Khác</option>
                            </select>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Nội dung (*)</label>
                            <div id="feedbackContent"></div>
                        </div>
                        <div class="ba-form-group">
                            <button type="button" id="btnSubmitFeedback" class="ba-btn ba-btn-primary">Gửi góp ý</button>
                        </div>
                    </div>
                </div>
            </div>
        <div id="bugDetailModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 720px; width: 95%; max-height: 85vh;">
                <div class="ba-modal-header">
                    <span id="bugDetailTitle" class="ba-feedback-detail-title"></span>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" id="bugDetailClose">×</button>
                </div>
                <div class="ba-modal-body" id="bugDetailBody" style="overflow-y: auto;"></div>
            </div>
        </div>
        <div id="timelineModal" class="ba-modal">
            <div class="ba-modal-content ba-timeline-modal-content" style="max-width: 480px; width: 95%; max-height: 90vh;">
                <div class="ba-modal-header">
                    <span id="timelineModalTitle">Timeline trạng thái</span>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" id="timelineModalClose">×</button>
                </div>
                <div class="ba-modal-body" id="timelineModalBody" style="overflow-y: auto;">
                    <div id="timelineModalContent"></div>
                    <div id="timelineReopenSection" class="ba-timeline-reopen" style="display:none;">
                        <div class="ba-form-group" style="margin-bottom:8px;">
                            <label class="ba-form-label">Lý do / nội dung mở lại (tùy chọn)</label>
                            <textarea id="timelineReopenNote" class="ba-input" rows="3" placeholder="Ví dụ: Case khác vẫn lỗi sau khi fix..." style="resize:vertical;max-height:120px;"></textarea>
                        </div>
                        <button type="button" id="timelineReopenBtn" class="ba-btn ba-btn-primary ba-timeline-reopen-btn">Mở lại góp ý</button>
                    </div>
                </div>
            </div>
        </div>
        </main>
    </form>
    <script src="https://cdn.jsdelivr.net/npm/summernote@0.8.20/dist/summernote.min.js"></script>
    <script>
        (function () {
            var uploadUrl = '<%= ResolveUrl("~/Handlers/UploadFeedbackImage.ashx") %>';
            var submitUrl = '<%= ResolveUrl("~/Pages/Feedback.aspx/SubmitFeedback") %>';
            var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
            var dismissJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissJob") %>';
            var cancelJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/CancelRestoreJob") %>';
            var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
            var functionQueueUrl = '<%= ResolveUrl("~/FunctionQueue") %>';
            var getFeedbackListUrl = '<%= ResolveUrl("~/Pages/Feedback.aspx/GetFeedbackList") %>';
            var getFeedbackDetailUrl = '<%= ResolveUrl("~/Pages/Feedback.aspx/GetFeedbackDetailForView") %>';
            var getHistoryUrl = '<%= ResolveUrl("~/Pages/Feedback.aspx/GetFeedbackStatusHistoryForView") %>';
            var getCommentsUrl = '<%= ResolveUrl("~/Pages/Feedback.aspx/GetFeedbackCommentsForView") %>';
            var reopenFeedbackUrl = '<%= ResolveUrl("~/Pages/Feedback.aspx/ReopenFeedback") %>';

            $(function () {
                // Editor đầy đủ: in đậm, in nghiêng, gạch chân, màu chữ, màu nền, font, cỡ chữ, danh sách, ảnh...
                $('#feedbackContent').summernote({
                    placeholder: 'Mô tả chi tiết. Có thể dán ảnh (Ctrl+V), kéo thả ảnh, hoặc dùng nút ảnh trên thanh công cụ.',
                    height: 450,
                    fontSizes: ['8', '9', '10', '11', '12', '14', '18', '24'],
                    toolbar: [
                        ['style', ['style']],
                        ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
                        ['fontname', ['fontname']],
                        ['fontsize', ['fontsize']],
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['height', ['height']],
                        ['table', ['table']],
                        ['insert', ['link', 'picture']],
                        ['view', ['fullscreen', 'codeview']]
                    ],
                    callbacks: {
                        onImageUpload: function (files, editor, welEditable) {
                            if (!files || !files.length) return;
                            var data = new FormData();
                            data.append('file', files[0]);
                            $.ajax({
                                url: uploadUrl,
                                type: 'POST',
                                data: data,
                                cache: false,
                                contentType: false,
                                processData: false,
                                success: function (res) {
                                    var url = (typeof res === 'string') ? (function () { try { var j = JSON.parse(res); return j.url; } catch (e) { return null; } })() : (res && res.url);
                                    if (url) $('#feedbackContent').summernote('insertImage', url);
                                }
                            });
                        },
                        onInit: function () {
                            // Fix menu: mở bằng mousedown; chặn click (capture) để Bootstrap 3 không toggle đóng ngay; đóng khi click ra ngoài.
                            var $editor = $('.note-editor');
                            function openGroup($group) {
                                $editor.find('.dropdown.open, .note-btn-group.open').not($group).removeClass('open');
                                $group.toggleClass('open');
                            }
                            function bindDropdownFix() {
                                $(document).off('mousedown.summernoteDropdown').on('mousedown.summernoteDropdown', '.note-editor .note-toolbar', function (e) {
                                    if ($(e.target).closest('.dropdown-menu').length) return;
                                    var $group = $(e.target).closest('.note-btn-group:has(.dropdown-menu), .dropdown:has(.dropdown-menu)');
                                    if ($group.length) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openGroup($group);
                                    }
                                });
                                // Chặn click (capture phase) trên nút dropdown để BS3 không nhận và toggle đóng menu ngay.
                                document.addEventListener('click', function (e) {
                                    if (!e.target || !$editor.length) return;
                                    if ($(e.target).closest('.dropdown-menu').length) return;
                                    var inToggle = $(e.target).closest('.note-editor .note-btn-group:has(.dropdown-menu), .note-editor .dropdown:has(.dropdown-menu)').length;
                                    if (inToggle) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }
                                }, true);
                                $(document).off('click.summernoteDropdownClose').on('click.summernoteDropdownClose', function (e) {
                                    if (!$(e.target).closest('.note-editor .dropdown').length && !$(e.target).closest('.note-editor .note-btn-group').length)
                                        $editor.find('.dropdown, .note-btn-group').removeClass('open');
                                });
                            }
                            setTimeout(bindDropdownFix, 50);
                        }
                    }
                });
            });

            $('#btnSubmitFeedback').on('click', function () {
                var title = ($('#feedbackTitle').val() || '').trim();
                var content = $('#feedbackContent').summernote('code');
                var category = ($('#feedbackCategory').val() || '').trim();
                if (!title) {
                    $('#feedbackError').text('Vui lòng nhập tiêu đề.').show();
                    $('#feedbackSuccess').hide();
                    return;
                }
                if (!content || !content.trim() || content === '<p><br></p>') {
                    $('#feedbackError').text('Vui lòng nhập nội dung.').show();
                    $('#feedbackSuccess').hide();
                    return;
                }
                $('#feedbackError').hide();
                $('#feedbackSuccess').hide();
                var $btn = $('#btnSubmitFeedback').prop('disabled', true);
                $.ajax({
                    url: submitUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ title: title, content: content, category: category || null, pageUrl: window.location.href }),
                    success: function (res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            $('#feedbackSuccess').show();
                            $('#feedbackError').hide();
                            $('#feedbackTitle').val('');
                            $('#feedbackCategory').val('');
                            $('#feedbackContent').summernote('reset');
                            defaultMonthRange(true);
                            loadFeedbackList();
                        } else {
                            $('#feedbackError').text(d && d.message ? d.message : 'Gửi thất bại.').show();
                        }
                    },
                    error: function () {
                        $('#feedbackError').text('Lỗi kết nối. Thử lại sau.').show();
                    },
                    complete: function () {
                        $btn.prop('disabled', false);
                    }
                });
            });

            function statusLabel(st) {
                if (st === 'New') return 'Mới'; if (st === 'Read') return 'Đã đọc'; if (st === 'InProgress') return 'Đang xử lý';
                if (st === 'Reopen') return 'Mở lại'; if (st === 'Resolved') return 'Đã xử lý'; if (st === 'Closed') return 'Đóng'; if (st === 'NotABug') return 'Đã đóng (không phải bug)';
                return st || '—';
            }
            function statusBadgeClass(st) {
                if (st === 'New') return 'ba-feedback-status-new'; if (st === 'Read') return 'ba-feedback-status-read';
                if (st === 'InProgress') return 'ba-feedback-status-inprogress'; if (st === 'Reopen') return 'ba-feedback-status-reopen';
                if (st === 'Resolved') return 'ba-feedback-status-resolved'; if (st === 'Closed') return 'ba-feedback-status-closed'; if (st === 'NotABug') return 'ba-feedback-status-notabug';
                return 'ba-feedback-status-read';
            }
            function defaultMonthRange(force) {
                var now = new Date();
                var y = now.getFullYear(), m = now.getMonth();
                var first = new Date(y, m, 1);
                var last = new Date(y, m + 1, 0);
                var fromStr = y + '-' + String(m + 1).padStart(2, '0') + '-01';
                var toStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(last.getDate()).padStart(2, '0');
                if (force || !$('#filterFromDate').val()) $('#filterFromDate').val(fromStr);
                if (force || !$('#filterToDate').val()) $('#filterToDate').val(toStr);
            }
            var feedbackListData = [];
            var feedbackSort = { col: 'createdAt', dir: 'desc' };

            function getFilteredList() {
                var q = ($('#feedbackSearch').val() || '').trim().toLowerCase();
                if (!q) return feedbackListData.slice();
                return feedbackListData.filter(function (r) {
                    var title = (r.title || '').toLowerCase();
                    var cat = (r.category || '').toLowerCase();
                    var user = (r.userName || '').toLowerCase();
                    return title.indexOf(q) >= 0 || cat.indexOf(q) >= 0 || user.indexOf(q) >= 0;
                });
            }
            function getSortedList(list) {
                var col = feedbackSort.col, dir = feedbackSort.dir;
                return list.slice().sort(function (a, b) {
                    var va = a[col], vb = b[col];
                    if (col === 'createdAt') {
                        va = va ? new Date(va).getTime() : 0;
                        vb = vb ? new Date(vb).getTime() : 0;
                        return dir === 'asc' ? va - vb : vb - va;
                    }
                    va = (va || '').toString().toLowerCase();
                    vb = (vb || '').toString().toLowerCase();
                    var c = va.localeCompare(vb);
                    return dir === 'asc' ? c : -c;
                });
            }
            function renderFeedbackTableBody(rows) {
                var html = '';
                rows.forEach(function (r) {
                    var created = r.createdAt ? new Date(r.createdAt).toLocaleString() : '—';
                    var st = r.status || '';
                    var badgeCls = statusBadgeClass(st);
                    html += '<tr><td>' + (r.title || '').replace(/</g, '&lt;') + '</td><td>' + (r.category || '—').replace(/</g, '&lt;') + '</td><td><span class="ba-feedback-status-badge ' + badgeCls + ' view-timeline" data-id="' + (r.id || '') + '" title="Bấm xem timeline">' + statusLabel(st) + '</span></td><td>' + created + '</td><td>' + (r.userName || '—').replace(/</g, '&lt;') + '</td><td><a href="#" class="ba-link view-feedback-detail" data-id="' + (r.id || '') + '">Xem</a></td></tr>';
                });
                $('#feedbackListBody').html(html);
            }
            function applyFilterAndSortAndRender() {
                var $body = $('#feedbackListBody'), $empty = $('#feedbackListEmpty'), $err = $('#feedbackListError'), $wrap = $('#feedbackListTableWrap');
                $err.hide();
                var filtered = getFilteredList();
                var sorted = getSortedList(filtered);
                if (sorted.length === 0) {
                    $body.empty();
                    $wrap.show();
                    $empty.show();
                } else {
                    $empty.hide();
                    $wrap.show();
                    renderFeedbackTableBody(sorted);
                }
            }
            function updateSortHeaderUi() {
                $('.ba-feedback-grid th.ba-th-sort').removeClass('asc desc');
                $('.ba-feedback-grid th.ba-th-sort[data-col="' + feedbackSort.col + '"]').addClass(feedbackSort.dir);
            }

            function loadFeedbackList(doneCallback) {
                defaultMonthRange();
                var from = $('#filterFromDate').val() || '';
                var to = $('#filterToDate').val() || '';
                var onlyMine = $('#filterOnlyMine').is(':checked');
                $.ajax({ url: getFeedbackListUrl, type: 'POST', contentType: 'application/json', dataType: 'json',
                    data: JSON.stringify({ fromDate: from, toDate: to, onlyMine: onlyMine, top: 100 }),
                    success: function (res) {
                        var d = res.d || res;
                        var $body = $('#feedbackListBody'), $empty = $('#feedbackListEmpty'), $err = $('#feedbackListError'), $wrap = $('#feedbackListTableWrap');
                        $err.hide().empty();
                        if (!d || !d.success) {
                            feedbackListData = [];
                            $body.empty();
                            $wrap.hide();
                            $empty.hide();
                            $err.html('Lỗi: ' + (d && d.message ? (d.message).replace(/</g, '&lt;') : 'Không tải được danh sách.')).show();
                            return;
                        }
                        feedbackListData = (d.list) ? d.list : [];
                        if (feedbackListData.length === 0) {
                            $body.empty();
                            $wrap.hide();
                            $empty.show();
                        } else {
                            updateSortHeaderUi();
                            applyFilterAndSortAndRender();
                        }
                    },
                    error: function (xhr, status, err) {
                        feedbackListData = [];
                        var msg = 'Lỗi kết nối hoặc máy chủ. Thử lại sau.';
                        if (xhr && xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                        else if (xhr && xhr.responseText) { try { var j = JSON.parse(xhr.responseText); if (j.message) msg = j.message; } catch (e) {} }
                        $('#feedbackListTableWrap').hide();
                        $('#feedbackListEmpty').hide();
                        $('#feedbackListError').html('Lỗi: ' + msg.replace(/</g, '&lt;')).show();
                    },
                    complete: function () { if (typeof doneCallback === 'function') doneCallback(); }
                });
            }
            $(function () {
                defaultMonthRange();
                loadFeedbackList();
                $(document).on('click', '.ba-feedback-group-header', function () {
                    $(this).closest('.ba-feedback-group').toggleClass('collapsed');
                });
                $(document).on('click', '#btnLoadFeedbackList', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var $btn = $(this);
                    var origText = $btn.text();
                    $btn.prop('disabled', true).text('Đang tải...');
                    loadFeedbackList(function () { $btn.prop('disabled', false).text(origText); });
                });
                $('#feedbackSearch').on('input', function () { applyFilterAndSortAndRender(); });
                $(document).on('click', '.ba-feedback-grid th.ba-th-sort', function () {
                    var col = $(this).data('col');
                    if (!col) return;
                    if (feedbackSort.col === col) feedbackSort.dir = feedbackSort.dir === 'asc' ? 'desc' : 'asc';
                    else { feedbackSort.col = col; feedbackSort.dir = 'asc'; }
                    updateSortHeaderUi();
                    applyFilterAndSortAndRender();
                });
                $(document).on('click', '.view-feedback-detail', function (e) {
                    e.preventDefault();
                    var id = $(this).data('id');
                    if (!id) return;
                    $.ajax({ url: getFeedbackDetailUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ id: id }),
                        success: function (res) {
                            var d = res.d || res;
                            if (!d || !d.success || !d.item) return;
                            var i = d.item;
                            $('#bugDetailTitle').text((i.title || '').replace(/</g, '&lt;'));
                            var meta = 'Gửi bởi: ' + (i.userName || '—').replace(/</g, '&lt;') + ' · ' + (i.createdAt ? new Date(i.createdAt).toLocaleString() : '') + ' · ' + statusLabel(i.status || '');
                            var bodyHtml = '<div style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:0.75rem;">' + meta + '</div><div class="ba-feedback-detail-content">' + (i.content || '') + '</div>';
                            (function () {
                                var raw = (i.adminNote || '').trim();
                                var adminOnly = raw.replace(/\s*\[Reopen[^\]]*\]\s*/g, '').trim();
                                if (adminOnly) bodyHtml += '<div style="margin-top:0.75rem;"><strong>Phản hồi từ admin:</strong><div class="ba-feedback-detail-content" style="margin-top:4px;">' + adminOnly.replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</div></div>';
                            })();
                            bodyHtml += '<div style="margin-top:1rem;"><div style="font-size:0.8125rem;font-weight:600;margin-bottom:4px;">Lịch sử trạng thái</div><ul id="viewDetailHistoryList" style="list-style:none;padding:0;margin:0;font-size:0.8125rem;"></ul></div>';
                            bodyHtml += '<div style="margin-top:0.75rem;"><div style="font-size:0.8125rem;font-weight:600;margin-bottom:4px;">Comment</div><ul id="viewDetailCommentsList" style="list-style:none;padding:0;margin:0;font-size:0.8125rem;"></ul></div>';
                            $('#bugDetailBody').html(bodyHtml);
                            $('#bugDetailModal').addClass('show');
                            $.ajax({ url: getHistoryUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ id: id }),
                                success: function (hr) {
                                    var hd = hr.d || hr;
                                    var list = (hd && hd.success && hd.list) ? hd.list : [];
                                    var html = '';
                                    if (list.length === 0) html = '<li style="color:var(--text-muted);">Chưa có.</li>';
                                    else list.forEach(function (h) { var t = h.changedAt ? new Date(h.changedAt).toLocaleString() : ''; var who = (h.changedByUserName || '—').replace(/</g, '&lt;'); var note = (h.note || '').trim(); var notePart = note ? ' · <span style="color:var(--text-secondary);">' + note.replace(/</g, '&lt;').replace(/\n/g, ' ') + '</span>' : ''; html += '<li>' + (h.fromStatus || '—') + ' → ' + (h.toStatus || '').replace(/</g, '&lt;') + ' · <strong>' + who + '</strong> · ' + t + notePart + '</li>'; });
                                    $('#viewDetailHistoryList').html(html);
                                }
                            });
                            $.ajax({ url: getCommentsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ id: id }),
                                success: function (cr) {
                                    var cd = cr.d || cr;
                                    var list = (cd && cd.success && cd.list) ? cd.list : [];
                                    var html = '';
                                    if (list.length === 0) html = '<li style="color:var(--text-muted);">Chưa có.</li>';
                                    else list.forEach(function (c) { var t = c.createdAt ? new Date(c.createdAt).toLocaleString() : ''; html += '<li><strong>' + (c.userName || '—').replace(/</g, '&lt;') + '</strong> ' + t + '<br/>' + (c.content || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</li>'; });
                                    $('#viewDetailCommentsList').html(html);
                                }
                            });
                        }
                    });
                });
                var timelineCurrentId = null;
                function fmtDate(d) { return d ? new Date(d).toLocaleString() : '—'; }
                function buildTimelineHtml(i, historyList) {
                    var rawNote = (i.adminNote || '').trim();
                    var adminOnly = rawNote.replace(/\s*\[Reopen[^\]]*\]\s*/g, '').trim();
                    var hasNote = adminOnly.length > 0;
                    var noteEsc = adminOnly.replace(/</g, '&lt;').replace(/\n/g, '<br/>');
                    var history = (historyList || []).slice().sort(function (a, b) { return new Date(a.changedAt || 0) - new Date(b.changedAt || 0); });
                    var events = [];
                    if (i.createdAt) events.push({ type: 'submit', at: i.createdAt });
                    history.forEach(function (h) { events.push({ type: 'history', at: h.changedAt, fromStatus: h.fromStatus, toStatus: h.toStatus, who: h.changedByUserName, note: h.note }); });
                    events.sort(function (a, b) { return new Date(a.at || 0) - new Date(b.at || 0); });
                    var html = '<div class="ba-timeline-v2">';
                    events.forEach(function (ev) {
                        var t = fmtDate(ev.at);
                        if (ev.type === 'submit') {
                            html += '<div class="ba-timeline-v2-item done"><div class="ba-timeline-v2-dot"></div><div class="ba-timeline-v2-body"><div class="ba-timeline-v2-time">' + t + '</div><div class="ba-timeline-v2-title">Gửi góp ý</div><div class="ba-timeline-v2-desc">Người gửi báo góp ý / bug.</div></div></div>';
                            if (i.expectedFixAt) {
                                var expectedT = fmtDate(i.expectedFixAt);
                                html += '<div class="ba-timeline-v2-item done"><div class="ba-timeline-v2-dot"></div><div class="ba-timeline-v2-body"><div class="ba-timeline-v2-time">' + expectedT + '</div><div class="ba-timeline-v2-title">Dự kiến fix (lần xử lý đầu)</div><div class="ba-timeline-v2-desc">Thời gian dự kiến hoàn thành khi admin đặt cho lần fix đầu tiên.</div></div></div>';
                            }
                            return;
                        }
                        var to = ev.toStatus || '', from = ev.fromStatus || '';
                        var who = (ev.who || '').replace(/</g, '&lt;');
                        if (to === 'InProgress') {
                            html += '<div class="ba-timeline-v2-item done"><div class="ba-timeline-v2-dot"></div><div class="ba-timeline-v2-body"><div class="ba-timeline-v2-time">' + t + '</div><div class="ba-timeline-v2-title">Bắt đầu xử lý</div><div class="ba-timeline-v2-desc">' + (who ? who + ' bắt đầu xử lý.' : 'Dev bắt đầu xử lý.') + '</div></div></div>';
                            return;
                        }
                        if (to === 'Resolved' || to === 'Closed' || to === 'NotABug') {
                            var notePart = (ev.note || '').trim() ? ' · ' + (ev.note || '').replace(/</g, '&lt;') : '';
                            html += '<div class="ba-timeline-v2-item done"><div class="ba-timeline-v2-dot"></div><div class="ba-timeline-v2-body"><div class="ba-timeline-v2-time">' + t + '</div><div class="ba-timeline-v2-title">Đã xử lý / Đóng</div><div class="ba-timeline-v2-desc">' + (who ? who + notePart : 'Trạng thái đã xử lý hoặc đóng.') + '</div></div></div>';
                            return;
                        }
                        if ((from === 'Resolved' || from === 'Closed' || from === 'NotABug') && (to === 'New' || to === 'Reopen')) {
                            var desc = (ev.note || '').trim() ? (who + ': ' + (ev.note || '').replace(/</g, '&lt;')) : (who || 'User') + ' mở lại góp ý';
                            html += '<div class="ba-timeline-v2-item done"><div class="ba-timeline-v2-dot"></div><div class="ba-timeline-v2-body"><div class="ba-timeline-v2-time">' + t + '</div><div class="ba-timeline-v2-title">Mở lại (Reopen)</div><div class="ba-timeline-v2-desc">' + desc + '</div></div></div>';
                        }
                    });
                    if (hasNote) {
                        html += '<div class="ba-timeline-v2-item done"><div class="ba-timeline-v2-dot"></div><div class="ba-timeline-v2-body"><div class="ba-timeline-v2-time">Phản hồi từ dev/admin</div><div class="ba-timeline-v2-title">Comment</div><a class="ba-timeline-v2-comment-toggle" href="#" data-toggle="comment">Xem comment</a><div class="ba-timeline-v2-comment-box" style="display:none;">' + noteEsc + '</div></div></div>';
                    }
                    html += '</div>';
                    return html;
                }
                $(document).on('click', '.view-timeline', function (e) {
                    e.preventDefault();
                    var id = $(this).data('id');
                    if (!id) return;
                    $.ajax({ url: getFeedbackDetailUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ id: id }),
                        success: function (res) {
                            var d = res.d || res;
                            if (!d || !d.success || !d.item) return;
                            var i = d.item;
                            timelineCurrentId = id;
                            $('#timelineModalTitle').text((i.title || '').replace(/</g, '&lt;'));
                            $('#timelineModalContent').html(buildTimelineHtml(i, []));
                            var canReopen = (i.status === 'Resolved' || i.status === 'Closed' || i.status === 'NotABug');
                            $('#timelineReopenSection').toggle(canReopen);
                            $('#timelineReopenNote').val('');
                            $('#timelineModal').addClass('show');
                            $.ajax({ url: getHistoryUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ id: id }),
                                success: function (hr) {
                                    var hd = hr.d || hr;
                                    var list = (hd && hd.success && hd.list) ? hd.list : [];
                                    $('#timelineModalContent').html(buildTimelineHtml(i, list));
                                }
                            });
                        }
                    });
                });
                $(document).on('click', '.ba-timeline-v2-comment-toggle', function (e) {
                    e.preventDefault();
                    var $box = $(this).siblings('.ba-timeline-v2-comment-box');
                    var isShown = $box.is(':visible');
                    $box.toggle();
                    $(this).text(isShown ? 'Xem comment' : 'Ẩn comment');
                });
                $('#timelineReopenBtn').on('click', function () {
                    var id = timelineCurrentId;
                    if (!id) return;
                    var note = ($('#timelineReopenNote').val() || '').trim();
                    var $btn = $(this).prop('disabled', true);
                    $.ajax({ url: reopenFeedbackUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ id: id, reopenNote: note }),
                        success: function (res) {
                            var d = res.d || res;
                            if (d && d.success) {
                                $('#timelineModal').removeClass('show');
                                applyFilterAndSortAndRender();
                            } else {
                                alert(d && d.message ? d.message : 'Không thể mở lại.');
                            }
                        },
                        complete: function () { $btn.prop('disabled', false); }
                    });
                });
                $('#bugDetailClose').on('click', function () { $('#bugDetailModal').removeClass('show'); });
                $('#timelineModalClose').on('click', function () { $('#timelineModal').removeClass('show'); });
            });

            // Chuông thông báo: load badge và khi mở panel thì load danh sách
            (function () {
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
                            if (!d) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
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
                                newBugs.forEach(function (b) { var created = formatNotifTime(b.createdAt); var bugUrl = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + created + '</div><a class="ba-notif-detail-link" href="' + bugUrl + '" data-action="bug">Xem / Xử lý</a></div>'; });
                                html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">';
                            }
                            jobs.forEach(function (j, idx) {
                                var st = j.status || '', jobType = j.type || 'Restore', typeLabel = (j.typeLabel || (jobType === 'Backup' ? 'Backup' : jobType === 'HRHelperMultiDbAnalyze' ? 'Phân tích Multi-DB' : 'Restore'));
                                var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : 'ba-notif-type-restore';
                                var dbName = (j.databaseName || j.DatabaseName || '').trim();
                                var hasReset = jobType === 'Restore' && (j.withAutoReset === true || (j.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
                                var resetTag = (jobType === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag" title="Restore có Reset">Có Reset' : 'ba-notif-no-reset-tag">Không Reset') + '</span> ') : '';
                                var pct = (j.percentComplete != null) ? Number(j.percentComplete) : 0;
                                var phase = (j.message || (jobType === 'Restore' ? 'Restore' : '')).toString().trim();
                                var startedByUid = (j.startedByUserId != null) ? parseInt(j.startedByUserId, 10) : 0;
                                var canCancel = (jobType === 'Restore' || jobType === 'Backup' || jobType === 'HRHelperMultiDbAnalyze' || jobType === 'HRHelperMultiDbReset') && currentUserId && startedByUid === currentUserId;
                                var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + jobType + '"><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + (typeLabel.replace(/</g, '&lt;')) + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div>' + BaNotif.wrapMetaWithBadge((j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + formatNotifTime(j.startTime), st);
                                if (st === 'Running' || st === 'Pending') {
                                    var progressLabel = (jobType === 'Restore' && phase) ? (pct + '% - ' + BaNotif.restorePhaseDisplay(phase)) : (jobType === 'HRHelperMultiDbAnalyze' ? (pct + '% - Phân tích') : (pct + '%'));
                                    row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt,var(--bg-darker));height:6px;border-radius:3px;overflow:hidden;"><div class="ba-notif-progress-bar" style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span class="ba-notif-progress-pct">' + progressLabel + '</span></div>';
                                    row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                                    if (canCancel) row += ' <button type="button" class="ba-notif-cancel-btn" data-job-id="' + (j.id || '') + '" title="Chỉ người thực hiện job mới có thể hủy">Hủy</button>';
                                } else if (st === 'Completed') row += BaNotif.completedBadgeRow() + '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                                else if (st === 'Failed') row += BaNotif.failedBadgeRow() + '<div class="ba-notif-msg ba-notif-msg-error">' + (j.message || '').replace(/</g, '&lt;') + '</div><a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                                row += '</div>';
                                html += row;
                            });
                            if (newBugs.length > 0) html += '</div></div>';
                            else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                            $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                            $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function (e) { var g = $(this).data('group'); var $body = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); var $arrow = $(this).find('.ba-notif-group-arrow'); if ($body.is(':visible')) { $body.slideUp(200); $arrow.text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $body.slideDown(200); $arrow.text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                            $list.off('click.detail').on('click.detail', '.ba-notif-detail-link[data-action="detail"]', function (e) { e.preventDefault(); var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || null; if (job && typeof window.showNotificationDetail === 'function') window.showNotificationDetail(job); });
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
