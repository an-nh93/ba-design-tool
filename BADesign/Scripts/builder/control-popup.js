var controlPopup = (function () {
    let idSeed = 1;
    let selectedPopupId = null;
    let selectedFieldId = null;

    // ================== CONFIG DEFAULT ==================
    function newPopupConfig() {
        return {
            id: "popup_" + (Date.now()) + "_" + (idSeed++),
            type: "popup",
            headerText: "New popup",
            titleText: "New popup",
            left: 450,
            top: 260,
            width: 650,
            height: 380,

            // ✅ NEW
            headerHeight: 30,        // chiều cao header
            titleFontSize: 12,       // size chữ title
            titleLineHeight: 27      // line-height title (thường = height của titlebar để canh giữa)
            // KHÔNG còn fields nội bộ nữa – field sẽ dùng controlField bên ngoài
        };
    }

    function ensureDefaults(cfg) {
        cfg.type = cfg.type || "popup";

        // ✅ CHỈ set default khi null/undefined (không đụng chuỗi rỗng)
        if (cfg.headerText == null) {
            cfg.headerText = (cfg.titleText != null ? cfg.titleText : "New popup");
        }
        if (cfg.titleText == null) {
            cfg.titleText = (cfg.headerText != null ? cfg.headerText : "New popup");
        }

        cfg.width = cfg.width || 650;
        cfg.height = cfg.height || 380;
        cfg.left = cfg.left || 450;
        cfg.top = cfg.top || 260;

        if (cfg.headerHeight == null) cfg.headerHeight = 34;
        if (cfg.titleFontSize == null) cfg.titleFontSize = 14;
        if (cfg.titleLineHeight == null) cfg.titleLineHeight = cfg.headerHeight || 34;
    }


    function getPopupElement(cfg) {
        return $('.popup-design[data-id="' + cfg.id + '"]');
    }

    // ================== STYLE APPLY =====================
    function clampNum(v, min, max, fallback) {
        let n = parseInt(v, 10);
        if (isNaN(n)) n = fallback;
        if (min != null && n < min) n = min;
        if (max != null && n > max) n = max;
        return n;
    }

    function applyPopupHeaderStyle(cfg, $popup) {
        if (!$popup || !$popup.length) return;

        cfg.headerHeight = clampNum(cfg.headerHeight, 24, 120, 34);
        cfg.titleFontSize = clampNum(cfg.titleFontSize, 10, 48, 14);
        cfg.titleLineHeight = clampNum(cfg.titleLineHeight, 20, 200, cfg.headerHeight);

        // ✅ Set CSS variables lên popup root
        $popup.find(".popup-titlebar").css("display", cfg.hideTitleBar ? "none" : "");
        $popup.css({
            "--pp-header-h": cfg.headerHeight + "px",
            "--pp-title-h": (cfg.hideTitleBar ? 0 : cfg.titleLineHeight) + "px",
            "--pp-title-font": cfg.titleFontSize + "px"
        });
    }


    // ================== RENDER POPUP ====================
    function renderPopup(cfg) {
        ensureDefaults(cfg);

        const $canvas = $("#canvas");

        const $popup = $(`
<div class="popup-design" data-id="${cfg.id}">
  <div class="popup-header">
    <div class="popup-header-left"></div>
    <span class="popup-header-text"></span>
    <span class="popup-header-close">✕</span>
  </div>
  <div class="popup-titlebar">
    <span class="popup-title-text"></span>
  </div>
  <div class="popup-body"></div>
  <div class="ub-resize ub-resize-right"></div>
  <div class="ub-resize ub-resize-bottom"></div>
  <div class="ub-resize ub-resize-corner"></div>
</div>
`);

        $popup.css({
            position: "absolute",
            left: cfg.left,
            top: cfg.top,
            width: cfg.width,
            height: cfg.height
        });

        $popup.find(".popup-header-text").text(cfg.headerText);
        $popup.find(".popup-title-text").text(cfg.titleText);

        // ✅ apply header/title style ngay khi render
        applyPopupHeaderStyle(cfg, $popup);

        $("#canvas-zoom-inner").append($popup);

        // ================== drag / resize (mượt) ==================
        try { interact($popup[0]).unset(); } catch (e) { }

        // Drag popup
        let dragLeft = 0;
        let dragTop = 0;

        interact($popup[0])
            .draggable({
                allowFrom: ".popup-header",
                ignoreFrom: ".popup-body, .ub-resize",
                listeners: {
                    start() {
                        dragLeft = cfg.left || 0;
                        dragTop = cfg.top || 0;
                    },
                    move(event) {
                        if (builder.dragSelectionBy(cfg.id, event.dx, event.dy)) return;
                        const shift = function (dx, dy) {
                            // event.dx/dy là pixel màn hình; canvas đang zoom bằng transform: scale
                            // nên phải chia viewScale, nếu không popup chạy nhanh/chậm hơn con trỏ khi zoom != 100%.
                            const vs = (window.builder && builder.viewScale > 0) ? builder.viewScale : 1;
                            dragLeft += dx / vs;
                            dragTop += dy / vs;

                            // Ruler boundary: 20px (theo margin của canvas)
                            cfg.left = Math.max(20, Math.round(dragLeft));
                            cfg.top = Math.max(20, Math.round(dragTop));
                            $popup.css({ left: cfg.left, top: cfg.top });
                        };
                        const step = builder.dragStep(event.dx, event.dy, shift);
                        shift(step.dx, step.dy);
                    },
                    end(event) {
                        if (builder.finishSelectionDrag(cfg.id, event)) return;
                        // ✅ chỉ refresh 1 lần khi thả
                        builder.refreshJson();
                    }
                }
            })
            .resizable({
                edges: { right: ".ub-resize-right, .ub-resize-corner", bottom: ".ub-resize-bottom, .ub-resize-corner" },
                listeners: {
                    move(event) {
                        const vs = (window.builder && builder.viewScale > 0) ? builder.viewScale : 1;
                        const newWidth = Math.max(350, Math.round(event.rect.width / vs));
                        const newHeight = Math.max(180, Math.round(event.rect.height / vs));

                        $popup.css({ width: newWidth, height: newHeight });
                        cfg.width = newWidth;
                        cfg.height = newHeight;

                        // update input đang mở property panel cho realtime
                        if (selectedPopupId === cfg.id) {
                            $("#ppWidth").val(Math.round(cfg.width));
                            $("#ppHeight").val(Math.round(cfg.height));
                        }
                    },
                    end() {
                        // ✅ chỉ refresh 1 lần khi resize xong
                        builder.refreshJson();
                    }
                }
            });

        // chọn popup khi click vào vùng trống (không phải field)
        $popup.on("mousedown", function (e) {
            // Nếu click trúng field bên trong popup thì để handler của field xử lý
            if ($(e.target).closest(".popup-field").length) return;

            // Click vào vùng trống .popup-body → cho phép event bubble lên #canvas để quét khối (marquee) chọn control
            if ($(e.target).closest(".popup-body").length) {
                if (window.builder && typeof builder.hideContextMenu === "function") {
                    var $menu = $("#builderContextMenu");
                    if ($menu.length && $menu.is(":visible")) builder.hideContextMenu();
                }
                var active = document.activeElement;
                if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.blur();
                return; // không stopPropagation, không chọn popup → #canvas sẽ bắt và bật marquee
            }

            // ✅ Ẩn context menu nếu đang hiện (trước khi stopPropagation)
            if (window.builder && typeof builder.hideContextMenu === "function") {
                var $menu = $("#builderContextMenu");
                if ($menu.length && $menu.is(":visible")) {
                    if ($(e.target).closest(".canvas-control, .popup-field").length === 0) {
                        builder.hideContextMenu();
                    }
                }
            }

            e.stopPropagation();

            // Bỏ focus khỏi input đang chọn (nếu có) để mất viền xanh
            var active = document.activeElement;
            if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
                active.blur();
            }

            selectPopup(cfg);
        });

        // nút X: xóa popup + field con
        $popup.find(".popup-header-close").on("click", function (e) {
            e.stopPropagation();
            deletePopupAndFields(cfg);
        });

        return $popup;
    }

    function deletePopupAndFields(cfg) {
        if (!cfg) return;

        builder.showConfirm({
            title: "Xóa popup",
            message: "Xóa popup này và mọi control nằm bên trong?",
            okText: "Xóa",
            cancelText: "Hủy",
            onOk: function () {
                builder.asOneStep(function () {
                    const gone = builder.collectDescendantIds(cfg.id).concat(cfg.id);

                    if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                        controlField.deleteWithChildren(cfg.id);
                    }

                    getPopupElement(cfg).remove();

                    builder.controls = (builder.controls || []).filter(c => gone.indexOf(c.id) < 0);

                    selectedPopupId = null;
                    selectedFieldId = null;

                    builderProps.showEmpty();
                    builder.refreshJson();
                });
            }
        });
    }

    // =============== PROPERTY PANEL POPUP ===============
    function showPopupProperties(cfg) {
        selectedPopupId = cfg.id;
        selectedFieldId = null;

        // ✅ Set selection ở builder để toolbar và các tính năng khác nhận biết popup được chọn
        builder.selectedControlId = cfg.id;
        builder.selectedControlType = "popup";

        // Bỏ tất cả selection của control / field
        $(".canvas-control").removeClass("canvas-control-selected");
        $(".popup-design").removeClass("popup-selected");
        $(".page-field").removeClass("page-field-selected");
        $(".popup-field").removeClass("popup-field-selected");

        // Reset luôn multiSelectedIds bên controlField
        if (window.controlField && typeof controlField.clearSelection === "function") {
            controlField.clearSelection();
        }

        // chọn popup hiện tại
        const $p = getPopupElement(cfg);
        $p.addClass("popup-selected");

        const P = builderProps;
        P.render(P.panel("Thuộc tính popup", "ID: " + cfg.id,
            P.section("Nội dung chữ",
                P.line(P.field("Chữ thanh trên", P.text({ id: "ppHeaderText", value: cfg.headerText }), null, "ppHeaderText")) +
                P.line(P.field("Tiêu đề", P.text({ id: "ppTitleText", value: cfg.titleText }), null, "ppTitleText"))) +
            P.section("Kích thước", P.grid(
                P.field("Rộng", P.number({ id: "ppWidth", value: cfg.width || 650, min: 350 }), "pp-field--num", "ppWidth"),
                P.field("Cao", P.number({ id: "ppHeight", value: cfg.height || 380, min: 180 }), "pp-field--num", "ppHeight"))) +
            P.section("Thanh tiêu đề",
                P.grid(
                    P.field("Cao", P.number({ id: "ppHeaderHeight", value: cfg.headerHeight || 34, min: 24, max: 120 }), "pp-field--num", "ppHeaderHeight"),
                    P.field("Cỡ chữ", P.number({ id: "ppTitleFontSize", value: cfg.titleFontSize || 14, min: 10, max: 48 }), "pp-field--num", "ppTitleFontSize"),
                    P.field("Cao dòng", P.number({ id: "ppTitleLineHeight", value: cfg.titleLineHeight || (cfg.headerHeight || 34), min: 20, max: 200 }), "pp-field--num", "ppTitleLineHeight")) +
                P.checks([P.check({ id: "ppHideTitleBar" }, "Ẩn thanh tiêu đề xám", cfg.hideTitleBar)])),
            P.button({ id: "btnSavePopupTemplate" }, "Lưu control này vào DB")));

        $("#ppWidth").on("input", function () {
            cfg.width = Math.max(350, parseInt(this.value || 650, 10));
            getPopupElement(cfg).css("width", cfg.width);
        });
        $("#ppHeight").on("input", function () {
            cfg.height = Math.max(180, parseInt(this.value || 380, 10));
            getPopupElement(cfg).css("height", cfg.height);
        });

        $("#ppHeaderText").on("input", function () {
            cfg.headerText = this.value;
            getPopupElement(cfg).find(".popup-header-text").text(cfg.headerText);
        });

        $("#ppTitleText").on("input", function () {
            cfg.titleText = this.value;
            getPopupElement(cfg).find(".popup-title-text").text(cfg.titleText);
        });

        // ✅ NEW bindings
        $("#ppHeaderHeight").on("input", function () {
            cfg.headerHeight = parseInt(this.value || 34, 10);
            applyPopupHeaderStyle(cfg, getPopupElement(cfg));
        });

        $("#ppTitleFontSize").on("input", function () {
            cfg.titleFontSize = parseInt(this.value || 14, 10);
            applyPopupHeaderStyle(cfg, getPopupElement(cfg));
        });

        $("#ppHideTitleBar").on("change", function () {
            cfg.hideTitleBar = this.checked;
            applyPopupHeaderStyle(cfg, getPopupElement(cfg));
            builder.refreshJson();
        });

        $("#ppTitleLineHeight").on("input", function () {
            cfg.titleLineHeight = parseInt(this.value || (cfg.headerHeight || 34), 10);
            applyPopupHeaderStyle(cfg, getPopupElement(cfg));
        });

        // ✅ refreshJson gom lại (đỡ lag) - chỉ refresh khi người dùng dừng gõ 1 chút
        let t = 0;
        $("#propPanel input").on("input", function () {
            clearTimeout(t);
            t = setTimeout(function () {
                builder.refreshJson();
            }, 120);
        });

        $("#btnSavePopupTemplate").on("click", function () {
            builder.saveControlToServer(cfg.id);
        });

        $("#btnDeletePopupFromPage").on("click", function () {
            deletePopupAndFields(cfg);
        });
    }

    // =============== SELECTION HELPERS ==================
    function selectPopup(cfg) {
        showPopupProperties(cfg);
    }


    // =============== DELETE bằng phím =====================
    function deleteSelectedPopup() {
        if (!selectedPopupId) return;
        const cfg = builder.findControl(selectedPopupId);
        if (!cfg || cfg.type !== "popup") return;
        deletePopupAndFields(cfg);
    }

    // lắng nghe phím Delete (không ăn trong input/textarea/select)
    $(document).on("keydown", function (e) {
        if (e.key !== "Delete") return;

        const tag = (e.target.tagName || "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        if (selectedPopupId) {
            var $p = $('.popup-design[data-id="' + selectedPopupId + '"]');
            if ($p.length && $p.hasClass("popup-selected")) {
                deleteSelectedPopup();
                e.preventDefault();
            } else {
                selectedPopupId = null;
            }
        }
    });

    // =============== PUBLIC API =========================
    return {
        addNew: function (dropPoint) {
            const cfg = newPopupConfig();
            builder.placeAtDropPoint(cfg, dropPoint);
            renderPopup(cfg);
            builder.registerControl(cfg);
            builder.refreshJson();
            showPopupProperties(cfg);
        },

        renderExisting: function (cfg) {
            // ensure style props cho data cũ
            ensureDefaults(cfg);
            renderPopup(cfg);
        },

        selectById: function (id) {
            const cfg = builder.findControl(id);
            if (cfg && cfg.type === "popup") {
                showPopupProperties(cfg);
            }
        },

        clearSelection: function () {
            selectedPopupId = null;
            selectedFieldId = null;
            $(".popup-design").removeClass("popup-selected");
        }
    };
})();
