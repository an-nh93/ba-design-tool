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
                // Icon section - separate row
                panelHtml.push('<div class="ess-action-row">');
                panelHtml.push('<div class="ess-action-field ess-action-field-full">');
                panelHtml.push('<label><span style="color:#0078d4;">🖼️</span><strong>Icon:</strong></label>');
                // Icon picker UI (similar to button icon picker, with Remove button)
                var currentIcon = it.icon || "";
                var iconType = it.iconType || ""; // "menu" or "glyphicon" or ""
                var iconPreview = "";
                var iconTypeText = "";
                var iconName = "";
                
                if (currentIcon && iconType) {
                    if (iconType === "glyphicon") {
                        var iconColor = it.iconColor || "#333333";
                        iconPreview = '<span class="' + currentIcon + '" style="font-size:16px; color:' + iconColor + ';"></span>';
                        iconTypeText = "Bootstrap Glyphicon";
                        var glyphiconItem = (window.BOOTSTRAP_GLYPHICON_LIST || []).find(function(icon) {
                            return icon.class === currentIcon;
                        });
                        iconName = glyphiconItem ? (glyphiconItem.description || glyphiconItem.class) : currentIcon;
                    } else if (iconType === "menu") {
                        iconPreview = '<img src="' + currentIcon + '" style="width:16px;height:16px;" />';
                        iconTypeText = "Menu Icons";
                        var menuItem = (window.MENU_ICON_LIST || []).find(function(icon) {
                            return icon.value === currentIcon;
                        });
                        iconName = menuItem ? menuItem.text : (currentIcon.split('/').pop() || currentIcon);
                    }
                } else if (currentIcon) {
                    // Legacy: if icon exists but no iconType, assume it's menu icon
                    iconPreview = '<img src="' + currentIcon + '" style="width:16px;height:16px;" />';
                    iconTypeText = "Menu Icons";
                    var menuItem = (window.MENU_ICON_LIST || []).find(function(icon) {
                        return icon.value === currentIcon;
                    });
                    iconName = menuItem ? menuItem.text : (currentIcon.split('/').pop() || currentIcon);
                }
                
                var iconColor = it.iconColor || "#333333";
                panelHtml.push('<div class="tb-icon-picker-wrapper" data-idx="' + idx + '" style="display:flex; align-items:center; gap:8px;">');
                panelHtml.push('<div class="tb-icon-preview-full" style="flex:1; padding:6px 8px; background:#f5f5f5; border-radius:4px; min-height:32px; display:flex; flex-direction:row; align-items:center; justify-content:flex-start; gap:8px;">');
                panelHtml.push(iconPreview || '<span style="color:#999; font-size:11px;">No icon selected</span>');
                panelHtml.push(iconName ? '<span style="font-size:11px; color:#666;">' + iconName + '</span>' : '');
                panelHtml.push('</div>');
                panelHtml.push('<button type="button" class="ess-btn-primary tb-browse-icon" data-idx="' + idx + '" style="padding:6px 12px; white-space:nowrap; flex-shrink:0;">Browse...</button>');
                panelHtml.push(currentIcon ? '<button type="button" class="ess-btn-secondary tb-remove-icon" data-idx="' + idx + '" style="padding:6px 12px; background:#ff4444; color:#fff; border:none; white-space:nowrap; flex-shrink:0;">Remove</button>' : '');
                panelHtml.push('</div>');
                panelHtml.push('</div>'); // Close ess-action-field
                panelHtml.push('</div>'); // Close ess-action-row for Icon
                
                // Color picker for Glyphicon (only show when iconType is glyphicon) - separate row
                if (iconType === "glyphicon" && currentIcon) {
                    panelHtml.push('<div class="ess-action-row">');
                    panelHtml.push('<div class="ess-action-field ess-action-field-full">');
                    panelHtml.push('<label><span style="color:#0078d4;">🎨</span><strong>Icon Color:</strong></label>');
                    panelHtml.push('<div style="display:flex; align-items:center; gap:8px;">');
                    panelHtml.push('<input type="color" class="tb-icon-color-picker" data-idx="' + idx + '" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + iconColor + '">');
                    panelHtml.push('<input type="text" class="tb-icon-color-text ess-col-input" data-idx="' + idx + '" style="flex:1;" value="' + iconColor + '">');
                    panelHtml.push('</div>');
                    panelHtml.push('</div>');
                    panelHtml.push('</div>');
                }
                panelHtml.push('</div>'); // Close ess-action-card-body
                panelHtml.push('</div>');
                panelHtml.push('</div>');
            });

            $("#tbItemsPanel").html(panelHtml.join(''));

            // Wire up icon picker for toolbar menu items
            // Use event delegation on #propPanel to ensure it works even if elements are re-rendered
            $("#propPanel").off("click.tbIcon", ".tb-browse-icon").on("click.tbIcon", ".tb-browse-icon", function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log("Toolbar Menu: Browse icon clicked");
                var idx = parseInt($(this).data("idx"), 10);
                var item = cfg.items[idx];
                if (!item) {
                    console.warn("Toolbar Menu: Item not found for index:", idx);
                    return;
                }
                
                // Use the icon picker from control-field.js
                if (window.controlField && typeof controlField.showIconPicker === "function") {
                    console.log("Toolbar Menu: Opening icon picker");
                    controlField.showIconPicker(item.iconType || "menu", function(selectedIcon, selectedIconType) {
                        console.log("Toolbar Menu: Icon selected:", selectedIcon, selectedIconType);
                        if (selectedIcon && selectedIconType) {
                            item.icon = selectedIcon;
                            item.iconType = selectedIconType;
                            // Update preview
                            updateToolbarIconPreview(idx, item);
                            drawButtons(cfg);
                            builder.refreshJson();
                            // Re-show properties to update preview
                            showProperties(cfg);
                        }
                    });
                } else {
                    console.error("Toolbar Menu: controlField.showIconPicker is not available");
                }
            });
            
            // Wire up Remove icon button
            $("#propPanel").off("click.tbIcon", ".tb-remove-icon").on("click.tbIcon", ".tb-remove-icon", function(e) {
                e.stopPropagation();
                e.preventDefault();
                var idx = parseInt($(this).data("idx"), 10);
                var item = cfg.items[idx];
                if (!item) return;
                
                item.icon = "";
                item.iconType = "";
                
                // Hide icon type label when removing icon
                var $iconTypeLabel = $("#tbItemsPanel .tb-icon-type-label[data-idx='" + idx + "']");
                if ($iconTypeLabel.length) {
                    $iconTypeLabel.hide();
                }
                
                updateToolbarIconPreview(idx, item);
                drawButtons(cfg);
                builder.refreshJson();
            });

            // Update icon previews on load
            function updateToolbarIconPreview(idx, item) {
                var $wrapper = $("#propPanel").find('.tb-icon-picker-wrapper[data-idx="' + idx + '"]');
                if (!$wrapper.length) return;
                
                var currentIcon = item.icon || "";
                var iconType = item.iconType || "";
                var iconPreview = "";
                var iconTypeText = "";
                var iconName = "";
                
                if (currentIcon && iconType) {
                    if (iconType === "glyphicon") {
                        var iconColor = item.iconColor || "#333333";
                        iconPreview = '<span class="' + currentIcon + '" style="font-size:16px; color:' + iconColor + ';"></span>';
                        iconTypeText = "Bootstrap Glyphicon";
                        var glyphiconItem = (window.BOOTSTRAP_GLYPHICON_LIST || []).find(function(icon) {
                            return icon.class === currentIcon;
                        });
                        iconName = glyphiconItem ? (glyphiconItem.description || glyphiconItem.class) : currentIcon;
                    } else if (iconType === "menu") {
                        iconPreview = '<img src="' + currentIcon + '" style="width:16px;height:16px;" />';
                        iconTypeText = "Menu Icons";
                        var menuItem = (window.MENU_ICON_LIST || []).find(function(icon) {
                            return icon.value === currentIcon;
                        });
                        iconName = menuItem ? menuItem.text : (currentIcon.split('/').pop() || currentIcon);
                    }
                } else if (currentIcon) {
                    // Legacy: if icon exists but no iconType, assume it's menu icon
                    iconPreview = '<img src="' + currentIcon + '" style="width:16px;height:16px;" />';
                    iconTypeText = "Menu Icons";
                    var menuItem = (window.MENU_ICON_LIST || []).find(function(icon) {
                        return icon.value === currentIcon;
                    });
                    iconName = menuItem ? menuItem.text : (currentIcon.split('/').pop() || currentIcon);
                }
                
                var $preview = $wrapper.find('.tb-icon-preview-full');
                var $removeBtn = $wrapper.find('.tb-remove-icon');
                
                if (iconPreview) {
                    $preview.html(iconPreview + (iconName ? '<span style="font-size:11px; color:#666;">' + iconName + '</span>' : ''));
                    if ($removeBtn.length) {
                        $removeBtn.show();
                    } else {
                        $wrapper.find('.tb-browse-icon').after('<button type="button" class="ess-btn-secondary tb-remove-icon" data-idx="' + idx + '" style="padding:6px 12px; background:#ff4444; color:#fff; border:none; white-space:nowrap;">Remove</button>');
                    }
                } else {
                    $preview.html('<span style="color:#999; font-size:11px;">No icon selected</span>');
                    if ($removeBtn.length) {
                        $removeBtn.hide();
                    }
                }
            }
            
            // Initialize icon previews for all items
            (cfg.items || []).forEach(function(item, idx) {
                updateToolbarIconPreview(idx, item);
            });
            
            // Color picker handlers for toolbar menu items
            function bindToolbarMenuColorPair(pickerSel, textSel, idx) {
                var $picker = $(pickerSel);
                var $text = $(textSel);
                
                function normalizeColor(val) {
                    if (!val) return "#333333";
                    val = $.trim(val);
                    if (/^[0-9a-f]{3}$/i.test(val)) {
                        var r = val[0], g = val[1], b = val[2];
                        return ("#" + r + r + g + g + b + b).toUpperCase();
                    }
                    if (/^[0-9a-f]{6}$/i.test(val)) {
                        return ("#" + val).toUpperCase();
                    }
                    if (/^#[0-9a-f]{3}$/i.test(val)) {
                        var r2 = val[1], g2 = val[2], b2 = val[3];
                        return ("#" + r2 + r2 + g2 + g2 + b2 + b2).toUpperCase();
                    }
                    if (/^#[0-9a-f]{6}$/i.test(val)) {
                        return val.toUpperCase();
                    }
                    return val;
                }
                
                if ($text.length) {
                    $text.off("change.tbColor blur.tbColor").on("change.tbColor blur.tbColor", function () {
                        var v = normalizeColor($(this).val());
                        var item = cfg.items[idx];
                        if (item && item.iconType === "glyphicon") {
                            item.iconColor = v;
                            if ($picker.length && /^#[0-9a-f]{6}$/i.test(v)) {
                                $picker.val(v);
                            }
                            updateToolbarIconPreview(idx, item);
                            drawButtons(cfg);
                            builder.refreshJson();
                        }
                    });
                }
                
                if ($picker.length) {
                    $picker.off("input.tbColor change.tbColor").on("input.tbColor change.tbColor", function () {
                        var v = normalizeColor($(this).val());
                        var item = cfg.items[idx];
                        if (item && item.iconType === "glyphicon") {
                            item.iconColor = v;
                            if ($text.length) $text.val(v);
                            updateToolbarIconPreview(idx, item);
                            drawButtons(cfg);
                            builder.refreshJson();
                        }
                    });
                }
            }
            
            // Wire color pickers for all toolbar menu items
            (cfg.items || []).forEach(function(item, idx) {
                if (item.iconType === "glyphicon" && item.icon) {
                    bindToolbarMenuColorPair(
                        ".tb-icon-color-picker[data-idx='" + idx + "']",
                        ".tb-icon-color-text[data-idx='" + idx + "']",
                        idx
                    );
                }
            });

            $("#tbItemsPanel input[data-field='text']").off("change.tb").on("change.tb", function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('toolbar-item-index'), 10);
                cfg.items[idx].text = $(this).val();
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
                .appendTo($("#canvas-zoom-inner"));

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
