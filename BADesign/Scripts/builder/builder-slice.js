/* ============================================================================
 * builder-slice.js
 * Cắt một ảnh chụp màn hình (ESS Image đã dán vào canvas) thành nhiều "lát".
 * Mỗi lát là một ESS Image độc lập (cắt thật bằng canvas, lưu base64), nên
 * kéo thả, đưa vào popup/group, lưu DB, preview, xuất ảnh như control thường.
 *
 * Hai công cụ trong cửa sổ cắt:
 *   - Cắt: vẽ khung → mỗi khung thành một lát.
 *   - Che: vẽ khung → tô đè bằng màu nền xung quanh (xóa control cũ khỏi ảnh)
 *     trước khi cắt. Sau đó BA đặt control thật đè lên chỗ trống.
 *
 * Chạy hoàn toàn offline, không cần thư viện ngoài.
 * Mở bằng chuột phải lên ảnh → "Cắt ảnh thành lát…".
 * ==========================================================================*/
(function (window, $) {
    "use strict";

    var slice = {};
    var MIN_SIZE = 4;
    var ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4];
    var st = null;   // state của phiên đang mở

    function toast(msg, type) { if (window.builder && builder.showToast) builder.showToast(msg, type || "info"); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // ----------------------------------------------------------------- entry
    slice.openForSelection = function () {
        var ids = (window.builderSnippet ? builderSnippet.getSelectionIds() : [builder.selectedControlId]).filter(Boolean);
        var cfg = ids.length === 1 ? builder.getControlConfig(ids[0]) : null;
        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image" || !cfg.imageData) {
            toast("Hãy chọn 1 ảnh (ESS Image) đã có ảnh. Dán ảnh chụp bằng Ctrl+V rồi chọn nó.", "info");
            return;
        }
        slice.open(cfg);
    };

    slice.open = function (cfg) {
        if (st) return;
        var img = new Image();
        img.onload = function () { build(cfg, img); };
        img.onerror = function () { toast("Không đọc được ảnh.", "error"); };
        img.src = cfg.imageData;
    };

    // ------------------------------------------------------------------- UI
    function build(cfg, img) {
        var natW = img.naturalWidth, natH = img.naturalHeight;
        st = { cfg: cfg, img: img, natW: natW, natH: natH, zoom: 1, tool: "cut", cuts: [], masks: [], sel: null, drag: null };

        var html =
            '<div class="sl-backdrop">' +
            '  <div class="sl-bar">' +
            '    <span class="sl-title">Cắt ảnh (' + natW + '×' + natH + ')</span>' +
            '    <button type="button" class="sl-tool sl-on" data-tool="cut" title="Vẽ khung để cắt thành lát">✂ Cắt</button>' +
            '    <button type="button" class="sl-tool" data-tool="mask" title="Vẽ khung để xóa vùng (tô màu nền)">▧ Che vùng</button>' +
            '    <span class="sl-sep"></span>' +
            '    <button type="button" data-act="zoom-out">−</button>' +
            '    <span class="sl-zoom">100%</span>' +
            '    <button type="button" data-act="zoom-in">+</button>' +
            '    <button type="button" data-act="zoom-fit">Vừa khít</button>' +
            '    <span class="sl-sep"></span>' +
            '    <button type="button" data-act="del" title="Xóa khung đang chọn (Delete)">Xóa khung</button>' +
            '    <button type="button" data-act="clear">Xóa hết</button>' +
            '    <span class="sl-sep"></span>' +
            '    <label>Tỉ lệ trên canvas <select class="sl-scale"><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select></label>' +
            '    <label><input type="checkbox" class="sl-keep" /> Giữ ảnh gốc</label>' +
            '    <span class="sl-grow"></span>' +
            '    <span class="sl-count"></span>' +
            '    <button type="button" class="sl-primary" data-act="apply">Áp dụng</button>' +
            '    <button type="button" data-act="cancel">Hủy (Esc)</button>' +
            '  </div>' +
            '  <div class="sl-hint">Kéo chuột trên ảnh để vẽ khung. Kéo khung để di chuyển, kéo góc phải-dưới để đổi cỡ, phím mũi tên chỉnh 1px (Shift = 10px).</div>' +
            '  <div class="sl-scroll"><div class="sl-stage"><img class="sl-img" draggable="false" /></div></div>' +
            '</div>';

        st.$root = $(html).appendTo(document.body);
        st.$stage = st.$root.find(".sl-stage");
        st.$stage.find("img").attr("src", cfg.imageData);
        st.$scroll = st.$root.find(".sl-scroll");

        // vừa khít lần đầu
        var availW = window.innerWidth - 60, availH = window.innerHeight - 130;
        setZoom(Math.min(1, availW / natW, availH / natH));

        bind();
        redraw();
    }

    function setZoom(z) {
        st.zoom = clamp(z, 0.1, 4);
        st.$stage.css({ width: st.natW * st.zoom, height: st.natH * st.zoom });
        st.$stage.find("img").css({ width: "100%", height: "100%" });
        st.$root.find(".sl-zoom").text(Math.round(st.zoom * 100) + "%");
        redraw();
    }

    function stepZoom(dir) {
        var z = st.zoom, i;
        if (dir > 0) { for (i = 0; i < ZOOMS.length; i++) if (ZOOMS[i] > z + 0.001) { setZoom(ZOOMS[i]); return; } }
        else { for (i = ZOOMS.length - 1; i >= 0; i--) if (ZOOMS[i] < z - 0.001) { setZoom(ZOOMS[i]); return; } }
    }

    function listOf(kind) { return kind === "mask" ? st.masks : st.cuts; }

    function redraw() {
        if (!st) return;
        st.$stage.find(".sl-rect").remove();
        [["mask", st.masks], ["cut", st.cuts]].forEach(function (pair) {
            var kind = pair[0];
            pair[1].forEach(function (r, i) {
                var sel = st.sel && st.sel.kind === kind && st.sel.idx === i;
                var $r = $('<div class="sl-rect"></div>')
                    .addClass(kind === "mask" ? "sl-mask" : "sl-cut")
                    .toggleClass("sl-sel", !!sel)
                    .attr({ "data-kind": kind, "data-idx": i })
                    .css({ left: r.x * st.zoom, top: r.y * st.zoom, width: r.w * st.zoom, height: r.h * st.zoom });
                $r.append($('<span class="sl-tag"></span>').text(kind === "mask" ? "che" : (i + 1) + " · " + r.w + "×" + r.h));
                if (sel) $r.append('<span class="sl-handle"></span>');
                st.$stage.append($r);
            });
        });
        st.$root.find(".sl-count").text(st.cuts.length + " lát, " + st.masks.length + " vùng che");
    }

    // ---------------------------------------------------------------- events
    function pt(e) {
        var r = st.$stage[0].getBoundingClientRect();
        return { x: clamp((e.clientX - r.left) / st.zoom, 0, st.natW), y: clamp((e.clientY - r.top) / st.zoom, 0, st.natH) };
    }

    function bind() {
        var $root = st.$root;

        $root.on("click", ".sl-tool", function () {
            st.tool = $(this).attr("data-tool");
            $root.find(".sl-tool").removeClass("sl-on");
            $(this).addClass("sl-on");
        });

        $root.on("click", "[data-act]", function () {
            var a = $(this).attr("data-act");
            if (a === "zoom-in") stepZoom(1);
            else if (a === "zoom-out") stepZoom(-1);
            else if (a === "zoom-fit") setZoom(Math.min(1, (window.innerWidth - 60) / st.natW, (window.innerHeight - 130) / st.natH));
            else if (a === "del") removeSelected();
            else if (a === "clear") { st.cuts = []; st.masks = []; st.sel = null; redraw(); }
            else if (a === "apply") apply();
            else if (a === "cancel") close();
        });

        st.$stage.on("mousedown", function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            var p = pt(e);
            var $t = $(e.target);

            if ($t.hasClass("sl-handle")) {
                var $r = $t.closest(".sl-rect");
                st.drag = { mode: "resize", kind: $r.attr("data-kind"), idx: +$r.attr("data-idx") };
                return;
            }
            var $rect = $t.closest(".sl-rect");
            if ($rect.length) {
                var kind = $rect.attr("data-kind"), idx = +$rect.attr("data-idx"), r0 = listOf(kind)[idx];
                st.sel = { kind: kind, idx: idx };
                st.drag = { mode: "move", kind: kind, idx: idx, ox: p.x - r0.x, oy: p.y - r0.y };
                redraw();
                return;
            }
            // vẽ mới
            var list = listOf(st.tool);
            list.push({ x: p.x, y: p.y, w: 0, h: 0 });
            st.sel = { kind: st.tool, idx: list.length - 1 };
            st.drag = { mode: "draw", kind: st.tool, idx: list.length - 1, sx: p.x, sy: p.y };
            redraw();
        });

        $(document).on("mousemove.slice", function (e) {
            if (!st || !st.drag) return;
            var d = st.drag, r = listOf(d.kind)[d.idx];
            if (!r) return;
            var p = pt(e);
            if (d.mode === "draw") {
                r.x = Math.min(d.sx, p.x); r.y = Math.min(d.sy, p.y);
                r.w = Math.abs(p.x - d.sx); r.h = Math.abs(p.y - d.sy);
            } else if (d.mode === "move") {
                r.x = clamp(p.x - d.ox, 0, st.natW - r.w);
                r.y = clamp(p.y - d.oy, 0, st.natH - r.h);
            } else if (d.mode === "resize") {
                r.w = clamp(p.x - r.x, MIN_SIZE, st.natW - r.x);
                r.h = clamp(p.y - r.y, MIN_SIZE, st.natH - r.y);
            }
            redraw();
        });

        $(document).on("mouseup.slice", function () {
            if (!st || !st.drag) return;
            var d = st.drag, list = listOf(d.kind), r = list[d.idx];
            st.drag = null;
            if (r) {
                r.x = Math.round(r.x); r.y = Math.round(r.y); r.w = Math.round(r.w); r.h = Math.round(r.h);
                if (r.w < MIN_SIZE || r.h < MIN_SIZE) { list.splice(d.idx, 1); st.sel = null; }
            }
            redraw();
        });

        // Bắt phím ở capture phase để phím Delete/mũi tên không lọt xuống Builder phía sau
        st.keyHandler = function (e) {
            if (!st) return;
            e.stopPropagation();
            if (e.key === "Escape") { e.preventDefault(); close(); return; }
            if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSelected(); return; }
            if (st.sel && /^Arrow/.test(e.key)) {
                e.preventDefault();
                var r = listOf(st.sel.kind)[st.sel.idx]; if (!r) return;
                var step = e.shiftKey ? 10 : 1;
                if (e.key === "ArrowLeft") r.x = clamp(r.x - step, 0, st.natW - r.w);
                if (e.key === "ArrowRight") r.x = clamp(r.x + step, 0, st.natW - r.w);
                if (e.key === "ArrowUp") r.y = clamp(r.y - step, 0, st.natH - r.h);
                if (e.key === "ArrowDown") r.y = clamp(r.y + step, 0, st.natH - r.h);
                redraw();
            }
        };
        document.addEventListener("keydown", st.keyHandler, true);
    }

    function removeSelected() {
        if (!st.sel) return;
        listOf(st.sel.kind).splice(st.sel.idx, 1);
        st.sel = null;
        redraw();
    }

    function close() {
        if (!st) return;
        document.removeEventListener("keydown", st.keyHandler, true);
        $(document).off(".slice");
        st.$root.remove();
        st = null;
    }

    // ----------------------------------------------------------------- apply
    // Màu nền xung quanh vùng che: lấy màu xuất hiện nhiều nhất trên đường viền 1px bên ngoài khung.
    function sampleBackground(ctx, m, W, H) {
        var counts = {}, best = null, bestN = 0;
        function add(x, y, w, h) {
            x = clamp(x, 0, W - 1); y = clamp(y, 0, H - 1);
            w = clamp(w, 1, W - x); h = clamp(h, 1, H - y);
            var d = ctx.getImageData(x, y, w, h).data;
            for (var i = 0; i < d.length; i += 4) {
                var k = d[i] + "," + d[i + 1] + "," + d[i + 2];
                var n = (counts[k] = (counts[k] || 0) + 1);
                if (n > bestN) { bestN = n; best = k; }
            }
        }
        if (m.y > 0) add(m.x, m.y - 1, m.w, 1);
        if (m.y + m.h < H) add(m.x, m.y + m.h, m.w, 1);
        if (m.x > 0) add(m.x - 1, m.y, 1, m.h);
        if (m.x + m.w < W) add(m.x + m.w, m.y, 1, m.h);
        return best ? "rgb(" + best + ")" : "#ffffff";
    }

    function apply() {
        if (!st.cuts.length) { toast("Chưa có lát nào. Chọn công cụ Cắt và kéo khung trên ảnh.", "info"); return; }

        var scale = parseFloat(st.$root.find(".sl-scale").val()) || 1;
        var keep = st.$root.find(".sl-keep").is(":checked");
        var src = st.cfg, W = st.natW, H = st.natH;

        var base = document.createElement("canvas");
        base.width = W; base.height = H;
        var ctx = base.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(st.img, 0, 0);

        try {
            st.masks.forEach(function (m) {
                ctx.fillStyle = sampleBackground(ctx, m, W, H);
                ctx.fillRect(m.x, m.y, m.w, m.h);
            });
        } catch (ex) {
            toast("Không đọc được điểm ảnh để che vùng: " + ex.message, "error");
            return;
        }

        var used = {};
        (builder.controls || []).forEach(function (c) { used[c.id] = true; });
        var made = [];

        st.cuts.forEach(function (r, i) {
            var c = document.createElement("canvas");
            c.width = r.w; c.height = r.h;
            c.getContext("2d").drawImage(base, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);

            var nc = JSON.parse(JSON.stringify(src));
            Object.keys(nc).forEach(function (k) { if (k.charAt(0) === "_") delete nc[k]; });
            delete nc.controlDbId; delete nc.groupId; delete nc.groupOffsetX; delete nc.groupOffsetY;

            var id;
            do { id = "fld_image_" + Date.now() + "_" + i + "_" + Math.random().toString(36).substr(2, 5); } while (used[id]);
            used[id] = true;

            nc.id = id;
            nc.imageData = c.toDataURL("image/png");
            nc.imageMode = "stretch";
            nc.caption = "";
            nc.left = Math.round((src.left || 0) + r.x * scale);
            nc.top = Math.round((src.top || 0) + r.y * scale);
            nc.width = Math.max(1, Math.round(r.w * scale));
            nc.height = Math.max(1, Math.round(r.h * scale));
            made.push(nc);
        });

        // Bỏ ảnh gốc (nếu không giữ) rồi dựng các lát – gộp một bước Undo
        if (!keep) {
            var idx = builder.controls.findIndex(function (c) { return c.id === src.id; });
            if (idx >= 0) builder.controls.splice(idx, 1);
            $('[data-id="' + src.id + '"]').remove();
        }

        made.forEach(function (nc) {
            nc._fromRestore = true;
            builder.renderControlByConfig(nc);
            delete nc._fromRestore;
            builder.controls.push(nc);
        });

        builder.clearSelection && builder.clearSelection();
        builder.refreshJson();
        if (window.builderSnippet) builderSnippet.selectIds(made.map(function (c) { return c.id; }));

        var n = made.length;
        close();
        toast("Đã tạo " + n + " lát" + (keep ? "" : " (đã bỏ ảnh gốc, Ctrl+Z để hoàn tác)") + ".", "success");
    }

    // ------------------------------------------------------------------ CSS
    function injectCss() {
        if (document.getElementById("builderSliceCss")) return;
        var css =
            '.sl-backdrop{position:fixed;inset:0;z-index:20000;background:rgba(30,30,30,.92);display:flex;flex-direction:column;font:12px/1.4 Segoe UI,Arial,sans-serif;color:#fff}' +
            '.sl-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;background:#1f2a37}' +
            '.sl-bar button{background:#374151;color:#fff;border:1px solid #4b5563;border-radius:3px;padding:4px 10px;cursor:pointer;font-size:12px}' +
            '.sl-bar button:hover{background:#4b5563}' +
            '.sl-bar .sl-on{background:#0F75BD;border-color:#0F75BD}' +
            '.sl-bar .sl-primary{background:#16a34a;border-color:#16a34a;font-weight:600}' +
            '.sl-bar select{font-size:12px}' +
            '.sl-title{font-weight:600;margin-right:6px}.sl-sep{width:1px;height:18px;background:#4b5563}.sl-grow{flex:1}' +
            '.sl-hint{padding:4px 12px;background:#111827;color:#9ca3af}' +
            '.sl-scroll{flex:1;overflow:auto;padding:16px}' +
            '.sl-stage{position:relative;margin:0 auto;background:#fff;box-shadow:0 0 0 1px #000;cursor:crosshair;user-select:none}' +
            '.sl-img{display:block;pointer-events:none}' +
            '.sl-rect{position:absolute;box-sizing:border-box;cursor:move}' +
            '.sl-cut{border:2px solid #0F75BD;background:rgba(15,117,189,.15)}' +
            '.sl-mask{border:2px dashed #dc2626;background:rgba(220,38,38,.25)}' +
            '.sl-sel{box-shadow:0 0 0 2px #fbbf24}' +
            '.sl-tag{position:absolute;left:0;top:-18px;background:#111827;color:#fff;padding:0 4px;font-size:11px;white-space:nowrap;border-radius:2px}' +
            '.sl-handle{position:absolute;right:-6px;bottom:-6px;width:12px;height:12px;background:#fbbf24;border:1px solid #000;cursor:nwse-resize}';
        $('<style id="builderSliceCss"></style>').text(css).appendTo("head");
    }

    $(function () { injectCss(); });

    window.builderSlice = slice;
})(window, jQuery);
