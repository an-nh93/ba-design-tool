(function(global) {
    'use strict';

    var $ = global.jQuery;
    if (!$) return;

    var DISMISSED_KEY = 'baDismissedJobIds';
    var DISMISSED_LIMIT = 500;
    var MESSAGE_LIMIT = 120;
    var RELOAD_GAP_MS = 400;
    var PANEL_POLL_MS = 6000;
    var RESTORE_POLL_MS = 2000;
    var RUNNING_POLL_MS = 4000;
    var CLOSED_POLL_MS = 10000;
    var WAITING_LABEL = 'Đang chờ xử lý...';
    var POST_PHASES = ['Reset Information', 'Completing', 'PostRestore', 'ShrinkLog', 'shrinklog'];
    var CANCELLABLE = ['Restore', 'Backup', 'HRHelperUpdateUser', 'HRHelperUpdateUserSignature', 'HRHelperUpdateEmployee', 'HRHelperUpdateOther', 'HRHelperMultiDbAnalyze', 'HRHelperMultiDbReset', 'HRHelperDeleteEmployee'];
    var TYPE_CLASS = {
        Backup: 'ba-notif-type-backup',
        Restore: 'ba-notif-type-restore',
        HRHelperUpdateUser: 'ba-notif-type-hr-user',
        HRHelperUpdateUserSignature: 'ba-notif-type-hr-user',
        HRHelperUpdateEmployee: 'ba-notif-type-hr-employee',
        HRHelperDeleteEmployee: 'ba-notif-type-hr-employee',
        HRHelperUpdateOther: 'ba-notif-type-hr-other',
        HRHelperMultiDbAnalyze: 'ba-notif-type-hr-analyze',
        HRHelperMultiDbReset: 'ba-notif-type-hr-analyze'
    };
    var TYPE_LABEL = {
        Backup: 'Backup',
        Restore: 'Restore',
        HRHelperMultiDbAnalyze: 'Phân tích Multi-DB',
        HRHelperMultiDbReset: 'Reset Multi-DB',
        HRHelperDeleteEmployee: 'Xóa Employee'
    };
    var PROGRESS_SUFFIX = {
        HRHelperMultiDbAnalyze: 'Phân tích',
        HRHelperMultiDbReset: 'Reset',
        HRHelperDeleteEmployee: 'Xóa employee'
    };
    var EMPTY_HTML = '<div class="ba-notif-empty">Không có thông báo.</div>';

    var state = { jobs: [], bugs: [], currentUserId: 0, isSuperAdmin: false, lastPercent: {}, requestId: 0, loadedAt: 0, pending: null };
    var timers = {};
    var config = {};
    var $list = null;
    var $badge = null;
    var $panel = null;

    function api(method) {
        return (global.BA_API_BASE || '') + '/' + method;
    }

    function post(url, data) {
        return $.ajax({ url: url, type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: data ? JSON.stringify(data) : '{}' });
    }

    function unwrap(response) {
        return response ? (response.d || response) : null;
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function parseDate(value) {
        if (value == null || value === '') return null;
        if (typeof value === 'number') return new Date(value);
        var text = String(value);
        var match = text.match(/\/Date\((\d+)\)\//);
        if (match) return new Date(parseInt(match[1], 10));
        var parsed = Date.parse(text);
        return isNaN(parsed) ? null : new Date(parsed);
    }

    function formatTime(value) {
        var date = parseDate(value);
        return date ? date.toLocaleString() : '—';
    }

    function field(job, name) {
        var value = job[name];
        return value != null ? value : job[name.charAt(0).toUpperCase() + name.slice(1)];
    }

    function toast(message, type) {
        if (global.BaToast && typeof global.BaToast.show === 'function') global.BaToast.show(message, type || 'info');
        else if (typeof global.baAlert === 'function') global.baAlert(message);
    }

    function dismissedKeys() {
        try {
            var parsed = JSON.parse(global.localStorage.getItem(DISMISSED_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function dismissedKey(id, type) {
        return (type === 'Backup' ? 'b:' : 'r:') + id;
    }

    function rememberDismissed(id, type) {
        var keys = dismissedKeys();
        var key = dismissedKey(id, type);
        if (keys.indexOf(key) >= 0) return;
        keys.push(key);
        if (keys.length > DISMISSED_LIMIT) keys = keys.slice(keys.length - DISMISSED_LIMIT);
        try { global.localStorage.setItem(DISMISSED_KEY, JSON.stringify(keys)); } catch (e) { }
    }

    function isActive(job) {
        return job.status === 'Running' || job.status === 'Pending';
    }

    function percentOf(job) {
        var raw = field(job, 'percentComplete');
        if (raw == null || raw === '') raw = job.percentcomplete;
        var value = (raw == null || raw === '') ? 0 : Number(raw);
        return isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
    }

    function phaseOf(job, percent) {
        var type = job.type;
        if (type !== 'Restore' && type !== 'Backup') return '';
        var phase = String(field(job, 'message') || '').trim() || (type === 'Restore' ? 'Restore' : '');
        if (phase === 'Pending') phase = WAITING_LABEL;
        if (phase === WAITING_LABEL && percent > 0) phase = type;
        return phase;
    }

    function knownPercent(job, phase, percent) {
        var key = String(job.id);
        var value = Math.max(percent, state.lastPercent[key] || 0);
        if (job.status === 'Running' || POST_PHASES.indexOf(phase) >= 0) state.lastPercent[key] = value;
        return value;
    }

    function progressLabel(job, phase, percent) {
        var text = '';
        if (job.type === 'Restore' && phase) text = global.BaNotif.restorePhaseDisplay(phase);
        else if (job.type === 'Backup' && phase) text = phase === 'Đang Backup' ? 'Backup' : phase;
        else if (PROGRESS_SUFFIX[job.type]) text = PROGRESS_SUFFIX[job.type];
        return percent + '%' + (text ? ' - ' + text : '');
    }

    function canCancel(job) {
        if (job.status !== 'Running' || CANCELLABLE.indexOf(job.type) < 0 || !state.currentUserId) return false;
        return state.isSuperAdmin || (parseInt(field(job, 'startedByUserId'), 10) || 0) === state.currentUserId;
    }

    function hasAutoReset(job, database) {
        if (job.type !== 'Restore') return false;
        if (job.withAutoReset === true) return true;
        return job.withAutoReset == null && database.indexOf('_RESET') >= 0 && database.indexOf('_NO_RESET') < 0;
    }

    function detailLink() {
        return '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
    }

    function bugRow(bug) {
        var url = (config.feedbackManageUrl || '') + (bug.id ? '?id=' + encodeURIComponent(bug.id) : '');
        return '<div class="ba-notif-item ba-notif-bug" data-bug-id="' + esc(bug.id || '') + '">' +
            '<div class="ba-notif-item-title"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> <span translate="no">' + esc(bug.title || '') + '</span></div>' +
            '<div class="ba-notif-item-meta"><span translate="no">' + esc(bug.userName || '—') + '</span> · ' + esc(formatTime(bug.createdAt)) + '</div>' +
            '<a class="ba-notif-detail-link" href="' + esc(url) + '" data-action="bug">Xem / Xử lý</a></div>';
    }

    function jobRow(job) {
        var type = job.type;
        var status = job.status || '';
        var percent = percentOf(job);
        var phase = phaseOf(job, percent);
        var message = String(field(job, 'message') || '').trim();
        var shortMessage = message.length > MESSAGE_LIMIT ? message.substring(0, MESSAGE_LIMIT) + '…' : message;
        var database = String(field(job, 'databaseName') || '').trim();
        var serverId = field(job, 'serverId');
        var sessionId = field(job, 'sessionId');
        var reset = hasAutoReset(job, database);
        var html = '<div class="ba-notif-item" data-job-id="' + esc(job.id) + '" data-job-type="' + esc(type) + '" data-server-id="' + esc(serverId != null ? serverId : '') +
            '" data-session-id="' + esc(sessionId != null ? sessionId : '') + '" data-phase="' + esc(phase) + '" data-has-reset="' + (reset ? '1' : '0') + '">';
        html += '<button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button>';
        html += '<div class="ba-notif-item-title"><span class="ba-notif-type-badge ' + (TYPE_CLASS[type] || '') + '">' + esc(job.typeLabel || TYPE_LABEL[type] || type) + '</span> ';
        if (type === 'Restore') {
            html += reset
                ? '<span class="ba-notif-type-badge ba-notif-reset-tag" title="Restore có tích hợp Reset thông tin">Có Reset</span> '
                : '<span class="ba-notif-type-badge ba-notif-no-reset-tag" title="Restore không reset">Không Reset</span> ';
        }
        html += '<span translate="no">' + esc(field(job, 'serverName') || '') + ' → ' + esc(database) + '</span></div>';
        html += global.BaNotif.wrapMetaWithBadge('<span><span translate="no">' + esc(field(job, 'startedByUserName') || '') + '</span> · ' + esc(formatTime(field(job, 'startTime'))) + '</span>', status);
        if (isActive(job)) {
            var shown = knownPercent(job, phase, percent);
            html += '<div class="ba-notif-progress-wrap"><div class="ba-notif-progress-track"><div class="ba-notif-progress-bar" style="width:' + shown + '%;"></div></div>' +
                '<span class="ba-notif-progress-pct">' + esc(progressLabel(job, phase, shown)) + '</span></div>';
            html += detailLink();
            if (canCancel(job)) html += ' <button type="button" class="ba-notif-cancel-btn" title="Hủy job đang chạy">Hủy</button>';
        } else if (status === 'Failed') {
            html += global.BaNotif.failedBadgeRow() + '<div class="ba-notif-msg ba-notif-msg-error">' + esc(shortMessage) + '</div>' + detailLink();
        } else if (status === 'Completed') {
            html += global.BaNotif.completedBadgeRow();
            if (shortMessage) html += '<div class="ba-notif-msg">' + esc(shortMessage) + '</div>';
            html += detailLink();
        } else {
            html += detailLink();
        }
        return html + '</div>';
    }

    function isCollapsed(name) {
        try { return global.sessionStorage.getItem('ba_notif_' + name + '_collapsed') === '1'; } catch (e) { return false; }
    }

    function setCollapsed(name, collapsed) {
        try {
            if (collapsed) global.sessionStorage.setItem('ba_notif_' + name + '_collapsed', '1');
            else global.sessionStorage.removeItem('ba_notif_' + name + '_collapsed');
        } catch (e) { }
    }

    function group(name, rows, count) {
        var collapsed = isCollapsed(name);
        var title = name === 'bugs' ? '🐛 Bugs mới (' + count + ')' : 'Thông báo job (' + count + ')';
        return '<div class="ba-notif-group" data-group="' + name + '">' +
            '<div class="ba-notif-section-title ba-notif-group-toggle" data-group="' + name + '">' +
            '<span class="ba-notif-group-arrow">' + (collapsed ? '▶' : '▼') + '</span>' +
            '<span class="ba-notif-group-label">' + title + '</span></div>' +
            '<div class="ba-notif-group-body" data-group="' + name + '"' + (collapsed ? ' style="display:none;"' : '') + '>' + rows + '</div></div>';
    }

    function setBadge(total) {
        if (total > 0) $badge.text(total).addClass('visible');
        else $badge.removeClass('visible');
    }

    function render() {
        var total = state.jobs.length + state.bugs.length;
        setBadge(total);
        if (!total) {
            $list.html(EMPTY_HTML);
            return;
        }
        var top = $list.scrollTop();
        var html = '';
        if (state.bugs.length) html += group('bugs', state.bugs.map(bugRow).join(''), state.bugs.length);
        if (state.jobs.length) html += group('jobs', state.jobs.map(jobRow).join(''), state.jobs.length);
        $list.html(html);
        $list.scrollTop(top);
    }

    function apply(data) {
        var keys = dismissedKeys();
        state.jobs = ((data && data.jobs) || [])
            .map(function(job) { job.type = job.type || 'Restore'; return job; })
            .filter(function(job) { return job.id != null && keys.indexOf(dismissedKey(job.id, job.type)) < 0; })
            .sort(function(a, b) {
                var first = parseDate(a.startTime);
                var second = parseDate(b.startTime);
                return (first && second) ? (second - first) : 0;
            });
        state.bugs = (data && data.newBugs) || [];
        state.currentUserId = (data && data.currentUserId != null) ? (parseInt(data.currentUserId, 10) || 0) : 0;
        state.isSuperAdmin = !!(data && (data.isSuperAdmin === true || data.isSuperAdmin === 'true'));
        render();
        schedule();
    }

    function reload() {
        if (!$list) return;
        var wait = RELOAD_GAP_MS - (Date.now() - state.loadedAt);
        if (wait > 0) {
            if (!state.pending) state.pending = setTimeout(function() { state.pending = null; reload(); }, wait);
            return;
        }
        state.loadedAt = Date.now();
        var requestId = ++state.requestId;
        post(api('GetJobs')).done(function(response) {
            if (requestId === state.requestId) apply(unwrap(response));
        });
    }

    function restoreSessions() {
        return state.jobs.filter(function(job) {
            var sessionId = field(job, 'sessionId');
            return job.type === 'Restore' && isActive(job) && sessionId != null && sessionId !== '' && field(job, 'serverId') != null;
        });
    }

    function pollRestoreProgress() {
        if (!panelOpen()) return;
        restoreSessions().forEach(function(job) {
            post(api('GetRestoreProgress'), { serverId: field(job, 'serverId'), sessionId: field(job, 'sessionId') }).done(function(response) {
                var data = unwrap(response);
                if (!data) return;
                var $row = $list.find('.ba-notif-item[data-job-id="' + job.id + '"]');
                if (!$row.length) return;
                if (data.completed) {
                    reload();
                    return;
                }
                if (data.percentComplete == null) return;
                var phase = (data.phase != null && String(data.phase).trim() !== '') ? String(data.phase).trim() : ($row.attr('data-phase') || 'Restore');
                if (data.percentComplete === 100 && (phase === 'Pending' || phase === WAITING_LABEL)) phase = 'Restore';
                var key = String(job.id);
                var current = parseInt($row.find('.ba-notif-progress-pct').text(), 10) || 0;
                var percent = global.BaNotif.mergeJobProgressPct(phase, data.percentComplete, state.lastPercent[key] || 0, current);
                state.lastPercent[key] = percent;
                $row.attr('data-phase', phase);
                $row.find('.ba-notif-progress-bar').css('width', percent + '%');
                if (global.BaJobProgress) global.BaJobProgress.label($row.find('.ba-notif-progress-pct')[0], percent, global.BaNotif.restorePhaseDisplay(phase));
            });
        });
    }

    function panelOpen() {
        return !!$panel && $panel.is(':visible');
    }

    function setTimer(name, action, interval) {
        var current = timers[name];
        if (current && current.action === action && current.interval === interval) return;
        if (current) clearInterval(current.id);
        timers[name] = null;
        if (!action) return;
        timers[name] = {
            action: action,
            interval: interval,
            id: setInterval(function() {
                if (!(global.BaJobProgress && global.BaJobProgress.isLive())) action();
            }, interval)
        };
    }

    function schedule() {
        var visible = !document.hidden;
        var open = visible && panelOpen();
        var active = state.jobs.some(isActive);
        setTimer('panel', open ? reload : null, PANEL_POLL_MS);
        if (open && restoreSessions().length) setTimer('progress', pollRestoreProgress, RESTORE_POLL_MS);
        else setTimer('progress', open && active ? reload : null, RUNNING_POLL_MS);
        setTimer('closed', visible && !open && active ? reload : null, CLOSED_POLL_MS);
    }

    function jobOf(element) {
        var id = String($(element).closest('.ba-notif-item').attr('data-job-id') || '');
        if (!id) return null;
        for (var i = 0; i < state.jobs.length; i++) {
            if (String(state.jobs[i].id) === id) return state.jobs[i];
        }
        return null;
    }

    function showDetail(job) {
        if (typeof global.showNotificationDetail !== 'function') return;
        post(api('GetJobResult'), { jobId: job.id }).done(function(response) {
            var data = unwrap(response);
            if (!data || !data.success) return;
            if (data.message != null) job.message = data.message;
            if (data.payload != null) job.payload = data.payload;
        }).always(function() {
            global.showNotificationDetail(job);
        });
    }

    function openDetail(job) {
        var helperUrl = config.hrHelperUrl || '';
        var onHelperPage = /\/hrhelper(\.aspx)?$/i.test(global.location.pathname);
        if (job.type !== 'HRHelperMultiDbAnalyze' || job.status !== 'Completed' || !helperUrl || onHelperPage) {
            showDetail(job);
            return;
        }
        post(helperUrl + '/GetMultiConnTokenForJob', { jobId: job.id }).done(function(response) {
            var data = unwrap(response);
            if (data && data.success && data.token) {
                global.location.href = helperUrl + '?k=' + encodeURIComponent(data.token) + '&jobId=' + encodeURIComponent(job.id);
                return;
            }
            toast(data && data.message ? data.message : 'Phiên kết nối Multi-DB đã hết. Vào Công cụ Database chọn lại Multi-DB, vào Trợ lý HR và bấm "Tải kết quả phân tích gần nhất".', 'info');
            showDetail(job);
        }).fail(function() {
            showDetail(job);
        });
    }

    function onDetailClick(e) {
        e.preventDefault();
        var job = jobOf(this);
        if (job) openDetail(job);
    }

    function onDismissClick(e) {
        e.preventDefault();
        e.stopPropagation();
        var job = jobOf(this);
        if (!job) return;
        rememberDismissed(job.id, job.type);
        state.jobs = state.jobs.filter(function(other) { return other !== job; });
        setBadge(state.jobs.length + state.bugs.length);
        post(api('DismissJob'), { jobId: job.id });
        $(this).closest('.ba-notif-item').slideUp(200, render);
    }

    function onCancelClick(e) {
        e.preventDefault();
        var job = jobOf(this);
        if (!job || typeof global.baConfirm !== 'function') return;
        var $button = $(this);
        var server = String(field(job, 'serverName') || '').trim();
        var database = String(field(job, 'databaseName') || '').trim();
        var description = (server || database) ? (server + ' → ' + database) : ('Job #' + job.id);
        var message = 'Bạn có chắc muốn hủy job:\n' + description + '\nLoại: ' + (job.type || job.typeLabel || 'Restore') + '\n\nHành động không thể hoàn tác.';
        global.baConfirm(message, function() {
            $button.prop('disabled', true);
            post(api('CancelRestoreJob'), { jobId: job.id }).done(function(response) {
                var data = unwrap(response);
                if (data && data.success) {
                    reload();
                    return;
                }
                $button.prop('disabled', false);
                toast(data && data.message ? data.message : 'Không thể hủy.', 'error');
            }).fail(function() {
                $button.prop('disabled', false);
                toast('Lỗi kết nối.', 'error');
            });
        }, null, 'Đồng ý', 'Thoát');
    }

    function onGroupClick() {
        var name = $(this).attr('data-group');
        var $body = $list.find('.ba-notif-group-body[data-group="' + name + '"]');
        var collapse = $body.is(':visible');
        if (collapse) $body.slideUp(200);
        else $body.slideDown(200);
        $(this).find('.ba-notif-group-arrow').text(collapse ? '▶' : '▼');
        setCollapsed(name, collapse);
    }

    function closePanel() {
        if (!panelOpen()) return;
        $panel.hide();
        schedule();
    }

    function onBellClick(e) {
        e.stopPropagation();
        if (panelOpen()) {
            closePanel();
            return;
        }
        $panel.show();
        reload();
        schedule();
    }

    function onVisibilityChange() {
        if (!document.hidden) reload();
        schedule();
    }

    function init() {
        if (!$('#restoreJobsBellWrap').length || !global.BaNotif) return;
        $list = $('#restoreJobsList');
        $badge = $('#restoreJobsBadge');
        $panel = $('#restoreJobsPanel');
        config = global.BA_BELL || {};
        $list.on('click', '.ba-notif-group-toggle', onGroupClick);
        $list.on('click', '.ba-notif-detail-link[data-action="detail"]', onDetailClick);
        $list.on('click', '.ba-notif-dismiss', onDismissClick);
        $list.on('click', '.ba-notif-cancel-btn', onCancelClick);
        $('#restoreJobsBellBtn').on('click', onBellClick);
        $panel.on('click', function(e) { e.stopPropagation(); });
        $(document).on('click', closePanel);
        document.addEventListener('visibilitychange', onVisibilityChange);
        if (global.BA_SignalR) {
            global.BA_SignalR.onJobsUpdated(reload);
            if (config.signalrUrl) global.BA_SignalR.start(config.signalrUrl, config.hubsUrl);
        }
        reload();
    }

    global.loadRestoreJobsPanel = reload;
    global.BaBell = {
        reload: reload,
        jobs: function() { return state.jobs.slice(); }
    };

    $(init);
})(typeof window !== 'undefined' ? window : this);
