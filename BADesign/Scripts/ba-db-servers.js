(function (window, $) {
    'use strict';

    var state = { busy: false, rolesEditable: false, rolesLoaded: false, roleRequest: 0 };

    function apiUrl(name) {
        return (window.BA_API_BASE || '') + '/' + name;
    }

    function post(name, data) {
        return $.ajax({
            url: apiUrl(name),
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(data || {})
        }).then(function (res) {
            return res && res.d !== undefined ? res.d : res;
        });
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toast(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type || 'info');
    }

    function findServer(id) {
        var list = window.servers || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    function currentId() {
        var id = parseInt($('#serverModalId').val(), 10);
        return isNaN(id) ? 0 : id;
    }

    function readForm() {
        var portText = ($('#serverModalPort').val() || '').trim();
        var port = portText ? parseInt(portText, 10) : 0;
        return {
            id: currentId(),
            serverName: ($('#serverModalServerName').val() || '').trim(),
            port: isNaN(port) ? 0 : port,
            username: ($('#serverModalUsername').val() || '').trim(),
            password: $('#serverModalPassword').val() || '',
            backupPath: ($('#serverModalBackupPath').val() || '').trim(),
            restorePath: ($('#serverModalRestorePath').val() || '').trim(),
            displayName: ($('#serverModalDisplayName').val() || '').trim()
        };
    }

    function formError(form) {
        if (!form.serverName) return 'Nhập tên server.';
        if (!form.username) return 'Nhập username.';
        if (!form.id && !form.password) return 'Nhập password.';
        return '';
    }

    function setBusy(busy) {
        state.busy = busy;
        $('#serverModalProbeBtn, #serverModalWriteTestBtn, #serverModalDetectBtn, #serverModalSaveBtn').prop('disabled', busy);
    }

    function checkRow(kind, text) {
        var symbol = kind === 'ok' ? '&#10003;' : kind === 'fail' ? '&#10005;' : kind === 'warn' ? '!' : kind === 'wait' ? '' : 'i';
        var rowClass = kind === 'fail' ? ' is-fail' : kind === 'warn' ? ' is-warn' : '';
        return '<div class="rw-check-row' + rowClass + '"><span class="rw-ico ' + esc(kind) + '">' + symbol + '</span><span>' + esc(text) + '</span></div>';
    }

    function renderChecks(checks) {
        var $box = $('#serverModalChecks');
        if (!checks || !checks.length) {
            $box.hide().empty();
            return;
        }
        var allowed = { ok: 1, fail: 1, warn: 1, info: 1, wait: 1 };
        $box.html(checks.map(function (c) {
            return checkRow(allowed[c.status] ? c.status : 'info', c.text);
        }).join('')).show();
        if ($box[0].scrollIntoView) $box[0].scrollIntoView({ block: 'nearest' });
    }

    function probe(options) {
        var form = readForm();
        var error = formError(form);
        if (error) {
            $('#serverModalHint').text(error);
            return $.Deferred().reject().promise();
        }
        $('#serverModalHint').text('');
        form.testWrite = !!(options && options.testWrite);
        setBusy(true);
        renderChecks([{ status: 'wait', text: form.testWrite ? 'Đang kiểm tra và ghi thử file…' : 'Đang kiểm tra cấu hình…' }]);
        return post('ProbeServer', { requestJson: JSON.stringify(form) })
            .done(function (d) {
                if (!d || !d.success) {
                    renderChecks([{ status: 'fail', text: d && d.message ? d.message : 'Không kiểm tra được cấu hình.' }]);
                    return;
                }
                renderChecks(d.checks || []);
            })
            .fail(function () {
                renderChecks([{ status: 'fail', text: 'Lỗi mạng khi kiểm tra cấu hình.' }]);
            })
            .always(function () {
                setBusy(false);
            });
    }

    function detectBackupPath() {
        probe().done(function (d) {
            if (!d || !d.success) return;
            if (!d.suggestedBackupPath) {
                toast('Không lấy được thư mục backup mặc định của SQL Server.', 'error');
                return;
            }
            $('#serverModalBackupPath').val(d.suggestedBackupPath);
            toast('Đã điền thư mục backup mặc định của SQL Server. Bấm Kiểm tra cấu hình để xác nhận.', 'info');
        });
    }

    function renderRoles(roles, editable) {
        var $list = $('#serverModalRoles').empty();
        state.rolesEditable = !!editable;
        state.rolesLoaded = true;
        (roles || []).forEach(function (role) {
            var $checkbox = $('<input type="checkbox" name="serverModalRole" />').val(String(role.roleId)).prop('checked', !!role.hasAccess).prop('disabled', !editable);
            $list.append($('<label/>').append($checkbox).append($('<span/>').text(role.name || ('Role ' + role.roleId))));
        });
        $('#serverModalRolesWrap').toggle((roles || []).length > 0);
    }

    function loadRoles(serverId) {
        var requestId = ++state.roleRequest;
        state.rolesLoaded = false;
        state.rolesEditable = false;
        $('#serverModalRolesWrap').hide();
        post('GetServerRoles', { serverId: serverId || 0 }).done(function (d) {
            if (requestId !== state.roleRequest || !d || !d.success) return;
            renderRoles(d.roles, d.canEdit);
        });
    }

    function resetModal(title) {
        $('#serverModalTitle').text(title);
        $('#serverModalHint').text('');
        renderChecks(null);
        setBusy(false);
    }

    function showAddServerModal() {
        resetModal('Thêm server');
        $('#serverModalId').val('');
        $('#serverModalServerName').val('').prop('readonly', false);
        $('#serverModalPort').val('');
        $('#serverModalUsername').val('');
        $('#serverModalPassword').val('').attr('placeholder', 'Mật khẩu');
        $('#serverModalDisplayName').val('');
        $('#serverModalBackupPath').val('');
        $('#serverModalRestorePath').val('');
        loadRoles(0);
        $('#serverModal').addClass('show');
    }

    function editServer(id) {
        var s = findServer(id);
        if (!s) return;
        resetModal('Sửa server');
        $('#serverModalId').val(s.id);
        $('#serverModalServerName').val(s.serverName || '').prop('readonly', true);
        $('#serverModalPort').val(s.port != null ? s.port : '');
        $('#serverModalUsername').val(s.username || '');
        $('#serverModalPassword').val('').attr('placeholder', 'Để trống nếu không đổi');
        $('#serverModalDisplayName').val(s.displayName || '');
        $('#serverModalBackupPath').val(s.backupPath || '');
        $('#serverModalRestorePath').val(s.restorePath || '');
        loadRoles(s.id);
        $('#serverModal').addClass('show');
    }

    function hideServerModal() {
        $('#serverModal').removeClass('show');
    }

    function saveServer() {
        if (state.busy) return;
        var form = readForm();
        var error = formError(form);
        if (error) {
            $('#serverModalHint').text(error);
            return;
        }
        $('#serverModalHint').text('');
        if (state.rolesLoaded && state.rolesEditable) {
            form.roleIds = $('#serverModalRoles input[name=serverModalRole]:checked').map(function () {
                return parseInt($(this).val(), 10);
            }).get();
        }
        var isEdit = !!form.id;
        setBusy(true);
        post('SaveServerEx', { requestJson: JSON.stringify(form) })
            .done(function (d) {
                if (d && d.success) {
                    toast(isEdit ? 'Đã cập nhật server.' : 'Đã thêm server.', 'success');
                    hideServerModal();
                    if (typeof window.fetchServers === 'function') window.fetchServers();
                    return;
                }
                $('#serverModalHint').text(d && d.message ? d.message : (isEdit ? 'Lỗi cập nhật.' : 'Lỗi thêm server.'));
            })
            .fail(function (xhr) {
                var message = isEdit ? 'Lỗi cập nhật.' : 'Lỗi thêm server.';
                var body = xhr && xhr.responseText ? xhr.responseText : '';
                if (body.indexOf('Authentication') >= 0 || body.indexOf('Session') >= 0)
                    message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                $('#serverModalHint').text(message);
            })
            .always(function () {
                setBusy(false);
            });
    }

    $(function () {
        $('#serverModalProbeBtn').on('click', function () { probe(); });
        $('#serverModalWriteTestBtn').on('click', function () {
            if (!($('#serverModalBackupPath').val() || '').trim()) {
                $('#serverModalHint').text('Nhập thư mục backup trước khi thử ghi file.');
                return;
            }
            probe({ testWrite: true });
        });
        $('#serverModalDetectBtn').on('click', detectBackupPath);
        $('#serverModal').on('input', 'input', function () {
            $('#serverModalHint').text('');
        });
    });

    window.showAddServerModal = showAddServerModal;
    window.editServer = editServer;
    window.hideServerModal = hideServerModal;
    window.saveServer = saveServer;
})(window, jQuery);
