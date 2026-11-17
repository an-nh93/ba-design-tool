/* ============================================================================
 * builder-autolayout.js
 * Khối "tự xếp" cho UI Builder: group box, section, popup, ESS section có thể bật
 * auto-layout. Khi đó vị trí các control con do tool tính lại sau MỌI thay đổi
 * (thả thêm, kéo đổi chỗ, xóa/cắt, đổi kích thước):
 *
 *   - flow : xếp ngang, hết chỗ thì xuống hàng (dùng cho các thẻ / chip).
 *   - stack: xếp dọc từ trên xuống (dùng cho các dòng form, các section).
 *
 * Thứ tự được suy ra từ vị trí HIỆN TẠI của control, nên BA thả một control vào
 * giữa hai control khác thì nó nằm đúng giữa, các control sau dồn theo. Cắt/xóa
 * thì khoảng trống tự khép lại. Khối đổi chiều cao thì các khối nằm bên dưới
 * (cùng cha) tự dịch xuống/lên theo.
 *
 * Dữ liệu vẫn là left/top/width/height như cũ (tool chỉ tính lại và ghi vào),
 * nên lưu DB, preview, xuất ảnh, Word không cần đổi. Bản vẽ cũ không có
 * cfg.autoLayout thì hoàn toàn không bị ảnh hưởng.
 *
 * cfg.autoLayout = { mode: "flow"|"stack", gap: 8, pad: 8, autoHeight: true }
 * ==========================================================================*/
