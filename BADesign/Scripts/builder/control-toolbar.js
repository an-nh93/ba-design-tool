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

        var html = [];
        html.push('<div class="ess-prop-tab-content ess-prop-tab-active" style="padding:12px;">');
        html.push('<h3 style="margin:0 0 12px 0; font-size:14px; font-weight:600; color:#0078d4;">Toolbar Menu</h3>');
        
        // Basic Info Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">ℹ️ Basic Info</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div style="display:grid; grid-template-columns: auto 1fr; gap:8px 12px; font-size:11px;">');
        html.push('<span style="color:#666;">ID:</span><span style="color:#333; font-weight:500;">' + cfg.id + '</span>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Options Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">⚙️ Options</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<label style="display:flex; align-items:center; gap:6px; padding:8px; background:#fafafa; border-radius:4px; cursor:pointer;">');
        html.push('<input type="checkbox" id="tbShowBg" ' + (isBg ? "checked" : "") + ' />');
        html.push('<strong>Show background / border</strong>');
        html.push('</label>');
        html.push('</div>');
        html.push('</div>');
        
        // Menu Items Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">🔧 Menu Items</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div id="tbItemsPanel"></div>');
        html.push('<button type="button" id="tbAddItem" class="ess-btn-primary" style="width:100%; margin-top:8px;">＋ Add menu</button>');
        html.push('</div>');
        html.push('</div>');
        
        // Save Button
        html.push('<div class="ess-col-card">');
        html.push('<button type="button" class="ess-btn-primary" style="width:100%;" onclick="builder.saveControlToServer(\'' + cfg.id + '\')">💾 Lưu control này vào DB</button>');
        html.push('</div>');
        
        html.push('</div>'); // Close ess-prop-tab-content

        $("#propPanel").html(html.join(''));

        $("#tbShowBg").off("change.tb").on("change.tb", function () {
            cfg.showBackground = this.checked;
            applyBackgroundState($('.canvas-control.canvas-toolbar[data-id="' + cfg.id + '"]'), cfg);
            builder.refreshJson();
        });

        function renderItems() {
            var panelHtml = [];
            var iconOptionsHtml = (window.MENU_ICON_LIST || []).map(function (ic) {
                return '<option value="' + ic.value + '">' + ic.text + '</option>';
            }).join("");

            (cfg.items || []).forEach(function (it, idx) {
                var selectedIcon = it.icon || "";
                var preview = selectedIcon
                    ? "<img src='" + selectedIcon + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />"
                    : "";

                panelHtml.push('<div class="ess-action-card" style="margin-bottom:8px;" data-toolbar-item-index="' + idx + '">');
                panelHtml.push('<div class="ess-action-card-header">');
                panelHtml.push('<span class="ess-action-number">' + (idx + 1) + '</span>');
                panelHtml.push('<div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">');
                panelHtml.push('<span style="font-size:11px; color:#0078d4; font-weight:600; white-space:nowrap; flex-shrink:0;">🔧 Menu:</span>');
                panelHtml.push('<input type="text" class="ess-action-caption" data-idx="' + idx + '" data-field="text" value="' + (it.text || "") + '" placeholder="Menu text"/>');
                panelHtml.push('<span class="tb-icon-preview" data-idx="' + idx + '">' + preview + '</span>');
                panelHtml.push('</div>');
                panelHtml.push('<button type="button" class="ess-action-delete tbDelItem" data-idx="' + idx + '" title="Delete">🗑</button>');
                panelHtml.push('</div>');
                panelHtml.push('<div class="ess-action-card-body">');
                panelHtml.push('<div class="ess-action-row">');
                panelHtml.push('<div class="ess-action-field ess-action-field-icon">');
                panelHtml.push('<label><span style="color:#0078d4;">🖼️</span><strong>Icon:</strong></label>');
                panelHtml.push('<select class="ess-action-input tb-icon-select" data-idx="' + idx + '" data-field="icon">' + iconOptionsHtml + '</select>');
                panelHtml.push('</div>');
                panelHtml.push('</div>');
                panelHtml.push('</div>');
                panelHtml.push('</div>');
            });

            $("#tbItemsPanel").html(panelHtml.join(''));

            $("#tbItemsPanel .tb-icon-select").each(function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('toolbar-item-index'), 10);
                var icon = (cfg.items[idx] && cfg.items[idx].icon) || "";
                $(this).val(icon);
            });

            $("#tbItemsPanel input[data-field='text']").off("change.tb").on("change.tb", function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('toolbar-item-index'), 10);
                cfg.items[idx].text = $(this).val();
                drawButtons(cfg);
                builder.refreshJson();
            });

            $("#tbItemsPanel .tb-icon-select").off("change.tb").on("change.tb", function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('toolbar-item-index'), 10);
                var val = $(this).val();
                cfg.items[idx].icon = val;

                var $preview = $("#tbItemsPanel .tb-icon-preview[data-idx='" + idx + "']");
                if (val) $preview.html("<img src='" + val + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />");
                else $preview.empty();

                drawButtons(cfg);
                builder.refreshJson();
            });

            $("#tbItemsPanel .tbDelItem").off("click.tb").on("click.tb", function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('toolbar-item-index'), 10);
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
