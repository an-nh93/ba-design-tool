var controlAnnotation = (function () {
    "use strict";

    var KINDS = {
        box: { name: "Khoanh đỏ", width: 220, height: 90, color: "#e53935", pad: 6 },
        highlight: { name: "Bôi vàng", width: 200, height: 28, color: "#ffeb3b", pad: 2 },
        note: { name: "Ghi chú", width: 220, height: 70, color: "#e53935", pad: 0 }
    };
    var SWATCHES = ["#e53935", "#ffeb3b", "#43a047", "#1e88e5", "#fb8c00", "#8e24aa"];
    var Z_INDEX = 6000;
    var MIN_SIZE = 12;
    var RULER = 20;

    function newId() {
        return "annot_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function rgba(hex, alpha) {
        var n = parseInt(hex.slice(1), 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
    }

    function toCanvas(clientX, clientY) {
        var inner = document.getElementById("canvas-zoom-inner");
        if (!inner) return builder.clientToCanvasPoint(clientX, clientY);
        var rect = inner.getBoundingClientRect();
        var scale = builder.viewScale || 1;
        return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    }

    function ensureConfig(cfg) {
        var kind = KINDS[cfg.kind] ? cfg.kind : "box";
        cfg.type = "annotation";
        cfg.kind = kind;
        cfg.color = /^#[0-9a-fA-F]{6}$/.test(cfg.color || "") ? cfg.color : KINDS[kind].color;
        cfg.shape = cfg.shape === "ellipse" ? "ellipse" : "rect";
        cfg.thickness = Math.max(1, Math.min(12, parseInt(cfg.thickness, 10) || 3));
        cfg.text = cfg.text == null ? "" : String(cfg.text).slice(0, 500);
        cfg.width = Math.max(MIN_SIZE, Math.round(cfg.width || KINDS[kind].width));
        cfg.height = Math.max(MIN_SIZE, Math.round(cfg.height || KINDS[kind].height));
        cfg.left = Math.max(RULER, Math.round(cfg.left || RULER));
        cfg.top = Math.max(RULER, Math.round(cfg.top || RULER));
        cfg.parentId = null;
        cfg.zIndex = Z_INDEX;
        return cfg;
    }

    function find(cfg) {
        return $(".ba-annot").filter(function () { return this.getAttribute("data-id") === cfg.id; });
    }

    function applyStyle($root, cfg) {
        $root.css({ left: cfg.left + "px", top: cfg.top + "px", width: cfg.width + "px", height: cfg.height + "px", zIndex: cfg.zIndex });
        var $face = $root.children(".ba-annot-face");
        var $tag = $root.children(".ba-annot-tag");
        var $text = $face.children(".ba-annot-text");
        if (cfg.kind === "box") {
            $face.css({ border: cfg.thickness + "px solid " + cfg.color, borderRadius: cfg.shape === "ellipse" ? "50%" : "6px", background: "transparent" });
            $tag.text(cfg.text).css({ background: cfg.color, display: cfg.text ? "block" : "none" });
        } else if (cfg.kind === "highlight") {
            $face.css({ border: "none", borderRadius: "2px", background: rgba(cfg.color, 0.45) });
        } else {
            $face.css({ border: "1px solid " + cfg.color, borderLeft: "4px solid " + cfg.color, borderRadius: "3px", background: "#fffbe0" });
            if (!$text.is(":focus")) $text.text(cfg.text);
        }
    }

    function select(cfg, $root, additive) {
        if (!additive) {
            $(".canvas-control-selected").removeClass("canvas-control-selected");
            $(".page-field-selected").removeClass("page-field-selected");
            $(".popup-field-selected").removeClass("popup-field-selected");
            $(".popup-selected").removeClass("popup-selected");
        }
        $root.addClass("canvas-control-selected");
        builder.selectedControlId = cfg.id;
        builder.selectedControlType = additive ? "multi" : "annotation";
        builder.highlightOutlineSelection();
        builder.updateSelectionSizeHint();
        if (!additive) showProperties(cfg);
    }

    function startEdit(cfg, $root) {
        var $text = $root.find(".ba-annot-text");
        if (!$text.length) return;
        $text.attr("contenteditable", "true").focus();
        var range = document.createRange();
        range.selectNodeContents($text[0]);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function render(cfg) {
        ensureConfig(cfg);
        find(cfg).remove();

        var $root = $('<div class="canvas-control ba-annot"></div>').addClass("ba-annot-" + cfg.kind).attr("data-id", cfg.id);
        var $face = $('<div class="ba-annot-face"></div>');
        if (cfg.kind === "note") $face.append('<div class="ba-annot-text"></div>');
        $root.append($face);
        if (cfg.kind === "box") {
            $root.append('<div class="ba-annot-tag"></div>');
            ["top", "right", "bottom", "left"].forEach(function (side) {
                $root.append('<div class="ba-annot-edge ba-annot-edge-' + side + '"></div>');
            });
        }
        $root.append('<div class="ba-annot-handle" title="Kéo để đổi kích thước"></div>');
        applyStyle($root, cfg);
        $("#canvas-zoom-inner").append($root);

        var moved = false;
        interact($root[0]).draggable({
            allowFrom: cfg.kind === "box" ? ".ba-annot-edge, .ba-annot-tag" : ".ba-annot-face",
            ignoreFrom: ".ba-annot-handle, [contenteditable=true]",
            listeners: {
                start: function () { moved = false; },
                move: function (event) {
                    if (builder.dragSelectionBy(cfg.id, event.dx, event.dy)) return;
                    var shift = function (dx, dy) {
                        var scale = builder.viewScale || 1;
                        moved = true;
                        cfg.left = Math.max(RULER, cfg.left + dx / scale);
                        cfg.top = Math.max(RULER, cfg.top + dy / scale);
                        $root.css({ left: cfg.left + "px", top: cfg.top + "px" });
                        builder.updateSelectionSizeHint();
                    };
                    var step = builder.dragStep(event.dx, event.dy, shift);
                    shift(step.dx, step.dy);
                },
                end: function (event) {
                    if (builder.finishSelectionDrag(cfg.id, event)) return;
                    cfg.left = Math.round(cfg.left);
                    cfg.top = Math.round(cfg.top);
                    $root.css({ left: cfg.left + "px", top: cfg.top + "px" });
                    if (moved) builder.refreshJson();
                    builder.updateSelectionSizeHint();
                }
            }
        }).resizable({
            edges: { right: ".ba-annot-handle", bottom: ".ba-annot-handle" },
            listeners: {
                move: function (event) {
                    var scale = builder.viewScale || 1;
                    cfg.width = Math.max(MIN_SIZE, cfg.width + event.deltaRect.width / scale);
                    cfg.height = Math.max(MIN_SIZE, cfg.height + event.deltaRect.height / scale);
                    $root.css({ width: cfg.width + "px", height: cfg.height + "px" });
                    builder.updateSelectionSizeHint();
                },
                end: function () {
                    cfg.width = Math.round(cfg.width);
                    cfg.height = Math.round(cfg.height);
                    $root.css({ width: cfg.width + "px", height: cfg.height + "px" });
                    builder.refreshJson();
                    builder.updateSelectionSizeHint();
                    if (builder.selectedControlId === cfg.id) showProperties(cfg);
                }
            }
        });

        $root.on("mousedown.annot", function (e) {
            if (e.button !== 0) return;
            if ($(e.target).is("[contenteditable=true]")) { e.stopPropagation(); return; }
            e.stopPropagation();
            select(cfg, $root, e.ctrlKey || e.shiftKey);
        });

        if (cfg.kind === "note") {
            var $text = $root.find(".ba-annot-text");
            $root.on("dblclick.annot", function () { startEdit(cfg, $root); });
            $text.on("keydown", function (e) {
                e.stopPropagation();
                if (e.key === "Escape") $text.blur();
            });
            $text.on("blur", function () {
                $text.removeAttr("contenteditable");
                var value = $text.text().slice(0, 500);
                if (value !== cfg.text) {
                    cfg.text = value;
                    builder.refreshJson();
                    if (builder.selectedControlId === cfg.id) showProperties(cfg);
                }
                $text.text(cfg.text);
            });
        }
        return $root;
    }

    function showProperties(cfg) {
        var kind = KINDS[cfg.kind];
        var P = builderProps;
        var look = P.line(P.field("Màu", P.swatches(SWATCHES, { id: "annColor", value: cfg.color, title: "Màu khác" })));
        if (cfg.kind === "box") {
            look += P.line(P.field("Kiểu khung", P.select({ id: "annShape" }, [["rect", "Chữ nhật"], ["ellipse", "Hình elip"]], cfg.shape), null, "annShape"));
            look += P.line(P.field("Độ dày nét", P.number({ id: "annThickness", min: 1, max: 12, value: cfg.thickness }), "pp-field--num", "annThickness"));
            look += P.line(P.field("Nhãn (ví dụ 1, 2 hoặc vài chữ)", P.text({ id: "annText", maxlength: 60, value: cfg.text }), "pp-field--stack", "annText"));
        } else if (cfg.kind === "note") {
            look += P.line(P.field("Nội dung ghi chú", P.textarea({ id: "annText", rows: 4, maxlength: 500 }, cfg.text) + P.hint("Có thể bấm đúp vào ghi chú trên vùng thiết kế để gõ trực tiếp."), "pp-field--stack", "annText"));
        }
        P.render(P.panel(kind.name, null,
            P.section("Hiển thị", look) +
            P.section("Kích thước", P.grid(
                P.field("Rộng", P.number({ id: "annWidth", min: MIN_SIZE, value: cfg.width }), "pp-field--num", "annWidth"),
                P.field("Cao", P.number({ id: "annHeight", min: MIN_SIZE, value: cfg.height }), "pp-field--num", "annHeight")))));

        function update() {
            applyStyle(find(cfg), ensureConfig(cfg));
            builder.refreshJson();
            builder.updateSelectionSizeHint();
        }
        $("#propPanel .pp-swatch").on("click", function () {
            cfg.color = $(this).attr("data-color");
            $("#annColor").val(cfg.color);
            update();
        });
        $("#annColor").on("input change", function () { cfg.color = this.value; update(); });
        $("#annShape").on("change", function () { cfg.shape = this.value; update(); });
        $("#annThickness").on("input change", function () { cfg.thickness = this.value; update(); });
        $("#annText").on("input", function () { cfg.text = this.value; update(); });
        $("#annWidth").on("change", function () { cfg.width = parseInt(this.value, 10) || cfg.width; update(); });
        $("#annHeight").on("change", function () { cfg.height = parseInt(this.value, 10) || cfg.height; update(); });
    }

    function create(kind, box) {
        var cfg = ensureConfig({ id: newId(), kind: kind, left: box.left, top: box.top, width: box.width, height: box.height });
        var $root = render(cfg);
        builder.registerControl(cfg);
        select(cfg, $root, false);
        return cfg;
    }

    function selectionBox(ids) {
        var rect = null;
        (ids || []).forEach(function (id) {
            var cfg = builder.getControlConfig(id);
            if (!cfg || cfg.type === "annotation") return;
            $("#canvas").find("[data-id]").filter(function () { return this.getAttribute("data-id") === id; }).each(function () {
                var r = this.getBoundingClientRect();
                if (r.width < 1 || r.height < 1) return;
                if (!rect) rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
                else {
                    rect.left = Math.min(rect.left, r.left);
                    rect.top = Math.min(rect.top, r.top);
                    rect.right = Math.max(rect.right, r.right);
                    rect.bottom = Math.max(rect.bottom, r.bottom);
                }
            });
        });
        if (!rect) return null;
        var scale = builder.viewScale || 1;
        var origin = toCanvas(rect.left, rect.top);
        return { left: origin.x, top: origin.y, width: (rect.right - rect.left) / scale, height: (rect.bottom - rect.top) / scale };
    }

    function addNew(kind, dropPoint) {
        if (!KINDS[kind]) kind = "box";
        var size = KINDS[kind];
        var point = dropPoint && dropPoint.clientX != null ? toCanvas(dropPoint.clientX, dropPoint.clientY) : { x: RULER + size.width / 2, y: RULER + size.height / 2 };
        return create(kind, { left: point.x - size.width / 2, top: point.y - size.height / 2, width: size.width, height: size.height });
    }

    function addForSelection(kind, fallbackPoint, ids) {
        if (!KINDS[kind]) kind = "box";
        var size = KINDS[kind];
        var box = selectionBox(ids || builder.getAllSelectedControlIds());
        if (!box) return addNew(kind, fallbackPoint);
        if (kind === "note") return create(kind, { left: box.left + box.width + 12, top: box.top, width: size.width, height: size.height });
        return create(kind, { left: box.left - size.pad, top: box.top - size.pad, width: box.width + 2 * size.pad, height: box.height + 2 * size.pad });
    }

    function label(cfg) {
        var name = (KINDS[cfg.kind] || KINDS.box).name;
        return cfg.text ? name + ": " + escapeHtml(String(cfg.text).slice(0, 40)) : name;
    }

    function highlightMarks(scope) {
        var base = scope.getBoundingClientRect();
        var ratioX = scope.offsetWidth ? base.width / scope.offsetWidth : 1;
        var ratioY = scope.offsetHeight ? base.height / scope.offsetHeight : 1;
        return $(scope).find(".ba-annot-highlight > .ba-annot-face").map(function () {
            var rect = this.getBoundingClientRect();
            return {
                x: (rect.left - base.left) / ratioX,
                y: (rect.top - base.top) / ratioY,
                width: rect.width / ratioX,
                height: rect.height / ratioY,
                color: this.style.backgroundColor
            };
        }).get().filter(function (mark) { return mark.width > 0 && mark.height > 0 && mark.color; });
    }

    function paintHighlights(canvas, marks, scale) {
        if (!marks.length) return canvas;
        var context = canvas.getContext("2d");
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = "multiply";
        marks.forEach(function (mark) {
            context.fillStyle = mark.color;
            context.fillRect(mark.x * scale, mark.y * scale, mark.width * scale, mark.height * scale);
        });
        context.restore();
        return canvas;
    }

    function captureWithHighlights(element, options) {
        var settings = $.extend({}, options);
        var marks = highlightMarks(element);
        var onclone = settings.onclone;
        settings.onclone = function (doc) {
            $(doc).find(".ba-annot-highlight").css("visibility", "hidden");
            if (typeof onclone === "function") return onclone.apply(this, arguments);
        };
        return html2canvas(element, settings).then(function (canvas) {
            return paintHighlights(canvas, marks, settings.scale || window.devicePixelRatio || 1);
        });
    }

    return {
        addNew: addNew,
        addForSelection: addForSelection,
        renderExisting: render,
        showProperties: showProperties,
        label: label,
        captureWithHighlights: captureWithHighlights
    };
})();

if (typeof window !== "undefined") {
    window.controlAnnotation = controlAnnotation;
}
