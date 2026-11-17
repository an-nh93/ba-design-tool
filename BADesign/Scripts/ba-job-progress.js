(function(global) {
    'use strict';

    var STALE_NOTICE_MS = 20000;
    var STALE_WARN_MS = 60000;
    var RELOAD_GAP_MS = 2500;
    var jobs = {};
    var reloadTimer = null;
    var reloadAt = 0;
    var ticker = null;
    var observer = null;
    var overlayJob = null;
    var lastPushAt = 0;
    var LIVE_WINDOW_MS = 8000;
    var SILENT_RELOAD_MS = 6000;
    var SILENT_RELOAD_GAP_MS = 5000;

    function entry(id) {
        return jobs[id] || (jobs[id] = { pct: 0, shown: null, message: null, detail: null, beat: 0, seen: Date.now(), jobType: null, finished: false, baseElapsed: 0, baseAt: 0 });
    }

    function phaseLabel(job) {
        if (!job.message) return '';
        if (job.jobType === 'Restore' && global.BaNotif && typeof global.BaNotif.restorePhaseDisplay === 'function')
            return global.BaNotif.restorePhaseDisplay(job.message);
        return job.message;
    }

    function clock(ms) {
        var seconds = Math.max(0, Math.floor(ms / 1000));
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        var two = function(n) { return n < 10 ? '0' + n : String(n); };
        return h > 0 ? h + ':' + two(m) + ':' + two(s) : two(m) + ':' + two(s);
    }

    function elapsedText(job) {
        return job.baseAt ? 'Đã chạy ' + clock(job.baseElapsed + Date.now() - job.baseAt) : '';
    }

    function setWidth(bar, from, to) {
        if (from != null && from !== to) {
            bar.style.transition = 'none';
            bar.style.width = from + '%';
            void bar.offsetWidth;
            bar.style.transition = '';
        }
        bar.style.width = to + '%';
    }

    function span(className, text) {
        var el = document.createElement('span');
        el.className = className;
        el.textContent = text;
        return el;
    }

    function writeLabel(el, percent, label) {
        var num = el.querySelector('.ba-job-num');
        var lab = el.querySelector('.ba-job-label');
        var numText = percent + '%';
        if (!num || !lab) {
            if (label == null) {
                var raw = (el.textContent || '').replace(/^\s*\d+\s*%\s*/, '').replace(/^-\s*/, '');
                label = raw;
            }
            el.textContent = '';
            el.appendChild(span('ba-job-num', numText));
            el.appendChild(span('ba-job-sep', label ? ' - ' : ''));
            el.appendChild(span('ba-job-label', label || ''));
            return;
        }
        if (num.textContent !== numText) num.textContent = numText;
        if (label != null && lab.textContent !== label && lab.getAttribute('data-source') !== label) {
            lab.textContent = label;
            lab.setAttribute('data-source', label);
            var sep = el.querySelector('.ba-job-sep');
            if (sep) sep.textContent = label ? ' - ' : '';
        }
    }

    function writeMeta(wrap, job) {
        var meta = wrap.querySelector('.ba-job-meta');
        var silent = job.beat ? Date.now() - job.beat : 0;
        var stale = silent >= STALE_NOTICE_MS ? 'Chưa có tín hiệu ' + Math.round(silent / 1000) + ' giây' : '';
        var elapsed = elapsedText(job);
        if (!job.detail && !stale && !elapsed) {
            if (meta) meta.parentNode.removeChild(meta);
            return;
        }
        if (!meta) {
            meta = document.createElement('div');
            meta.className = 'ba-job-meta';
            meta.appendChild(span('ba-job-elapsed', ''));
            meta.appendChild(span('ba-job-detail', ''));
            meta.appendChild(span('ba-job-stale', ''));
            wrap.appendChild(meta);
        }
        var elapsedEl = meta.querySelector('.ba-job-elapsed');
        if (elapsedEl && elapsedEl.getAttribute('data-source') !== elapsed) {
            elapsedEl.textContent = elapsed;
            elapsedEl.setAttribute('data-source', elapsed);
        }
        var detailEl = meta.querySelector('.ba-job-detail');
        var staleEl = meta.querySelector('.ba-job-stale');
        var detail = job.detail || '';
        if (detailEl.getAttribute('data-source') !== detail) {
            detailEl.textContent = detail;
            detailEl.setAttribute('data-source', detail);
        }
        if (staleEl.getAttribute('data-source') !== stale) {
            staleEl.textContent = stale;
            staleEl.setAttribute('data-source', stale);
        }
        meta.classList.toggle('ba-job-meta-warn', silent >= STALE_WARN_MS);
    }

    function paintItem(item, job) {
        var wrap = item.querySelector('.ba-notif-progress-wrap');
        if (!wrap) return false;
        var bar = wrap.querySelector('.ba-notif-progress-bar');
        var pctEl = wrap.querySelector('.ba-notif-progress-pct');
        var rendered = bar ? (parseFloat(bar.style.width) || 0) : 0;
        if (rendered > job.pct) job.pct = Math.round(rendered);
        wrap.classList.add('ba-job-live');
        if (bar) setWidth(bar, job.shown == null ? rendered : job.shown, job.pct);
        job.shown = job.pct;
        if (pctEl) writeLabel(pctEl, job.pct, job.message ? phaseLabel(job) : null);
        writeMeta(wrap, job);
        return true;
    }

    function finishItem(item, job) {
        if (job.finished || job.shown == null || job.shown >= 100) { job.finished = true; return; }
        job.finished = true;
        var track = document.createElement('div');
        track.className = 'ba-job-finish';
        var fill = document.createElement('div');
        fill.style.width = job.shown + '%';
        track.appendChild(fill);
        item.appendChild(track);
        void fill.offsetWidth;
        fill.style.width = '100%';
        setTimeout(function() { if (track.parentNode) track.parentNode.removeChild(track); }, 1100);
    }

    function itemsOf(id) {
        return document.querySelectorAll('.ba-notif-item[data-job-id="' + id + '"]');
    }

    function paintOverlay(job) {
        var fill = document.getElementById('hrJobOverlayFill');
        if (!fill) return;
        var overlay = document.getElementById('hrJobOverlay');
        if (!overlay || !overlay.classList.contains('show')) return;
        if (!/^HRHelper/.test(job.jobType || '')) return;
        fill.style.width = job.pct + '%';
        var meta = document.getElementById('hrJobOverlayMeta');
        if (meta) {
            var text = [elapsedText(job), job.detail || ''].filter(Boolean).join(' · ');
            if (meta.getAttribute('data-source') !== text) {
                meta.textContent = text;
                meta.setAttribute('data-source', text);
            }
        }
    }

    function requestReload() {
        if (reloadTimer || typeof global.loadRestoreJobsPanel !== 'function') return;
        var wait = Math.max(0, RELOAD_GAP_MS - (Date.now() - reloadAt));
        reloadTimer = setTimeout(function() {
            reloadTimer = null;
            reloadAt = Date.now();
            try { global.loadRestoreJobsPanel(); } catch (e) { }
        }, wait);
    }

    function onProgress(p) {
        if (!p || !p.id) return;
        var job = entry(p.id);
        lastPushAt = Date.now();
        job.beat = lastPushAt;
        job.finished = false;
        if (p.jobType) job.jobType = p.jobType;
        var percent = parseInt(p.percent, 10);
        if (!isNaN(percent) && percent > job.pct) job.pct = Math.min(99, percent);
        if (p.message) job.message = p.message;
        job.detail = p.detail || null;
        if (p.elapsed != null && !isNaN(parseInt(p.elapsed, 10))) { job.baseElapsed = parseInt(p.elapsed, 10) * 1000; job.baseAt = Date.now(); }
        overlayJob = job;
        var items = itemsOf(p.id);
        var painted = false;
        for (var i = 0; i < items.length; i++) painted = paintItem(items[i], job) || painted;
        paintOverlay(job);
        if (!painted) requestReload();
        startTicker();
    }

    function sync() {
        var items = document.querySelectorAll('.ba-notif-item[data-job-id]');
        for (var i = 0; i < items.length; i++) {
            var id = items[i].getAttribute('data-job-id');
            if (!id) continue;
            var hasBar = !!items[i].querySelector('.ba-notif-progress-wrap');
            if (hasBar) {
                var job = entry(id);
                if (!job.jobType) job.jobType = items[i].getAttribute('data-job-type') || null;
                paintItem(items[i], job);
            } else if (jobs[id]) {
                finishItem(items[i], jobs[id]);
            }
        }
        startTicker();
    }

    function tick() {
        var live = 0;
        var now = Date.now();
        var silent = false;
        var wraps = document.querySelectorAll('.ba-notif-item[data-job-id] .ba-notif-progress-wrap');
        for (var i = 0; i < wraps.length; i++) {
            var item = wraps[i].closest ? wraps[i].closest('.ba-notif-item') : null;
            var id = item ? item.getAttribute('data-job-id') : null;
            if (!id || !jobs[id]) continue;
            live++;
            if (now - (jobs[id].beat || jobs[id].seen) >= SILENT_RELOAD_MS) silent = true;
            writeMeta(wraps[i], jobs[id]);
        }
        if (silent && now - reloadAt >= SILENT_RELOAD_GAP_MS) requestReload();
        if (overlayJob) {
            var overlay = document.getElementById('hrJobOverlay');
            if (overlay && overlay.classList.contains('show')) { live++; paintOverlay(overlayJob); }
            else overlayJob = null;
        }
        if (!live && ticker) { clearInterval(ticker); ticker = null; }
    }

    function startTicker() {
        if (!ticker) ticker = setInterval(tick, 1000);
    }

    function init() {
        var list = document.getElementById('restoreJobsList');
        if (list && typeof MutationObserver !== 'undefined' && !observer) {
            observer = new MutationObserver(function() { sync(); });
            observer.observe(list, { childList: true });
        }
        if (global.BA_SignalR && typeof global.BA_SignalR.onJobProgress === 'function')
            global.BA_SignalR.onJobProgress(onProgress);
        sync();
    }

    global.BaJobProgress = {
        apply: onProgress,
        sync: sync,
        isLive: function() { return Date.now() - lastPushAt < LIVE_WINDOW_MS; },
        label: function(el, percent, label) { if (el) writeLabel(el, Math.max(0, Math.min(100, parseInt(percent, 10) || 0)), label == null ? null : String(label)); }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : this);
