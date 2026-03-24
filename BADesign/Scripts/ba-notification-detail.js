/* Chi tiết thông báo chuông — đồng bộ với Database Search (Loại reset, Tiến trình, File backup, …). Cần window.BA_API_BASE → DatabaseSearch.aspx */
(function() {
    if (typeof jQuery === 'undefined') return;
    function parseDateSafe(v) {
        if (v == null || v === '') return null;
        if (typeof v === 'number') return new Date(v);
        var s = (typeof v === 'string') ? v : String(v);
        var m = s.match(/\/Date\((\d+)\)\//);
        if (m) return new Date(parseInt(m[1], 10));
        return isNaN(Date.parse(s)) ? null : new Date(s);
    }
    function formatNotifTime(v) { var dt = parseDateSafe(v); return dt ? dt.toLocaleString() : '—'; }
    function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function resolveStatusLabelAndClass($item) {
        if (!$item || !$item.length || $item.hasClass('ba-notif-bug')) return null;
        if ($item.find('.ba-notif-msg-error').length) return { cls: 'ba-notif-status-failed', label: 'Lỗi' };
        var txt = ($item.text() || '');
        if (txt.indexOf('Đã xong') >= 0) return { cls: 'ba-notif-status-completed', label: 'Xong' };
        if ($item.find('.ba-notif-progress-wrap').length) {
            var ptxt = (($item.find('.ba-notif-progress-pct').first().text() || '') + ' ' + txt).toLowerCase();
            if (ptxt.indexOf('đang chờ') >= 0 || ptxt.indexOf('pending') >= 0) return { cls: 'ba-notif-status-pending', label: 'Đang chờ' };
            return { cls: 'ba-notif-status-running', label: 'Đang chạy' };
        }
        return null;
    }
    function ensureStatusBadgeForItem($item) {
        var status = resolveStatusLabelAndClass($item);
        if (!status) return;
        if ($item.find('.ba-notif-status-badge').length) return;
        var $meta = $item.children('div').filter(function() {
            var t = jQuery(this).text() || '';
            return t.indexOf('·') >= 0;
        }).first();
        if ($meta.length) {
            if (!$meta.css('display') || $meta.css('display') === 'block') {
                $meta.css({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' });
            }
            $meta.append('<span class="ba-notif-status-badge ' + status.cls + '">' + status.label + '</span>');
        } else {
            $item.prepend('<div style="margin-top:4px;"><span class="ba-notif-status-badge ' + status.cls + '">' + status.label + '</span></div>');
        }
        var $pct = $item.find('.ba-notif-progress-pct').first();
        if ($pct.length) {
            var t = ($pct.text() || '').trim();
            var isRestore = $item.find('.ba-notif-type-restore').length > 0;
            var hasPhase = t.indexOf(' - ') >= 0;
            if (isRestore && !hasPhase && /^100%$/i.test(t)) {
                $pct.text('100% - Hoàn tất restore, đang chờ bước tiếp theo...');
            }
        }
    }
    function enhanceNotificationListStatusBadges() {
        var $list = jQuery('#restoreJobsList');
        if (!$list.length) return;
        $list.find('.ba-notif-item').each(function() { ensureStatusBadgeForItem(jQuery(this)); });
    }

    window.hideNotificationDetailModal = function() {
        jQuery('#notificationDetailModal').removeClass('show').css('display', '');
    };

    window.hideRestoreDiagLargeModal = function() {
        jQuery('#baRestoreDiagLargeModal').removeClass('show').attr('aria-hidden', 'true');
    };

    /** HTML giám sát SQL (dùng chung panel nhỏ + popup lớn). */
    function buildRestoreDiagnosticsHtml(d) {
        if (!d || !d.success) {
            return '<span style="color:#f88;">' + esc((d && d.message) || 'Không tải được.') + '</span>';
        }
        var parts = [];
        var j = d.job || {};
        parts.push('<div class="ba-restore-diag-block"><strong>Job (app)</strong> phase: <code>' + esc(j.message || '—') + '</code> · % UI: <code>' + esc(String(j.percentComplete != null ? j.percentComplete : '—')) + '</code> · SessionId: <code>' + esc(j.sessionId != null ? String(j.sessionId) : '—') + '</code></div>');
        var sql = d.sqlSession;
        if (sql) {
            if (sql.found) {
                parts.push('<div class="ba-restore-diag-block"><strong>sys.dm_exec_requests</strong> (session restore)</div>');
                parts.push('<table class="ba-restore-diag-table"><tbody>');
                function row(k, v) { parts.push('<tr><td>' + esc(k) + '</td><td><code>' + esc(v != null ? String(v) : '—') + '</code></td></tr>'); }
                row('status', sql.status);
                row('command', sql.command);
                row('wait_type', sql.waitType);
                row('wait_time (ms)', sql.waitTimeMs);
                row('last_wait_type', sql.lastWaitType);
                row('percent_complete (SQL)', sql.percentCompleteSql != null ? sql.percentCompleteSql : '—');
                row('estimated_completion_time (ms)', sql.estimatedCompletionTimeMs);
                row('total_elapsed_time (ms)', sql.totalElapsedTimeMs);
                row('blocking_session_id', sql.blockingSessionId);
                parts.push('</tbody></table>');
            } else {
                parts.push('<div class="ba-restore-diag-block"><strong>sys.dm_exec_requests</strong>: không có dòng cho session <code>' + esc(String(sql.sessionId)) + '</code>.</div>');
            }
        }
        var db = d.databaseOnServer;
        if (db) {
            parts.push('<div class="ba-restore-diag-block"><strong>sys.databases</strong></div>');
            if (db.found) {
                parts.push('<div>Trạng thái: <code class="ba-restore-diag-state">' + esc(db.stateDesc || '—') + '</code>' + (db.userAccessDesc ? ' · Truy cập: <code>' + esc(db.userAccessDesc) + '</code>' : '') + '</div>');
            } else {
                parts.push('<div>Không thấy database <code>' + esc(db.name || '—') + '</code> trên server.</div>');
            }
        }
        var hints = d.hints;
        if (hints && hints.length) {
            parts.push('<div class="ba-restore-diag-block ba-restore-diag-hints"><strong>Gợi ý</strong><ul>');
            for (var hi = 0; hi < hints.length; hi++) parts.push('<li>' + esc(hints[hi]) + '</li>');
            parts.push('</ul></div>');
        }
        if (d.queriedAt) parts.push('<div class="ba-restore-diag-queried">Truy vấn lúc: ' + esc(d.queriedAt) + '</div>');
        return parts.join('');
    }

    function renderRestoreDiagnosticsInto($el, d) {
        if (!$el || !$el.length) return;
        $el.html(buildRestoreDiagnosticsHtml(d));
    }

    /** primary: 'small' | 'large' — panel đang bấm Làm mới; khi thành công đồng bộ cả hai nếu popup lớn đang mở. */
    function fetchRestoreDiagnostics(jobId, primary) {
        var apiBase = window.BA_API_BASE || '';
        var $small = jQuery('#ba-restore-diag-body');
        var $large = jQuery('#ba-restore-diag-large-body');
        var $modal = jQuery('#baRestoreDiagLargeModal');
        var loading = '<span class="ba-reset-info-loading">Đang đọc SQL Server…</span>';
        if (!apiBase || !jobId) {
            var err = '<span style="color:#f88;">Chưa cấu BA_API_BASE hoặc thiếu job.</span>';
            if (primary === 'small' && $small.length) $small.html(err);
            if (primary === 'large' && $large.length) $large.html(err);
            return;
        }
        if (primary === 'small' && $small.length) $small.html(loading);
        if (primary === 'large' && $large.length) $large.html(loading);
        jQuery.ajax({ url: apiBase + '/GetRestoreJobDiagnostics', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobId }) })
            .done(function(res) {
                var d = res.d || res;
                window.__baLastRestoreDiagData = d;
                window.__baLastRestoreDiagJobId = jobId;
                if ($small.length) renderRestoreDiagnosticsInto($small, d);
                if ($large.length && $modal.hasClass('show')) renderRestoreDiagnosticsInto($large, d);
            })
            .fail(function(xhr) {
                var err = '<span style="color:#f88;">Lỗi mạng: ' + esc(xhr.statusText || 'fail') + '</span>';
                if (primary === 'small' && $small.length) $small.html(err);
                if (primary === 'large' && $large.length) $large.html(err);
            });
    }

    window.showNotificationDetail = function(job) {
        if (!job) return;
        var typeLabel;
        if (job.type === 'Backup') typeLabel = 'Backup database';
        else if (job.type === 'Restore' || !job.type) typeLabel = 'Restore database';
        else typeLabel = esc(job.typeLabel || job.type || 'Job');
        var dbName = (job.databaseName || job.DatabaseName || '').trim();
        var isRestore = (job.type === 'Restore' || !job.type);
        var hasReset = isRestore && (job.withAutoReset === true || (job.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
        var startStr = formatNotifTime(job.startTime);
        var endStr = formatNotifTime(job.completedAt);
        var statusLabel = job.status === 'Running' ? 'Đang chạy' : (job.status === 'Completed' ? 'Thành công' : (job.status === 'Failed' ? 'Lỗi' : esc(job.status || '—')));
        var payloadObj = null;
        if (job.payload) {
            try { payloadObj = (typeof job.payload === 'string') ? JSON.parse(job.payload) : job.payload; } catch (e) { payloadObj = null; }
        }
        var html = '<table><tbody>';
        html += '<tr><th>Loại</th><td>' + typeLabel + '</td></tr>';
        html += '<tr><th>Server</th><td>' + esc(job.serverName || '—') + '</td></tr>';
        html += '<tr><th>Database</th><td>' + esc(job.databaseName || '—') + '</td></tr>';
        var resetBadge = '';
        if (isRestore) {
            resetBadge = hasReset ? '<span class="ba-notif-type-badge ba-notif-reset-tag">Có Reset</span>' : '<span class="ba-notif-type-badge ba-notif-no-reset-tag">Không Reset</span>';
            if (hasReset) {
                var srvId = job.serverId != null ? job.serverId : (job.ServerId != null ? job.ServerId : 0);
                var jobIdVal = job.id != null ? job.id : (job.Id != null ? job.Id : 0);
                resetBadge += ' <button type="button" class="ba-notif-reset-info-btn" title="Xem thông tin reset (email, phone, password)" data-job-id="' + jobIdVal + '" data-server-id="' + srvId + '" data-database-name="' + (dbName.replace(/"/g, '&quot;')) + '">ℹ</button>';
            }
        }
        html += '<tr><th>Loại reset</th><td>' + (resetBadge || '—') + '</td></tr>';
        html += '<tr><th>Thực hiện bởi</th><td>' + esc(job.startedByUserName || '—') + '</td></tr>';
        var msgTrim = (job.message || '').trim();
        var msgProgressLabel = msgTrim;
        if (msgTrim === 'PostRestore') msgProgressLabel = 'Hoàn tất restore — chuẩn bị Reset';
        else if (msgTrim === 'ShrinkLog') msgProgressLabel = 'Đang shrink file log…';
        else if (msgTrim === 'Completing') msgProgressLabel = 'Đang hoàn tất job…';
        var progressText = (job.percentComplete != null)
            ? (String(job.percentComplete) + '%' + (msgProgressLabel ? ' - ' + esc(msgProgressLabel) : ''))
            : ((job.status === 'Running' || job.status === 'Pending') && msgProgressLabel ? esc(msgProgressLabel) : '—');
        html += '<tr><th>Tiến trình</th><td>' + progressText + '</td></tr>';
        html += '<tr><th>Trạng thái</th><td>' + statusLabel + '</td></tr>';
        if (isRestore && payloadObj && (payloadObj.withShrinkLog === true || String(payloadObj.withShrinkLog).toLowerCase() === 'true')) {
            var sfs = String(payloadObj.shrinkFinalStatus || '').toLowerCase();
            var sfm = (payloadObj.shrinkFinalMessage || '').toString();
            var sfText = 'Đang xử lý';
            if (sfs === 'success') sfText = 'Thành công';
            else if (sfs === 'failed') sfText = 'Thất bại';
            var sfColor = (sfs === 'success') ? '#10b981' : (sfs === 'failed' ? '#ef4444' : '#f59e0b');
            var sfMsg = sfm ? ('<div style="margin-top:4px;color:var(--text-muted);font-size:0.78rem;word-break:break-word;">' + esc(sfm) + '</div>') : '';
            html += '<tr><th>Shrink cuối</th><td><span style="font-weight:600;color:' + sfColor + ';">' + sfText + '</span>' + sfMsg + '</td></tr>';
        }
        html += '<tr><th>Bắt đầu</th><td>' + startStr + '</td></tr>';
        html += '<tr><th>Kết thúc</th><td>' + endStr + '</td></tr>';
        if (job.backupFileName) html += '<tr><th>File backup</th><td>' + esc(job.backupFileName) + '</td></tr>';
        if ((job.type || '') === 'HRHelperMultiDbReset' && job.payload) {
            try {
                var pl = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                if (pl) {
                    html += '<tr><th>Email reset</th><td>' + esc(pl.email || '—') + '</td></tr>';
                    html += '<tr><th>Phone reset</th><td>' + esc(pl.phone || '—') + '</td></tr>';
                    var dbArr = pl.databaseNames || [];
                    var nDb = dbArr.length || pl.databaseCount || 0;
                    var dbCell = nDb + ' Database';
                    if (dbArr.length > 0) {
                        var escAttr = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                        dbCell += ' <button type="button" class="ba-db-list-toggle" data-dbs="' + escAttr(JSON.stringify(dbArr)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button>';
                        dbCell += '<div class="ba-db-list-popover"></div>';
                    }
                    html += '<tr><th>Danh sách database</th><td>' + dbCell + '</td></tr>';
                }
            } catch (e) {}
        }
        if ((job.type || '') === 'HRHelperDeleteEmployee' && job.payload) {
            try {
                var pl2 = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                var empList = Array.isArray(pl2) ? pl2 : (pl2 && pl2.employees) ? pl2.employees : [];
                if (empList.length > 0) {
                    var escAttr2 = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                    var empCell = empList.length + ' nhân viên';
                    empCell += ' <button type="button" class="ba-emp-list-toggle" data-emps="' + escAttr2(JSON.stringify(empList)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button>';
                    empCell += '<div class="ba-db-list-popover ba-emp-list-popover"></div>';
                    html += '<tr><th>Danh sách nhân viên đã xóa</th><td>' + empCell + '</td></tr>';
                }
            } catch (e) {}
        }
        html += '</tbody></table>';
        if (msgTrim && msgTrim !== 'Restore' && msgTrim !== 'Reset Information' && msgTrim !== 'PostRestore' && msgTrim !== 'ShrinkLog' && msgTrim !== 'Completing') {
            html += '<div class="ba-notif-full-msg">' + esc(job.message).replace(/\n/g, '<br/>') + '</div>';
        }
        var jobIdDiag = job.id != null ? job.id : (job.Id != null ? job.Id : 0);
        var canDiag = (typeof window.BA_CAN_VIEW_RESTORE_DIAGNOSTICS !== 'undefined' && window.BA_CAN_VIEW_RESTORE_DIAGNOSTICS === true);
        if (canDiag && isRestore && jobIdDiag > 0) {
            html += '<div class="ba-restore-diag-wrap" style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.12);padding-top:10px;">';
            html += '<div style="margin-bottom:8px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;"><strong>Giám sát chi tiết (SQL Server)</strong>';
            html += '<button type="button" class="ba-restore-diag-view-detail" data-job-id="' + jobIdDiag + '" title="Xem chi tiết: làm mới + mở popup lớn">Xem chi tiết</button>';
            html += '<span style="opacity:0.75;font-size:12px;">Đọc session restore + trạng thái DB (RESTORING / ONLINE)</span></div>';
            html += '<div id="ba-restore-diag-body" class="ba-restore-diag-body" style="font-size:12px;line-height:1.45;opacity:0.9;">Bấm <strong>Xem chi tiết</strong> để mở popup lớn và tự động làm mới dữ liệu SQL mới nhất.</div>';
            html += '</div>';
        }
        html += '<div id="baResetInfoPopup" class="ba-reset-info-popup" style="display:none;"></div>';
        jQuery('#notificationDetailBody').html(html);
        jQuery('#notificationDetailBody').off('click.baDbList').on('click.baDbList', '.ba-db-list-toggle', function() {
            var $btn = jQuery(this), $pop = $btn.siblings('.ba-db-list-popover').first();
            var raw = $btn.attr('data-dbs');
            if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
            try {
                var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                var grid = '<div class="ba-db-list-grid">' + (arr.map(function(name) { return '<span>' + esc(name) + '</span>'; }).join('')) + '</div>';
                $pop.html(grid).addClass('show');
            } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
        });
        jQuery('#notificationDetailBody').off('click.baEmpList').on('click.baEmpList', '.ba-emp-list-toggle', function() {
            var $btn = jQuery(this), $pop = $btn.siblings('.ba-emp-list-popover').first();
            var raw = $btn.attr('data-emps');
            if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
            try {
                var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                var esc2 = function(s){ return (s||'').replace(/</g, '&lt;').replace(/&/g, '&amp;'); };
                var grid = '<div class="ba-db-list-grid">' + (arr.map(function(o) { var lid = o.localId != null ? o.localId : o.LocalId || ''; var name = o.name != null ? o.name : o.Name || ''; return '<span>' + esc2(lid) + (name ? ' – ' + esc2(name) : '') + '</span>'; }).join('')) + '</div>';
                $pop.html(grid).addClass('show');
            } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
        });
        jQuery('#notificationDetailBody').off('click.baRestoreDiagOpenLarge').on('click.baRestoreDiagOpenLarge', '.ba-restore-diag-view-detail', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var jid = parseInt(jQuery(this).attr('data-job-id') || '0', 10);
            if (!jid) return;
            jQuery('#baRestoreDiagLargeModal .ba-restore-diag-refresh-large').attr('data-job-id', jid);
            jQuery('#baRestoreDiagLargeModal').addClass('show').attr('aria-hidden', 'false');
            var $large = jQuery('#ba-restore-diag-large-body');
            $large.html('<span class="ba-reset-info-loading">Đang tải…</span>');
            // Xem chi tiết = mở popup lớn + refresh ngay dữ liệu mới nhất.
            fetchRestoreDiagnostics(jid, 'large');
        });
        jQuery('#notificationDetailBody').off('click.baResetInfo').on('click.baResetInfo', '.ba-notif-reset-info-btn', function(e) {
            e.preventDefault(); e.stopPropagation();
            var $btn = jQuery(this), jobId = $btn.data('job-id'), serverId = $btn.data('server-id'), dbName = $btn.data('database-name');
            var $popup = jQuery('#baResetInfoPopup');
            var apiBase = window.BA_API_BASE || '';
            if ($popup.length && apiBase && (serverId != null && dbName || jobId)) {
                $popup.html('<span class="ba-reset-info-loading">Đang tải...</span>').show();
                var payload = { serverId: serverId || 0, databaseName: dbName || '' };
                if (jobId) payload.jobId = jobId;
                jQuery.ajax({ url: apiBase + '/GetRestoreResetInfo', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify(payload) })
                    .done(function(res) { var d = res.d || res; if (d && d.success && d.resetDetail) { var raw2 = d.resetDetail.replace(/^Reset:\s*/i, '').trim(); var rows = []; raw2.split(/\s*,\s*/).forEach(function(pair) { var idx = pair.indexOf('='); if (idx > 0) { var label = pair.substring(0, idx).trim(); var value = pair.substring(idx + 1).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); var lbl = label === 'Email' ? 'Email' : label === 'Phone' ? 'Phone' : label === 'Password' ? 'Password' : label; rows.push('<div class="ba-reset-info-row"><span class="ba-reset-info-label">' + lbl + '</span><span class="ba-reset-info-value">' + value + '</span></div>'); } }); $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">' + (rows.length ? rows.join('') : raw2.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</div>'); } else $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không có thông tin reset.</div>'); })
                    .fail(function() { $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không tải được thông tin.</div>'); });
            }
        });
        jQuery(document).off('click.baResetInfoClose').on('click.baResetInfoClose', function(ev) { if (jQuery(ev.target).closest('#baResetInfoPopup').length === 0 && !jQuery(ev.target).hasClass('ba-notif-reset-info-btn')) jQuery('#baResetInfoPopup').hide(); });
        jQuery('#notificationDetailModal').addClass('show');
    };

    jQuery(function() {
        var $modal = jQuery('#notificationDetailModal');
        if (!$modal.length) return;
        jQuery('#notificationDetailClose').on('click', function(e) { e.preventDefault(); e.stopPropagation(); window.hideNotificationDetailModal(); });
        $modal.on('click', function(e) { if (e.target === this) window.hideNotificationDetailModal(); });
        var $diagLarge = jQuery('#baRestoreDiagLargeModal');
        if ($diagLarge.length) {
            jQuery('#baRestoreDiagLargeClose').on('click', function(e) { e.preventDefault(); e.stopPropagation(); window.hideRestoreDiagLargeModal(); });
            $diagLarge.on('click', function(e) { if (e.target === this) window.hideRestoreDiagLargeModal(); });
            jQuery(document).on('click', '.ba-restore-diag-refresh-large', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var jid = parseInt(jQuery(this).attr('data-job-id') || '0', 10);
                if (!jid) return;
                fetchRestoreDiagnostics(jid, 'large');
            });
        }
        // Chuông được render khác nhau theo từng trang; lớp enhancer này đảm bảo badge trạng thái nhất quán toàn bộ trang.
        var $list = jQuery('#restoreJobsList');
        if ($list.length && typeof window.MutationObserver !== 'undefined') {
            var observer = new MutationObserver(function() { enhanceNotificationListStatusBadges(); });
            observer.observe($list[0], { childList: true, subtree: true });
            jQuery(window).on('beforeunload', function() { try { observer.disconnect(); } catch (e) {} });
        }
        enhanceNotificationListStatusBadges();
        setTimeout(enhanceNotificationListStatusBadges, 500);
        setTimeout(enhanceNotificationListStatusBadges, 1500);
    });
})();
