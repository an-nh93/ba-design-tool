(function (window, $) {
    'use strict';

    var TOTAL_STEPS = 3;
    var state = {
        step: 1,
        defaults: null,
        defaultsRequested: false,
        precheck: null,
        precheckSeq: 0,
        precheckBusy: false,
        target: null,
        targetSeq: 0,
        targetBusy: false,
        targetTimer: null,
        nameTouched: false,
        submitting: false
    };

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

    function serverList() {
        return window.servers || [];
    }

    function findServer(id) {
        var list = serverList();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    function serverLabel(s) {
        var name = (s.displayName || '').trim();
        var address = (s.serverName || ('ID ' + s.id)) + (s.port != null ? ',' + s.port : '');
        var label = name ? name + ' (' + address + ')' : address;
        if (s.sqlVersionName) label += ' — ' + s.sqlVersionName;
        return label;
    }

    function restoreRoot(s) {
        return s ? (s.restorePath || s.backupPath || '') : '';
    }

    function currentServerId() {
        var id = parseInt($('#restoreModalServer').val(), 10);
        return isNaN(id) ? 0 : id;
    }

    function selectedFiles() {
        var json = ($('#restoreModalFileListJson').val() || '').trim();
        if (json) {
            try {
                var list = JSON.parse(json);
                if (list && list.length) return list;
            } catch (e) {
                return [];
            }
        }
        var one = ($('#restoreModalFileValue').val() || '').trim();
        return one ? [one] : [];
    }

    function fileDisplayName(path) {
        var parts = String(path || '').split('\\');
        return parts[parts.length - 1] || path;
    }

    function fillServers(selectedId) {
        var $sel = $('#restoreModalServer').empty();
        $sel.append($('<option/>').val('').text('-- Chọn server --'));
        serverList().forEach(function (s) {
            var ready = !!restoreRoot(s);
            var $option = $('<option/>').val(String(s.id)).text(serverLabel(s) + (ready ? '' : ' — chưa cấu hình thư mục restore'));
            if (!ready) $option.prop('disabled', true);
            $sel.append($option);
        });
        var selected = selectedId ? findServer(selectedId) : null;
        $sel.val(selected && restoreRoot(selected) ? String(selectedId) : '');
    }

    function updateServerNote() {
        var $note = $('#restoreWizardServerNote');
        var server = findServer(currentServerId());
        if (!server) {
            var anyReady = serverList().some(function (s) { return !!restoreRoot(s); });
            $note.text(anyReady ? '' : 'Chưa có server nào được cấu hình thư mục restore. Nhờ người quản lý server thiết lập ở mục Sửa server.');
            return;
        }
        $note.html('Chép file .bak vào thư mục: <span class="rw-path">' + esc(restoreRoot(server)) + '</span>');
    }

    function clearFileSelection() {
        $('#restoreModalFileValue').val('');
        $('#restoreModalFileListJson').val('');
        $('#restoreModalSelectedFile').text('Chưa chọn file').removeClass('has-file').css('color', '');
        $('#restoreModalSelectedFilePathWrap').hide();
        $('#restoreModalSelectedFilePath').text('');
        $('#restoreModalBackupSetsWrap').hide();
        $('#restoreModalBackupSets').empty();
        $('#restoreModalNoFiles').hide();
        state.precheck = null;
        state.precheckBusy = false;
        state.precheckSeq++;
        $('#restoreWizardPrecheck').hide().empty();
    }

    function checkRow(kind, html) {
        var symbol = kind === 'ok' ? '&#10003;' : kind === 'fail' ? '&#10005;' : kind === 'warn' ? '!' : kind === 'wait' ? '' : 'i';
        var rowClass = kind === 'fail' ? ' is-fail' : kind === 'warn' ? ' is-warn' : '';
        return '<div class="rw-check-row' + rowClass + '"><span class="rw-ico ' + kind + '">' + symbol + '</span><span>' + html + '</span></div>';
    }

    function formatBytes(bytes) {
        if (typeof window.formatSize === 'function') return window.formatSize(bytes);
        return bytes + ' B';
    }

    function formatDateTime(value) {
        if (!value || typeof window.formatDate !== 'function') return '';
        var text = window.formatDate(value);
        return text === '—' ? '' : text;
    }

    function renderPrecheck() {
        var $box = $('#restoreWizardPrecheck');
        var d = state.precheck;
        if (state.precheckBusy) {
            $box.show().html(checkRow('wait', 'Đang kiểm tra file backup…'));
            return;
        }
        if (!d) {
            $box.hide().empty();
            return;
        }
        if (!d.success) {
            $box.show().html(checkRow('fail', esc(d.message || 'Không kiểm tra được file backup.')));
            return;
        }
        var source = [];
        if (d.sourceDatabase) source.push('database gốc <strong>' + esc(d.sourceDatabase) + '</strong>');
        var when = formatDateTime(d.backupDate);
        if (when) source.push('backup lúc ' + esc(when));
        if (d.backupTypeName) source.push(esc(d.backupTypeName));
        if (d.backupSizeBytes > 0) source.push(esc(formatBytes(d.backupSizeBytes)));
        if (d.backupVersionText) source.push(esc(d.backupVersionText));
        var html = checkRow('info', 'Nguồn: ' + source.join(' · '));
        html += d.compatible
            ? checkRow('ok', 'Phiên bản phù hợp với server đích: ' + esc(d.serverVersionText || ''))
            : checkRow('fail', esc(d.compatMessage || 'Phiên bản SQL Server không phù hợp.'));
        if (d.compatible) {
            html += d.diskOk
                ? checkRow('ok', 'Đủ dung lượng đĩa trên server đích.')
                : checkRow('fail', esc(d.diskMessage || 'Không đủ dung lượng đĩa.'));
        }
        if (!d.compatible && d.compatibleServers && d.compatibleServers.length) {
            html += checkRow('info', 'Server phù hợp: ' + d.compatibleServers.map(function (s) {
                return '<a href="#" class="rw-switch-server" data-server-id="' + esc(s.id) + '">' + esc(s.name) + ' (' + esc(s.versionName) + ')</a>';
            }).join(', ') + '. Bấm để đổi server, rồi chọn lại file trong thư mục restore của server đó.');
        }
        if (d.setCount > 1) html += checkRow('warn', 'File chứa ' + d.setCount + ' backup set. Kiểm tra lựa chọn ở bảng bên dưới.');
        $box.show().html(html);
    }

    function runPrecheck() {
        var serverId = currentServerId();
        var files = selectedFiles();
        state.precheck = null;
        var seq = ++state.precheckSeq;
        if (!serverId || !files.length) {
            state.precheckBusy = false;
            renderPrecheck();
            updateNav();
            return;
        }
        state.precheckBusy = true;
        renderPrecheck();
        updateNav();
        post('GetRestorePrecheck', { serverId: serverId, backupFileNamesJson: JSON.stringify(files) })
            .done(function (d) {
                if (seq !== state.precheckSeq) return;
                state.precheckBusy = false;
                state.precheck = d || { success: false, message: 'Không kiểm tra được file backup.' };
                if (d && d.success && d.suggestedName && !state.nameTouched) {
                    $('#restoreModalToDatabase').val(d.suggestedName);
                    state.target = null;
                }
                renderPrecheck();
                updateNav();
            })
            .fail(function () {
                if (seq !== state.precheckSeq) return;
                state.precheckBusy = false;
                state.precheck = { success: false, message: 'Lỗi mạng khi kiểm tra file backup. Thử chọn lại file.' };
                renderPrecheck();
                updateNav();
            });
    }

    function precheckPassed() {
        var d = state.precheck;
        return !!(d && d.success && d.compatible && d.diskOk);
    }

    function targetName() {
        return ($('#restoreModalToDatabase').val() || '').trim();
    }

    function renderTarget() {
        var $box = $('#restoreWizardTargetStatus');
        var $overwrite = $('#restoreWizardOverwriteWrap');
        var d = state.target;
        if (state.targetBusy) {
            $box.show().html(checkRow('wait', 'Đang kiểm tra tên database…'));
            $overwrite.hide();
            return;
        }
        if (!d) {
            $box.hide().empty();
            $overwrite.hide();
            return;
        }
        if (!d.success) {
            $box.show().html(checkRow('fail', esc(d.message || 'Không kiểm tra được database đích.')));
            $overwrite.hide();
            return;
        }
        if (!d.valid) {
            $box.show().html(checkRow('fail', esc(d.message || 'Tên database không hợp lệ.')));
            $overwrite.hide();
            return;
        }
        if (!d.exists) {
            $box.show().html(checkRow('ok', 'Tên chưa được dùng. Database mới sẽ được tạo.'));
            $overwrite.hide();
            return;
        }
        var owner = d.restoredBy ? 'do <strong>' + esc(d.restoredBy) + '</strong> restore' : 'chưa có thông tin người restore';
        var when = formatDateTime(d.restoredAt);
        if (when) owner += ' lúc ' + esc(when);
        if (!d.canOverwrite) {
            $box.show().html(checkRow('fail', 'Database đã tồn tại (' + owner + '). Bạn không có quyền ghi đè — hãy đặt tên khác.'));
            $overwrite.hide();
            return;
        }
        $box.show().html(checkRow('warn', 'Database đã tồn tại (' + owner + '). Restore sẽ ghi đè lên database này.'));
        $('#restoreWizardOverwriteName').text(targetName());
        $overwrite.show();
    }

    function checkTarget() {
        var serverId = currentServerId();
        var name = targetName();
        var seq = ++state.targetSeq;
        state.target = null;
        $('#restoreModalReplace').prop('checked', false);
        if (!serverId || !name) {
            state.targetBusy = false;
            renderTarget();
            updateNav();
            return;
        }
        state.targetBusy = true;
        renderTarget();
        updateNav();
        post('CheckRestoreTarget', { serverId: serverId, databaseName: name })
            .done(function (d) {
                if (seq !== state.targetSeq) return;
                state.targetBusy = false;
                state.target = d || { success: false, message: 'Không kiểm tra được database đích.' };
                renderTarget();
                updateNav();
            })
            .fail(function () {
                if (seq !== state.targetSeq) return;
                state.targetBusy = false;
                state.target = { success: false, message: 'Lỗi mạng khi kiểm tra database đích.' };
                renderTarget();
                updateNav();
            });
    }

    function scheduleTargetCheck() {
        if (state.targetTimer) window.clearTimeout(state.targetTimer);
        state.target = null;
        state.targetBusy = true;
        state.targetSeq++;
        renderTarget();
        updateNav();
        state.targetTimer = window.setTimeout(checkTarget, 450);
    }

    function targetPassed() {
        var d = state.target;
        if (!d || !d.success || !d.valid) return false;
        if (!d.exists) return true;
        return !!d.canOverwrite && $('#restoreModalReplace').prop('checked');
    }

    function emailAllowed(email) {
        var patterns = state.defaults && state.defaults.emailPatterns ? state.defaults.emailPatterns : [];
        if (!patterns.length) return true;
        var value = String(email || '').trim().toLowerCase();
        for (var i = 0; i < patterns.length; i++) {
            var pattern = String(patterns[i] || '').trim().toLowerCase();
            if (!pattern) continue;
            if (pattern.charAt(0) === '*') {
                var suffix = pattern.substring(1).trim();
                if (suffix && value.length > suffix.length && value.substring(value.length - suffix.length) === suffix) return true;
            } else if (value === pattern) {
                return true;
            }
        }
        return false;
    }

    function skipSanitize() {
        return $('#restoreModalSkipSanitize').prop('checked');
    }

    function keepSalary() {
        return $('#restoreModalKeepSalary').prop('checked');
    }

    function numberValue(selector) {
        var value = parseFloat($(selector).val());
        return isNaN(value) ? 0 : value;
    }

    function sanitizeError() {
        if (skipSanitize()) return '';
        var email = ($('#restoreModalResetEmail').val() || '').trim();
        if (!email) return 'Nhập email thay thế.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email thay thế không hợp lệ.';
        if (!emailAllowed(email)) return 'Email thay thế phải thuộc domain nội bộ được phép.';
        if (!keepSalary()) {
            var min = numberValue('#restoreModalSalaryMin');
            var max = numberValue('#restoreModalSalaryMax');
            if (min <= 0 || max <= 0) return 'Nhập khoảng lương giả lớn hơn 0.';
            if (max < min) return 'Khoảng lương giả: giá trị sau phải lớn hơn hoặc bằng giá trị trước.';
        }
        return '';
    }

    function stepError(step) {
        if (step === 1) {
            if (!currentServerId()) return 'Chọn server đích.';
            if (!selectedFiles().length) return 'Chọn file backup.';
            if (state.precheckBusy) return 'Đang kiểm tra file backup…';
            if (!state.precheck) return 'Chưa kiểm tra được file backup.';
            if (!precheckPassed()) return 'File backup chưa đạt kiểm tra ở trên.';
            return '';
        }
        if (step === 2) {
            if (!targetName()) return 'Nhập tên database đích.';
            if (state.targetBusy) return 'Đang kiểm tra tên database…';
            var d = state.target;
            if (!d) return 'Chưa kiểm tra được tên database.';
            if (!d.success || !d.valid) return d.message || 'Tên database không hợp lệ.';
            if (d.exists && !d.canOverwrite) return 'Không có quyền ghi đè database này.';
            if (d.exists && !$('#restoreModalReplace').prop('checked')) return 'Đánh dấu xác nhận ghi đè để tiếp tục.';
            return '';
        }
        return sanitizeError();
    }

    function renderSanitizePage() {
        var skip = skipSanitize();
        var keep = keepSalary();
        $('#restoreWizardSkipWarning').toggle(skip);
        $('#restoreWizardSanitizeFields').toggle(!skip);
        $('#restoreWizardSalaryRange').toggle(!skip && !keep);
        $('#restoreModalKeepSalary').prop('disabled', skip).closest('label').css('opacity', skip ? 0.5 : 1);
        $('#restoreWizardChecklist li').each(function () {
            var item = $(this).data('item');
            $(this).toggleClass('is-off', skip || (item === 'salary' && keep));
        });
        $('#restoreWizardEmailNote').text(emailNote());
        renderSummary();
    }

    function renderSummary() {
        var server = findServer(currentServerId());
        var files = selectedFiles();
        var lines = [];
        lines.push('Restore <strong>' + esc(files.length > 1 ? files.length + ' file' : fileDisplayName(files[0])) + '</strong> lên <strong>'
            + esc(server ? serverLabel(server) : '') + '</strong>, database <strong>' + esc(targetName()) + '</strong>'
            + (state.target && state.target.exists ? ' (ghi đè).' : ' (tạo mới).'));
        if (skipSanitize()) {
            lines.push('<span style="color: var(--danger); font-weight: 600;">Không làm sạch dữ liệu.</span>');
        } else {
            var parts = ['email <strong>' + esc(($('#restoreModalResetEmail').val() || '').trim()) + '</strong>',
                'mật khẩu <strong>' + esc(($('#restoreModalResetPassword').val() || '').trim() || (state.defaults ? state.defaults.password : '')) + '</strong>',
                'điện thoại <strong>' + esc(($('#restoreModalResetPhone').val() || '').trim() || (state.defaults ? state.defaults.phone : '')) + '</strong>'];
            parts.push(keepSalary()
                ? '<span style="color: var(--warning); font-weight: 600;">giữ lương thật</span>'
                : 'lương giả từ <strong>' + esc(numberValue('#restoreModalSalaryMin').toLocaleString()) + '</strong> đến <strong>' + esc(numberValue('#restoreModalSalaryMax').toLocaleString()) + '</strong>');
            lines.push('Làm sạch: ' + parts.join(', ') + '.');
        }
        $('#restoreWizardSummary').html(lines.join('<br/>'));
    }

    function updateNav() {
        var step = state.step;
        var error = stepError(step);
        $('#restoreWizardSteps .rw-step').each(function () {
            var n = parseInt($(this).data('step'), 10);
            $(this).toggleClass('is-active', n === step).toggleClass('is-done', n < step);
        });
        $('#restoreWizardBack').toggle(step > 1).prop('disabled', state.submitting);
        $('#restoreWizardNext').toggle(step < TOTAL_STEPS).prop('disabled', !!error || state.submitting);
        $('#restoreModalConfirm').toggle(step === TOTAL_STEPS).prop('disabled', !!error || state.submitting);
        $('#restoreWizardHint').text(error);
        $('#restoreWizardSummary').toggle(step === TOTAL_STEPS);
        if (step === TOTAL_STEPS) renderSummary();
    }

    function setStep(step) {
        state.step = Math.max(1, Math.min(TOTAL_STEPS, step));
        for (var i = 1; i <= TOTAL_STEPS; i++) {
            $('#restoreWizardPage' + i).toggle(i === state.step);
        }
        if (state.step === 2) {
            if (!state.target && !state.targetBusy) checkTarget();
            window.setTimeout(function () { $('#restoreModalToDatabase').focus(); }, 50);
        }
        if (state.step === 3) renderSanitizePage();
        updateNav();
    }

    function applyDefaults() {
        var d = state.defaults || {};
        $('#restoreModalResetEmail').val(d.email || '');
        $('#restoreModalResetPassword').val(d.password || '');
        $('#restoreModalResetPhone').val(d.phone || '');
        $('#restoreModalSalaryMin').val(d.salaryMin || '');
        $('#restoreModalSalaryMax').val(d.salaryMax || '');
        $('#restoreWizardPrivileged').toggle(!!d.canSkipSanitize);
    }

    function loadDefaults() {
        if (state.defaults || state.defaultsRequested) {
            applyDefaults();
            return;
        }
        state.defaultsRequested = true;
        post('GetSanitizeDefaults', {})
            .done(function (d) {
                state.defaultsRequested = false;
                if (d && d.success) {
                    state.defaults = d;
                    applyDefaults();
                    if (state.step === 3) renderSanitizePage();
                    updateNav();
                }
            })
            .fail(function () {
                state.defaultsRequested = false;
            });
    }

    function resetWizard(serverId, databaseName) {
        state.precheck = null;
        state.precheckBusy = false;
        state.target = null;
        state.targetBusy = false;
        state.nameTouched = !!databaseName;
        state.submitting = false;
        if (state.targetTimer) window.clearTimeout(state.targetTimer);
        fillServers(serverId);
        clearFileSelection();
        $('#restoreModalToDatabase').val(databaseName || '');
        $('#restoreModalRecovery').val('RECOVERY');
        $('#restoreModalReplace').prop('checked', false);
        $('#restoreModalShrinkLog').prop('checked', true);
        $('#restoreModalKeepSalary').prop('checked', false);
        $('#restoreModalSkipSanitize').prop('checked', false);
        $('#restoreModal details.rw-advanced').prop('open', false);
        renderTarget();
        updateServerNote();
        loadDefaults();
        setStep(1);
    }

    function selectedPositions() {
        var positions = [];
        $('#restoreModalBackupSets .restore-set-cb:checked').each(function () {
            var position = parseInt($(this).data('position'), 10);
            if (!isNaN(position) && position > 0) positions.push(position);
        });
        if (!positions.length) positions = [1];
        positions.sort(function (a, b) { return a - b; });
        return positions;
    }

    function startRestore() {
        var files = selectedFiles();
        var skip = skipSanitize();
        var request = {
            serverId: currentServerId(),
            databaseName: targetName(),
            backupFileName: files[0],
            backupFileNames: files,
            positions: selectedPositions(),
            recoveryState: ($('#restoreModalRecovery').val() || 'RECOVERY').toUpperCase(),
            withReplace: !!(state.target && state.target.exists),
            withShrinkLog: $('#restoreModalShrinkLog').prop('checked'),
            withSanitize: !skip,
            resetEmail: skip ? '' : ($('#restoreModalResetEmail').val() || '').trim(),
            resetPassword: skip ? '' : ($('#restoreModalResetPassword').val() || '').trim(),
            resetPhone: skip ? '' : ($('#restoreModalResetPhone').val() || '').trim(),
            keepRealSalary: !skip && keepSalary(),
            salaryMin: numberValue('#restoreModalSalaryMin'),
            salaryMax: numberValue('#restoreModalSalaryMax')
        };
        state.submitting = true;
        updateNav();
        $('#restoreOverlay').addClass('show');
        post('StartRestoreEx', { requestJson: JSON.stringify(request) })
            .done(function (d) {
                if (!d || !d.success || (!d.sessionId && !d.jobId)) {
                    toast(d && d.message ? d.message : 'Không thể bắt đầu restore.', 'error');
                    return;
                }
                hideRestoreModal();
                toast('Restore đã bắt đầu. Theo dõi tiến độ ở biểu tượng chuông.', 'info');
                if (typeof window.loadRestoreJobsPanel === 'function') window.loadRestoreJobsPanel();
            })
            .fail(function () {
                toast('Lỗi khi bắt đầu restore. Kiểm tra kết nối rồi thử lại.', 'error');
            })
            .always(function () {
                state.submitting = false;
                $('#restoreOverlay').removeClass('show');
                updateNav();
            });
    }

    function submit() {
        if (state.submitting) return;
        for (var step = 1; step <= TOTAL_STEPS; step++) {
            var error = stepError(step);
            if (error) {
                setStep(step);
                toast(error, 'error');
                return;
            }
        }
        if (skipSanitize() && typeof window.showConfirmModal === 'function') {
            window.showConfirmModal(
                'Restore không làm sạch dữ liệu',
                'Database sẽ giữ nguyên email, số điện thoại, mật khẩu, lương và cấu hình gửi mail của khách hàng.\n\nBạn chắc chắn muốn tiếp tục?',
                startRestore, null, 'Vẫn restore');
            return;
        }
        startRestore();
    }

    var sanitizeTarget = { serverId: 0, databaseName: '', submitting: false };

    function emailNote() {
        var patterns = state.defaults && state.defaults.emailPatterns ? state.defaults.emailPatterns : [];
        return patterns.length
            ? 'Mọi email trong database sẽ đổi thành địa chỉ này. Domain được phép: ' + patterns.join(', ')
            : 'Mọi email trong database sẽ đổi thành địa chỉ này.';
    }

    function sanitizeModalError() {
        var email = ($('#sanitizeModalEmail').val() || '').trim();
        if (!email) return 'Nhập email thay thế.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email thay thế không hợp lệ.';
        if (!emailAllowed(email)) return 'Email thay thế phải thuộc domain nội bộ được phép.';
        if (!$('#sanitizeModalKeepSalary').prop('checked')) {
            var min = numberValue('#sanitizeModalSalaryMin');
            var max = numberValue('#sanitizeModalSalaryMax');
            if (min <= 0 || max <= 0) return 'Nhập khoảng lương giả lớn hơn 0.';
            if (max < min) return 'Khoảng lương giả: giá trị sau phải lớn hơn hoặc bằng giá trị trước.';
        }
        return '';
    }

    function renderSanitizeModal() {
        var keep = $('#sanitizeModalKeepSalary').prop('checked');
        $('#sanitizeModalSalaryRange').toggle(!keep);
        $('#sanitizeModalChecklist li').each(function () {
            $(this).toggleClass('is-off', keep && $(this).data('item') === 'salary');
        });
        $('#sanitizeModalEmailNote').text(emailNote());
        var error = sanitizeModalError();
        $('#sanitizeModalHint').text(error);
        $('#sanitizeModalConfirm').prop('disabled', !!error || sanitizeTarget.submitting);
    }

    function applySanitizeModalDefaults() {
        var d = state.defaults || {};
        $('#sanitizeModalEmail').val(d.email || '');
        $('#sanitizeModalPassword').val(d.password || '');
        $('#sanitizeModalPhone').val(d.phone || '');
        $('#sanitizeModalSalaryMin').val(d.salaryMin || '');
        $('#sanitizeModalSalaryMax').val(d.salaryMax || '');
        $('#sanitizeModalPrivileged').toggle(!!d.canSkipSanitize);
        renderSanitizeModal();
    }

    function showSanitizeModal(serverId, databaseName) {
        var server = findServer(serverId);
        sanitizeTarget = { serverId: serverId, databaseName: databaseName || '', submitting: false };
        $('#sanitizeModalTarget').text((server ? serverLabel(server) : '') + ' / ' + (databaseName || ''));
        $('#sanitizeModalKeepSalary').prop('checked', false);
        applySanitizeModalDefaults();
        if (!state.defaults) {
            post('GetSanitizeDefaults', {}).done(function (d) {
                if (d && d.success) {
                    state.defaults = d;
                    applySanitizeModalDefaults();
                }
            });
        }
        $('#sanitizeModal').addClass('show');
    }

    function hideSanitizeModal() {
        $('#sanitizeModal').removeClass('show');
    }

    function startSanitize() {
        var request = {
            serverId: sanitizeTarget.serverId,
            databaseName: sanitizeTarget.databaseName,
            resetEmail: ($('#sanitizeModalEmail').val() || '').trim(),
            resetPassword: ($('#sanitizeModalPassword').val() || '').trim(),
            resetPhone: ($('#sanitizeModalPhone').val() || '').trim(),
            keepRealSalary: $('#sanitizeModalKeepSalary').prop('checked'),
            salaryMin: numberValue('#sanitizeModalSalaryMin'),
            salaryMax: numberValue('#sanitizeModalSalaryMax')
        };
        sanitizeTarget.submitting = true;
        renderSanitizeModal();
        post('StartSanitizeDatabase', { requestJson: JSON.stringify(request) })
            .done(function (d) {
                if (!d || !d.success) {
                    toast(d && d.message ? d.message : 'Không thể bắt đầu làm sạch dữ liệu.', 'error');
                    return;
                }
                hideSanitizeModal();
                toast('Đã bắt đầu làm sạch dữ liệu. Theo dõi tiến độ ở biểu tượng chuông.', 'info');
                if (typeof window.loadRestoreJobsPanel === 'function') window.loadRestoreJobsPanel();
            })
            .fail(function () {
                toast('Lỗi khi bắt đầu làm sạch dữ liệu. Kiểm tra kết nối rồi thử lại.', 'error');
            })
            .always(function () {
                sanitizeTarget.submitting = false;
                renderSanitizeModal();
            });
    }

    function submitSanitize() {
        if (sanitizeTarget.submitting || sanitizeModalError()) return;
        if (typeof window.showConfirmModal !== 'function') {
            startSanitize();
            return;
        }
        window.showConfirmModal(
            'Làm sạch dữ liệu',
            'Email, số điện thoại, mật khẩu' + ($('#sanitizeModalKeepSalary').prop('checked') ? '' : ', lương') + ' trong database "' + sanitizeTarget.databaseName + '" sẽ bị thay thế và không hoàn tác được.\n\nBạn chắc chắn muốn tiếp tục?',
            startSanitize, null, 'Làm sạch');
    }

    function showRestoreModal(serverId, databaseName) {
        resetWizard(serverId || 0, databaseName || '');
        $('#restoreModal').addClass('show');
    }

    function showRestoreModalStandalone() {
        showRestoreModal(0, '');
    }

    function hideRestoreModal() {
        $('#restoreModal').removeClass('show');
    }

    function onFilesChosen() {
        var files = selectedFiles();
        $('#restoreModalSelectedFile').toggleClass('has-file', files.length > 0).css('color', '');
        if (files.length === 1) $('#restoreModalSelectedFile').text(fileDisplayName(files[0]));
        runPrecheck();
    }

    $(function () {
        $('#restoreModalServer').on('change', function () {
            clearFileSelection();
            state.target = null;
            updateServerNote();
            updateNav();
        });
        $('#restoreWizardPrecheck').on('click', '.rw-switch-server', function (e) {
            e.preventDefault();
            $('#restoreModalServer').val(String($(this).data('server-id'))).trigger('change');
        });
        $('#restoreModalToDatabase').on('input', function () {
            state.nameTouched = true;
            scheduleTargetCheck();
        });
        $('#restoreModalReplace').on('change', updateNav);
        $('#restoreModalKeepSalary, #restoreModalSkipSanitize').on('change', function () {
            renderSanitizePage();
            updateNav();
        });
        $('#restoreWizardPage3').on('input', 'input', updateNav);
        $('#restoreWizardBack').on('click', function () {
            setStep(state.step - 1);
        });
        $('#restoreWizardNext').on('click', function () {
            if (stepError(state.step)) return;
            setStep(state.step + 1);
        });
        $('#restoreModalConfirm').on('click', submit);
        $('#restoreWizardSteps').on('click', '.rw-step.is-done', function () {
            if (state.submitting) return;
            setStep(parseInt($(this).data('step'), 10));
        });
        $('#restoreModal').on('keydown', 'input[type="text"], input[type="number"]', function (e) {
            if (e.which !== 13) return;
            e.preventDefault();
            if (state.step < TOTAL_STEPS) $('#restoreWizardNext').trigger('click');
        });
        $('#sanitizeModal').on('input change', 'input', renderSanitizeModal);
        $('#sanitizeModal').on('keydown', 'input[type="text"], input[type="number"]', function (e) {
            if (e.which !== 13) return;
            e.preventDefault();
            submitSanitize();
        });
        $('#sanitizeModalConfirm').on('click', submitSanitize);
    });

    window.showSanitizeModal = showSanitizeModal;
    window.hideSanitizeModal = hideSanitizeModal;
    window.showRestoreModal = showRestoreModal;
    window.showRestoreModalStandalone = showRestoreModalStandalone;
    window.hideRestoreModal = hideRestoreModal;
    window.doRestoreDatabase = submit;
    window.baRestoreWizard = { onFilesChosen: onFilesChosen, refreshServers: function () { fillServers(currentServerId()); updateServerNote(); } };
})(window, jQuery);
