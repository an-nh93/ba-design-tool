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

    window.hideNotificationDetailModal = function() {
        jQuery('#notificationDetailModal').removeClass('show').css('display', '');
    };

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
        var progressText = (job.percentComplete != null)
            ? (String(job.percentComplete) + '%' + (msgTrim ? ' - ' + esc(msgTrim) : ''))
            : ((job.status === 'Running' || job.status === 'Pending') && msgTrim ? esc(msgTrim) : '—');
        html += '<tr><th>Tiến trình</th><td>' + progressText + '</td></tr>';
        html += '<tr><th>Trạng thái</th><td>' + statusLabel + '</td></tr>';
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
        if (msgTrim && msgTrim !== 'Restore' && msgTrim !== 'Reset Information') {
            html += '<div class="ba-notif-full-msg">' + esc(job.message).replace(/\n/g, '<br/>') + '</div>';
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
    });
})();
