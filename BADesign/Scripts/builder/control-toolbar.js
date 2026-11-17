var controlToolbar = (function () {

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
        $("#canvas-zoom-inner").append($root);
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
            if (it.icon) {
                var iconType = it.iconType || "menu";
                if (iconType === "glyphicon") {
                    var iconColor = it.iconColor || "#333333";
                    var $icon = $("<span>")
                        .addClass(it.icon)
                        .css({
                            "font-size": "14px",
                            "margin-right": "4px",
                            "color": iconColor
                        });
                    $btn.append($icon);
                } else {
                    $("<img>").attr("src", it.icon).appendTo($btn);
                }
            }
            $("<span>").text(it.text || "").appendTo($btn);
            $inner.append($btn);
        });

        applyBackgroundState($root, cfg);
    }

    function bandElement(cfg) {
        var parent = cfg.parentId ? builder.getControlConfig(cfg.parentId) : null;
        if (!parent) return null;
        var $parent = builder.controlElement(parent);
        if (parent.type === "popup") return $parent.find(".popup-titlebar").first()[0] || null;
        if (parent.type === "field" && parent.ftype === "section") return $parent.children(".page-field-section-header")[0] || null;
        return null;
    }

    function alignToBand(cfg) {
        var $root = builder.controlElement(cfg);
        var band = bandElement(cfg);
        if (!$root.length || !band) return false;
        var box = $root[0].getBoundingClientRect(), strip = band.getBoundingClientRect();
        if (!box.height || !strip.height) return false;
        var middle = (box.top + box.bottom) / 2;
        if (middle < strip.top || middle > strip.bottom) return false;
        if (cfg.showBackground !== false) {
            cfg.showBackground = false;
            applyBackgroundState($root, cfg);
            box = $root[0].getBoundingClientRect();
        }
        var top = Math.round((cfg.top || 0) + ((strip.top + strip.bottom) - (box.top + box.bottom)) / 2 / builder.cssScale());
        if (top !== cfg.top) {
            cfg.top = top;
            $root.css("top", top + "px");
        }
        return true;
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
        var P = builderProps;
        P.render(P.panel("Toolbar Menu", "ID: " + cfg.id,
            P.section("Tùy chọn", P.checks([P.check({ id: "tbShowBg" }, "Hiện nền và viền", cfg.showBackground !== false)])) +
            P.section("Các nút", P.rows({ id: "tbItemsPanel", "data-pp-owner": cfg.id, "data-pp-kind": "item" }, ""), {
                action: P.button({ id: "tbAddItem", "class": "pp-btn--primary pp-btn--small" }, "＋ Thêm nút")
            }),
            P.saveButton(cfg.id)));

        $("#tbShowBg").off("change.tb").on("change.tb", function () {
            cfg.showBackground = this.checked;
            applyBackgroundState($('.canvas-control.canvas-toolbar[data-id="' + cfg.id + '"]'), cfg);
            builder.refreshJson();
        });

        function redraw() {
            drawButtons(cfg);
            builder.refreshJson();
        }

        function renderItems() {
            $("#tbItemsPanel").html((cfg.items || []).map(function (it, idx) {
                return P.row({
                    attrs: { "class": "pp-cols-1", "data-toolbar-item-index": idx },
                    open: P.isRowOpen(cfg.id, "item", idx),
                    head: P.rowNo(idx + 1) +
                        P.text({ "data-idx": idx, "data-field": "text", value: it.text || "", placeholder: "Chữ trên nút" }) +
                        P.iconCell(it, idx),
                    tools: P.rowToggle("Biểu tượng và màu") + P.iconButton({ "class": "pp-icon-btn--danger tbDelItem", "data-idx": idx, title: "Xóa nút" }, "×"),
                    body: P.iconEditor(it, idx)
                });
            }).join(""));

            $("#tbItemsPanel input[data-field='text']").off("change.tb").on("change.tb", function () {
                var idx = parseInt($(this).closest('.pp-row').data('toolbar-item-index'), 10);
                cfg.items[idx].text = $(this).val();
                redraw();
            });

            $("#tbItemsPanel .tbDelItem").off("click.tb").on("click.tb", function () {
                var idx = parseInt($(this).closest('.pp-row').data('toolbar-item-index'), 10);
                cfg.items.splice(idx, 1);
                P.rowRemoved(cfg.id, 'item', idx);
                renderItems();
                redraw();
            });
        }

        P.bindIcons("#tbItemsPanel", {
            item: function (key) { return cfg.items[key]; },
            changed: function (structural) {
                if (structural) renderItems();
                redraw();
            }
        });

        $("#tbAddItem").off("click.tb").on("click.tb", function () {
            cfg.items = cfg.items || [];
            cfg.items.push({ text: "Menu " + (cfg.items.length + 1), icon: "" });
            renderItems();
            redraw();
        });

        renderItems();
    }

    // =========================
    // Draggable
    // =========================
    function setupDraggable($root, cfg) {
        try { interact($root[0]).unset(); } catch (e) { }

        interact($root[0]).draggable({
            inertia: false,

            listeners: {
                start: function () {
                    if (!$root.hasClass("canvas-control-selected")) selectToolbar($root, cfg);
                },

                move: function (ev) {
                    builder.dragControlBy(cfg, $root, ev.dx || 0, ev.dy || 0);
                },

                end: function (ev) {
                    builder.finishControlDrag(cfg, $root, ev);
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
            builder.placeAtDropPoint(cfg, dropPoint);

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
            if (!cfg.dock) {
                var parentCfg = cfg.parentId ? builder.getControlConfig(cfg.parentId) : null;
                cfg.dock = (parentCfg && parentCfg.type === "popup") ? "popup" : null;
            }
            if (typeof cfg.showBackground === "undefined") cfg.showBackground = true;

            render(cfg);
        },

        alignToBand: alignToBand,
        showProperties: showProperties
    };
})();
