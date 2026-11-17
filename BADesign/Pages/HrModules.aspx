<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="HrModules.aspx.cs"
    Inherits="BADesign.Pages.HrModules" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Phân hệ HR - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
        .hm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
        .hm-head .ba-section-hint { max-width: 46rem; }
        .hm-tools { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
        .hm-tools select.ba-input { flex: 0 0 auto; width: auto; }
        .hm-search { flex: 1 1 14rem; max-width: 20rem; }
        .hm-result { margin-left: auto; color: var(--text-muted); font-size: 0.8125rem; white-space: nowrap; }
        .hm-order { display: inline-flex; gap: 0.25rem; }
        .hm-name { font-weight: 600; color: var(--text-primary); }
        .hm-off .hm-name, .hm-muted { color: var(--text-muted); }
        .hm-acts { display: flex; justify-content: flex-end; gap: 0.25rem; }
        .hm-select { min-width: 12rem; }
        .hm-error { color: var(--danger); font-size: 0.8125rem; }
        .hm-error:empty { display: none; }
        .hm-form { display: flex; flex-direction: column; gap: 0.75rem; }
        .hm-check { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-weight: 400; cursor: pointer; }
        .hm-check input { width: 15px; height: 15px; margin: 0; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content">
                    <div class="hm-error" id="hmLoadError"></div>

                    <div class="ba-card">
                        <div class="hm-head">
                            <div>
                                <h2 class="ba-card-title">Danh sách phân hệ</h2>
                                <p class="ba-section-hint">Phân hệ dùng để lọc màn hình trong hộp Màn hình chuẩn của UI Builder. Phân hệ đang ẩn không hiện trong hộp chọn; màn hình thuộc phân hệ đó vẫn còn trong thư viện.</p>
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="hmAdd">Thêm phân hệ</button>
                        </div>
                        <div class="ba-table-wrap" id="hmModuleWrap">
                            <table class="ba-table">
                                <thead>
                                    <tr>
                                        <th>Thứ tự</th>
                                        <th>Tên phân hệ</th>
                                        <th>Màn hình chuẩn</th>
                                        <th>Mẫu của team</th>
                                        <th>Trạng thái</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody id="hmModules"></tbody>
                            </table>
                        </div>
                        <div class="ba-empty-state" id="hmModuleEmpty">Chưa có phân hệ nào. Bấm Thêm phân hệ để tạo.</div>
                    </div>

                    <div class="ba-card">
                        <h2 class="ba-card-title">Phân hệ của từng màn hình</h2>
                        <p class="ba-section-hint">Chọn phân hệ cho từng màn hình chuẩn và từng mẫu của team. Thay đổi được lưu ngay.</p>
                        <div class="hm-tools">
                            <input type="text" class="ba-input hm-search" id="hmSearch" placeholder="Tìm theo tên màn hình..." autocomplete="off" />
                            <select class="ba-input" id="hmFilter" title="Lọc theo tình trạng gán phân hệ">
                                <option value="all">Tất cả màn hình</option>
                                <option value="none">Chưa gán phân hệ</option>
                            </select>
                            <span class="hm-result" id="hmResult"></span>
                        </div>
                        <div class="ba-table-wrap" id="hmItemWrap">
                            <table class="ba-table">
                                <thead>
                                    <tr>
                                        <th>Màn hình</th>
                                        <th>Kiểu</th>
                                        <th>Nguồn</th>
                                        <th>Phân hệ</th>
                                    </tr>
                                </thead>
                                <tbody id="hmItems"></tbody>
                            </table>
                        </div>
                        <div class="ba-empty-state" id="hmItemEmpty">Không có màn hình nào khớp.</div>
                    </div>
                </div>
            </main>
        </div>

        <div id="hmModal" class="ba-modal">
            <div class="ba-modal-content">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="hmModalTitle">Thêm phân hệ</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" data-close="hmModal" aria-label="Đóng">&times;</button>
                </div>
                <div class="ba-modal-body hm-form">
                    <div class="ba-form-group">
                        <label class="ba-form-label" for="hmName">Tên phân hệ</label>
                        <input type="text" class="ba-input" id="hmName" maxlength="100" placeholder="Ví dụ: Recruitment" autocomplete="off" />
                    </div>
                    <label class="hm-check"><input type="checkbox" id="hmActive" /> <span>Hiện trong hộp Màn hình chuẩn</span></label>
                    <div class="hm-error" id="hmModalError"></div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" data-close="hmModal">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="hmSave">Lưu phân hệ</button>
                </div>
            </div>
        </div>
    </form>
    <script>
        (function () {
            var SERVICE = '<%= ResolveUrl("~/Pages/HrModules.aspx") %>';
            var UI_LABELS = { core: 'Core', ess: 'ESS' };
            var state = { modules: [], items: [], query: '', filter: 'all', editingId: 0 };

            function call(method, payload) {
                return $.ajax({
                    url: SERVICE + '/' + method,
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

            function cell(child) {
                var td = el('td');
                td.appendChild(child);
                return td;
            }

            function button(text, className, title, onClick, disabled) {
                var node = el('button', 'ba-btn ba-btn-sm ' + className, text);
                node.type = 'button';
                if (title) node.title = title;
                node.disabled = !!disabled;
                node.addEventListener('click', onClick);
                return node;
            }

            function answer(d, fallback, onDone) {
                if (!d || !d.success) {
                    toast(d && d.message ? d.message : fallback, 'error');
                    load();
                    return;
                }
                if (d.message) toast(d.message, 'success');
                if (onDone) onDone(d);
                load();
            }

            function moduleById(id) {
                return state.modules.filter(function (m) { return m.ModuleId === id; })[0] || null;
            }

            function moduleRow(module, index) {
                var tr = el('tr', module.IsActive ? null : 'hm-off');
                tr.setAttribute('data-id', module.ModuleId);

                var order = el('div', 'hm-order');
                order.appendChild(button('↑', 'ba-btn-secondary', 'Đưa lên', function () { move(index, -1); }, index === 0));
                order.appendChild(button('↓', 'ba-btn-secondary', 'Đưa xuống', function () { move(index, 1); }, index === state.modules.length - 1));
                tr.appendChild(cell(order));
                tr.appendChild(cell(data('span', 'hm-name', module.Name)));
                tr.appendChild(cell(data('span', null, String(module.ScreenCount))));
                tr.appendChild(cell(data('span', null, String(module.TemplateCount))));
                tr.appendChild(cell(el('span', module.IsActive ? null : 'hm-muted', module.IsActive ? 'Đang dùng' : 'Đang ẩn')));

                var acts = el('div', 'hm-acts');
                acts.appendChild(button('Đổi tên', 'ba-btn-secondary', null, function () { openModal(module); }));
                acts.appendChild(button(module.IsActive ? 'Ẩn' : 'Hiện', 'ba-btn-secondary',
                    module.IsActive ? 'Không hiện phân hệ này trong hộp Màn hình chuẩn' : 'Hiện lại phân hệ này trong hộp Màn hình chuẩn',
                    function () { saveModule(module.ModuleId, module.Name, !module.IsActive); }));
                acts.appendChild(button('Xóa', 'ba-btn-danger', null, function () { removeModule(module); }));
                tr.appendChild(cell(acts));
                return tr;
            }

            function moduleSelect(item) {
                var select = el('select', 'ba-input hm-select');
                var none = el('option', null, 'Chưa gán');
                none.value = '0';
                select.appendChild(none);
                state.modules.forEach(function (module) {
                    if (!module.IsActive && module.ModuleId !== item.ModuleId) return;
                    var option = data('option', null, module.Name);
                    option.value = String(module.ModuleId);
                    select.appendChild(option);
                });
                select.value = String(item.ModuleId || 0);
                select.addEventListener('change', function () {
                    call('Assign', { kind: item.Kind, key: item.Key, moduleId: parseInt(select.value, 10) || 0 })
                        .done(function (d) { answer(d, 'Không lưu được phân hệ của màn hình.'); })
                        .fail(function () { toast('Không lưu được phân hệ của màn hình.', 'error'); load(); });
                });
                return select;
            }

            function itemRow(item) {
                var tr = el('tr');
                tr.setAttribute('data-key', item.Kind + ':' + item.Key);
                tr.appendChild(cell(data('span', 'hm-name', item.Name)));
                tr.appendChild(cell(data('span', null, UI_LABELS[item.Ui] || '')));
                tr.appendChild(cell(item.Kind === 'template' ? el('span', 'hm-muted', 'Mẫu của team') : data('span', 'hm-muted', item.Group)));
                tr.appendChild(cell(moduleSelect(item)));
                return tr;
            }

            function visibleItems() {
                return state.items.filter(function (item) {
                    if (state.filter === 'none' && item.ModuleId) return false;
                    return !state.query || (item.Name + ' ' + item.Group).toLowerCase().indexOf(state.query) >= 0;
                });
            }

            function render() {
                var modules = byId('hmModules');
                modules.textContent = '';
                state.modules.forEach(function (module, index) { modules.appendChild(moduleRow(module, index)); });
                $('#hmModuleWrap').toggle(state.modules.length > 0);
                $('#hmModuleEmpty').toggle(state.modules.length === 0);

                var items = byId('hmItems');
                var list = visibleItems();
                items.textContent = '';
                list.forEach(function (item) { items.appendChild(itemRow(item)); });
                $('#hmItemWrap').toggle(list.length > 0);
                $('#hmItemEmpty').toggle(list.length === 0);
                byId('hmResult').textContent = list.length === state.items.length
                    ? state.items.length + ' màn hình'
                    : 'Hiện ' + list.length + ' trên ' + state.items.length + ' màn hình';
            }

            function load() {
                call('LoadAll').done(function (d) {
                    if (!d || !d.success) {
                        byId('hmLoadError').textContent = d && d.message ? d.message : 'Không tải được danh sách phân hệ.';
                        return;
                    }
                    byId('hmLoadError').textContent = '';
                    state.modules = d.modules || [];
                    state.items = d.items || [];
                    render();
                }).fail(function () {
                    byId('hmLoadError').textContent = 'Không tải được danh sách phân hệ.';
                });
            }

            function saveModule(moduleId, name, isActive, onDone) {
                call('SaveModule', { moduleId: moduleId, name: name, isActive: isActive })
                    .done(function (d) {
                        if (onDone) onDone(d);
                        else answer(d, 'Không lưu được phân hệ.');
                    })
                    .fail(function () {
                        if (onDone) onDone(null);
                        else toast('Không lưu được phân hệ.', 'error');
                    });
            }

            function move(index, delta) {
                var target = index + delta;
                if (target < 0 || target >= state.modules.length) return;
                var ids = state.modules.map(function (m) { return m.ModuleId; });
                ids.splice(target, 0, ids.splice(index, 1)[0]);
                call('ReorderModules', { moduleIds: ids })
                    .done(function (d) { answer(d, 'Không lưu được thứ tự phân hệ.'); })
                    .fail(function () { toast('Không lưu được thứ tự phân hệ.', 'error'); });
            }

            function removeModule(module) {
                var used = module.ScreenCount + module.TemplateCount;
                var question = 'Xóa phân hệ "' + module.Name + '"?';
                var note = used > 0 ? 'Có ' + used + ' màn hình đang gán phân hệ này; chúng sẽ thành chưa gán, không bị xóa.' : '';
                baConfirm(note ? question + ' ' + note : question, function () {
                    call('DeleteModule', { moduleId: module.ModuleId })
                        .done(function (d) { answer(d, 'Không xóa được phân hệ.'); })
                        .fail(function () { toast('Không xóa được phân hệ.', 'error'); });
                }, null, 'Xóa phân hệ', 'Không');
            }

            function openModal(module) {
                state.editingId = module ? module.ModuleId : 0;
                byId('hmModalTitle').textContent = module ? 'Đổi tên phân hệ' : 'Thêm phân hệ';
                byId('hmName').value = module ? module.Name : '';
                byId('hmActive').checked = module ? module.IsActive : true;
                byId('hmModalError').textContent = '';
                $('#hmModal').addClass('show');
                byId('hmName').focus();
            }

            function submitModal() {
                var name = $.trim(byId('hmName').value);
                var error = byId('hmModalError');
                if (!name) {
                    error.textContent = 'Chưa nhập tên phân hệ.';
                    byId('hmName').focus();
                    return;
                }
                saveModule(state.editingId, name, byId('hmActive').checked, function (d) {
                    if (!d || !d.success) {
                        error.textContent = d && d.message ? d.message : 'Không lưu được phân hệ.';
                        return;
                    }
                    $('#hmModal').removeClass('show');
                    toast(d.message || 'Đã lưu phân hệ.', 'success');
                    load();
                });
            }

            $(function () {
                $('#hmAdd').on('click', function () { openModal(null); });
                $('#hmSave').on('click', submitModal);
                $('#hmName').on('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitModal();
                    }
                });
                $('#hmSearch').on('input', function () {
                    state.query = $.trim(this.value).toLowerCase();
                    render();
                });
                $('#hmFilter').on('change', function () {
                    state.filter = this.value;
                    render();
                });
                $(document).on('click', '[data-close]', function () { $('#' + $(this).attr('data-close')).removeClass('show'); });
                $(document).on('keydown', function (e) {
                    if (e.key === 'Escape') $('#hmModal').removeClass('show');
                });
                load();
            });
        })();
    </script>
</body>
</html>
