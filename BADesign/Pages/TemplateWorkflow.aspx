<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="TemplateWorkflow.aspx.cs"
    Inherits="BADesign.Pages.TemplateWorkflow" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Quy trình duyệt mẫu UI - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
        .wf-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
        .wf-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 0.75rem; }
        .wf-card { margin-bottom: 0; min-width: 0; }
        .wf-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
        .wf-card-name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); word-break: break-word; }
        .wf-card-desc { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.8125rem; word-break: break-word; }
        .wf-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.375rem; }
        .wf-tag { padding: 0.0625rem 0.5rem; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-darker); color: var(--text-secondary); font-size: 0.75rem; }
        .wf-tag-default { border-color: var(--primary); color: var(--primary-light); }
        .wf-tag-off { border-color: var(--danger); color: var(--danger); }
        .wf-flow { margin: 0.5rem 0 0; padding: 0; list-style: none; counter-reset: wfstep; }
        .wf-flow li { position: relative; padding: 0.25rem 0 0.25rem 1.75rem; font-size: 0.8125rem; color: var(--text-primary); word-break: break-word; }
        .wf-flow li::before { counter-increment: wfstep; content: counter(wfstep); position: absolute; left: 0; top: 0.25rem; width: 1.25rem; height: 1.25rem; border-radius: 50%; background: var(--primary); color: #fff; font-size: 0.6875rem; font-weight: 600; line-height: 1.25rem; text-align: center; }
        .wf-flow .wf-flow-who { color: var(--text-secondary); }
        .wf-card-actions { display: flex; gap: 0.375rem; flex-shrink: 0; }
        .wf-form label { display: block; margin: 0.625rem 0 0.25rem; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .wf-form .ba-input { width: 100%; box-sizing: border-box; }
        .wf-form label.wf-check { display: flex; align-items: center; gap: 0.375rem; font-weight: normal; color: var(--text-primary); cursor: pointer; }
        .wf-roles { display: flex; flex-wrap: wrap; gap: 0.375rem 1rem; }
        .wf-roles label { display: inline-flex; align-items: center; gap: 0.375rem; margin: 0; font-weight: normal; color: var(--text-primary); cursor: pointer; }
        .wf-role-note { color: var(--text-muted); font-size: 0.75rem; }
        .wf-steps-head { display: flex; align-items: center; justify-content: space-between; margin: 0.875rem 0 0.375rem; color: var(--text-primary); }
        .wf-step { border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.625rem; margin-bottom: 0.5rem; background: var(--bg-darker); }
        .wf-step-top { display: flex; align-items: center; gap: 0.5rem; }
        .wf-step-no { flex: 0 0 auto; font-weight: 600; color: var(--primary-light); white-space: nowrap; }
        .wf-step-top .ba-input { flex: 1 1 auto; min-width: 0; }
        .wf-step-top .ba-btn { flex: 0 0 auto; white-space: nowrap; }
        .wf-step-add { display: flex; gap: 0.375rem; margin-top: 0.375rem; }
        .wf-step-add select { flex: 1 1 auto; min-width: 0; }
        .wf-chips { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.375rem; min-height: 1.5rem; }
        .wf-chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.0625rem 0.25rem 0.0625rem 0.5rem; border-radius: 999px; background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-primary); font-size: 0.75rem; }
        .wf-chip button { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 0.875rem; line-height: 1; padding: 0 0.125rem; }
        .wf-chip button:hover { color: var(--danger); }
        .wf-chip-warn { border-color: var(--danger); }
        .wf-empty-step { color: var(--text-muted); font-size: 0.75rem; }
        .wf-step-mode { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; margin: 0.375rem 0 0.25rem; }
        .wf-form .wf-step-mode label { display: inline-flex; align-items: center; gap: 0.375rem; margin: 0; font-weight: normal; color: var(--text-primary); cursor: pointer; }
        .wf-flow-boss { color: var(--primary-light); }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content">
                    <div class="wf-toolbar">
                        <p class="ba-section-hint" style="margin:0; flex:1 1 420px;">Mỗi quy trình áp dụng cho một hoặc nhiều bộ phận (role) của người gửi mẫu. Yêu cầu đi lần lượt qua từng bước; ở mỗi bước chỉ cần một người trong danh sách duyệt. Role chưa gán quy trình nào thì dùng quy trình mặc định. Một bước có thể giao cho sếp của role người gửi; sếp của từng role khai ở trang Phân quyền.</p>
                        <button type="button" class="ba-btn ba-btn-primary" id="wfAdd">+ Thêm quy trình</button>
                    </div>
                    <div class="wf-list" id="wfList"></div>
                    <div class="ba-empty" id="wfEmpty" style="display:none;">Chưa có quy trình duyệt nào. Thêm một quy trình để BA gửi được mẫu vào thư viện chung.</div>
                </div>
            </main>
        </div>

        <div id="wfModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width:720px; width:100%;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="wfModalTitle">Quy trình duyệt</h3>
                    <button type="button" class="ba-modal-close" id="wfModalClose" aria-label="Đóng">&times;</button>
                </div>
                <div class="ba-modal-body wf-form">
                    <label for="wfName" style="margin-top:0;">Tên quy trình</label>
                    <input type="text" id="wfName" class="ba-input" maxlength="128" />
                    <label for="wfDesc">Mô tả</label>
                    <input type="text" id="wfDesc" class="ba-input" maxlength="500" />
                    <label>Áp dụng cho bộ phận (role của người gửi)</label>
                    <div class="wf-roles" id="wfRoles" translate="no"></div>
                    <label class="wf-check"><input type="checkbox" id="wfDefault" /> <span>Dùng làm quy trình mặc định cho role chưa gán quy trình nào</span></label>
                    <label class="wf-check"><input type="checkbox" id="wfActive" /> <span>Đang dùng</span></label>
                    <div class="wf-steps-head">
                        <strong>Các bước duyệt</strong>
                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" id="wfAddStep">+ Thêm bước</button>
                    </div>
                    <div id="wfSteps"></div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="wfCancel">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="wfSave">Lưu quy trình</button>
                </div>
            </div>
        </div>
    </form>
    <script>
        (function () {
            var SERVICE = '<%= ResolveUrl("~/Pages/TemplateWorkflow.aspx") %>';
            var MAX_STEPS = 5;
            var state = { workflows: [], roles: [], users: [], editing: null };

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

            function userById(id) {
                for (var i = 0; i < state.users.length; i++) if (state.users[i].UserId === id) return state.users[i];
                return null;
            }

            function roleLabel(id) {
                for (var i = 0; i < state.roles.length; i++) if (state.roles[i].RoleId === id) return state.roles[i].Name || state.roles[i].Code;
                return String(id);
            }

            function renderList() {
                var list = document.getElementById('wfList');
                list.textContent = '';
                $('#wfEmpty').toggle(state.workflows.length === 0);
                state.workflows.forEach(function (wf) {
                    var card = el('div', 'ba-card wf-card');
                    var head = el('div', 'wf-card-head');
                    var title = el('div');
                    var name = el('div', 'wf-card-name', wf.Name);
                    name.setAttribute('translate', 'no');
                    title.appendChild(name);
                    if (wf.Description) {
                        var desc = el('p', 'wf-card-desc', wf.Description);
                        desc.setAttribute('translate', 'no');
                        title.appendChild(desc);
                    }
                    var actions = el('div', 'wf-card-actions');
                    var edit = el('button', 'ba-btn ba-btn-secondary ba-btn-sm', 'Sửa');
                    edit.type = 'button';
                    edit.addEventListener('click', function () { openEditor(wf); });
                    var remove = el('button', 'ba-btn ba-btn-danger ba-btn-sm', 'Xóa');
                    remove.type = 'button';
                    remove.addEventListener('click', function () { removeWorkflow(wf); });
                    actions.appendChild(edit);
                    actions.appendChild(remove);
                    head.appendChild(title);
                    head.appendChild(actions);
                    card.appendChild(head);

                    var tags = el('div', 'wf-tags');
                    if (wf.IsDefault) tags.appendChild(el('span', 'wf-tag wf-tag-default', 'Mặc định'));
                    if (!wf.IsActive) tags.appendChild(el('span', 'wf-tag wf-tag-off', 'Tạm ngưng'));
                    (wf.RoleIds || []).forEach(function (id) {
                        var tag = el('span', 'wf-tag', roleLabel(id));
                        tag.setAttribute('translate', 'no');
                        tags.appendChild(tag);
                    });
                    if (!wf.IsDefault && !(wf.RoleIds || []).length) tags.appendChild(el('span', 'wf-tag wf-tag-off', 'Chưa gán bộ phận nào'));
                    card.appendChild(tags);

                    var flow = el('ol', 'wf-flow');
                    (wf.Steps || []).forEach(function (step) {
                        var item = el('li');
                        var stepName = el('strong', null, step.StepName);
                        stepName.setAttribute('translate', 'no');
                        item.appendChild(stepName);
                        var who = el('div', 'wf-flow-who');
                        who.setAttribute('translate', 'no');
                        if (step.UseRoleManager) {
                            var boss = el('span', 'wf-flow-boss', 'Sếp của role người gửi');
                            boss.setAttribute('translate', 'yes');
                            who.appendChild(boss);
                        } else {
                            who.appendChild(document.createTextNode((step.ApproverNames || []).join(', ')));
                        }
                        item.appendChild(who);
                        flow.appendChild(item);
                    });
                    card.appendChild(flow);
                    list.appendChild(card);
                });
            }

            function load() {
                call('LoadAll').done(function (d) {
                    if (!d || !d.success) { toast(d && d.message ? d.message : 'Không tải được dữ liệu.', 'error'); return; }
                    state.workflows = d.workflows || [];
                    state.roles = d.roles || [];
                    state.users = d.users || [];
                    renderList();
                }).fail(function () { toast('Không tải được dữ liệu.', 'error'); });
            }

            function roleOwner(roleId, exceptId) {
                for (var i = 0; i < state.workflows.length; i++) {
                    var wf = state.workflows[i];
                    if (wf.WorkflowId !== exceptId && (wf.RoleIds || []).indexOf(roleId) >= 0) return wf;
                }
                return null;
            }

            function renderRoles() {
                var host = document.getElementById('wfRoles');
                host.textContent = '';
                state.roles.forEach(function (role) {
                    var label = el('label');
                    var check = el('input');
                    check.type = 'checkbox';
                    check.checked = state.editing.RoleIds.indexOf(role.RoleId) >= 0;
                    check.addEventListener('change', function () {
                        var at = state.editing.RoleIds.indexOf(role.RoleId);
                        if (check.checked && at < 0) state.editing.RoleIds.push(role.RoleId);
                        if (!check.checked && at >= 0) state.editing.RoleIds.splice(at, 1);
                    });
                    label.appendChild(check);
                    label.appendChild(el('span', null, role.Name || role.Code));
                    var managerNote = el('span', 'wf-role-note');
                    var managerText = el('span', null, role.ManagerName ? 'Sếp:' : 'chưa khai sếp');
                    managerText.setAttribute('translate', 'yes');
                    managerNote.appendChild(managerText);
                    if (role.ManagerName) managerNote.appendChild(document.createTextNode(' ' + role.ManagerName));
                    label.appendChild(managerNote);
                    var owner = roleOwner(role.RoleId, state.editing.WorkflowId);
                    if (owner) label.appendChild(el('span', 'wf-role-note', '(' + owner.Name + ')'));
                    host.appendChild(label);
                });
            }

            function renderSteps() {
                var host = document.getElementById('wfSteps');
                host.textContent = '';
                state.editing.Steps.forEach(function (step, index) {
                    var box = el('div', 'wf-step');
                    var top = el('div', 'wf-step-top');
                    var no = el('span', 'wf-step-no', 'Bước ' + (index + 1));
                    var name = el('input', 'ba-input');
                    name.type = 'text';
                    name.maxLength = 128;
                    name.placeholder = 'Tên bước, ví dụ: Trưởng nhóm BA duyệt';
                    name.value = step.StepName || '';
                    name.addEventListener('input', function () { step.StepName = name.value; });
                    var drop = el('button', 'ba-btn ba-btn-secondary ba-btn-sm', 'Bỏ bước');
                    drop.type = 'button';
                    drop.disabled = state.editing.Steps.length <= 1;
                    drop.addEventListener('click', function () { state.editing.Steps.splice(index, 1); renderSteps(); });
                    top.appendChild(no);
                    top.appendChild(name);
                    top.appendChild(drop);
                    box.appendChild(top);

                    var mode = el('div', 'wf-step-mode');
                    [{ boss: true, text: 'Sếp của role người gửi' }, { boss: false, text: 'Người cụ thể' }].forEach(function (choice) {
                        var label = el('label');
                        var radio = el('input');
                        radio.type = 'radio';
                        radio.name = 'wfStepMode' + index;
                        radio.checked = !!step.UseRoleManager === choice.boss;
                        radio.addEventListener('change', function () { step.UseRoleManager = choice.boss; renderSteps(); });
                        label.appendChild(radio);
                        label.appendChild(el('span', null, choice.text));
                        mode.appendChild(label);
                    });
                    box.appendChild(mode);

                    if (step.UseRoleManager) {
                        box.appendChild(el('div', 'wf-empty-step', 'Người duyệt là sếp của role mà người gửi thuộc về. Sếp của từng role khai ở trang Phân quyền, mỗi role một sếp.'));
                        host.appendChild(box);
                        return;
                    }

                    var chips = el('div', 'wf-chips');
                    chips.setAttribute('translate', 'no');
                    if (!step.ApproverIds.length) {
                        var none = el('span', 'wf-empty-step', 'Chưa có người duyệt');
                        none.setAttribute('translate', 'yes');
                        chips.appendChild(none);
                    }
                    step.ApproverIds.forEach(function (id) {
                        var user = userById(id);
                        var chip = el('span', 'wf-chip' + (user && user.HasEmail ? '' : ' wf-chip-warn'));
                        chip.appendChild(el('span', null, user ? user.Name + (user.RoleName || user.RoleCode ? ' (' + (user.RoleName || user.RoleCode) + ')' : '') : '#' + id));
                        if (!user || !user.HasEmail) chip.title = 'Người này chưa có email nên sẽ không nhận được thư báo.';
                        var x = el('button', null, '×');
                        x.type = 'button';
                        x.addEventListener('click', function () {
                            step.ApproverIds.splice(step.ApproverIds.indexOf(id), 1);
                            renderSteps();
                        });
                        chip.appendChild(x);
                        chips.appendChild(chip);
                    });
                    box.appendChild(chips);

                    var add = el('div', 'wf-step-add');
                    var select = el('select', 'ba-input');
                    select.setAttribute('translate', 'no');
                    var first = el('option', null, '');
                    first.value = '';
                    select.appendChild(first);
                    state.users.forEach(function (user) {
                        if (step.ApproverIds.indexOf(user.UserId) >= 0) return;
                        var option = el('option', null, user.Name + (user.RoleName || user.RoleCode ? ' (' + (user.RoleName || user.RoleCode) + ')' : ''));
                        option.value = String(user.UserId);
                        select.appendChild(option);
                    });
                    var addButton = el('button', 'ba-btn ba-btn-secondary ba-btn-sm', 'Thêm người duyệt');
                    addButton.type = 'button';
                    addButton.addEventListener('click', function () {
                        var id = parseInt(select.value, 10);
                        if (!(id > 0)) { toast('Hãy chọn một người trong danh sách.', 'warning'); return; }
                        step.ApproverIds.push(id);
                        renderSteps();
                    });
                    add.appendChild(select);
                    add.appendChild(addButton);
                    box.appendChild(add);
                    host.appendChild(box);
                });
                $('#wfAddStep').prop('disabled', state.editing.Steps.length >= MAX_STEPS);
            }

            function openEditor(wf) {
                state.editing = wf ? {
                    WorkflowId: wf.WorkflowId, Name: wf.Name, Description: wf.Description || '', IsDefault: !!wf.IsDefault, IsActive: !!wf.IsActive,
                    RoleIds: (wf.RoleIds || []).slice(),
                    Steps: (wf.Steps || []).map(function (s) { return { StepName: s.StepName, UseRoleManager: !!s.UseRoleManager, ApproverIds: (s.ApproverIds || []).slice() }; })
                } : { WorkflowId: 0, Name: '', Description: '', IsDefault: state.workflows.length === 0, IsActive: true, RoleIds: [], Steps: [{ StepName: '', UseRoleManager: false, ApproverIds: [] }] };
                $('#wfModalTitle').text(wf ? 'Sửa quy trình duyệt' : 'Thêm quy trình duyệt');
                $('#wfName').val(state.editing.Name);
                $('#wfDesc').val(state.editing.Description);
                $('#wfDefault').prop('checked', state.editing.IsDefault);
                $('#wfActive').prop('checked', state.editing.IsActive);
                renderRoles();
                renderSteps();
                $('#wfModal').addClass('show');
                $('#wfName').focus();
            }

            function closeEditor() {
                $('#wfModal').removeClass('show');
                state.editing = null;
            }

            function save() {
                var wf = state.editing;
                if (!wf) return;
                wf.Name = $.trim($('#wfName').val());
                wf.Description = $.trim($('#wfDesc').val());
                wf.IsDefault = $('#wfDefault').prop('checked');
                wf.IsActive = $('#wfActive').prop('checked');
                if (!wf.Name) { toast('Hãy nhập tên quy trình.', 'warning'); $('#wfName').focus(); return; }
                for (var i = 0; i < wf.Steps.length; i++) {
                    if (!wf.Steps[i].ApproverIds.length && !wf.Steps[i].UseRoleManager) { toast('Mỗi bước cần ít nhất một người duyệt, hoặc chọn sếp của role người gửi.', 'warning'); return; }
                }
                var payload = {
                    WorkflowId: wf.WorkflowId, Name: wf.Name, Description: wf.Description, IsDefault: wf.IsDefault, IsActive: wf.IsActive, RoleIds: wf.RoleIds,
                    Steps: wf.Steps.map(function (s, index) { return { StepNo: index + 1, StepName: $.trim(s.StepName || ''), UseRoleManager: !!s.UseRoleManager, ApproverIds: s.UseRoleManager ? [] : s.ApproverIds }; })
                };
                $('#wfSave').prop('disabled', true);
                call('SaveWorkflow', { workflow: payload }).done(function (d) {
                    if (!d || !d.success) { toast(d && d.message ? d.message : 'Không lưu được quy trình.', 'error'); return; }
                    toast('Đã lưu quy trình duyệt.', 'success');
                    closeEditor();
                    load();
                }).fail(function () { toast('Không lưu được quy trình.', 'error'); })
                    .always(function () { $('#wfSave').prop('disabled', false); });
            }

            function removeWorkflow(wf) {
                baConfirm('Xóa quy trình duyệt này? Các yêu cầu đang chờ duyệt vẫn đi tiếp theo các bước đã ghi lúc gửi.', function () {
                    call('DeleteWorkflow', { workflowId: wf.WorkflowId }).done(function (d) {
                        if (!d || !d.success) { toast(d && d.message ? d.message : 'Không xóa được quy trình.', 'error'); return; }
                        toast('Đã xóa quy trình duyệt.', 'success');
                        load();
                    }).fail(function () { toast('Không xóa được quy trình.', 'error'); });
                }, null, 'Xóa', 'Hủy');
            }

            $(function () {
                $('#wfAdd').on('click', function () { openEditor(null); });
                $('#wfAddStep').on('click', function () {
                    if (!state.editing || state.editing.Steps.length >= MAX_STEPS) return;
                    state.editing.Steps.push({ StepName: '', UseRoleManager: false, ApproverIds: [] });
                    renderSteps();
                });
                $('#wfSave').on('click', save);
                $('#wfCancel, #wfModalClose').on('click', closeEditor);
                $(document).on('keydown', function (e) {
                    if (e.key === 'Escape' && $('#wfModal').hasClass('show')) closeEditor();
                });
                load();
            });
        })();
    </script>
</body>
</html>