(function (window, $) {
    "use strict";

    var api = {};
    var DEFAULTS = { gap: 8, pad: 8, autoHeight: true };
    var busy = false;

    // ------------------------------------------------------------- helpers
    function ctrls() { return (window.builder && builder.controls) || []; }
    function byId(id) { return builder.getControlConfig(id); }

    function isContainerCfg(c) {
        return !!c && ((c.type === "field" && (c.ftype === "groupbox" || c.ftype === "section")) ||
            c.type === "popup" || c.type === "collapsible-section");
    }

    function $outer(cfg) {
        var $o = $('#canvas-zoom-inner [data-id="' + cfg.id + '"]');
        if (cfg.type === "popup") { var $p = $o.filter(".popup-design"); if ($p.length) return $p.first(); }
        return $o.first();
    }

    function $content($el, cfg) {
        if (cfg.type === "popup") return $el.find(".popup-body").first();
        if (cfg.type === "collapsible-section") return $el.find(".ess-collapsible-content").first();
        return $el.find(".page-field-groupbox-content, .page-field-section-content").first();
    }

    function depth(cfg) {
        var d = 0, cur = cfg, guard = 50;
        while (cur && cur.parentId && guard-- > 0) { cur = byId(cur.parentId); d++; }
        return d;
    }

    function opts(cfg) {
        var a = cfg.autoLayout || {};
        return {
            mode: (a.mode === "stack" || a.mode === "rows") ? a.mode : "flow",
            gap: a.gap != null ? a.gap : DEFAULTS.gap,
            pad: a.pad != null ? a.pad : DEFAULTS.pad,
            autoHeight: a.autoHeight !== false
        };
    }

    function sizeOf(c) {
        var $d = $('#canvas-zoom-inner [data-id="' + c.id + '"]').first();
        return {
            w: c.width || ($d.length ? $d[0].offsetWidth : 0) || 0,
            h: c.height || ($d.length ? $d[0].offsetHeight : 0) || 0
        };
    }

    function setPos(c, left, top) {
        var changed = (c.left !== left) || (c.top !== top);
        c.left = left; c.top = top;
        if (changed) $('#canvas-zoom-inner [data-id="' + c.id + '"]').first().css({ left: left + "px", top: top + "px" });
        return changed;
    }

    // ------------------------------------------------------------ ordering
    // Gom control thành các hàng theo độ chồng lấn dọc, mỗi hàng sắp theo left.
    function clusterRows(items) {
        var list = items.slice().sort(function (a, b) { return (a.c.top || 0) - (b.c.top || 0) || (a.c.left || 0) - (b.c.left || 0); });
        var rows = [];
        list.forEach(function (it) {
            var top = it.c.top || 0, h = it.s.h || 1, bottom = top + h;
            var row = null;
            for (var i = rows.length - 1; i >= 0; i--) {
                var r = rows[i];
                var overlap = Math.min(bottom, r.bottom) - Math.max(top, r.top);
                if (overlap >= 0.5 * Math.min(h, r.bottom - r.top)) { row = r; break; }
            }
            if (!row) { row = { top: top, bottom: bottom, items: [] }; rows.push(row); }
            row.items.push(it);
            row.top = Math.min(row.top, top); row.bottom = Math.max(row.bottom, bottom);
        });
        rows.sort(function (a, b) { return a.top - b.top; });
        rows.forEach(function (r) { r.items.sort(function (a, b) { return (a.c.left || 0) - (b.c.left || 0); }); });
        return rows;
    }

    function orderFlow(items) {
        var out = [];
        clusterRows(items).forEach(function (r) { out = out.concat(r.items); });
        return out;
    }

    function orderStack(items) {
        return items.slice().sort(function (a, b) { return (a.c.top || 0) - (b.c.top || 0) || (a.c.left || 0) - (b.c.left || 0); });
    }

    // ------------------------------------------------------------ layout 1 khối
    // Trả về { changed, deltaH, oldH, newH, oldTop }
    function layoutContainer(cfg) {
        var $el = $outer(cfg);
        if (!$el.length) return null;
        var $c = $content($el, cfg);
        if (!$c.length || !$c.is(":visible")) return null;

        var o = opts(cfg);
        var kids = ctrls().filter(function (c) { return c.parentId === cfg.id; });
        var items = kids.map(function (c) { return { c: c, s: sizeOf(c) }; });
        var ordered = o.mode === "stack" ? orderStack(items) : orderFlow(items);
        // Ô rất cao so với mặt bằng chung (avatar, ảnh lớn) sẽ "bắc cầu" gộp nhiều hàng thành 1 cụm → tách riêng, chỉ đi theo hàng gần nó nhất.
        var tall = [];
        if (o.mode === "rows" && items.length > 3) {
            var hs = items.map(function (i) { return i.s.h; }).sort(function (a, b) { return a - b; });
            var med = hs[hs.length >> 1] || 0;
            tall = items.filter(function (i) { return i.s.h >= 45 && i.s.h >= 2.5 * med; });
        }
        var rowsList = o.mode === "rows" ? clusterRows(items.filter(function (i) { return tall.indexOf(i) < 0; })) : null;
        var rowMoves = [];

        var contentW = $c[0].clientWidth || 0;
        var changed = false;
        var x = o.pad, y = o.pad, rowH = 0, maxBottom = o.pad;

        if (rowsList) {
            // Hàng đầu giữ nguyên độ lệch so với ô cao nhất/trên cùng (vd avatar nhô lên trên hàng đầu)
            if (rowsList.length) {
                var minAll = Infinity;
                items.forEach(function (i) { minAll = Math.min(minAll, i.c.top || 0); });
                // nội dung bắt đầu sát mép (≤ pad+3, kể cả -1px do lề lát ảnh) thì giữ nguyên; bắt đầu xa hơn (vừa xoá hàng đầu) thì khép về pad
                y = (minAll <= o.pad + 3 ? minAll : o.pad) + Math.max(0, rowsList[0].top - minAll);
            }
            // Giữ cột (left) như ảnh gốc, chỉ dồn theo chiều dọc. Khoảng cách giữa các hàng được NHỚ lại (gapMem) để lần đầu xếp không làm ảnh "nhảy";
            // hàng bị xoá thì khoảng cách của nó biến mất nên khe trống tự khép lại, hàng mới chèn vào dùng gap mặc định.
            var mem = (cfg.autoLayout && cfg.autoLayout.gapMem) || {};
            var newMem = {};
            var infos = rowsList.map(function (r) {
                // Ô bị đè ngang với ô bên trái (chồng lấn thật >3px) → không đẩy sang phải mà tách xuống hàng riêng ngay dưới, giữ cột.
                // Chỉ tách khi đã có "trí nhớ" (không phải lần xếp đầu) và ô đó/ô bị đè là ô MỚI (chưa có trong trí nhớ): ô đã đè sẵn từ ảnh gốc thì giữ nguyên.
                var keep = [], spill = [], pr = -Infinity, prevIt = null, hasMem = Object.keys(mem).length > 0;
                r.items.forEach(function (it) {
                    var l = Math.max(it.c.left || 0, o.pad);
                    if (hasMem && pr > -Infinity && l < pr - 3 && (mem[it.c.id] == null || (prevIt && mem[prevIt.c.id] == null))) spill.push(it);
                    else { keep.push(it); pr = Math.max(pr, l + it.s.w); prevIt = it; }
                });
                var rTop = Infinity, rBot = -Infinity;
                keep.forEach(function (it) { rTop = Math.min(rTop, it.c.top || 0); rBot = Math.max(rBot, (it.c.top || 0) + it.s.h); });
                return { r: r, keep: keep, spill: spill, rTop: rTop, rBot: rBot };
            });
            infos.forEach(function (inf, idx) {
                var next = infos[idx + 1];
                var g = null;
                inf.r.items.forEach(function (it) { if (g === null && mem[it.c.id] != null) g = mem[it.c.id]; });
                if (g === null) g = next ? next.rTop - inf.rBot : o.gap;   // lần đầu: giữ đúng khoảng cách hiện có (kể cả hàng so le chồng nhẹ)
                inf.keep.forEach(function (it) {
                    changed = setPos(it.c, Math.max(it.c.left || 0, o.pad), y + ((it.c.top || 0) - inf.rTop)) || changed;   // giữ lệch dọc trong hàng
                });
                rowMoves.push({ oldTop: inf.rTop, delta: y - inf.rTop });
                y += (inf.rBot - inf.rTop);
                inf.spill.forEach(function (it) {
                    y += o.gap;
                    changed = setPos(it.c, Math.max(it.c.left || 0, o.pad), y) || changed;
                    y += it.s.h;
                });
                maxBottom = Math.max(maxBottom, y);
                inf.r.items.forEach(function (it) { newMem[it.c.id] = g; });
                y += g;
            });
            if (cfg.autoLayout) {
                var same = JSON.stringify(mem) === JSON.stringify(newMem);
                if (!same) { cfg.autoLayout.gapMem = newMem; changed = true; }
            }
            tall.forEach(function (it) {
                var t0 = it.c.top || 0, best = null;
                rowMoves.forEach(function (rm) {
                    if (!best || Math.abs(rm.oldTop - t0) < Math.abs(best.oldTop - t0)) best = rm;
                });
                var nt = best ? t0 + best.delta : t0;
                changed = setPos(it.c, Math.max(it.c.left || 0, o.pad), nt) || changed;
                maxBottom = Math.max(maxBottom, nt + it.s.h);
            });
        } else ordered.forEach(function (it) {
            var w = it.s.w, h = it.s.h;
            if (o.mode === "stack") {
                changed = setPos(it.c, o.pad, y) || changed;
                y += h + o.gap;
                maxBottom = Math.max(maxBottom, y - o.gap);
            } else {
                if (x > o.pad && contentW && x + w > contentW - o.pad) { x = o.pad; y += rowH + o.gap; rowH = 0; }
                changed = setPos(it.c, x, y) || changed;
                x += w + o.gap;
                rowH = Math.max(rowH, h);
                maxBottom = Math.max(maxBottom, y + rowH);
            }
        });

        var res = { changed: changed, deltaH: 0, oldH: $el[0].offsetHeight, newH: $el[0].offsetHeight, oldTop: cfg.top || 0 };
        // Ô cuối cùng luôn cách đáy khối đúng "pad" + phần viền/đệm của khung. Công thức đo theo
        // vị trí thật của vùng content (không dùng chiều cao content vì nó có min-height, không co giãn).
        var canGrow = o.autoHeight && ordered.length && cfg.type !== "collapsible-section";
        if (canGrow) {
            var newH;
            if (cfg.type === "popup") {
                newH = Math.max(180, Math.round(maxBottom + o.pad + ($el[0].offsetHeight - $c[0].clientHeight)));
            } else {
                var os = window.getComputedStyle($el[0]);
                var topInset = ($el[0].clientTop || 0) + $c[0].offsetTop;
                var bottomInset = (parseFloat(os.paddingBottom) || 0) + (parseFloat(os.borderBottomWidth) || 0);
                newH = Math.max(cfg.bare ? 1 : 40, Math.round(topInset + maxBottom + o.pad + bottomInset));
            }
            if (Math.abs(newH - res.oldH) >= 1) {
                cfg.height = newH;
                $el.css("height", newH + "px");
                res.newH = newH; res.deltaH = newH - res.oldH; res.changed = true;
            }
        }
        return res;
    }

    // Khối đổi cao → đẩy các khối anh em nằm bên dưới (cùng cha, không phải khối tự xếp)
    function pushSiblings(cfg, oldH, deltaH) {
        if (!deltaH) return;
        var parent = cfg.parentId ? byId(cfg.parentId) : null;
        if (parent && parent.autoLayout) return;              // cha tự xếp sẽ tự dồn
        var oldBottom = (cfg.top || 0) + oldH;
        var l1 = cfg.left || 0, r1 = l1 + (cfg.width || 0);
        ctrls().forEach(function (s) {
            if (s.id === cfg.id || (s.parentId || null) !== (cfg.parentId || null)) return;
            if (s.type === "popup") return;                    // popup là lớp phủ, không dồn
            if ((s.top || 0) < oldBottom - 1) return;
            var l2 = s.left || 0, r2 = l2 + (s.width || 0);
            if (Math.min(r1, r2) - Math.max(l1, l2) <= 0) return;
            setPos(s, s.left || 0, (s.top || 0) + deltaH);
        });
    }

    // ------------------------------------------------------------------ run
    // Chạy cho mọi khối bật auto-layout, khối sâu nhất trước. Idempotent.
    api.run = function () {
        if (busy || !window.builder) return false;
        var list = ctrls().filter(function (c) { return isContainerCfg(c) && c.autoLayout; });
        if (!list.length) { markBadges(); return false; }
        busy = true;
        var any = false;
        try {
            list.sort(function (a, b) { return depth(b) - depth(a); });
            list.forEach(function (cfg) {
                var r = layoutContainer(cfg);
                if (!r) return;
                any = any || r.changed;
                if (r.deltaH) pushSiblings(cfg, r.oldH, r.deltaH);
            });
            // Đẩy khối anh em có thể làm khối tự xếp khác đổi vị trí (không đổi nội dung) → không cần chạy lại.
        } finally { busy = false; }
        markBadges();
        return any;
    };

    function markBadges() {
        $("#canvas-zoom-inner [data-autolayout]").removeAttr("data-autolayout");
        ctrls().forEach(function (c) {
            if (isContainerCfg(c) && c.autoLayout) $outer(c).attr("data-autolayout", opts(c).mode);
        });
    }

    // ------------------------------------------------------------- bật / tắt
    api.getSelectedContainer = function () {
        var ids = window.builderSnippet ? builderSnippet.getSelectionIds() : [builder.selectedControlId];
        var cfg = ids.length ? byId(ids[0]) : null;
        return isContainerCfg(cfg) ? cfg : null;
    };

    api.setMode = function (mode, cfg) {
        cfg = cfg || api.getSelectedContainer();
        if (!cfg) {
            if (builder.showToast) builder.showToast("Chọn một group box, section, popup hoặc ESS section để bật tự xếp.", "info");
            return;
        }
        if (mode === "off") {
            delete cfg.autoLayout;
        } else {
            cfg.autoLayout = $.extend({}, DEFAULTS, cfg.autoLayout || {}, { mode: mode });
        }
        builder.refreshJson();      // wrapper bên dưới sẽ chạy layout rồi ghi history
        if (builder.showToast) {
            builder.showToast(mode === "off" ? "Đã tắt tự xếp." : (mode === "stack" ? "Đã bật xếp dọc." : mode === "rows" ? "Đã bật xếp theo hàng (giữ cột, dồn dọc)." : "Đã bật xếp ngang (tự xuống hàng)."), "success");
        }
    };

    // ------------------------------------------------------------------ init
    function injectCss() {
        if (document.getElementById("builderAutoLayoutCss")) return;
        var css =
            '[data-autolayout]{outline:1px dashed #16a34a;outline-offset:-1px}' +
            '.page-field-groupbox-bare[data-autolayout]{outline:none}' +
            '.page-field-groupbox-bare[data-autolayout]:hover{outline:1px dotted rgba(22,163,74,.6)}' +
            '.page-field-groupbox-bare[data-autolayout]::after{display:none}' +
            '[data-autolayout]::after{position:absolute;right:4px;top:2px;font:600 10px/14px Segoe UI,Arial,sans-serif;color:#fff;background:#16a34a;padding:0 5px;border-radius:2px;pointer-events:none;z-index:5}' +
            '[data-autolayout="flow"]::after{content:"⇆ tự xếp ngang"}' +
            '[data-autolayout="stack"]::after{content:"⇅ tự xếp dọc"}' +
            '[data-autolayout="rows"]::after{content:"☰ tự xếp theo hàng"}';
        $('<style id="builderAutoLayoutCss"></style>').text(css).appendTo("head");
    }

    $(function () {
        if (!window.builder) return;
        injectCss();

        // Chạy layout trước mỗi lần ghi JSON/history: mọi thao tác (thả, kéo, xóa, undo) đều đi qua đây.
        var orig = builder.refreshJson;
        builder.refreshJson = function () {
            try { api.run(); } catch (e) { if (window.console) console.error("autolayout:", e); }
            return orig.apply(this, arguments);
        };
    });

    window.builderAutoLayout = api;
})(window, jQuery);
