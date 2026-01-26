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
        $popup.css({
            "--pp-header-h": cfg.headerHeight + "px",
            "--pp-title-h": cfg.titleLineHeight + "px",
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
        let dragRaf = 0;
        let dragPending = null;

        interact($popup[0])
            .draggable({
                allowFrom: ".popup-header",
                ignoreFrom: ".popup-body",
                listeners: {
                    move(event) {
                        // throttle bằng RAF để mượt
                        const curLeft = parseFloat($popup.css("left")) || cfg.left || 0;
                        const curTop = parseFloat($popup.css("top")) || cfg.top || 0;

                        let newLeft = curLeft + event.dx;
                        let newTop = curTop + event.dy;

                        // Ruler boundary: 20px (theo margin của canvas)
                        var rulerLeft = 20;
                        var rulerTop = 20;
                        if (newLeft < rulerLeft) newLeft = rulerLeft;
                        if (newTop < rulerTop) newTop = rulerTop;

                        dragPending = { newLeft, newTop, dx: event.dx, dy: event.dy };

                        if (!dragRaf) {
                            dragRaf = requestAnimationFrame(function () {
                                dragRaf = 0;
                                if (!dragPending) return;

                                const p = dragPending;
                                dragPending = null;

                               $popup.css({ left: p.newLeft, top: p.newTop });
                                cfg.left = p.newLeft;
                                cfg.top = p.newTop;
                            });
                        }
                    },
                    end() {
                        // ✅ chỉ refresh 1 lần khi thả
                        builder.refreshJson();
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 350, height: 180 }
                    })
                ],
                listeners: {
                    move(event) {
                        const newWidth = event.rect.width;
                        const newHeight = event.rect.height;

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

            // ✅ Ẩn context menu nếu đang hiện (trước khi stopPropagation)
            if (window.builder && typeof builder.hideContextMenu === "function") {
                var $menu = $("#builderContextMenu");
                if ($menu.length && $menu.is(":visible")) {
                    // Kiểm tra xem có click vào control nào không
                    if ($(e.target).closest(".canvas-control, .popup-field").length === 0) {
                        // Click vào vùng trống trong popup -> ẩn context menu
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
            title: "Delete popup",
            message: "Delete this popup and all its fields?",
            okText: "Delete",
            cancelText: "Cancel",
            onOk: function () {
                if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                    controlField.deleteWithChildren(cfg.id);
                }

                getPopupElement(cfg).remove();

                builder.controls = (builder.controls || []).filter(c => c.id !== cfg.id);

                selectedPopupId = null;
                selectedFieldId = null;

                $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");
                builder.refreshJson();
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

        const html = `
<div class="ess-prop-tab-content ess-prop-tab-active" style="padding:12px;">
<h3 style="margin:0 0 12px 0; font-size:14px; font-weight:600; color:#0078d4;">Popup Properties</h3>

<div class="ess-col-card" style="margin-bottom:12px;">
  <div class="ess-col-card-header">
    <span style="font-size:12px; color:#0078d4; font-weight:600;">📝 Text Content</span>
  </div>
  <div class="ess-col-card-body">
    <div class="ess-col-row">
      <div class="ess-col-field ess-col-field-full">
        <label><span style="color:#0078d4;">📋</span><strong>Header text:</strong></label>
        <input id="ppHeaderText" type="text" class="ess-col-input" value="${escapeHtml(cfg.headerText)}" />
      </div>
    </div>
    <div class="ess-col-row">
      <div class="ess-col-field ess-col-field-full">
        <label><span style="color:#0078d4;">📝</span><strong>Title text:</strong></label>
        <input id="ppTitleText" type="text" class="ess-col-input" value="${escapeHtml(cfg.titleText)}" />
      </div>
    </div>
  </div>
</div>

<div class="ess-col-card" style="margin-bottom:12px;">
  <div class="ess-col-card-header">
    <span style="font-size:12px; color:#0078d4; font-weight:600;">📏 Size</span>
  </div>
  <div class="ess-col-card-body">
    <div class="ess-col-row">
      <div class="ess-col-field ess-col-field-width">
        <label><span style="color:#0078d4;">📐</span><strong>Width:</strong></label>
        <input id="ppWidth" type="number" class="ess-col-input" value="${cfg.width || 650}" min="350" />
      </div>
      <div class="ess-col-field ess-col-field-width">
        <label><span style="color:#0078d4;">📐</span><strong>Height:</strong></label>
        <input id="ppHeight" type="number" class="ess-col-input" value="${cfg.height || 380}" min="180" />
      </div>
    </div>
  </div>
</div>

<div class="ess-col-card" style="margin-bottom:12px;">
  <div class="ess-col-card-header">
    <span style="font-size:12px; color:#0078d4; font-weight:600;">🎨 Header Style</span>
  </div>
  <div class="ess-col-card-body">
    <div class="ess-col-row">
      <div class="ess-col-field" style="flex: 0 0 180px; max-width: 180px;">
        <label><span style="color:#0078d4;">📏</span><strong>Height:</strong></label>
        <input id="ppHeaderHeight" type="number" class="ess-col-input" value="${cfg.headerHeight || 34}" min="24" max="120" />
      </div>
      <div class="ess-col-field" style="flex: 0 0 180px; max-width: 180px;">
        <label><span style="color:#0078d4;">🔤</span><strong>Font size:</strong></label>
        <input id="ppTitleFontSize" type="number" class="ess-col-input" value="${cfg.titleFontSize || 14}" min="10" max="48" />
      </div>
    </div>
    <div class="ess-col-row">
      <div class="ess-col-field" style="flex: 0 0 180px; max-width: 180px;">
        <label><span style="color:#0078d4;">📏</span><strong>Line height:</strong></label>
        <input id="ppTitleLineHeight" type="number" class="ess-col-input" value="${cfg.titleLineHeight || (cfg.headerHeight || 34)}" min="20" max="200" />
      </div>
    </div>
  </div>
</div>

<div class="ess-col-card">
  <button type="button" id="btnSavePopupTemplate" class="ess-btn-primary" style="width:100%;">💾 Lưu control này vào DB</button>
</div>
</div>
`;

        $("#propPanel").html(html);

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

    // =============== UTIL ===============================
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
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
        addNew: function () {
            const cfg = newPopupConfig();
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
