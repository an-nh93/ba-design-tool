<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Home.aspx.cs"
    Inherits="BADesign.Pages.Home" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Thiết kế giao diện - HR Helper</title>
    <uc:BaHead runat="server" />
    <link href="../Content/builder-templates.css?v=20261166" rel="stylesheet" />
    <script src="../Scripts/builder/builder-templates.js?v=20261172"></script>
    <style>
        .hd-head { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 0.375rem 0.75rem; border-bottom: 2px solid var(--border); flex-shrink: 0; }
        .hd-head .ba-tabs { flex: 1 1 auto; border-bottom: 0; margin-bottom: 0; }
        .hd-head-actions { display: flex; flex-wrap: wrap; flex-shrink: 0; max-width: 100%; gap: 0.5rem; padding-bottom: 0.375rem; }
        .hd-count { display: inline-block; min-width: 1.25rem; margin-left: 0.375rem; padding: 0 0.375rem; border-radius: 999px; background: var(--border); color: var(--text-secondary); font-size: 0.6875rem; font-weight: 600; line-height: 1.125rem; text-align: center; }
        .hd-count:empty { display: none; }
        .ba-tab.active .hd-count { background: var(--primary-soft); color: var(--primary-light); }

        .hd-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; padding: 0.625rem 0; flex-shrink: 0; }
        .hd-search { position: relative; flex: 1 1 14rem; max-width: 20rem; }
        .hd-search .ba-input { padding-left: 1.875rem; }
        .hd-search .hd-icon { position: absolute; left: 0.5625rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .hd-toolbar select.ba-input { flex: 0 0 auto; width: auto; }
        .hd-result { margin-left: auto; color: var(--text-muted); font-size: 0.8125rem; white-space: nowrap; }
        .hd-view { display: inline-flex; flex: 0 0 auto; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
        .hd-view-btn { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 1.8125rem; border: 0; background: var(--bg-darker); color: var(--text-muted); cursor: pointer; }
        .hd-view-btn + .hd-view-btn { border-left: 1px solid var(--border); }
        .hd-view-btn:hover { color: var(--text-primary); }
        .hd-view-btn.active { background: var(--primary); color: #fff; }

        .hd-pop-wrap { position: relative; flex: 0 0 auto; }
        .hd-pop-btn { display: inline-flex; align-items: center; gap: 0.375rem; width: auto; max-width: 15rem; cursor: pointer; text-align: left; }
        .hd-pop-btn > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hd-pop-btn .hd-icon { width: 0.75rem; height: 0.75rem; color: var(--text-muted); }
        .hd-pop { position: absolute; z-index: 50; top: calc(100% + 4px); left: 0; display: none; flex-direction: column; width: 17.5rem; max-height: 21rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28); overflow: hidden; }
        .hd-pop-wrap.open .hd-pop { display: flex; }
        .hd-pop-search { padding: 0.5rem; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .hd-pop-list { flex: 1 1 auto; min-height: 0; padding: 0.25rem; overflow-y: auto; scrollbar-width: thin; }
        .hd-pop-item { display: flex; align-items: center; gap: 0.5rem; margin: 0; padding: 0.3125rem 0.5rem; border-radius: 6px; color: var(--text-primary); font-size: 0.8125rem; font-weight: 400; cursor: pointer; }
        .hd-pop-item:hover { background: var(--bg-hover); }
        .hd-pop-item input { flex: 0 0 auto; width: 15px; height: 15px; margin: 0; cursor: pointer; }
        .hd-pop-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hd-pop-count { flex: 0 0 auto; color: var(--text-muted); font-size: 0.75rem; }
        .hd-pop-item .hd-act { width: 1.5rem; height: 1.5rem; }
        .hd-pop-foot { display: flex; padding: 0.5rem; border-top: 1px solid var(--border); flex-shrink: 0; }
        .hd-pop-foot .ba-btn { flex: 1 1 auto; }

        .hd-body { flex: 1 1 auto; min-height: 0; padding-bottom: 0.75rem; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border-light) transparent; }
        .hd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(14.5rem, 1fr)); gap: 0.75rem; }
        .hd-card { display: flex; flex-direction: column; min-width: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .hd-card:hover { border-color: var(--primary); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18); }
        .hd-thumb { position: relative; display: block; width: 100%; aspect-ratio: 16 / 9; padding: 0; border: 0; border-bottom: 1px solid var(--border); background: #fff; overflow: hidden; cursor: pointer; }
        .hd-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: left top; }
        .hd-thumb-cta { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.45); opacity: 0; transition: opacity 0.15s ease; }
        .hd-thumb:hover .hd-thumb-cta, .hd-thumb:focus-visible .hd-thumb-cta { opacity: 1; }
        .hd-thumb-cta span { padding: 0.3125rem 0.875rem; border-radius: 999px; background: var(--primary); color: #fff; font-size: 0.8125rem; font-weight: 600; }
        .hd-noimg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.375rem; width: 100%; height: 100%; background: var(--bg-darker); color: var(--text-muted); font-size: 0.75rem; }
        .hd-noimg .hd-icon { width: 1.75rem; height: 1.75rem; opacity: 0.7; }
        .hd-card-body { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; padding: 0.5rem 0.75rem; }
        .hd-name { display: block; color: var(--text-primary); font-size: 0.875rem; font-weight: 600; line-height: 1.35; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        a.hd-name:hover { color: var(--primary-light); text-decoration: none; }
        .hd-meta { display: flex; align-items: center; gap: 0.375rem; min-width: 0; min-height: 1.25rem; color: var(--text-muted); font-size: 0.75rem; }
        .hd-chip { display: inline-flex; flex: 0 0 auto; align-items: center; padding: 0 0.4375rem; border-radius: 999px; font-size: 0.6875rem; font-weight: 600; line-height: 1.125rem; white-space: nowrap; }
        .hd-chip-public { background: rgba(16, 185, 129, 0.16); color: var(--success); }
        .hd-chip-private { background: var(--bg-hover); color: var(--text-secondary); }
        .hd-chip-type { background: var(--primary-soft); color: var(--primary-light); }
        body.light-theme .hd-chip-public { color: #047857; }
        body.light-theme .hd-chip-type, body.light-theme .ba-tab.active .hd-count { color: var(--primary); }
        .hd-project { display: inline-flex; align-items: center; gap: 0.25rem; min-width: 0; }
        .hd-project > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hd-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; min-height: 1.75rem; }
        .hd-date { color: var(--text-muted); font-size: 0.75rem; white-space: nowrap; }
        .hd-acts { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 0.125rem; }
        .hd-act { display: inline-flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; }
        .hd-act:hover { background: var(--bg-hover); color: var(--text-primary); }
        .hd-act-danger:hover { background: rgba(239, 68, 68, 0.14); color: var(--danger); }
        .hd-icon { display: inline-flex; flex: 0 0 auto; width: 1rem; height: 1rem; }
        .hd-icon svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }

        .hd-body .ba-table-wrap { min-height: 0; max-height: none; margin-bottom: 0; }
        .hd-row-thumb { display: block; width: 4rem; height: 2.25rem; padding: 0; border: 1px solid var(--border); border-radius: 4px; background: #fff; overflow: hidden; cursor: pointer; }
        .hd-row-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: left top; }
        .hd-row-thumb .hd-noimg .hd-icon { width: 1rem; height: 1rem; }
        .hd-row-thumb .hd-noimg-text { display: none; }
        .hd-row-name { max-width: 22rem; }
        .hd-row-acts { display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem; }

        .hd-skel { pointer-events: none; }
        .hd-skel .hd-thumb, .hd-skel-line { background: var(--bg-hover); animation: hd-pulse 1.2s ease-in-out infinite; }
        .hd-skel-line { height: 0.75rem; border-radius: 4px; }
        .hd-skel-line.short { width: 55%; }
        @keyframes hd-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

        .hd-empty-title { color: var(--text-primary); font-size: 0.9375rem; font-weight: 600; }
        .hd-empty-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: 0.375rem; }
        .hd-empty .hd-icon { width: 2.25rem; height: 2.25rem; opacity: 0.6; }

        .hd-preview .ba-modal-content { max-width: min(68.75rem, 96vw); }
        .hd-preview .ba-modal-body { padding: 0.75rem; background: var(--bg-darker); text-align: center; }
        .hd-preview img { max-width: 100%; max-height: 76vh; border: 1px solid var(--border); background: #fff; }
        .hd-preview .hd-noimg { min-height: 14rem; font-size: 0.875rem; }
        .hd-form { display: flex; flex-direction: column; gap: 0.75rem; }
        .hd-form-error { color: var(--danger); font-size: 0.8125rem; }
        .hd-form-error:empty { display: none; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content ba-fill">
                    <div class="hd-head">
                        <div class="ba-tabs" id="hdTabs">
                            <button type="button" class="ba-tab active" data-scope="mine"><span>Thiết kế của tôi</span><span class="hd-count" id="hdCountMine" translate="no"></span></button>
                            <button type="button" class="ba-tab" data-scope="shared"><span>Thiết kế công khai</span><span class="hd-count" id="hdCountShared" translate="no"></span></button>
                        </div>
                        <div class="hd-head-actions">
                            <button type="button" class="ba-btn ba-btn-secondary" id="hdFromStandard" title="Bắt đầu từ một màn hình chuẩn của HRM"><span class="hd-icon" data-icon="layout"></span><span>Từ màn hình chuẩn</span></button>
                            <a class="ba-btn ba-btn-secondary" id="hdFromDrawio" href="<%= ResolveUrl("~/Builder") %>?drawio=1" title="Mở file vẽ bằng draw.io và chuyển các hình thành control"><span class="hd-icon" data-icon="file"></span><span>Từ file draw.io</span></a>
                            <a class="ba-btn ba-btn-secondary" id="hdFromHtml" href="<%= ResolveUrl("~/Builder") %>?htmlfile=1" title="Mở file HTML (ví dụ mockup do AI vẽ) và chuyển trang cùng các popup của nó thành control"><span class="hd-icon" data-icon="file"></span><span>Từ file HTML</span></a>
                            <a class="ba-btn ba-btn-primary" id="hdNew" href="<%= ResolveUrl("~/Builder") %>" title="Mở UI Builder với trang trắng"><span class="hd-icon" data-icon="plus"></span><span>Thiết kế mới</span></a>
                        </div>
                    </div>

                    <div class="hd-toolbar">
                        <div class="hd-search">
                            <span class="hd-icon" data-icon="search"></span>
                            <input type="text" class="ba-input" id="hdSearch" placeholder="Tìm theo tên, dự án, người tạo..." autocomplete="off" />
                        </div>
                        <div class="hd-pop-wrap" id="hdProjectWrap">
                            <button type="button" class="ba-input hd-pop-btn" id="hdProjectBtn" title="Lọc theo dự án" aria-haspopup="true" aria-expanded="false"><span id="hdProjectLabel">Tất cả dự án</span><span class="hd-icon" data-icon="caret"></span></button>
                            <div class="hd-pop" id="hdProjectPop">
                                <div class="hd-pop-search"><input type="text" class="ba-input" id="hdProjectSearch" placeholder="Tìm dự án..." autocomplete="off" /></div>
                                <div class="hd-pop-list" id="hdProjectList"></div>
                                <div class="hd-pop-foot"><button type="button" class="ba-btn ba-btn-secondary" id="hdProjectNew"><span class="hd-icon" data-icon="plus"></span><span>Dự án mới</span></button></div>
                            </div>
                        </div>
                        <select class="ba-input" id="hdVisibility" title="Lọc theo trạng thái chia sẻ">
                            <option value="all">Mọi trạng thái</option>
                            <option value="public">Công khai</option>
                            <option value="private">Riêng tư</option>
                        </select>
                        <select class="ba-input" id="hdSort" title="Sắp xếp">
                            <option value="date-desc">Mới sửa trước</option>
                            <option value="date-asc">Cũ nhất trước</option>
                            <option value="name-asc">Tên A đến Z</option>
                            <option value="name-desc">Tên Z đến A</option>
                            <option value="type-asc">Theo loại</option>
                            <option value="owner-asc" id="hdSortOwner">Theo người tạo</option>
                        </select>
                        <span class="hd-result" id="hdResult"></span>
                        <div class="hd-view" id="hdView">
                            <button type="button" class="hd-view-btn active" data-view="grid" title="Xem dạng lưới"><span class="hd-icon" data-icon="grid"></span></button>
                            <button type="button" class="hd-view-btn" data-view="table" title="Xem dạng danh sách"><span class="hd-icon" data-icon="list"></span></button>
                        </div>
                    </div>

                    <div class="hd-body" id="hdBody">
                        <div class="hd-grid" id="hdGrid"></div>
                        <div class="ba-table-wrap" id="hdTableWrap">
                            <table class="ba-table">
                                <thead>
                                    <tr>
                                        <th>Ảnh</th>
                                        <th>Tên thiết kế</th>
                                        <th>Loại</th>
                                        <th id="hdColState">Trạng thái</th>
                                        <th id="hdColOwner">Người tạo</th>
                                        <th>Dự án</th>
                                        <th>Sửa lần cuối</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody id="hdRows"></tbody>
                            </table>
                        </div>
                        <div class="ba-empty-state hd-empty" id="hdEmpty">
                            <span class="hd-icon" id="hdEmptyIcon"></span>
                            <div class="hd-empty-title" id="hdEmptyTitle"></div>
                            <div id="hdEmptyText"></div>
                            <div class="hd-empty-actions" id="hdEmptyActions"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <div id="hdPreview" class="ba-modal hd-preview">
            <div class="ba-modal-content">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="hdPreviewTitle" translate="no"></h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" data-close="hdPreview" aria-label="Đóng">&times;</button>
                </div>
                <div class="ba-modal-body" id="hdPreviewBody"></div>
            </div>
        </div>

        <div id="hdProjectModal" class="ba-modal">
            <div class="ba-modal-content">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Dự án mới</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" data-close="hdProjectModal" aria-label="Đóng">&times;</button>
                </div>
                <div class="ba-modal-body hd-form">
                    <div class="ba-form-group">
                        <label class="ba-form-label" for="hdProjectName">Tên dự án</label>
                        <input type="text" class="ba-input" id="hdProjectName" maxlength="100" placeholder="Ví dụ: Chấm công 2026" autocomplete="off" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label" for="hdProjectDescription">Mô tả</label>
                        <textarea class="ba-input" id="hdProjectDescription" rows="3" maxlength="500" placeholder="Không bắt buộc"></textarea>
                    </div>
                    <div class="hd-form-error" id="hdProjectError"></div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" data-close="hdProjectModal">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="hdProjectCreate">Tạo dự án</button>
                </div>
            </div>
        </div>
    </form>
    <script>
        (function () {
            var SERVICE = '<%= ResolveUrl("~/Pages/Home.aspx") %>';
            var PROJECT_SERVICE = '<%= ResolveUrl("~/Pages/Builder.aspx") %>';
            var BUILDER = '<%= ResolveUrl("~/Builder") %>';
            var VIEW_KEY = 'designs-view';
            var NO_PROJECT = 'none';
            var SKELETON_CARDS = 8;
            var ICONS = {
                search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
                plus: '<path d="M8 3v10M3 8h10"/>',
                grid: '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>',
                list: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>',
                caret: '<path d="M8 10.7L1.3 4h13.4z" fill="currentColor" stroke="none"/>',
                layout: '<rect x="2" y="2.5" width="12" height="11" rx="1.2"/><path d="M2 6h12M6.5 6v7.5"/>',
                file: '<path d="M4 2h5.5L12 4.5V14H4z"/><path d="M9.5 2v2.5H12"/>',
                image: '<rect x="2" y="3" width="12" height="10" rx="1.2"/><circle cx="5.6" cy="6.4" r="1.1"/><path d="M2.4 11.6l3.4-3 2.4 2 2.2-1.8 3.2 2.8"/>',
                eye: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
                globe: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 1.7 2.6 3.7 2.6 6S9.8 12.3 8 14c-1.8-1.7-2.6-3.7-2.6-6S6.2 3.7 8 2z"/>',
                lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
                trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5M6.8 7v4M9.2 7v4"/>',
                copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.2"/><path d="M3.5 10.5h-1v-8h8v1"/>',
                folder: '<path d="M2 4.5a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1z"/>',
                user: '<circle cx="8" cy="5.5" r="2.5"/><path d="M3 13.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4"/>',
                alert: '<path d="M8 2.5l6 10.5H2z"/><path d="M8 6.5v3M8 11.3v.2"/>'
            };
            var TYPE_LABELS = { page: 'Trang' };
            var state = { scope: 'mine', view: 'grid', status: 'loading', message: '', search: '', visibility: 'all', sort: 'date-desc', projects: null, mine: [], shared: [], projectList: [] };

            function call(base, method, payload) {
                return $.ajax({
                    url: base + '/' + method,
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify(payload || {})
                }).then(function (res) { return res && res.d !== undefined ? res.d : res; });
            }

            function toast(message, type) { BaToast.show(message, type || 'info'); }

            function byId(id) { return document.getElementById(id); }

            function el(tag, className, text) {
                var node = document.createElement(tag);
                if (className) node.className = className;
                if (text != null) node.textContent = text;
                return node;
            }

            function data(tag, className, text) {
                var node = el(tag, className, text);
                node.setAttribute('translate', 'no');
                return node;
            }

            function fillIcon(node, name) {
                node.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
                return node;
            }

            function icon(name) { return fillIcon(el('span', 'hd-icon'), name); }

            function iconButton(name, title, className, onClick) {
                var button = el('button', 'hd-act' + (className ? ' ' + className : ''));
                button.type = 'button';
                button.title = title;
                button.setAttribute('aria-label', title);
                button.appendChild(icon(name));
                button.addEventListener('click', onClick);
                return button;
            }

            function noImage() {
                var node = el('span', 'hd-noimg');
                node.appendChild(icon('image'));
                node.appendChild(el('span', 'hd-noimg-text', 'Chưa có ảnh xem trước'));
                return node;
            }

            function image(item) {
                if (!item.Thumb) return noImage();
                var img = el('img');
                img.alt = '';
                img.loading = 'lazy';
                img.src = item.Thumb;
                img.addEventListener('error', function () {
                    if (img.parentNode) img.parentNode.replaceChild(noImage(), img);
                });
                return img;
            }

            function typeLabel(item) { return TYPE_LABELS[item.Type] || item.Type; }
            function projectKey(item) { return item.ProjectId == null ? NO_PROJECT : String(item.ProjectId); }
            function editUrl(item) { return BUILDER + '?controlId=' + item.Id; }
            function cloneUrl(item) { return BUILDER + '?cloneId=' + item.Id; }
            function isMineScope() { return state.scope === 'mine'; }

            function haystack(item) {
                return [item.Name, item.ProjectName, item.Owner, item.Type, item.Updated].join(' ').toLowerCase();
            }

            function byText(a, b) { return String(a).localeCompare(String(b), 'vi', { sensitivity: 'base' }); }
            function newestFirst(a, b) { return b.UpdatedOrder - a.UpdatedOrder; }

            var SORTERS = {
                'date-desc': newestFirst,
                'date-asc': function (a, b) { return a.UpdatedOrder - b.UpdatedOrder; },
                'name-asc': function (a, b) { return byText(a.Name, b.Name) || newestFirst(a, b); },
                'name-desc': function (a, b) { return byText(b.Name, a.Name) || newestFirst(a, b); },
                'type-asc': function (a, b) { return byText(a.Type, b.Type) || newestFirst(a, b); },
                'owner-asc': function (a, b) { return byText(a.Owner, b.Owner) || newestFirst(a, b); }
            };

            function visibleItems() {
                var mine = isMineScope();
                var text = state.search;
                return state[state.scope].filter(function (item) {
                    if (mine && state.visibility === 'public' && !item.IsPublic) return false;
                    if (mine && state.visibility === 'private' && item.IsPublic) return false;
                    if (mine && state.projects && !state.projects[projectKey(item)]) return false;
                    return !text || haystack(item).indexOf(text) >= 0;
                }).sort(SORTERS[state.sort] || newestFirst);
            }

            function hasFilter() {
                return !!state.search || (isMineScope() && (state.visibility !== 'all' || !!state.projects));
            }

            function clearFilters() {
                state.search = '';
                state.visibility = 'all';
                state.projects = null;
                byId('hdSearch').value = '';
                byId('hdVisibility').value = 'all';
                renderProjects();
                render();
            }

            function stateChip(item) {
                return el('span', 'hd-chip ' + (item.IsPublic ? 'hd-chip-public' : 'hd-chip-private'), item.IsPublic ? 'Công khai' : 'Riêng tư');
            }

            function projectLabel(item) {
                return item.ProjectName ? data('span', null, item.ProjectName) : el('span', null, 'Chưa chọn dự án');
            }

            function ownerLabel(item) {
                return item.IsMine ? el('span', null, 'Bạn') : data('span', null, item.Owner);
            }

            function dateLabel(item) {
                var node = el('span', 'hd-date');
                node.title = 'Sửa lần cuối';
                node.appendChild(data('span', null, item.Updated));
                return node;
            }

            function actions(item) {
                var box = el('div', 'hd-acts');
                box.appendChild(iconButton('eye', 'Xem ảnh lớn', null, function () { openPreview(item); }));
                if (isMineScope()) {
                    box.appendChild(iconButton(item.IsPublic ? 'lock' : 'globe', item.IsPublic ? 'Chuyển thành riêng tư' : 'Chuyển thành công khai', null, function () { setPublic(item, !item.IsPublic); }));
                    box.appendChild(iconButton('trash', 'Xóa thiết kế', 'hd-act-danger', function () { removeDesign(item); }));
                }
                return box;
            }

            function cloneLink(item) {
                var link = el('a', 'ba-btn ba-btn-sm ba-btn-primary');
                link.href = cloneUrl(item);
                link.title = 'Tạo bản sao của thiết kế này trong UI Builder';
                link.appendChild(icon('copy'));
                link.appendChild(el('span', null, 'Nhân bản'));
                return link;
            }

            function card(item) {
                var mine = isMineScope();
                var node = el('article', 'hd-card');
                node.setAttribute('data-id', item.Id);

                var thumb = el(mine ? 'a' : 'button', 'hd-thumb');
                if (mine) thumb.href = editUrl(item);
                else {
                    thumb.type = 'button';
                    thumb.addEventListener('click', function () { openPreview(item); });
                }
                thumb.appendChild(image(item));
                var cta = el('span', 'hd-thumb-cta');
                cta.appendChild(el('span', null, mine ? 'Mở thiết kế' : 'Xem ảnh lớn'));
                thumb.appendChild(cta);
                node.appendChild(thumb);

                var body = el('div', 'hd-card-body');
                var name = data(mine ? 'a' : 'div', 'hd-name', item.Name);
                name.title = item.Name;
                if (mine) name.href = editUrl(item);
                body.appendChild(name);

                var meta = el('div', 'hd-meta');
                if (mine) meta.appendChild(stateChip(item));
                if (item.Type !== 'page') meta.appendChild(data('span', 'hd-chip hd-chip-type', typeLabel(item)));
                var project = el('span', 'hd-project');
                project.appendChild(icon(mine ? 'folder' : 'user'));
                if (mine) project.appendChild(projectLabel(item));
                else project.appendChild(ownerLabel(item));
                meta.appendChild(project);
                body.appendChild(meta);

                var foot = el('div', 'hd-foot');
                foot.appendChild(dateLabel(item));
                var right = actions(item);
                if (!mine) right.appendChild(cloneLink(item));
                foot.appendChild(right);
                body.appendChild(foot);
                node.appendChild(body);
                return node;
            }

            function cell(child) {
                var td = el('td');
                td.appendChild(child);
                return td;
            }

            function row(item) {
                var mine = isMineScope();
                var tr = el('tr');
                tr.setAttribute('data-id', item.Id);

                var thumb = el('button', 'hd-row-thumb');
                thumb.type = 'button';
                thumb.title = 'Xem ảnh lớn';
                thumb.appendChild(image(item));
                thumb.addEventListener('click', function () { openPreview(item); });
                tr.appendChild(cell(thumb));

                var name = data(mine ? 'a' : 'span', 'hd-name hd-row-name', item.Name);
                name.title = item.Name;
                if (mine) name.href = editUrl(item);
                tr.appendChild(cell(name));
                tr.appendChild(cell(TYPE_LABELS[item.Type] ? el('span', null, typeLabel(item)) : data('span', null, item.Type)));
                tr.appendChild(cell(mine ? stateChip(item) : ownerLabel(item)));
                tr.appendChild(cell(projectLabel(item)));
                tr.appendChild(cell(dateLabel(item)));

                var tools = el('div', 'hd-row-acts');
                tools.appendChild(actions(item));
                if (mine) {
                    var open = el('a', 'ba-btn ba-btn-sm ba-btn-primary', 'Mở');
                    open.href = editUrl(item);
                    tools.appendChild(open);
                } else {
                    tools.appendChild(cloneLink(item));
                }
                tr.appendChild(cell(tools));
                return tr;
            }

            function skeletonCard() {
                var node = el('div', 'hd-card hd-skel');
                node.appendChild(el('div', 'hd-thumb'));
                var body = el('div', 'hd-card-body');
                body.appendChild(el('div', 'hd-skel-line'));
                body.appendChild(el('div', 'hd-skel-line short'));
                node.appendChild(body);
                return node;
            }

            function emptyAction(text, className, onClick, href) {
                var node = el(href ? 'a' : 'button', 'ba-btn ' + className, text);
                if (href) node.href = href;
                else {
                    node.type = 'button';
                    node.addEventListener('click', onClick);
                }
                return node;
            }

            function showEmpty(iconName, title, text, buttons) {
                fillIcon(byId('hdEmptyIcon'), iconName);
                byId('hdEmptyTitle').textContent = title;
                byId('hdEmptyText').textContent = text || '';
                var host = byId('hdEmptyActions');
                host.textContent = '';
                (buttons || []).forEach(function (button) { host.appendChild(button); });
                $('#hdEmpty').show();
            }

            function renderEmpty(total) {
                if (state.status === 'error') {
                    showEmpty('alert', state.message || 'Không tải được danh sách thiết kế.', 'Kiểm tra kết nối rồi thử lại.',
                        [emptyAction('Thử lại', 'ba-btn-primary', function () { load(); })]);
                } else if (total > 0) {
                    showEmpty('search', 'Không có thiết kế nào khớp bộ lọc', 'Thử từ khóa khác hoặc bỏ bớt điều kiện lọc.',
                        [emptyAction('Xóa bộ lọc', 'ba-btn-secondary', clearFilters)]);
                } else if (isMineScope()) {
                    showEmpty('layout', 'Bạn chưa có thiết kế nào', 'Tạo một thiết kế mới hoặc bắt đầu từ màn hình chuẩn của HRM.', [
                        emptyAction('Từ màn hình chuẩn', 'ba-btn-secondary', openStandardScreens),
                        emptyAction('Thiết kế mới', 'ba-btn-primary', null, BUILDER)
                    ]);
                } else {
                    showEmpty('globe', 'Chưa có thiết kế công khai nào', 'Thiết kế được chuyển thành công khai sẽ hiện ở đây để mọi người nhân bản.');
                }
            }

            function render() {
                var mine = isMineScope();
                var loading = state.status === 'loading';
                var ready = state.status === 'ready';
                var total = state[state.scope].length;
                var list = ready ? visibleItems() : [];
                var grid = byId('hdGrid');
                var rows = byId('hdRows');
                var showTable = state.view === 'table' && !loading;

                $('#hdTabs .ba-tab').removeClass('active').filter('[data-scope="' + state.scope + '"]').addClass('active');
                $('#hdCountMine').text(ready ? String(state.mine.length) : '');
                $('#hdCountShared').text(ready ? String(state.shared.length) : '');
                $('#hdProjectWrap, #hdVisibility').toggle(mine);
                $('#hdSortOwner').prop('disabled', mine).prop('hidden', mine);
                $('#hdColState').toggle(mine);
                $('#hdColOwner').toggle(!mine);
                $('#hdView .hd-view-btn').removeClass('active').filter('[data-view="' + state.view + '"]').addClass('active');
                $('#hdResult').text(!ready ? '' : (list.length === total ? total + ' thiết kế' : 'Hiện ' + list.length + ' trên ' + total + ' thiết kế'));

                grid.textContent = '';
                rows.textContent = '';
                $('#hdEmpty').hide();
                if (loading) {
                    for (var i = 0; i < SKELETON_CARDS; i++) grid.appendChild(skeletonCard());
                } else if (!list.length) {
                    renderEmpty(ready ? total : 0);
                } else if (showTable) {
                    list.forEach(function (item) { rows.appendChild(row(item)); });
                } else {
                    list.forEach(function (item) { grid.appendChild(card(item)); });
                }
                $(grid).toggle(loading || (!!list.length && !showTable));
                $('#hdTableWrap').toggle(!!list.length && showTable);
            }

            function showLoadError(message) {
                state.status = 'error';
                state.message = message || '';
                render();
            }

            function load(silent) {
                if (!silent) {
                    state.status = 'loading';
                    render();
                }
                call(SERVICE, 'ListDesigns').done(function (d) {
                    if (!d || !d.success) {
                        if (!silent) showLoadError(d && d.message);
                        return;
                    }
                    state.status = 'ready';
                    state.mine = d.mine || [];
                    state.shared = d.shared || [];
                    renderProjects();
                    render();
                }).fail(function () {
                    if (!silent) showLoadError();
                });
            }

            function reload() {
                load(true);
                loadProjects();
            }

            function openPreview(item) {
                byId('hdPreviewTitle').textContent = item.Name;
                var body = byId('hdPreviewBody');
                body.textContent = '';
                body.appendChild(image(item));
                $('#hdPreview').addClass('show');
            }

            function setPublic(item, isPublic) {
                call(SERVICE, 'SetDesignPublic', { controlId: item.Id, isPublic: isPublic }).done(function (d) {
                    toast(d && d.message ? d.message : 'Không đổi được trạng thái chia sẻ.', d && d.success ? 'success' : 'error');
                    reload();
                }).fail(function () { toast('Không đổi được trạng thái chia sẻ.', 'error'); });
            }

            function removeDesign(item) {
                baConfirm('Xóa thiết kế "' + item.Name + '"? Thiết kế sẽ không còn trong danh sách của bạn.', function () {
                    call(SERVICE, 'DeleteDesign', { controlId: item.Id }).done(function (d) {
                        toast(d && d.message ? d.message : 'Không xóa được thiết kế.', d && d.success ? 'success' : 'error');
                        reload();
                    }).fail(function () { toast('Không xóa được thiết kế.', 'error'); });
                }, null, 'Xóa thiết kế', 'Không');
            }

            function openStandardScreens() { builderTemplates.openGallery(); }

            function looseDesigns() {
                return state.mine.filter(function (item) { return item.ProjectId == null; }).length;
            }

            function projectName(key) {
                if (key === NO_PROJECT) return null;
                var found = state.projectList.filter(function (p) { return String(p.projectId) === key; })[0];
                return found ? found.name : null;
            }

            function toggleProject(key, checked) {
                var selected = state.projects || {};
                if (checked) selected[key] = true;
                else delete selected[key];
                state.projects = Object.keys(selected).length ? selected : null;
                renderProjects();
                render();
            }

            function projectOption(key, name, count, isData, canDelete) {
                var label = el('label', 'hd-pop-item');
                var box = el('input');
                box.type = 'checkbox';
                box.checked = key === null ? !state.projects : !!(state.projects && state.projects[key]);
                box.addEventListener('change', function () {
                    if (key === null) {
                        state.projects = null;
                        renderProjects();
                        render();
                    } else {
                        toggleProject(key, box.checked);
                    }
                });
                label.appendChild(box);
                label.appendChild(isData ? data('span', 'hd-pop-name', name) : el('span', 'hd-pop-name', name));
                if (count != null) label.appendChild(data('span', 'hd-pop-count', String(count)));
                if (canDelete) {
                    label.appendChild(iconButton('trash', 'Xóa dự án', 'hd-act-danger', function (e) {
                        e.preventDefault();
                        removeProject(key, name, count);
                    }));
                }
                return label;
            }

            function renderProjects() {
                var list = byId('hdProjectList');
                var query = $.trim(byId('hdProjectSearch').value).toLowerCase();
                var selected = state.projects ? Object.keys(state.projects) : [];
                var loose = looseDesigns();
                list.textContent = '';
                if (!query) list.appendChild(projectOption(null, 'Tất cả dự án', null, false, false));
                state.projectList.forEach(function (p) {
                    if (query && String(p.name).toLowerCase().indexOf(query) < 0) return;
                    list.appendChild(projectOption(String(p.projectId), p.name, p.designCount || 0, true, true));
                });
                if (loose && !query) list.appendChild(projectOption(NO_PROJECT, 'Chưa chọn dự án', loose, false, false));

                var label = byId('hdProjectLabel');
                var single = selected.length === 1 ? projectName(selected[0]) : null;
                if (single) {
                    label.setAttribute('translate', 'no');
                    label.textContent = single;
                } else {
                    label.removeAttribute('translate');
                    label.textContent = !selected.length ? 'Tất cả dự án' : (selected.length === 1 ? 'Chưa chọn dự án' : selected.length + ' dự án');
                }
            }

            function loadProjects() {
                call(PROJECT_SERVICE, 'GetProjects').done(function (list) {
                    state.projectList = Array.isArray(list) ? list : [];
                    if (state.projects) {
                        Object.keys(state.projects).forEach(function (key) {
                            if (key !== NO_PROJECT && !projectName(key)) delete state.projects[key];
                        });
                        if (!Object.keys(state.projects).length) state.projects = null;
                    }
                    renderProjects();
                    render();
                }).fail(function () { toast('Không tải được danh sách dự án.', 'error'); });
            }

            function closeProjectPop() {
                $('#hdProjectWrap').removeClass('open');
                $('#hdProjectBtn').attr('aria-expanded', 'false');
            }

            function openProjectModal() {
                closeProjectPop();
                byId('hdProjectName').value = '';
                byId('hdProjectDescription').value = '';
                byId('hdProjectError').textContent = '';
                $('#hdProjectModal').addClass('show');
                byId('hdProjectName').focus();
            }

            function createProject() {
                var name = $.trim(byId('hdProjectName').value);
                var error = byId('hdProjectError');
                if (!name) {
                    error.textContent = 'Chưa nhập tên dự án.';
                    byId('hdProjectName').focus();
                    return;
                }
                call(PROJECT_SERVICE, 'CreateProject', { name: name, description: $.trim(byId('hdProjectDescription').value) }).done(function (d) {
                    if (!d || !d.success) {
                        error.textContent = d && d.message ? d.message : 'Không tạo được dự án.';
                        return;
                    }
                    $('#hdProjectModal').removeClass('show');
                    toast('Đã tạo dự án.', 'success');
                    loadProjects();
                }).fail(function () { error.textContent = 'Không tạo được dự án.'; });
            }

            function removeProject(key, name, count) {
                closeProjectPop();
                var question = 'Xóa dự án "' + name + '"?';
                var note = count > 0 ? 'Dự án có ' + count + ' thiết kế; các thiết kế này không bị xóa, chỉ không còn thuộc dự án.' : '';
                baConfirm(note ? question + ' ' + note : question, function () {
                    call(PROJECT_SERVICE, 'DeleteProject', { projectId: parseInt(key, 10) }).done(function (d) {
                        if (!d || !d.success) {
                            toast(d && d.message ? d.message : 'Không xóa được dự án.', 'error');
                            return;
                        }
                        toast('Đã xóa dự án.', 'success');
                        reload();
                    }).fail(function () { toast('Không xóa được dự án.', 'error'); });
                }, null, 'Xóa dự án', 'Không');
            }

            function setScope(scope) {
                state.scope = scope === 'shared' ? 'shared' : 'mine';
                if (isMineScope() && state.sort === 'owner-asc') {
                    state.sort = 'date-desc';
                    byId('hdSort').value = state.sort;
                }
                if (window.history && history.replaceState) history.replaceState(null, '', '#' + state.scope);
                closeProjectPop();
                render();
            }

            $(function () {
                $('.hd-icon[data-icon]').each(function () { fillIcon(this, this.getAttribute('data-icon')); });

                var savedView = null;
                try { savedView = window.localStorage.getItem(VIEW_KEY); } catch (e) { savedView = null; }
                state.view = savedView === 'table' ? 'table' : 'grid';
                state.scope = (window.location.hash || '') === '#shared' ? 'shared' : 'mine';

                $('#hdTabs').on('click', '.ba-tab', function () { setScope($(this).attr('data-scope')); });
                $('#hdView').on('click', '.hd-view-btn', function () {
                    state.view = $(this).attr('data-view') === 'table' ? 'table' : 'grid';
                    try { window.localStorage.setItem(VIEW_KEY, state.view); } catch (e) { }
                    render();
                });
                $('#hdSearch').on('input', function () {
                    state.search = $.trim(this.value).toLowerCase();
                    render();
                });
                $('#hdVisibility').on('change', function () {
                    state.visibility = this.value;
                    render();
                });
                $('#hdSort').on('change', function () {
                    state.sort = this.value;
                    render();
                });
                $('#hdFromStandard').on('click', openStandardScreens);

                $('#hdProjectBtn').on('click', function () {
                    var open = !$('#hdProjectWrap').hasClass('open');
                    $('#hdProjectWrap').toggleClass('open', open);
                    $(this).attr('aria-expanded', open ? 'true' : 'false');
                    if (open) byId('hdProjectSearch').focus();
                });
                $('#hdProjectSearch').on('input', renderProjects);
                $('#hdProjectNew').on('click', openProjectModal);
                $('#hdProjectCreate').on('click', createProject);
                $('#hdProjectName').on('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        createProject();
                    }
                });

                $(document).on('click', '[data-close]', function () { $('#' + $(this).attr('data-close')).removeClass('show'); });
                $(document).on('mousedown', function (e) {
                    if (!$(e.target).closest('#hdProjectWrap').length) closeProjectPop();
                });
                $(document).on('keydown', function (e) {
                    if (e.key !== 'Escape') return;
                    closeProjectPop();
                    $('#hdPreview, #hdProjectModal').removeClass('show');
                });

                load();
                loadProjects();
            });
        })();
    </script>
</body>
</html>
