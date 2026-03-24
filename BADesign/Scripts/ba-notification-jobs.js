/**
 * Chuông thông báo job — dùng chung mọi trang có NotificationBell.ascx.
 * Badge trạng thái (Đang chạy / Đang chờ) cạnh dòng user · giờ: BaNotif.wrapMetaWithBadge(...)
 */
(function (global) {
    'use strict';
    var BaNotif = global.BaNotif || {};

    BaNotif.esc = function (s) {
        return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    /** Badge Running / Pending (đặt cạnh dòng thời gian). */
    BaNotif.statusBadgeHtml = function (st) {
        if (st === 'Running') return '<span class="ba-notif-status-badge ba-notif-status-running">Đang chạy</span>';
        if (st === 'Pending') return '<span class="ba-notif-status-badge ba-notif-status-pending">Đang chờ</span>';
        return '';
    };

    /**
     * Dòng meta: user · thời gian + badge (flex).
     * @param {string} innerHtml — đã escape phần text nếu cần (thường là tên + ' · ' + time)
     * @param {string} status — Running | Pending | ...
     * @param {string} [extraDivStyle] — thêm vào style của div (vd. font-size)
     */
    BaNotif.wrapMetaWithBadge = function (innerHtml, status, extraDivStyle) {
        var base = 'color:var(--text-muted);margin-top:4px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;';
        return '<div style="' + base + (extraDivStyle || '') + '">' + innerHtml + BaNotif.statusBadgeHtml(status || '') + '</div>';
    };

    BaNotif.completedBadgeRow = function () {
        return '<div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span class="ba-notif-status-badge ba-notif-status-completed">Xong</span><span style="color:var(--success,#10b981);font-size:0.8125rem;">Đã xong</span></div>';
    };

    BaNotif.failedBadgeRow = function () {
        return '<div style="margin-top:6px;"><span class="ba-notif-status-badge ba-notif-status-failed">Lỗi</span></div>';
    };

    /** Hiển thị phase restore từ BaJob.Message (đồng bộ với DatabaseSearch.aspx). */
    BaNotif.restorePhaseDisplay = function (phase) {
        var p = (phase == null ? '' : String(phase)).trim();
        if (p === 'Restore' || p === 'Đang Restore') return 'Restore';
        if (p === 'PostRestore') return 'Hoàn tất restore — chuẩn bị Reset';
        if (p === 'ShrinkLog' || p === 'shrinklog') return 'Đang shrink file log…';
        if (p === 'Completing' || p === 'completing') return 'Đang hoàn tất job…';
        return p;
    };

    /** Phase sau RESTORE: % chỉ tăng (tránh 77% → 0% do race GetJobs/GetRestoreProgress). Restore: max(UI, API) như cũ. */
    BaNotif.mergeJobProgressPct = function (phase, apiPct, lastKeyPct, curUiPct) {
        var p = (apiPct != null && !isNaN(Number(apiPct))) ? Math.max(0, Math.min(100, Number(apiPct))) : 0;
        var last = lastKeyPct || 0;
        var cur = curUiPct || 0;
        var ph = (phase == null ? '' : String(phase)).trim();
        if (ph === 'Reset Information' || ph === 'Completing' || ph === 'PostRestore' || ph === 'ShrinkLog' || ph.toLowerCase() === 'shrinklog') {
            return Math.max(last, p);
        }
        return Math.max(cur, p);
    };

    global.BaNotif = BaNotif;
})(typeof window !== 'undefined' ? window : this);
