var controlToolbar = (function () {

    // =========================
    // Helpers: scale + coords
    // =========================
    function getScale() {
        return (window.builder && typeof builder.viewScale === "number" && builder.viewScale > 0)
            ? builder.viewScale
            : 1;
    }

    // client -> canvas point (account zoom + scroll)
    function clientToCanvasPoint(clientX, clientY) {
        var canvasEl = document.getElementById("canvas");
        if (!canvasEl) return { x: 0, y: 0 };

        var r = canvasEl.getBoundingClientRect();
        var scale = getScale();

        var x = (clientX - r.left + canvasEl.scrollLeft) / scale;
        var y = (clientY - r.top + canvasEl.scrollTop) / scale;

        return { x: x, y: y };
    }

    // client -> popup point (account zoom)
    function clientToPopupPoint($popup, clientX, clientY) {
        if (!$popup || !$popup.length) return { x: 0, y: 0 };
        var pr = $popup[0].getBoundingClientRect();
        var scale = getScale();

        var x = (clientX - pr.left) / scale;
        var y = (clientY - pr.top) / scale;

        return { x: x, y: y };
    }

    function clampMin0(n) {
        n = (typeof n === "number" && isFinite(n)) ? n : 0;
        return n < 0 ? 0 : n;
    }

    function readCssLeftTop($el, cfg) {
        var l = parseFloat($el.css("left"));
        var t = parseFloat($el.css("top"));
        if (!isFinite(l)) l = cfg.left || 0;
        if (!isFinite(t)) t = cfg.top || 0;
        return { left: l, top: t };
    }

    // =========================
    // Config
    // =========================
    function newConfig() {
        var idx = (builder && builder.controls && builder.controls.length) ? builder.controls.length : 0;
        return {
            id: "toolbar_" + Date.now(),
            type: "toolbar",
            left: 20,
            top: 20 + idx * 35,
            parentId: null,
            dock: null,           // "popup"
            showBackground: true, // ✅ NEW
            items: [
                { text: "Add", icon: "/Content/images/icon-menu/menu-add.png" }
            ]
        };
    }

    // =========================
    // DOM
    // =========================
    function buildDom(cfg) {
        var $root = $(`
<div class="canvas-control canvas-toolbar" data-id="${cfg.id}">
  <div class="canvas-toolbar-inner"></div>
</div>`);
        return $root;
    }

    function applyBackgroundState($root, cfg) {
        var show = (cfg.showBackground !== false);

        $root.toggleClass("tb-no-bg", !show);

        // fallback inline để chắc chắn (trong trường hợp CSS chưa có)
        if (!show) {
            $root.css({ background: "transparent", border: "none" });
            $root.find(".canvas-toolbar-inner").css({ background: "transparent", border: "none", padding: 0 });
            $root.find(".canvas-toolbar-btn").css({ background: "transparent", border: "none" });
        } else {
            // để CSS tự handle; reset inline (nếu có)
            $root.css({ background: "", border: "" });
            $root.find(".canvas-toolbar-inner").css({ background: "", border: "", padding: "" });
            $root.find(".canvas-toolbar-btn").css({ background: "", border: "" });
        }
    }

    function mountToHost($root, cfg) {
        var $canvas = $("#canvas");

        if (cfg.parentId && cfg.dock === "popup") {
            var $host = $('.popup-design[data-id="' + cfg.parentId + '"]');
            if ($host.length) {
                $root.addClass("toolbar-docked-in-popup");
                $root.css({ position: "absolute", left: cfg.left, top: cfg.top });
                $host.append($root);
                applyBackgroundState($root, cfg);
                return;
            }
            // fallback -> canvas
            cfg.parentId = null;
            cfg.dock = null;
        }

        $root.removeClass("toolbar-docked-in-popup");
        $root.css({ position: "absolute", left: cfg.left, top: cfg.top });
        $canvas.append($root);
        applyBackgroundState($root, cfg);
    }

    function drawButtons(cfg) {
        var $root = $('.canvas-control.canvas-toolbar[data-id="' + cfg.id + '"]');
        if (!$root.length) return;

        var $inner = $root.find(".canvas-toolbar-inner");
        if (!$inner.length) return;

        $inner.empty();

        (cfg.items || []).forEach(function (it) {
            var $btn = $('<button type="button" class="canvas-toolbar-btn"></button>');
            if (it.icon) $("<img>").attr("src", it.icon).appendTo($btn);
            $("<span>").text(it.text || "").appendTo($btn);
            $inner.append($btn);
        });

        applyBackgroundState($root, cfg);
    }

    // =========================
    // Selection + properties
    // =========================
    function selectToolbar($root, cfg) {
        if (window.controlPopup && typeof controlPopup.clearSelection === "function") {
            controlPopup.clearSelection();
        }

        $(".canvas-control").removeClass("canvas-control-selected");
        $root.addClass("canvas-control-selected");

        builder.selectedControlId = cfg.id;
        builder.selectedControlType = "toolbar";

        if (builder.highlightOutlineSelection) builder.highlightOutlineSelection();
        if (builder.updateSelectionSizeHint) builder.updateSelectionSizeHint();

        showProperties(cfg);
    }

    function showProperties(cfg) {
        var isBg = (cfg.showBackground !== false);

        var html =
            `<h3>Toolbar menu</h3>
<div class="prop-section">
  <div><b>ID:</b> ${cfg.id}</div>
</div>

<div class="prop-section">
  <label style="display:block;margin-bottom:6px;">
    <input type="checkbox" id="tbShowBg" ${isBg ? "checked" : ""} />
    Show background / border
  </label>
</div>

<div class="prop-section">
  <div id="tbItemsPanel"></div>
  <button type="button" id="tbAddItem">+ Add menu</button>
</div>

<div class="prop-section">
  <button type="button" onclick="builder.saveControlToServer('${cfg.id}')">💾 Lưu control này vào DB</button>
</div>`;

        $("#propPanel").html(html);

        $("#tbShowBg").off("change.tb").on("change.tb", function () {
            cfg.showBackground = this.checked;
            applyBackgroundState($('.canvas-control.canvas-toolbar[data-id="' + cfg.id + '"]'), cfg);
            builder.refreshJson();
        });

        function renderItems() {
            var panelHtml = "";
            var iconOptionsHtml = (window.MENU_ICON_LIST || []).map(function (ic) {
                return '<option value="' + ic.value + '">' + ic.text + '</option>';
            }).join("");

            (cfg.items || []).forEach(function (it, idx) {
                var selectedIcon = it.icon || "";
                var preview = selectedIcon
                    ? "<img src='" + selectedIcon + "' style='width:14px;height:14px;vertical-align:middle;' />"
                    : "";

                panelHtml +=
                    "<div style='margin-bottom:4px;'>" +
                    "Text: <input type='text' data-idx='" + idx + "' data-field='text' value='" + (it.text || "") + "' style='width:110px;' />" +
                    " Icon: <select data-idx='" + idx + "' data-field='icon' class='tb-icon-select' style='width:160px;margin-right:4px;'>" +
                    iconOptionsHtml +
                    "</select>" +
                    "<span class='tb-icon-preview' data-idx='" + idx + "'>" + preview + "</span>" +
                    " <button type='button' class='tbDelItem' data-idx='" + idx + "'>x</button>" +
                    "</div>";
            });

            $("#tbItemsPanel").html(panelHtml);

            $("#tbItemsPanel .tb-icon-select").each(function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                var icon = (cfg.items[idx] && cfg.items[idx].icon) || "";
                $(this).val(icon);
            });

            $("#tbItemsPanel input[data-field='text']").off("change.tb").on("change.tb", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.items[idx].text = this.value;
                drawButtons(cfg);
                builder.refreshJson();
            });

            $("#tbItemsPanel .tb-icon-select").off("change.tb").on("change.tb", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                var val = this.value;
                cfg.items[idx].icon = val;

                var $preview = $("#tbItemsPanel .tb-icon-preview[data-idx='" + idx + "']");
                if (val) $preview.html("<img src='" + val + "' style='width:14px;height:14px;vertical-align:middle;' />");
                else $preview.empty();

                drawButtons(cfg);
                builder.refreshJson();
            });

            $("#tbItemsPanel .tbDelItem").off("click.tb").on("click.tb", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.items.splice(idx, 1);
                renderItems();
                drawButtons(cfg);
                builder.refreshJson();
            });
        }

        $("#tbAddItem").off("click.tb").on("click.tb", function () {
            cfg.items = cfg.items || [];
            cfg.items.push({ text: "Menu " + (cfg.items.length + 1), icon: "" });
            renderItems();
            drawButtons(cfg);
            builder.refreshJson();
        });

        renderItems();
    }

    // =========================
    // Dock / Undock (FIX jump in popup)
    // =========================
    function tryDockToPopup($root, cfg, endClientX, endClientY, grabOffset) {
        if (!window.builder || typeof builder.hitTestPopupPoint !== "function") return;

        var popupId = builder.hitTestPopupPoint(endClientX, endClientY);

        // đang nằm trong popup nào?
        var currentPopupId = (cfg.parentId && cfg.dock === "popup") ? cfg.parentId : null;

        // Nếu thả trong popup
        if (popupId) {
            var $host = $('.popup-design[data-id="' + popupId + '"]');
            if (!$host.length) return;

            // ✅ CASE 1: kéo trong CÙNG popup => KHÔNG tính lại theo chuột nữa (tránh snap top-left = pointer)
            if (currentPopupId && popupId === currentPopupId && $root.parent().is($host)) {
                var lt = readCssLeftTop($root, cfg);
                cfg.left = clampMin0(lt.left);
                cfg.top = clampMin0(lt.top);
                return;
            }

            // ✅ CASE 2: dock từ canvas -> popup, hoặc từ popup A -> popup B
            cfg.parentId = popupId;
            cfg.dock = "popup";

            var pt = clientToPopupPoint($host, endClientX, endClientY);

            var offX = (grabOffset && isFinite(grabOffset.x)) ? grabOffset.x : 0;
            var offY = (grabOffset && isFinite(grabOffset.y)) ? grabOffset.y : 0;

            cfg.left = clampMin0(pt.x - offX);
            cfg.top = clampMin0(pt.y - offY);

            $root.addClass("toolbar-docked-in-popup")
                .css({ position: "absolute", left: cfg.left, top: cfg.top })
                .appendTo($host);

            return;
        }

        // Không thả trong popup
        if (currentPopupId) {
            // ✅ undock về canvas
            var $canvas = $("#canvas");
            if (!$canvas.length) return;

            cfg.parentId = null;
            cfg.dock = null;

            var pt2 = clientToCanvasPoint(endClientX, endClientY);

            var offX2 = (grabOffset && isFinite(grabOffset.x)) ? grabOffset.x : 0;
            var offY2 = (grabOffset && isFinite(grabOffset.y)) ? grabOffset.y : 0;

            cfg.left = clampMin0(pt2.x - offX2);
            cfg.top = clampMin0(pt2.y - offY2);

            $root.removeClass("toolbar-docked-in-popup")
                .css({ position: "absolute", left: cfg.left, top: cfg.top })
                .appendTo($canvas);

            return;
        }

        // canvas kéo trong canvas => move đã set đúng rồi, chỉ chốt cfg
        var lt2 = readCssLeftTop($root, cfg);
        cfg.left = clampMin0(lt2.left);
        cfg.top = clampMin0(lt2.top);
    }

    // =========================
    // Draggable
    // =========================
    function setupDraggable($root, cfg) {
        try { interact($root[0]).unset(); } catch (e) { }

        var scale = getScale();

        var raf = 0;
        var pending = null;

        // ✅ NEW: lưu offset nắm chuột trong control (theo scale)
        var grabOffset = { x: 0, y: 0 };

        function applyMove(nl, nt) {
            $root.css({ left: nl, top: nt });
            cfg.left = nl;
            cfg.top = nt;
        }

        interact($root[0]).draggable({
            inertia: false,
            autoScroll: true,
            ignoreFrom: ".canvas-toolbar-btn, .canvas-toolbar-btn *",

            listeners: {
                start: function (ev) {
                    scale = getScale();

                    // lưu offset nắm (để khi dock/undock không bị giật)
                    var r = $root[0].getBoundingClientRect();
                    grabOffset.x = (ev.clientX - r.left) / scale;
                    grabOffset.y = (ev.clientY - r.top) / scale;

                    selectToolbar($root, cfg);
                },

                move: function (ev) {
                    var dx = (ev.dx || 0) / scale;
                    var dy = (ev.dy || 0) / scale;

                    var lt = readCssLeftTop($root, cfg);
                    var nl = lt.left + dx;
                    var nt = lt.top + dy;

                    nl = clampMin0(nl);
                    nt = clampMin0(nt);

                    if (builder && builder.snapEnabled) {
                        var step = builder.snapStep || 5;
                        nl = Math.round(nl / step) * step;
                        nt = Math.round(nt / step) * step;
                    } else {
                        nl = Math.round(nl);
                        nt = Math.round(nt);
                    }

                    pending = { nl: nl, nt: nt };
                    if (!raf) {
                        raf = requestAnimationFrame(function () {
                            raf = 0;
                            if (!pending) return;
                            applyMove(pending.nl, pending.nt);
                            pending = null;

                            if (builder && builder.updateSelectionSizeHint) {
                                builder.updateSelectionSizeHint();
                            }
                        });
                    }
                },

                end: function (ev) {
                    if (raf) {
                        cancelAnimationFrame(raf);
                        raf = 0;
                    }
                    pending = null;

                    // ✅ FIX: dock/undock có tính grabOffset + tránh recalc trong cùng popup
                    tryDockToPopup($root, cfg, ev.clientX, ev.clientY, grabOffset);

                    if (builder) builder.refreshJson();
                }
            }
        });
    }

    // =========================
    // Main render
    // =========================
    function render(cfg) {
        var $root = buildDom(cfg);

        mountToHost($root, cfg);

        // vẽ nút ngay từ đầu
        drawButtons(cfg);

        setupDraggable($root, cfg);

        $root.on("mousedown", function (e) {
            e.stopPropagation();
            selectToolbar($root, cfg);
        });
    }

    // =========================
    // Public API
    // =========================
    return {
        addNew: function (dropPoint) {
            var cfg = newConfig();

            // nếu add bằng drop từ palette
            if (dropPoint && typeof dropPoint.clientX === "number" && typeof dropPoint.clientY === "number") {
                if (builder && typeof builder.hitTestPopupPoint === "function") {
                    var pid = builder.hitTestPopupPoint(dropPoint.clientX, dropPoint.clientY);

                    if (pid) {
                        cfg.parentId = pid;
                        cfg.dock = "popup";

                        var $host = $('.popup-design[data-id="' + pid + '"]');
                        if ($host.length) {
                            var pt = clientToPopupPoint($host, dropPoint.clientX, dropPoint.clientY);
                            cfg.left = clampMin0(pt.x);
                            cfg.top = clampMin0(pt.y);
                        }
                    } else {
                        var pt2 = clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY);
                        cfg.left = clampMin0(pt2.x);
                        cfg.top = clampMin0(pt2.y);
                    }
                }
            }

            render(cfg);
            builder.registerControl(cfg);

            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "toolbar";
            if (builder.highlightOutlineSelection) builder.highlightOutlineSelection();
            showProperties(cfg);
            if (builder.updateSelectionSizeHint) builder.updateSelectionSizeHint();
        },

        renderExisting: function (cfg) {
            if (!cfg.items) cfg.items = [];
            if (!cfg.dock) cfg.dock = (cfg.parentId ? "popup" : null);
            if (typeof cfg.showBackground === "undefined") cfg.showBackground = true;

            render(cfg);
        }
    };
})();
