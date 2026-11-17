<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="TemplateRequests.aspx.cs"
    Inherits="BADesign.Pages.TemplateRequests" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Mẫu UI dùng chung - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
        .tr-count { display: inline-block; min-width: 1.125rem; margin-left: 0.25rem; padding: 0 0.3125rem; border-radius: 999px; background: var(--danger); color: #fff; font-size: 0.6875rem; font-weight: 600; line-height: 1.125rem; text-align: center; }
        .tr-count:empty { display: none; }
        .tr-list { display: flex; flex-direction: column; gap: 0.625rem; }
        .tr-item { display: flex; gap: 0.75rem; margin-bottom: 0; min-width: 0; }
        .tr-thumb { flex: 0 0 150px; width: 150px; height: 96px; border: 1px solid var(--border); border-radius: 6px; background: #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 0.75rem; }
        .tr-thumb img { max-width: 100%; max-height: 100%; display: block; }
        .tr-main { flex: 1 1 auto; min-width: 0; }
        .tr-title { display: flex; align-items: center; flex-wrap: wrap; gap: 0.375rem; }
        .tr-name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); word-break: break-word; }
        .tr-tag { padding: 0.0625rem 0.5rem; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-darker); color: var(--text-secondary); font-size: 0.75rem; }
        .tr-meta { margin-top: 0.1875rem; color: var(--text-muted); font-size: 0.8125rem; word-break: break-word; }
        .tr-desc { margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.8125rem; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .tr-state { margin-top: 0.3125rem; font-size: 0.8125rem; color: var(--text-primary); word-break: break-word; }
        .tr-status { display: inline-block; padding: 0.0625rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-right: 0.375rem; }
        .tr-status-pending { background: rgba(245, 158, 11, 0.2); color: #d97706; }
        .tr-status-approved { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .tr-status-rejected { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .tr-status-cancelled { background: var(--bg-darker); color: var(--text-muted); }
        .tr-actions { flex: 0 0 auto; display: flex; flex-direction: column; gap: 0.375rem; align-items: stretch; }
        .tr-actions .ba-btn { white-space: nowrap; justify-content: center; text-decoration: none; }
        .tl { margin: 0; padding: 0; list-style: none; }
        .tl li { position: relative; padding: 0 0 1rem 1.75rem; }
        .tl li::before { content: ""; position: absolute; left: 0.3125rem; top: 0.25rem; width: 0.75rem; height: 0.75rem; border-radius: 50%; background: var(--border); box-sizing: border-box; }
        .tl li::after { content: ""; position: absolute; left: 0.625rem; top: 1.125rem; bottom: 0; width: 2px; background: var(--border); }
        .tl li:last-child { padding-bottom: 0; }
        .tl li:last-child::after { display: none; }
        .tl li.tl-done::before, .tl li.tl-approved::before, .tl li.tl-auto::before, .tl li.tl-autochain::before { background: var(--success); }
        .tl li.tl-rejected::before { background: var(--danger); }
        .tl li.tl-pending::before { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25); }
        .tl li.tl-cancelled::before { background: var(--text-muted); }
        .tl li.tl-waiting::before { background: transparent; border: 2px solid var(--border); }
        .tl-title { font-weight: 600; color: var(--text-primary); font-size: 0.875rem; word-break: break-word; }
        .tl-line { color: var(--text-secondary); font-size: 0.8125rem; word-break: break-word; }
        .tl-note { margin-top: 0.1875rem; padding: 0.3125rem 0.5rem; border-left: 3px solid var(--border); background: var(--bg-darker); color: var(--text-primary); font-size: 0.8125rem; white-space: pre-wrap; word-break: break-word; }
        @media (max-width: 760px) {
            .tr-item { flex-wrap: wrap; }
            .tr-actions { flex-direction: row; flex-wrap: wrap; width: 100%; }
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content">
                    <div class="ba-tabs" id="trTabs">
                        <button type="button" class="ba-tab active" data-scope="todo"><span>Chờ tôi duyệt</span><span class="tr-count" id="trTodoCount" translate="no"></span></button>
                        <button type="button" class="ba-tab" data-scope="mine">Tôi đã gửi</button>
                        <button type="button" class="ba-tab" data-scope="library">Thư viện chung</button>
                        <button type="button" class="ba-tab" data-scope="all" id="trTabAll" style="display:none;">Tất cả yêu cầu</button>
                    </div>
                    <p class="ba-section-hint" id="trHint" style="margin-top:0.5rem;"></p>
                    <div class="tr-list" id="trList"></div>
                    <div class="ba-empty" id="trEmpty" style="display:none;"></div>
                </div>
            </main>
        </div>

        <div id="trModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width:560px; width:100%;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Tiến trình duyệt</h3>
                    <button type="button" class="ba-modal-close" id="trModalClose" aria-label="Đóng">&times;</button>
                </div>
                <div class="ba-modal-body">
                    <div class="tr-name" id="trModalName" translate="no" style="margin-bottom:0.75rem;"></div>
                    <ol class="tl" id="trTimeline"></ol>
                </div>
            </div>
        </div>
    </form>
    <script>
        (function () {
            var SERVICE = '<%= ResolveUrl("~/Pages/TemplateRequests.aspx") %>';
            var BUILDER = '<%= ResolveUrl("~/Builder") %>';
            var HINTS = {
                todo: 'Các mẫu đang chờ bạn duyệt. Bấm Xem và duyệt để mở mẫu ở chế độ chỉ xem trong UI Builder.',
                mine: 'Các mẫu bạn đã gửi. Muốn gửi mẫu mới: mở thiết kế trong UI Builder, bấm mũi tên cạnh nút Lưu rồi chọn Gửi làm mẫu chung.',
                library: 'Các mẫu đã được duyệt, dùng chung cho mọi người có quyền UI Builder. Trong UI Builder, các mẫu này nằm ở hộp Màn hình chuẩn, nhóm Mẫu của team.',
                all: 'Mọi yêu cầu gửi mẫu. Chỉ người quản trị mẫu UI thấy tab này.'
            };
            var EMPTY = {
                todo: 'Không có mẫu nào đang chờ bạn duyệt.',
                mine: 'Bạn chưa gửi mẫu nào.',
                library: 'Thư viện chung chưa có mẫu nào.',
                all: 'Chưa có yêu cầu nào.'
            };
            var STATUS = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Bị từ chối', Cancelled: 'Đã hủy' };
            var STEP = { approved: 'Đã duyệt', rejected: 'Từ chối', auto: 'Tự động duyệt vì người gửi là người duyệt của bước này', autochain: 'Tự động duyệt vì người duyệt bước trước cũng là người duyệt của bước này', pending: 'Đang chờ duyệt', waiting: 'Chưa tới' };
            var state = { scope: 'todo', canBuild: false };

            function call(method, data) {
                return $.ajax({
                    url: SERVICE + '/' + method,
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify(data || {})
                }).then(function (res) { return res && res.d !== undefined ? res.d : res; });
            }

            function toast(message, type) { BaToast.show(message, type || 'info'); }

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

            function action(text, className, onClick) {
                var button = el('button', 'ba-btn ba-btn-sm ' + className, text);
                button.type = 'button';
                button.addEventListener('click', onClick);
                return button;
            }

            function link(text, className, href) {
                var a = el('a', 'ba-btn ba-btn-sm ' + className, text);
                a.href = href;
                return a;
            }

            function item(info) {
                var card = el('div', 'ba-card tr-item');
                var thumb = el('div', 'tr-thumb');
                if (info.Thumb && /^\/[\w\-.\/]+\.png$/.test(info.Thumb)) {
                    var img = el('img');
                    img.alt = '';
                    img.loading = 'lazy';
                    img.src = info.Thumb;
                    img.addEventListener('error', function () { thumb.textContent = 'Không có ảnh'; });
                    thumb.appendChild(img);
                } else {
                    thumb.textContent = 'Không có ảnh';
                }
                card.appendChild(thumb);

                var main = el('div', 'tr-main');
                var title = el('div', 'tr-title');
                title.appendChild(data('span', 'tr-name', info.Name));
                if (info.UiKind) title.appendChild(data('span', 'tr-tag', info.UiKind === 'ess' ? 'ESS' : 'Core'));
                if (info.ModuleName || info.Category) title.appendChild(data('span', 'tr-tag', info.ModuleName || info.Category));
                main.appendChild(title);

                var meta = el('div', 'tr-meta');
                meta.appendChild(el('span', null, 'Người gửi:'));
                meta.appendChild(data('span', null, ' ' + info.SubmitterName + (info.SubmitterRole ? ' (' + info.SubmitterRole + ')' : '') + ' · ' + info.SubmittedAt + ' · ' + info.ControlCount + ' control'));
                main.appendChild(meta);
                if (info.Description) main.appendChild(data('div', 'tr-desc', info.Description));

                var stateLine = el('div', 'tr-state');
                stateLine.appendChild(el('span', 'tr-status tr-status-' + String(info.Status || '').toLowerCase(), STATUS[info.Status] || info.Status));
                if (info.Status === 'Pending') {
                    stateLine.appendChild(el('span', null, 'Bước'));
                    stateLine.appendChild(data('span', null, ' ' + info.CurrentStepNo + '/' + info.TotalSteps + ' · '));
                    stateLine.appendChild(el('span', null, 'đang chờ:'));
                    stateLine.appendChild(data('span', null, ' ' + (info.PendingWith || []).join(', ')));
                } else if (info.Status === 'Approved') {
                    stateLine.appendChild(el('span', null, 'Người duyệt:'));
                    stateLine.appendChild(data('span', null, ' ' + ((info.ApprovedBy || []).join(', ') || info.CompletedBy || '') + ' · ' + (info.CompletedAt || '')));
                    if (!info.IsInLibrary) stateLine.appendChild(el('span', 'tr-tag', 'Không còn trong thư viện'));
                } else if (info.Status === 'Rejected') {
                    stateLine.appendChild(data('span', null, (info.CompletedBy || '') + ' · ' + (info.CompletedAt || '') + (info.CompletedNote ? ' · ' + info.CompletedNote : '')));
                } else if (info.CompletedAt) {
                    stateLine.appendChild(data('span', null, info.CompletedAt));
                }
                main.appendChild(stateLine);
                card.appendChild(main);

                var actions = el('div', 'tr-actions');
                actions.appendChild(link(info.CanAct ? 'Xem và duyệt' : 'Xem mẫu', info.CanAct ? 'ba-btn-primary' : 'ba-btn-secondary', BUILDER + '?reviewId=' + info.RequestId));
                actions.appendChild(action('Tiến trình', 'ba-btn-secondary', function () { showTimeline(info.RequestId); }));
                if (info.IsInLibrary && state.canBuild) actions.appendChild(link('Dùng mẫu này', 'ba-btn-secondary', BUILDER + '?template=team-' + info.RequestId));
                if (info.CanCancel) actions.appendChild(action('Hủy yêu cầu', 'ba-btn-danger', function () { cancel(info); }));
                if (info.CanRemove) actions.appendChild(action('Gỡ khỏi thư viện', 'ba-btn-danger', function () { remove(info); }));
                card.appendChild(actions);
                return card;
            }

            function load() {
                var scope = state.scope;
                $('#trHint').text(HINTS[scope] || '');
                call('ListRequests', { scope: scope }).done(function (d) {
                    if (scope !== state.scope) return;
                    var list = document.getElementById('trList');
                    list.textContent = '';
                    if (!d || !d.success) {
                        $('#trEmpty').text(d && d.message ? d.message : 'Không tải được danh sách.').show();
                        return;
                    }
                    state.canBuild = !!d.canBuild;
                    $('#trTabAll').toggle(!!d.isAdmin);
                    $('#trTodoCount').text(d.todo > 0 ? String(d.todo) : '');
                    (d.list || []).forEach(function (info) { list.appendChild(item(info)); });
                    $('#trEmpty').text(EMPTY[scope] || '').toggle(!(d.list || []).length);
                }).fail(function () {
                    $('#trEmpty').text('Không tải được danh sách.').show();
                });
            }

            function showTimeline(requestId) {
                call('GetRequest', { requestId: requestId }).done(function (d) {
                    if (!d || !d.success) { toast(d && d.message ? d.message : 'Không tải được tiến trình.', 'error'); return; }
                    var info = d.request;
                    $('#trModalName').text(info.Name);
                    var host = document.getElementById('trTimeline');
                    host.textContent = '';
                    (info.Timeline || []).forEach(function (entry) {
                        var li = el('li', 'tl-' + entry.Status);
                        li.appendChild(data('div', 'tl-title', entry.Title));
                        if (entry.Kind === 'step') {
                            li.appendChild(el('div', 'tl-line', STEP[entry.Status] || ''));
                            if (entry.Status === 'pending' || entry.Status === 'waiting') {
                                var who = el('div', 'tl-line');
                                who.appendChild(el('span', null, 'Người duyệt:'));
                                who.appendChild(data('span', null, ' ' + (entry.Waiting || []).join(', ')));
                                li.appendChild(who);
                            }
                        }
                        if (entry.By || entry.At) li.appendChild(data('div', 'tl-line', [entry.By, entry.At].filter(Boolean).join(' · ')));
                        if (entry.Note) li.appendChild(data('div', 'tl-note', entry.Note));
                        host.appendChild(li);
                    });
                    $('#trModal').addClass('show');
                }).fail(function () { toast('Không tải được tiến trình.', 'error'); });
            }

            function cancel(info) {
                baConfirm('Hủy yêu cầu gửi mẫu này? Người duyệt sẽ không còn thấy yêu cầu.', function () {
                    call('CancelRequest', { requestId: info.RequestId }).done(function (d) {
                        toast(d && d.message ? d.message : 'Không hủy được yêu cầu.', d && d.success ? 'success' : 'error');
                        load();
                    }).fail(function () { toast('Không hủy được yêu cầu.', 'error'); });
                }, null, 'Hủy yêu cầu', 'Không');
            }

            function remove(info) {
                baConfirm('Gỡ mẫu này khỏi thư viện chung? Các thiết kế đã tạo từ mẫu không bị ảnh hưởng.', function () {
                    call('RemoveFromLibrary', { requestId: info.RequestId }).done(function (d) {
                        toast(d && d.message ? d.message : 'Không gỡ được mẫu.', d && d.success ? 'success' : 'error');
                        load();
                    }).fail(function () { toast('Không gỡ được mẫu.', 'error'); });
                }, null, 'Gỡ mẫu', 'Không');
            }

            $(function () {
                var wanted = (window.location.hash || '').replace('#', '');
                if (HINTS[wanted]) state.scope = wanted;
                $('#trTabs .ba-tab').removeClass('active').filter('[data-scope="' + state.scope + '"]').addClass('active');
                $('#trTabs').on('click', '.ba-tab', function () {
                    state.scope = $(this).attr('data-scope');
                    $('#trTabs .ba-tab').removeClass('active');
                    $(this).addClass('active');
                    if (window.history && history.replaceState) history.replaceState(null, '', '#' + state.scope);
                    load();
                });
                $('#trModalClose').on('click', function () { $('#trModal').removeClass('show'); });
                $(document).on('keydown', function (e) {
                    if (e.key === 'Escape') $('#trModal').removeClass('show');
                });
                load();
            });
        })();
    </script>
</body>
</html>
