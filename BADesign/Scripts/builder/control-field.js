var controlField = (function () {
    var multiSelectedIds = [];

    // Icon Picker Modal Function
    // callback: function(selectedIcon, selectedIconType) - called when OK is clicked
    function showIconPicker(initialType, callback) {
        // Create modal if it doesn't exist (for use by all controls, not just ess-button)
        if (!$("#iconPickerModal").length) {
            var modalHtml = '<div id="iconPickerModal" class="ess-modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:10000;">' +
                '<div class="ess-modal-content" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:#fff; border-radius:4px; max-width:700px; width:90%; height:600px; display:flex; flex-direction:column; box-shadow:0 4px 20px rgba(0,0,0,0.3);">' +
                '<div class="ess-modal-header" style="padding:16px; border-bottom:1px solid #e0e0e0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">' +
                '<h3 style="margin:0; font-size:16px; font-weight:600;">Chọn Icon</h3>' +
                '<button type="button" class="ess-modal-close" id="iconPickerClose" style="background:none; border:none; font-size:24px; cursor:pointer; color:#666; padding:0; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">&times;</button>' +
                '</div>' +
                '<div style="padding:16px; border-bottom:1px solid #e0e0e0; flex-shrink:0;">' +
                '<div style="margin-bottom:12px; padding:12px; background:#f5f5f5; border-radius:4px;">' +
                '<div style="display:flex; gap:16px; align-items:center;">' +
                '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:14px;">' +
                '<input type="radio" name="iconPickerType" value="menu" checked style="cursor:pointer;" />' +
                '<span>Icon Cadena (Menu Icons)</span>' +
                '</label>' +
                '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:14px;">' +
                '<input type="radio" name="iconPickerType" value="glyphicon" style="cursor:pointer;" />' +
                '<span>Icon Glyphicon</span>' +
                '</label>' +
                '</div>' +
                '</div>' +
                '<div>' +
                '<input type="text" id="iconPickerSearchInput" class="ess-col-input" placeholder="Search icon by name or class (e.g., add, delete, search)..." style="width:100%; padding:8px;" />' +
                '</div>' +
                '</div>' +
                '<div id="iconPickerIconList" style="flex:1; overflow-y:auto; display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:8px; padding:16px; border:1px solid #e0e0e0; border-radius:4px; background:#fafafa; min-height:0; align-items:start;">' +
                '</div>' +
                '<style>' +
                '.icon-picker-item { height: auto !important; min-height: 70px !important; max-height: 70px !important; }' +
                '</style>' +
                '<div class="ess-modal-footer" style="padding:12px 16px; border-top:1px solid #e0e0e0; display:flex; justify-content:flex-end; gap:8px; flex-shrink:0;">' +
                '<button type="button" id="iconPickerCancel" class="ess-btn-secondary" style="padding:6px 16px; background:#f0f0f0; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:13px;">Cancel</button>' +
                '<button type="button" id="iconPickerOk" class="ess-btn-primary" style="padding:6px 16px; background:#0078d4; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:13px;">OK</button>' +
                '</div>' +
                '</div>' +
                '</div>';
            $("body").append(modalHtml);
        }
        
        var $modal = $("#iconPickerModal");
        var $iconList = $("#iconPickerIconList");
        var $searchInput = $("#iconPickerSearchInput");
        var selectedIcon = null;
        var selectedIconType = null; // "menu" or "glyphicon"
        var currentIconType = initialType || "menu"; // Default to menu (Icon Cadena) when opened from Browse button
        var onIconSelected = callback || null; // Callback function
        
        // IMPORTANT: Save current control ID and type IMMEDIATELY when opening popup
        // This prevents losing focus when clicking on icons
        var savedControlId = builder.selectedControlId;
        var savedControlType = builder.selectedControlType;
        var savedCfg = savedControlId ? builder.getControlConfig(savedControlId) : null;
        
        // Render icons based on type
        function renderIcons(iconType, filterText) {
            $iconList.empty();
            var icons = [];
            
            if (iconType === "menu") {
                icons = window.MENU_ICON_LIST || [];
            } else if (iconType === "glyphicon") {
                icons = window.BOOTSTRAP_GLYPHICON_LIST || [];
            }
            
            var filteredIcons = icons;
            if (filterText) {
                var searchLower = filterText.toLowerCase();
                if (iconType === "menu") {
                    filteredIcons = icons.filter(function(icon) {
                        return icon.text.toLowerCase().indexOf(searchLower) !== -1 ||
                               icon.value.toLowerCase().indexOf(searchLower) !== -1;
                    });
                } else if (iconType === "glyphicon") {
                    filteredIcons = icons.filter(function(icon) {
                        return icon.class.toLowerCase().indexOf(searchLower) !== -1 ||
                               icon.description.toLowerCase().indexOf(searchLower) !== -1;
                    });
                }
            }
            
            if (filteredIcons.length === 0) {
                $iconList.html('<div style="grid-column:1/-1; text-align:center; padding:20px; color:#999;">No icons found</div>');
                return;
            }
            
            filteredIcons.forEach(function(icon) {
                var $item;
                if (iconType === "menu") {
                    var iconHtml = icon.value ? '<img src="' + icon.value + '" style="width:20px;height:20px;" />' : '<span style="font-size:11px; color:#999;">(No icon)</span>';
                    $item = $('<div class="icon-picker-item" data-type="menu" data-value="' + (icon.value || "") + '" style="padding:8px; border:1px solid #ddd; border-radius:4px; text-align:center; cursor:pointer; background:#fff; transition:all 0.2s; display:flex; flex-direction:column; min-height:70px; max-height:70px; height:70px;">' +
                        '<div style="margin-bottom:4px; min-height:28px; max-height:28px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">' + iconHtml + '</div>' +
                        '<span style="font-size:9px; color:#666; display:block; word-break:break-word; line-height:1.2; height:32px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; flex-shrink:0;">' + icon.text + '</span>' +
                        '</div>');
                } else if (iconType === "glyphicon") {
                    // Ensure Bootstrap Glyphicon CSS is available - use inline style for icon
                    $item = $('<div class="icon-picker-item" data-type="glyphicon" data-class="' + icon.class + '" style="padding:8px; border:1px solid #ddd; border-radius:4px; text-align:center; cursor:pointer; background:#fff; transition:all 0.2s; display:flex; flex-direction:column; min-height:70px; max-height:70px; height:70px;">' +
                        '<span class="' + icon.class + '" style="font-size:28px; display:block; margin-bottom:4px; line-height:1; color:#333; flex-shrink:0;"></span>' +
                        '<span style="font-size:9px; color:#666; display:block; word-break:break-word; line-height:1.2; height:32px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; flex-shrink:0;">' + icon.description + '</span>' +
                        '</div>');
                }
                
                if ($item) {
                    $item.on("click", function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        // Prevent losing focus on canvas button
                        e.stopImmediatePropagation();
                        
                        // Restore saved control selection to prevent losing focus
                        if (savedControlId && savedControlType) {
                            builder.selectedControlId = savedControlId;
                            builder.selectedControlType = savedControlType;
                            // Immediately highlight to maintain visual focus
                            builder.highlightOutlineSelection();
                        }
                        
                        $(".icon-picker-item").removeClass("selected").css({
                            "border-color": "#ddd",
                            "background": "#fff"
                        });
                        $(this).addClass("selected").css({
                            "border-color": "#0078d4",
                            "background": "#e6f2ff"
                        });
                        selectedIconType = $(this).data("type");
                        if (selectedIconType === "menu") {
                            selectedIcon = $(this).data("value") || "";
                        } else if (selectedIconType === "glyphicon") {
                            selectedIcon = $(this).data("class") || "";
                        }
                        // Debug log
                        console.log("Icon selected:", selectedIcon, "Type:", selectedIconType);
                    });
                    
                    $item.on("mouseenter", function() {
                        if (!$(this).hasClass("selected")) {
                            $(this).css({
                                "border-color": "#0078d4",
                                "background": "#f0f7ff"
                            });
                        }
                    });
                    
                    $item.on("mouseleave", function() {
                        if (!$(this).hasClass("selected")) {
                            $(this).css({
                                "border-color": "#ddd",
                                "background": "#fff"
                            });
                        }
                    });
                    
                    $iconList.append($item);
                }
            });
        }
        
        // Set radio button based on initialType (default to menu/Icon Cadena)
        if (currentIconType === "menu") {
            $("input[name='iconPickerType'][value='menu']").prop("checked", true);
        } else {
            $("input[name='iconPickerType'][value='glyphicon']").prop("checked", true);
        }
        
        // Radio button change handler
        $("input[name='iconPickerType']").off("change").on("change", function() {
            currentIconType = $(this).val();
            $searchInput.val("");
            renderIcons(currentIconType, "");
        });
        
        // Search handler
        $searchInput.off("input").on("input", function() {
            renderIcons(currentIconType, $(this).val());
        });
        
        // Close handlers
        $("#iconPickerClose, #iconPickerCancel").off("click").on("click", function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Remove document-level event handler
            $(document).off("mousedown.iconPickerPrevent");
            
            // Use saved values (saved when popup opened)
            var currentControlId = savedControlId;
            var currentControlType = savedControlType;
            var cfg = savedCfg;
            
            $modal.hide();
            selectedIcon = null;
            selectedIconType = null;
            
            // Restore focus after modal closes
            setTimeout(function() {
                if (currentControlId && currentControlType) {
                    builder.selectedControlId = currentControlId;
                    builder.selectedControlType = currentControlType;
                    var $control = $('.canvas-control[data-id="' + currentControlId + '"]');
                    if ($control.length) {
                        builder.highlightOutlineSelection();
                        if (cfg) {
                            showProperties(cfg);
                        }
                    }
                }
            }, 100);
        });
        
        // OK handler
        $("#iconPickerOk").off("click").on("click", function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            
            // Debug log
            console.log("OK clicked - selectedIcon:", selectedIcon, "selectedIconType:", selectedIconType);
            console.log("Saved control ID:", savedControlId, "Type:", savedControlType);
            
            // Use SAVED control ID (saved when popup opened), not current selection
            // This ensures we update the correct button even if focus was lost
            var currentControlId = savedControlId;
            var currentControlType = savedControlType;
            var currentCfg = savedCfg;
            
            if (selectedIcon !== null && selectedIcon !== undefined && selectedIconType) {
                // If callback provided, call it instead of default button handling
                if (onIconSelected && typeof onIconSelected === "function") {
                    // Call callback first
                    onIconSelected(selectedIcon, selectedIconType);
                    // Don't call showProperties for callback-based usage - let the callback handle it
                    // Remove document-level event handler
                    $(document).off("mousedown.iconPickerPrevent");
                    // Hide modal FIRST - must be done synchronously
                    $modal.hide();
                    selectedIcon = null;
                    selectedIconType = null;
                    return; // Exit early - callback will handle the rest
                } else if (currentCfg && currentCfg.uiMode === "ess" && currentCfg.ftype === "button") {
                    // Default behavior: update button icon
                    currentCfg.btnIcon = selectedIcon;
                    currentCfg.btnIconType = selectedIconType;
                    
                    // Update preview
                    var $preview = $("#btnIconPreview");
                    var $iconTypeLabel = $("#btnIconTypeLabel");
                    var iconHtml = "";
                    var iconTypeText = "";
                    var iconName = "";
                    
                    if (selectedIconType === "glyphicon") {
                        iconHtml = '<span class="' + selectedIcon + '" style="font-size:24px;"></span>';
                        iconTypeText = "Bootstrap Glyphicon";
                        // Find icon name from BOOTSTRAP_GLYPHICON_LIST
                        var glyphiconItem = (window.BOOTSTRAP_GLYPHICON_LIST || []).find(function(icon) {
                            return icon.class === selectedIcon;
                        });
                        iconName = glyphiconItem ? (glyphiconItem.description || glyphiconItem.class) : selectedIcon;
                    } else if (selectedIconType === "menu" && selectedIcon) {
                        iconHtml = '<img src="' + selectedIcon + '" style="width:24px;height:24px;" />';
                        iconTypeText = "Menu Icons";
                        // Find icon name from MENU_ICON_LIST
                        var menuItem = (window.MENU_ICON_LIST || []).find(function(icon) {
                            return icon.value === selectedIcon;
                        });
                        iconName = menuItem ? menuItem.text : (selectedIcon.split('/').pop() || selectedIcon);
                    } else {
                        iconHtml = '<span style="color:#999; font-size:11px;">No icon selected</span>';
                    }
                    
                    // Update icon type label
                    if ($iconTypeLabel.length) {
                        $iconTypeLabel.text(iconTypeText).show();
                    }
                    
                    $preview.html(iconHtml + (iconName ? '<span style="font-size:10px; color:#666; margin-top:4px; text-align:center;">' + iconName + '</span>' : ''));
                    
                    // Show Remove button
                    var $removeBtn = $("#btnRemoveIcon");
                    if (!$removeBtn.length) {
                        // Add Remove button if not exists
                        $("#btnBrowseIcon").after('<button type="button" id="btnRemoveIcon" class="ess-btn-secondary" style="padding:6px 12px; background:#ff4444; color:#fff; border:none;">Remove</button>');
                    } else {
                        $removeBtn.show();
                    }
                    
                    // Update button icon
                    var $btn = $(".canvas-control[data-id='" + currentCfg.id + "']").find(".page-field-editor button");
                    $btn.find("img, span.glyphicon").remove();
                    if (selectedIcon && selectedIconType) {
                        if (selectedIconType === "glyphicon") {
                            var $icon = $('<span class="' + selectedIcon + '"></span>');
                            $icon.css({
                                "font-size": "14px",
                                "margin-right": "4px"
                            });
                            $btn.prepend($icon);
                        } else if (selectedIconType === "menu" && selectedIcon) {
                            var $icon = $('<img src="' + selectedIcon + '" />');
                            $icon.css({
                                "width": "16px",
                                "height": "16px",
                                "vertical-align": "middle",
                                "margin-right": "4px"
                            });
                            $btn.prepend($icon);
                        }
                    }
                    
                    builder.refreshJson();
                }
            } else {
                console.warn("No icon selected or invalid selection");
            }
            
            // Remove document-level event handler
            $(document).off("mousedown.iconPickerPrevent");
            
            // Hide modal FIRST - must be done synchronously
            $modal.hide();
            selectedIcon = null;
            selectedIconType = null;
            
            // Restore focus after modal closes
            setTimeout(function() {
                if (currentControlId && currentControlType) {
                    builder.selectedControlId = currentControlId;
                    builder.selectedControlType = currentControlType;
                    var $control = $('.canvas-control[data-id="' + currentControlId + '"]');
                    if ($control.length) {
                        builder.highlightOutlineSelection();
                        if (currentCfg) {
                            showProperties(currentCfg);
                        }
                    }
                }
            }, 100);
        });
        
        // CRITICAL: Prevent ALL clicks inside modal from bubbling to canvas
        // This prevents losing focus when clicking anywhere in the popup
        $modal.off("click.iconPicker").on("click.iconPicker", function(e) {
            // Only allow overlay clicks to close modal
            if ($(e.target).hasClass("ess-modal-overlay")) {
                // Store current selection before closing
                var currentControlId = savedControlId;
                var currentControlType = savedControlType;
                var cfg = savedCfg;
                
                $modal.hide();
                selectedIcon = null;
                selectedIconType = null;
                
                // Restore focus after modal closes
                setTimeout(function() {
                    if (currentControlId && currentControlType) {
                        builder.selectedControlId = currentControlId;
                        builder.selectedControlType = currentControlType;
                        var $control = $('.canvas-control[data-id="' + currentControlId + '"]');
                        if ($control.length) {
                            builder.highlightOutlineSelection();
                            if (cfg) {
                                showProperties(cfg);
                            }
                        }
                    }
                }, 100);
            } else {
                // Prevent all other clicks from bubbling
                e.stopPropagation();
                e.preventDefault();
            }
        });
        
        // CRITICAL: Prevent ALL events inside modal from reaching canvas
        // Use mousedown (fires before click) to catch events earlier
        $modal.find(".ess-modal-content").off("mousedown.iconPickerContent click.iconPickerContent").on("mousedown.iconPickerContent click.iconPickerContent", function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Restore saved control selection immediately to maintain focus
            if (savedControlId && savedControlType) {
                builder.selectedControlId = savedControlId;
                builder.selectedControlType = savedControlType;
                builder.highlightOutlineSelection();
            }
            // Don't prevent default to allow normal form interactions
        });
        
        // Prevent clicks on all interactive elements from bubbling
        $modal.find("input, button, .icon-picker-item, label").off("mousedown.iconPickerItem click.iconPickerItem").on("mousedown.iconPickerItem click.iconPickerItem", function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Restore saved control selection immediately to maintain focus
            if (savedControlId && savedControlType) {
                builder.selectedControlId = savedControlId;
                builder.selectedControlType = savedControlType;
                builder.highlightOutlineSelection();
            }
            // Don't prevent default for form elements to allow normal interaction
            if (!$(this).is("input[type='text']") && !$(this).is("input[type='radio']") && !$(this).is("button")) {
                e.preventDefault();
            }
        });
        
        // CRITICAL: Prevent document-level mousedown events from deselecting control
        // This must be done BEFORE showing modal to catch events early
        var preventCanvasDeselect = function(e) {
            // If click is inside modal, prevent it from reaching canvas
            if ($(e.target).closest("#iconPickerModal").length) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                // Restore saved control selection immediately
                if (savedControlId && savedControlType) {
                    builder.selectedControlId = savedControlId;
                    builder.selectedControlType = savedControlType;
                    builder.highlightOutlineSelection();
                }
            }
        };
        
        // Attach to document with capture phase (runs before other handlers)
        $(document).off("mousedown.iconPickerPrevent").on("mousedown.iconPickerPrevent", preventCanvasDeselect);
        
        // Initial render
        renderIcons(currentIconType, "");
        $searchInput.val("");
        
        // Ensure control remains focused/highlighted when opening popup
        if (savedControlId && savedControlType) {
            builder.selectedControlId = savedControlId;
            builder.selectedControlType = savedControlType;
            builder.highlightOutlineSelection();
        }
        
        $modal.show();
        setTimeout(function() {
            $searchInput.focus();
        }, 100);
        
        // Clean up event handler when modal closes
        var originalCloseHandlers = $("#iconPickerClose, #iconPickerCancel");
        originalCloseHandlers.off("click.iconPickerCleanup").on("click.iconPickerCleanup", function() {
            $(document).off("mousedown.iconPickerPrevent");
        });
        
        // Also clean up when OK is clicked
        $("#iconPickerOk").off("click.iconPickerCleanup").on("click.iconPickerCleanup", function() {
            $(document).off("mousedown.iconPickerPrevent");
        });
    }

    // ==== IMAGE helpers ====
    var IMAGE_MODES = ["fit", "fill", "stretch", "center"];

    function getImageMode(cfg) {
        var m = cfg.imageMode || "fit";
        if (IMAGE_MODES.indexOf(m) < 0) m = "fit";
        return m;
    }

    // Đổ DOM ảnh cho 1 field image dựa trên cfg.imageData + cfg.imageMode
    function applyImageDomForField(cfg) {
        var $dom = $('.canvas-control.page-field[data-id="' + cfg.id + '"]');
        if (!$dom.length) return;

        var $inner = $dom.find(".ess-image-inner");
        if (!$inner.length) return;

        var mode = getImageMode(cfg);

        $inner
            .removeClass("ess-image-mode-fit ess-image-mode-fill ess-image-mode-stretch ess-image-mode-center")
            .addClass("ess-image-mode-" + mode)
            .empty();

        if (cfg.imageData) {
            var $img = $('<img class="ess-image-img" />').attr("src", cfg.imageData);
            $inner.append($img);
        } else {
            $inner.append('<span class="ess-image-placeholder">Drop / paste image</span>');
        }
    }

    function loadImageFileToField(file, cfg) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (re) {
            cfg.imageData = re.target.result;
            applyImageDomForField(cfg);
            builder.refreshJson();
        };
        reader.readAsDataURL(file);
    }

    // Khởi tạo click + drag/drop cho 1 field image
    function initEssImageDrop($field, cfg) {
        var $drop = $field.find(".ess-image-drop");
        if (!$drop.length) return;

        $drop.off(".essImage");

        // Click -> chọn file
        $drop.on("click.essImage", function (e) {
            e.preventDefault();
            e.stopPropagation();

            var $input = $drop.find("input.ess-image-file");
            if (!$input.length) {
                $input = $('<input type="file" accept="image/*" class="ess-image-file" style="display:none;" />')
                    .appendTo($drop);
            }

            $input.off("change.essImage").on("change.essImage", function () {
                var f = this.files && this.files[0];
                if (f) loadImageFileToField(f, cfg);
                this.value = "";
            }).trigger("click");
        });

        // Drag & drop
        $drop.on("dragover.essImage", function (e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = "copy";
            $drop.addClass("ess-image-drop-hover");
        });

        $drop.on("dragleave.essImage", function (e) {
            e.preventDefault();
            $drop.removeClass("ess-image-drop-hover");
        });

        $drop.on("drop.essImage", function (e) {
            e.preventDefault();
            $drop.removeClass("ess-image-drop-hover");

            var dt = e.originalEvent.dataTransfer;
            if (!dt || !dt.files || !dt.files.length) return;
            loadImageFileToField(dt.files[0], cfg);
        });
    }

    // Tạo mới 1 image field (ESS) từ dataUrl khi paste ảnh trên page trống
    function createImageFieldWithData(dataUrl) {
        var cfg = newConfig("image", "ess");
        cfg.imageData = dataUrl;

        render(cfg);
        builder.registerControl(cfg);

        builder.selectedControlId = cfg.id;
        builder.selectedControlType = "field";
        builder.highlightOutlineSelection();
        showProperties(cfg);
        builder.updateSelectionSizeHint();
    }

    function initGlobalImagePaste() {
        $(document).on("paste.essImage", function (e) {
            // Nếu builder đang ưu tiên dán control thì NHƯỜNG cho builder
            if (window.builder &&
                typeof builder.shouldPreferAppPaste === "function" &&
                builder.shouldPreferAppPaste()) {
                return;
            }

            var ev = e.originalEvent || e;
            var cd = ev.clipboardData;
            if (!cd || !cd.items || !cd.items.length) return;

            var item = null;
            for (var i = 0; i < cd.items.length; i++) {
                if (cd.items[i].type && cd.items[i].type.indexOf("image") === 0) {
                    item = cd.items[i];
                    break;
                }
            }
            if (!item) return;

            var file = item.getAsFile();
            if (!file) return;

            e.preventDefault();

            var reader = new FileReader();
            reader.onload = function (re) {
                var dataUrl = re.target.result;

                // ...
                // Sau khi xử lý xong ảnh, thử xóa clipboard hệ thống
                if (window.builder && typeof builder.clearSystemClipboard === "function") {
                    builder.clearSystemClipboard();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Khởi động handler paste ảnh (chỉ cần 1 lần)
    initGlobalImagePaste();


    // === IMAGE helper: đọc file -> dataURL, cập nhật DOM + config ===
    function handleEssImageFiles(files, $drop) {
        if (!files || !files.length) return;
        var file = files[0];
        if (!file || !file.type || file.type.indexOf("image/") !== 0) return;

        var fieldId = $drop.closest(".page-field").attr("data-id");
        if (!fieldId || !window.builder) return;

        var cfg = builder.getControlConfig(fieldId);
        if (!cfg) return;

        var reader = new FileReader();
        reader.onload = function (ev) {
            var dataUrl = ev.target.result;

            // Lưu vào config
            cfg.imageData = dataUrl;

            // Xoá style nền cũ nếu còn
            $drop
                .removeClass("ess-image-has-image")
                .css({
                    "background-image": "",
                    "background-size": "",
                    "background-position": ""
                });

            // Dựng lại DOM bên trong đúng chuẩn mới (img / placeholder)
            applyImageDomForField(cfg);

            builder.refreshJson();
        };
        reader.readAsDataURL(file);
    }



    // === ESS IMAGE: drag & drop ===
    $(document).on("dragenter dragover", ".ess-image-drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.originalEvent.dataTransfer.dropEffect = "copy";
        $(this).addClass("ess-image-drop-over");
    });

    $(document).on("dragleave dragend", ".ess-image-drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("ess-image-drop-over");
    });

    $(document).on("drop", ".ess-image-drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("ess-image-drop-over");
        var dt = e.originalEvent.dataTransfer;
        if (!dt || !dt.files) return;
        handleEssImageFiles(dt.files, $(this));
    });

    // Click chọn file
    $(document).on("click", ".ess-image-drop", function (e) {
        // để mousedown vẫn chọn field, click này chỉ trigger input file
        var $input = $(this).find("input[type='file']");
        if ($input.length) {
            $input.trigger("click");
        }
    });

    // Change file input
    $(document).on("change", ".ess-image-drop input[type='file']", function (e) {
        var files = this.files;
        var $drop = $(this).closest(".ess-image-drop");
        handleEssImageFiles(files, $drop);
        // reset để chọn lại cùng 1 file vẫn trigger change
        this.value = "";
    });

    // ---- PASTE ẢNH TỪ CLIPBOARD VÀO CANVAS / ESS IMAGE ----
    // ---- PASTE ẢNH TỪ CLIPBOARD VÀO CANVAS / ESS IMAGE ----
    $(document).on("paste", function (e) {
        var ev = e.originalEvent || e;

        // Nếu đang gõ trong input/textarea/select -> để user paste text bình thường
        var tag = (e.target && e.target.tagName || "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        // *** MỚI: nếu builder đang ưu tiên dán control thì bỏ qua handler ảnh này ***
        if (window.builder &&
            typeof builder.shouldPreferAppPaste === "function" &&
            builder.shouldPreferAppPaste()) {
            // Cho builder.js xử lý (paste control)
            return;
        }

        var cd = ev.clipboardData || window.clipboardData;
        if (!cd) return;

        var files = [];

        // Chrome/Edge/Firefox: clipboardData.items
        if (cd.items && cd.items.length) {
            for (var i = 0; i < cd.items.length; i++) {
                var it = cd.items[i];
                if (it.kind === "file" && it.type && it.type.indexOf("image/") === 0) {
                    files.push(it.getAsFile());
                }
            }
        }

        // Fallback: clipboardData.files
        if (!files.length && cd.files && cd.files.length) {
            for (var j = 0; j < cd.files.length; j++) {
                var f = cd.files[j];
                if (f.type && f.type.indexOf("image/") === 0) {
                    files.push(f);
                }
            }
        }

        // Không có file ảnh -> để dành cho paste text / paste control
        if (!files.length) return;

        // Từ đây trở đi: chắc chắn có ảnh => không cho paste control nữa
        e.preventDefault();
        e.stopImmediatePropagation();

        if (!window.builder) return;

        // 1. Ưu tiên: nếu đang chọn sẵn 1 field image thì dán vào đó
        var cfg = null;
        if (builder.selectedControlId) {
            cfg = builder.getControlConfig(builder.selectedControlId) || null;
        }

        // 2. Nếu chưa chọn hoặc không phải image -> tự tạo 1 ESS Image mới
        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image") {
            if (window.controlField && typeof controlField.addNew === "function") {
                controlField.addNew("image", "ess");
                if (builder.selectedControlId) {
                    cfg = builder.getControlConfig(builder.selectedControlId) || null;
                }
            }
        }

        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image") {
            return;
        }

        var $field = $('.canvas-control.page-field[data-id="' + cfg.id + '"]');
        var $drop = $field.find(".ess-image-drop").first();
        if (!$drop.length) return;

        handleEssImageFiles(files, $drop);

        // *** MỚI: sau khi paste ảnh xong, thử xóa clipboard hệ thống ***
        if (window.builder && typeof builder.clearSystemClipboard === "function") {
            builder.clearSystemClipboard();
        }
    });


    $(document).on("click", ".ess-number .ess-spin-up, .ess-number .ess-spin-down", function (e) {
        e.preventDefault();
        e.stopPropagation(); // tránh kéo field khi bấm nút

        var $btn = $(this);
        var isUp = $btn.hasClass("ess-spin-up");
        var $wrap = $btn.closest(".ess-number");
        var $input = $wrap.find("input[type='number']").first();
        if (!$input.length) return;

        var step = parseFloat($input.attr("step")) || 1;
        var minAttr = $input.attr("min");
        var maxAttr = $input.attr("max");

        var val = parseFloat($input.val());
        if (isNaN(val)) val = 0;
        val = isUp ? val + step : val - step;

        if (minAttr !== undefined && minAttr !== "") {
            var min = parseFloat(minAttr);
            if (!isNaN(min)) val = Math.max(val, min);
        }
        if (maxAttr !== undefined && maxAttr !== "") {
            var max = parseFloat(maxAttr);
            if (!isNaN(max)) val = Math.min(val, max);
        }

        $input.val(val);
        $input.trigger("change");
    });

    // ---- Tạo config mới cho 1 field ----
    function newConfig(ftype, uiMode) {
        var idx = builder.controls.length || 0;
        var id = "fld_" + ftype + "_" + Date.now();


        var defaultCaptionPosition = "left";
        if (ftype === "checkbox" || ftype === "radio") {
            defaultCaptionPosition = "right";
            // ↑ sửa thành đúng value của option "Right of control"
            //   vd <option value="right">Right of control</option>
        }



        var defWidth = 260;
        var defHeight = 26;
        if (ftype === "memo") defHeight = 80;
        if (ftype === "groupbox" || ftype === "section") {
            defWidth = 600;
            defHeight = 120;
        }

        if (ftype === "button") {
            defWidth = 50;   // nút vuông nhỏ kiểu "..."
            defHeight = 24;  // chiều cao chuẩn của nút
        }
        if (uiMode === "core") {
            // các control core cũ
            //if (ftype === "memo") {
            //    defHeight = 80;
            //} else if (ftype === "groupbox" || ftype === "section") {
            //    defWidth = 600;
            //    defHeight = 120;
            //} else if (ftype === "button") {
            //    defWidth = 60;
            //    defHeight = 24;
            //}
        }
        else if (uiMode === "ess") {
            // === ESS controls ===
            if (ftype === "text") {
                defWidth = 380;
                defHeight = 40;
            } else if (ftype === "combo") {
                defWidth = 380;
                defHeight = 40;
            } else if (ftype === "multiselect") {
                defWidth = 400;
                defHeight = 40;
            } else if (ftype === "date") {      // ESS Date
                defWidth = 380;   // rộng hơn 1 chút cho giống ESS
                defHeight = 40;   // cao giống ô date ngoài trang ESS
            } else if (ftype === "memo") {
                defWidth = 435;
                defHeight = 70;
            } else if (ftype === "button") {
                defWidth = 90;
                defHeight = 48;
            } else if (ftype === "numberic-test") {
                defWidth = 380;
                defHeight = 45;
            } else if (ftype === "tag") {
                defWidth = 110;
                defHeight = 30;
            } else if (ftype === "progress") {
                defWidth = 220;
                defHeight = 26;
            } else if (ftype === "image") {
                defWidth = 140;
                defHeight = 90;
            }
        }

        var caption =
            ftype === "label" ? "Label"
                : ftype === "groupbox" ? "Group"
                    : ftype === "section" ? "Section"
                        : ftype === "language" ? "Local Data Language"
                            : ftype === "numberic-test" ? "Numeric"
                                : ftype.charAt(0).toUpperCase() + ftype.slice(1);

        var cfg = {
            id: id,
            type: "field",
            ftype: ftype,
            uiMode: uiMode || "core",      // core / ess
            caption: caption,
            required: false,
            disabled: false,
            defaultValue: "",
            items: (ftype === "combo" ? ["Item 1", "Item 2"] : []),
            // Multi-select specific config
            multiselectColumns: (ftype === "multiselect" ? [
                { name: "value", caption: "Value", width: 150 },
                { name: "label", caption: "Label", width: 200 }
            ] : []),
            multiselectItems: (ftype === "multiselect" ? [
                { value: "all", label: "All" },
                { value: "month", label: "Month" }
            ] : []),
            multiselectSelectedValues: (ftype === "multiselect" ? [] : []),
            left: 20,
            top: 20 + idx * 35,
            width: defWidth,
            height: defHeight,
            labelWidth: 120,
            captionBold: false,
            captionItalic: false,
            captionPosition: defaultCaptionPosition,
            parentId: null,
            tabPageId: null,
            tabIndex: null,
            zIndex: (ftype === "groupbox" || ftype === "section") ? 0 : 1
        };

        // ĐIỀU CHỈNH RIÊNG CHO BUTTON
        if (ftype === "button") {
            cfg.caption = "";
            cfg.defaultValue = "...";
            cfg.labelWidth = 0;

            // ESS button: cấu hình màu
            if (uiMode === "ess") {
                cfg.btnBackColor = cfg.btnBackColor || "#ffffff";
                cfg.btnTextColor = cfg.btnTextColor || "#0A75BA";
                cfg.btnBorderColor = cfg.btnBorderColor || "#0A75BA"; // mặc định viền xanh
            }
        }

        // TAG – giống button nhưng style pill
        if (ftype === "tag") {
            cfg.caption = "";
            cfg.defaultValue = "In Progress";
            cfg.labelWidth = 0;

            if (uiMode === "ess") {
                cfg.tagBackColor = cfg.tagBackColor || "#0D9EFF";
                cfg.tagTextColor = cfg.tagTextColor || "#ffffff";
            }
        }

        // PROGRESSBAR
        if (ftype === "progress") {
            cfg.caption = "";
            cfg.defaultValue = "";
            cfg.labelWidth = 0;
            if (typeof cfg.progressValue !== "number") {
                cfg.progressValue = 0;
            }
        }

        // IMAGE
        if (ftype === "image") {
            cfg.caption = "";
            cfg.defaultValue = "";
            cfg.labelWidth = 0;
            cfg.imageData = cfg.imageData || null; // base64 hoặc url
        }

        return cfg;
    }


    // Lấy danh sách id mọi field là con/cháu/chắt của rootId
    function getDescendantFieldIds(rootId, includeRoot) {
        var result = [];
        var fields = (builder.controls || []).filter(function (c) {
            return c && c.type === "field";
        });

        var map = {};
        fields.forEach(function (f) {
            map[f.id] = f.parentId || null;
        });

        function isDescendant(id) {
            var cur = map[id];
            while (cur) {
                if (cur === rootId) return true;
                cur = map[cur];
            }
            return false;
        }

        fields.forEach(function (f) {
            if (includeRoot && f.id === rootId) {
                result.push(f.id);
            } else if (isDescendant(f.id)) {
                result.push(f.id);
            }
        });

        return result;
    }

    // CẬP NHẬT z-index cho toàn bộ field con của 1 container
    // baseZ: z-index muốn áp cho CON (thường = z-index container + 1)
    function updateDescendantsZIndex(rootId, baseZ) {
        if (!window.builder || !builder.controls) return;

        var ids = getDescendantFieldIds(rootId, false); // không lấy root
        if (!ids || !ids.length) return;

        ids.forEach(function (cid) {
            var childCfg = builder.getControlConfig(cid);
            if (!childCfg) return;

            childCfg.zIndex = baseZ;
            $('.canvas-control.page-field[data-id="' + cid + '"]').css("z-index", baseZ);
        });
    }



    // Di chuyển tất cả field con/cháu của rootId
    function moveDescendants(rootId, dx, dy, includeRoot) {
        var ids = getDescendantFieldIds(rootId, includeRoot);

        ids.forEach(function (id) {
            var c = builder.controls.find(function (x) { return x.id === id; });
            if (!c) return;

            var $dom = $('.canvas-control.page-field[data-id="' + id + '"]');
            var curL = parseFloat($dom.css("left")) || c.left || 0;
            var curT = parseFloat($dom.css("top")) || c.top || 0;
            var nl = curL + dx;
            var nt = curT + dy;

            $dom.css({ left: nl, top: nt });
            c.left = nl;
            c.top = nt;
        });
    }

    // Hiển thị/ẩn field theo Tab đang active
    function applyTabVisibilityFor(tabCfg) {
        var tabId = tabCfg.id;
        var activeIndex = tabCfg.activeTabIndex || 0;

        (builder.controls || []).forEach(function (c) {
            if (!c || c.type !== "field") return;
            if (c.tabPageId !== tabId) return;

            var $dom = $('.canvas-control.page-field[data-id="' + c.id + '"]');
            var idx = (typeof c.tabIndex === "number") ? c.tabIndex : 0;
            if (idx === activeIndex) $dom.show();
            else $dom.hide();
        });
    }

    function findParentContainerFor(fieldCfg) {
        var left = fieldCfg.left;
        var top = fieldCfg.top;
        var right = fieldCfg.left + fieldCfg.width;
        var bottom = fieldCfg.top + fieldCfg.height;

        var best = null;

        (builder.controls || []).forEach(function (c) {
            if (!c) return;
            if (c.id === fieldCfg.id) return;

            var isFieldContainer = (c.type === "field" &&
                (c.ftype === "groupbox" || c.ftype === "section"));
            var isTabPage = (c.type === "tabpage");
            var isPopup = (c.type === "popup");

            if (!isFieldContainer && !isTabPage && !isPopup) return;

            var cRight = c.left + c.width;
            var cBottom = c.top + c.height;

            if (left >= c.left && top >= c.top && right <= cRight && bottom <= cBottom) {
                if (!best || (c.left >= best.left && c.top >= best.top &&
                    c.width <= best.width && c.height <= best.height)) {
                    best = c;
                }
            }
        });

        return best ? best.id : null;
    }

    function updateFieldParent(fieldCfg) {
        var pid = findParentContainerFor(fieldCfg);
        fieldCfg.parentId = pid || null;

        // reset info tab
        fieldCfg.tabPageId = null;
        fieldCfg.tabIndex = null;

        var $dom = $('.canvas-control.page-field[data-id="' + fieldCfg.id + '"]');

        // Không nằm trong container nào → dùng z-index mặc định
        if (!pid) {
            var defZ = (fieldCfg.ftype === "groupbox" || fieldCfg.ftype === "section") ? 0 : 1;
            fieldCfg.zIndex = defZ;
            $dom.css("z-index", defZ);
            return;
        }

        var parentCfg = (builder.controls || []).find(function (c) { return c.id === pid; });
        if (!parentCfg) return;

        if (parentCfg.type === "tabpage") {
            fieldCfg.tabPageId = parentCfg.id;
            fieldCfg.tabIndex = parentCfg.activeTabIndex || 0;
        } else if (parentCfg.type === "field") {
            fieldCfg.tabPageId = parentCfg.tabPageId || null;
            if (typeof parentCfg.tabIndex === "number") {
                fieldCfg.tabIndex = parentCfg.tabIndex;
            }

            // ✅ FIX Z-INDEX: con phải nằm trên parent container
            var pz = parseInt(parentCfg.zIndex || "0", 10);
            if (isNaN(pz)) pz = 0;

            var childZ = pz + 1;
            fieldCfg.zIndex = childZ;
            $dom.css("z-index", childZ);

            // nếu bản thân fieldCfg cũng là container -> nâng luôn con của nó
            if (fieldCfg.ftype === "groupbox" || fieldCfg.ftype === "section") {
                updateDescendantsZIndex(fieldCfg.id, childZ + 1);
            }
        } else if (parentCfg.type === "popup") {
            // Field là con của popup
            var $popup = $('.popup-design[data-id="' + parentCfg.id + '"]');
            if ($popup.length && $dom.length) {
                // Đưa DOM field nằm ngay sau popup để đảm bảo vẽ phía trên
                $dom.insertAfter($popup);

                var popupZ = parseInt($popup.css("z-index") || "0", 10);
                if (isNaN(popupZ)) popupZ = 0;

                // z-index của chính field (section/group/textbox, ...)
                var newZ = popupZ + 1;
                fieldCfg.zIndex = newZ;
                $dom.css("z-index", newZ);

                // ✅ FIX: nếu chính nó là container (groupbox/section)
                // thì tăng luôn z-index cho toàn bộ field con bên trong,
                // để con không bị nằm dưới section/popup.
                if (fieldCfg.ftype === "groupbox" || fieldCfg.ftype === "section") {
                    // Cho tất cả con = newZ + 1 (cao hơn container)
                    updateDescendantsZIndex(fieldCfg.id, newZ + 1);
                }
            }
        }
    }

    function collectDescendants(rootId) {
        var result = [];

        function dfs(parentId) {
            (builder.controls || []).forEach(function (c) {
                if (!c || c.type !== "field") return;
                if (c.parentId === parentId) {
                    result.push(c.id);
                    dfs(c.id);
                }
            });
        }

        dfs(rootId);
        return result;
    }

    function deleteFieldWithChildren(fieldId) {
        if (!fieldId) return;

        var idsToRemove = [fieldId].concat(collectDescendants(fieldId));

        idsToRemove.forEach(function (id) {
            $('.canvas-control.page-field[data-id="' + id + '"]').remove();
        });

        builder.controls = (builder.controls || []).filter(function (c) {
            return !(c && c.type === "field" && idsToRemove.indexOf(c.id) >= 0);
        });

        multiSelectedIds = [];
        if (builder.selectedControlId && idsToRemove.indexOf(builder.selectedControlId) >= 0) {
            builder.selectedControlId = null;
        }
        $(".page-field").removeClass("page-field-selected");

        builder.refreshJson();
    }


    // Layout cho field thường (không group/section/language)
    function applyLayout($field, cfg) {
        if (cfg.ftype === "groupbox" || cfg.ftype === "section" || cfg.ftype === "language")
            return;

        var uiMode = cfg.uiMode || "core";
        var isEss = uiMode === "ess";

        var $cap = $field.find(".page-field-caption");
        var $editor = $field.find(".page-field-editor");

        var isButton = (cfg.ftype === "button");
        var isTag = (cfg.ftype === "tag");
        var isProgress = (cfg.ftype === "progress");
        var isImage = (cfg.ftype === "image");
        var isButtonLike = isButton || isTag || isProgress || isImage;

        var isCheck = (cfg.ftype === "checkbox" || cfg.ftype === "radio");
        var pos = cfg.captionPosition || "left";
        var hasCaption = !!(cfg.caption && cfg.caption.trim() !== "");

        // BUTTON-LIKE: không caption, editor chiếm full
        if (isButtonLike) {
            $cap.hide();

            var totalW = cfg.width || $field.outerWidth() || 50;
            var totalH = cfg.height || $field.outerHeight() || 24;

            $field.css({
                width: totalW,
                height: totalH
            });

            $editor.css({
                width: "100%",
                height: "100%",
                display: isEss ? "flex" : "block",
                "align-items": isEss ? "center" : ""
            });

            if (isButton) {
                $editor.find("button").css({
                    width: "100%",
                    height: "100%"
                });
            } else if (isTag) {
                $editor.find(".ess-tag").css({
                    maxWidth: "100%"
                });
            } else if (isProgress) {
                $editor.find(".ess-progress").css({
                    width: "100%"
                });
            } else if (isImage) {
                $editor.find(".ess-image-drop").css({
                    width: "100%",
                    height: "100%"
                });
            }

            return;
        }

        // Không có caption -> editor full width
        if (!hasCaption) {
            $cap.hide();
            if (isEss) {
                $editor.css({
                    flex: "1 1 auto",
                    width: "100%",
                    display: "flex"
                });
            } else {
                var totalW2 = cfg.width || $field.outerWidth() || 260;
                $editor.css({
                    width: totalW2 + "px",
                    display: "inline-block"
                });
            }
            return;
        } else {
            $cap.show();
        }

        // CHECKBOX / RADIO – giữ logic cũ
        if (isCheck) {
            if (pos === "right") {
                if ($editor.index() > $cap.index()) {
                    $editor.insertBefore($cap);
                }

                $editor.css({
                    width: "auto",
                    display: "inline-block"
                });

                $cap.css({
                    width: "auto",
                    display: "inline-block",
                    "margin-left": "4px"
                });

                return;
            } else {
                if ($cap.index() > $editor.index()) {
                    $cap.insertBefore($editor);
                }
            }
        }

        // Layout 2 cột: Caption + Editor
        var labelWidth = cfg.labelWidth || 120;
        var totalWidth = cfg.width || $field.outerWidth() || 260;
        var editorWidth = Math.max(40, totalWidth - labelWidth - 10);

        if (isEss) {
            // ESS: dùng flex, caption cố định, editor co giãn
            $field.css("width", totalWidth + "px");

            $cap.css({
                width: labelWidth + "px",
                flex: "0 0 " + labelWidth + "px",
                display: "block"   // wrap đẹp hơn
            });

            $editor.css({
                flex: "1 1 auto",
                width: "auto",
                display: "flex"
            });
        } else {
            // CORE: inline-block như cũ
            $cap.css({
                width: labelWidth + "px",
                display: "inline-block"
            });
            $editor.css({
                width: editorWidth + "px",
                display: "inline-block"
            });
        }
    }

    // ESS: set height cho input/select/textarea/button bên trong theo height field
    function applyEssInnerHeight($field, cfg) {
        if (cfg.uiMode !== "ess") return;
        if (cfg.ftype === "groupbox" || cfg.ftype === "section" || cfg.ftype === "language") return;

        var h = cfg.height || $field.outerHeight() || 0;
        if (!h) return;

        // Vùng bên trong trừ padding top/bottom 4px
        var innerH = Math.max(18, h - 8);

        // Canh giữa caption theo chiều dọc cho ESS
        var $cap = $field.find(".page-field-caption");
        if ($cap.length) {
            // Nếu caption dài -> cho wrap => KHÔNG ép line-height = innerH
            $cap.css({
                height: "auto",
                "line-height": "1.2",
                "padding-top": "2px",
                "padding-bottom": "2px"
            });
        }

        // ==== ESS DATE: input-group + icon calendar ====
        if (cfg.ftype === "date") {
            var $grp = $field.find(".ess-date.input-group");
            if ($grp.length) {
                $grp.css("height", innerH + "px");

                var $input = $grp.find("input.form-control");
                var $addon = $grp.find(".ess-date-addon");

                $input.css({
                    height: innerH + "px",
                    "line-height": innerH + "px"
                });

                $addon.css({
                    height: (innerH - 2) + "px",
                    "line-height": innerH + "px"
                });

                return; // đã xử lý xong date thì thoát
            }
        }

        // ==== Các ESS control khác ====
        var $inner = null;
        var hInner = innerH;

        if (cfg.ftype === "memo") {
            $inner = $field.find(".page-field-editor textarea");
        } else if (cfg.ftype === "button") {
            // ESS button – chừa thêm chút cho border/padding
            $inner = $field.find(".page-field-editor button");
            hInner = Math.max(22, h - 12);
        } else if (cfg.ftype === "tag") {
            $inner = $field.find(".ess-tag");
        } else if (cfg.ftype === "progress") {
            $inner = $field.find(".ess-progress");
        } else if (cfg.ftype === "image") {
            $inner = $field.find(".ess-image-drop");
        } else if (cfg.ftype === "multiselect") {
            $inner = $field.find(".core-multiselect-btn");
        } else {
            $inner = $field.find(".page-field-editor").find("input,select,textarea");
        }

        if (!$inner || !$inner.length) return;

        $inner.css("height", hInner + "px");
    }

    // Render multi-select dropdown
    function renderMultiSelect(cfg) {
        var $wrapper = $('<div class="core-multiselect-wrapper"></div>');
        var $button = $('<button type="button" class="core-multiselect-btn" tabindex="-1">' +
            '<span class="core-multiselect-text">Select...</span>' +
            '<span class="core-multiselect-arrow">▼</span>' +
            '</button>');
        var $dropdown = $('<div class="core-multiselect-dropdown" style="display: none;">' +
            '<div class="core-multiselect-table-container">' +
            '<table class="core-multiselect-table">' +
            '<thead><tr></tr></thead>' +
            '<tbody></tbody>' +
            '</table>' +
            '</div>' +
            '</div>');
        
        $wrapper.append($button).append($dropdown);
        
        // Initialize dropdown content
        updateMultiSelectDropdown(cfg, $dropdown);
        
        // Toggle dropdown
        $button.on('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            var isOpen = $dropdown.is(':visible');
            $('.core-multiselect-dropdown').hide(); // Close all other dropdowns
            $dropdown.toggle(!isOpen);
        });
        
        // Close when clicking outside
        $(document).on('click.coreMultiselect', function(e) {
            if (!$(e.target).closest('.core-multiselect-wrapper').length) {
                $dropdown.hide();
            }
        });
        
        // Checkbox change handler
        $dropdown.on('change', 'input[type="checkbox"]', function() {
            var value = $(this).val();
            var selected = cfg.multiselectSelectedValues || [];
            if ($(this).is(':checked')) {
                if (selected.indexOf(value) === -1) {
                    selected.push(value);
                }
            } else {
                var idx = selected.indexOf(value);
                if (idx !== -1) {
                    selected.splice(idx, 1);
                }
            }
            cfg.multiselectSelectedValues = selected;
            updateMultiSelectButton($button, cfg);
            builder.refreshJson();
        });
        
        // Update button text
        updateMultiSelectButton($button, cfg);
        
        return $wrapper;
    }
    
    function updateMultiSelectDropdown(cfg, $dropdown) {
        var columns = cfg.multiselectColumns || [];
        var items = cfg.multiselectItems || [];
        var selectedValues = cfg.multiselectSelectedValues || [];
        
        // Build header
        var $thead = $dropdown.find('thead tr');
        $thead.empty();
        $thead.append('<th style="width: 30px;"><input type="checkbox" class="core-multiselect-select-all" /></th>');
        columns.forEach(function(col) {
            $thead.append('<th style="width: ' + (col.width || 150) + 'px;">' + (col.caption || col.name) + '</th>');
        });
        
        // Build body
        var $tbody = $dropdown.find('tbody');
        $tbody.empty();
        items.forEach(function(item) {
            var $row = $('<tr></tr>');
            var value = item.value || item[columns[0]?.name] || '';
            var isSelected = selectedValues.indexOf(value) !== -1;
            
            $row.append('<td><input type="checkbox" value="' + value + '" ' + (isSelected ? 'checked' : '') + ' /></td>');
            columns.forEach(function(col) {
                var cellValue = item[col.name] || '';
                $row.append('<td>' + cellValue + '</td>');
            });
            $tbody.append($row);
        });
        
        // Select all handler
        $dropdown.find('.core-multiselect-select-all').off('change').on('change', function() {
            var checked = $(this).is(':checked');
            $dropdown.find('tbody input[type="checkbox"]').prop('checked', checked);
            if (checked) {
                cfg.multiselectSelectedValues = items.map(function(item) {
                    return item.value || item[columns[0]?.name] || '';
                });
            } else {
                cfg.multiselectSelectedValues = [];
            }
            updateMultiSelectButton($dropdown.closest('.core-multiselect-wrapper').find('.core-multiselect-btn'), cfg);
            builder.refreshJson();
        });
    }
    
    function updateMultiSelectButton($button, cfg) {
        var selectedValues = cfg.multiselectSelectedValues || [];
        var items = cfg.multiselectItems || [];
        var columns = cfg.multiselectColumns || [];
        var displayColumn = columns[0]?.name || 'label';
        
        if (selectedValues.length === 0) {
            $button.find('.core-multiselect-text').text('Select...');
        } else if (selectedValues.length === 1) {
            var item = items.find(function(it) {
                return (it.value || it[columns[0]?.name] || '') === selectedValues[0];
            });
            var text = item ? (item[displayColumn] || item.value || selectedValues[0]) : selectedValues[0];
            $button.find('.core-multiselect-text').text(text);
        } else {
            $button.find('.core-multiselect-text').text(selectedValues.length + ' items selected');
        }
    }

    function render(cfg) {
        var $canvas = $("#canvas");

        if ((cfg.ftype === "checkbox" || cfg.ftype === "radio") && !cfg.captionPosition) {
            cfg.captionPosition = "left";
        }
        if (!cfg.uiMode) cfg.uiMode = "core"; // field cũ load lên -> core

        var uiMode = cfg.uiMode || "core";
        var extraClass = uiMode === "ess" ? " ess-field" : " core-field";

        var $field;
        var isContainer = (cfg.ftype === "groupbox" || cfg.ftype === "section");

        if (cfg.ftype === "groupbox") {
            $field = $(`
<div class="canvas-control page-field page-field-groupbox${extraClass}" data-id="${cfg.id}">
  <div class="page-field-groupbox-title">${cfg.caption != null ? cfg.caption : "Group"}</div>
  <div class="page-field-resizer"></div>
</div>`);
        } else if (cfg.ftype === "section") {
            $field = $(`
<div class="canvas-control page-field page-field-section${extraClass}" data-id="${cfg.id}">
  <div class="page-field-section-header">${cfg.caption != null ? cfg.caption : "Section"}</div>
  <div class="page-field-resizer"></div>
</div>`);
        } else {
            $field = $(`
<div class="canvas-control page-field${extraClass}" data-id="${cfg.id}">
  <label class="page-field-caption"></label>
  <div class="page-field-editor"></div>
  <div class="page-field-resizer"></div>
</div>`);

            var $cap = $field.find(".page-field-caption");

            if (cfg.ftype === "button") {
                $cap.text("").hide();
            } else {
                var capText = (cfg.caption != null ? cfg.caption : cfg.ftype);
                $cap.text(capText);
                $cap.css("font-weight", cfg.captionBold ? "700" : "normal");
                $cap.css("font-style", cfg.captionItalic ? "italic" : "normal");
            }

            if (cfg.required) {
                $cap.addClass("page-field-caption-required");
            }

            var $editor;
            switch (cfg.ftype) {
                case "text":
                    $editor = $('<input type="text" />');
                    break;

                case "date":
                    if (cfg.uiMode === "ess") {
                        $editor = $(`
<div class="ess-date input-group">
    <input type="text" class="form-control ess-date-input" />
    <span class="input-group-text ess-date-addon">
        <i class="bi bi-calendar3"></i>
    </span>
</div>`);
                    } else {
                        $editor = $('<input type="date" class="core-date-input" />');
                    }
                    break;

                case "number":
                    $editor = $(`
<div class="core-number">
    <input type="number" class="core-number-input" />
    <button type="button" class="core-spin-up">▲</button>
    <button type="button" class="core-spin-down">▼</button>
</div>`);
                    break;
                case "numberic-test":
                    $editor = $(`
<div class="ess-number">
    <input type="number" class="ess-number-input" />
    <button type="button" class="ess-spin-up">▲</button>
    <button type="button" class="ess-spin-down">▼</button>
</div>`);
                    break;
                case "combo":
                    $editor = $('<select></select>');
                    (cfg.items || []).forEach(function (it) {
                        $("<option>").text(it).val(it).appendTo($editor);
                    });
                    break;
                case "multiselect":
                    $editor = renderMultiSelect(cfg);
                    break;
                case "memo":
                    $editor = $('<textarea rows="3"></textarea>');
                    break;
                case "label":
                    $editor = $('<span></span>');
                    break;
                case "checkbox":
                    $editor = $('<label><input type="checkbox" /> <span>' +
                        (cfg.defaultValue || "") + '</span></label>');
                    break;
                case "radio":
                    $editor = $('<label><input type="radio" /> <span>' +
                        (cfg.defaultValue || "") + '</span></label>');
                    break;
                case "language":
                    $editor = $('<select class="page-lang-select-en"><option>English</option></select>');
                    break;
                case "button":
                    var btnCls = "page-field-button-editor" + (cfg.uiMode === "ess" ? " ess-button" : "");
                    $editor = $('<button type="button" class="' + btnCls + '"></button>');
                    
                    // Add icon if exists
                    if (cfg.uiMode === "ess" && cfg.btnIcon && cfg.btnIconType && cfg.btnIconType !== "none") {
                        if (cfg.btnIconType === "glyphicon") {
                            var $icon = $('<span class="' + cfg.btnIcon + '"></span>');
                            // Set color for Glyphicon icon to match button border color
                            var iconColor = cfg.btnBorderColor || "#0A75BA";
                            $icon.css({
                                "font-size": "14px",
                                "margin-right": "4px",
                                "color": iconColor
                            });
                            $editor.append($icon);
                        } else if (cfg.btnIconType === "menu" && cfg.btnIcon) {
                            var $icon = $('<img src="' + cfg.btnIcon + '" />');
                            $icon.css({
                                "width": "16px",
                                "height": "16px",
                                "vertical-align": "middle",
                                "margin-right": "4px"
                            });
                            $editor.append($icon);
                        }
                    }
                    
                    $editor.append(document.createTextNode(cfg.defaultValue || cfg.caption || "Button"));
                    if (cfg.disabled) $editor.prop("disabled", true);

                    // Áp màu cho ESS button
                    if (cfg.uiMode === "ess") {
                        cfg.btnBackColor = cfg.btnBackColor || "#ed120b";
                        cfg.btnTextColor = cfg.btnTextColor || "#ffffff";
                        cfg.btnBorderColor = cfg.btnBorderColor || "#0A75BA";

                        $editor.css({
                            "background-color": cfg.btnBackColor,
                            "color": cfg.btnTextColor,
                            "border-color": cfg.btnBorderColor
                        });
                    }
                    break;

                case "tag":
                    var tagText = cfg.defaultValue || "In Progress";
                    var tagBg = cfg.tagBackColor || "#0D9EFF";
                    var tagColor = cfg.tagTextColor || "#ffffff";
                    
                    // ✅ Escape HTML để tránh XSS và đảm bảo text được render đúng
                    var escapedText = $('<div>').text(tagText || "In Progress").html();
                    
                    $editor = $(`
<div class="ess-tag">
  <span class="ess-tag-icon"><i class="bi bi-tag-fill"></i></span>
  <span class="ess-tag-text">` + escapedText + `</span>
</div>`);
                    // ✅ Set text trực tiếp vào HTML và đảm bảo nó không bị mất
                    $editor.find(".ess-tag-text").html(escapedText);
                    $editor.find(".ess-tag-text").text(tagText || "In Progress"); // Set cả text() để đảm bảo
                    $editor.css({
                        "background-color": tagBg,
                        "color": tagColor
                    });
                    break;

                case "progress":
                    var val = (typeof cfg.progressValue === "number") ? cfg.progressValue : 0;
                    val = Math.max(0, Math.min(100, val));
                    cfg.progressValue = val;
                    $editor = $(`
<div class="ess-progress">
  <div class="ess-progress-track">
    <div class="ess-progress-fill" style="width:${val}%;"></div>
  </div>
  <div class="ess-progress-text">${val}%</div>
</div>`);
                    break;

                case "image":
                    var mode = getImageMode(cfg);
                    var innerHtml = cfg.imageData
                        ? '<img class="ess-image-img" src="' + cfg.imageData + '" />'
                        : '<span class="ess-image-placeholder">Drop / paste image</span>';

                    $editor = $(`
<div class="ess-image-drop">
  <div class="ess-image-inner ess-image-mode-${mode}">
    ${innerHtml}
  </div>
</div>`);
                    break;



                default:
                    $editor = $('<input type="text" />');
                    break;
            }

            // Gán defaultValue cho vài loại đặc biệt
            if (cfg.ftype === "label" && cfg.defaultValue) {
                $editor.text(cfg.defaultValue);
            } else if ((cfg.ftype === "checkbox" || cfg.ftype === "radio") && cfg.defaultValue) {
                $editor.find("span").text(cfg.defaultValue);
            } else if (cfg.ftype === "number" || cfg.ftype === "numberic-test" && cfg.defaultValue) {
                $editor.find("input[type='number']").val(cfg.defaultValue);
            } else if (cfg.ftype === "button" && cfg.defaultValue) {
                $editor.text(cfg.defaultValue);
            } else if (cfg.ftype === "date" && cfg.defaultValue) {
                if (cfg.uiMode === "ess") {
                    $editor.find("input[type='text']").val(cfg.defaultValue);
                } else {
                    $editor.val(cfg.defaultValue);
                }
            } else if (!["combo", "multiselect", "checkbox", "radio", "language", "label", "button", "tag", "image", "progress"].includes(cfg.ftype) && cfg.defaultValue) {
                $editor.val(cfg.defaultValue);
            }
            
            // Update multiselect dropdown if needed
            if (cfg.ftype === "multiselect") {
                var $wrapper = $editor;
                var $dropdown = $wrapper.find('.core-multiselect-dropdown');
                if ($dropdown.length) {
                    updateMultiSelectDropdown(cfg, $dropdown);
                    updateMultiSelectButton($wrapper.find('.core-multiselect-btn'), cfg);
                }
            }

            // nếu load lại image từ JSON
            if (cfg.ftype === "image" && cfg.imageData) {
                var $img = $editor.find("img.ess-image");
                $img.attr("src", cfg.imageData).show();
                $editor.find(".ess-image-placeholder").hide();
            }

            $field.find(".page-field-editor").append($editor);
        }

        $canvas.append($field);

        if (cfg.ftype === "image") {
            initEssImageDrop($field, cfg);
        }

        $field.css({
            left: cfg.left,
            top: cfg.top,
            width: cfg.width,
            height: cfg.height
        });

        // ESS: đồng bộ chiều cao input/memo/button với height field
        applyEssInnerHeight($field, cfg);

        if (cfg.disabled) {
            if (cfg.ftype === "button") {
                $field.find(".page-field-editor button").prop("disabled", true);
            } else if (cfg.ftype !== "label") {
                $field.find(".page-field-editor")
                    .find("input,select,textarea,button")
                    .prop("disabled", true);
            }
            $field.addClass("page-field-disabled");
        }

        if (!isContainer && cfg.ftype !== "language") {
            applyLayout($field, cfg);
        }

        if (cfg.zIndex != null) {
            $field.css("z-index", cfg.zIndex);
        }

        // DRAG + RESIZE - Cải thiện để tránh conflict
        // Thêm resize handles vào DOM
        var $resizeHandleRight = $('<div class="page-field-resize-handle-right"></div>');
        var $resizeHandleBottom = $('<div class="page-field-resize-handle-bottom"></div>');
        var $resizeHandleCorner = $('<div class="page-field-resizer"></div>');
        $field.append($resizeHandleRight).append($resizeHandleBottom).append($resizeHandleCorner);

        var fieldInteractable = interact($field[0]);
        var isResizing = false;
        var dragStartTime = 0;
        var dragStartPos = null;

        // DRAG - chỉ cho phép khi không phải từ resize handles
        fieldInteractable.draggable({
            ignoreFrom: "input, select, textarea, .page-field-resizer, .page-field-resize-handle-right, .page-field-resize-handle-bottom",
            // Thêm threshold để phân biệt drag vs resize
            startAxis: 'xy',
            lockAxis: false,
            listeners: {
                start: function (ev) {
                    // Kiểm tra nếu click vào resize handle thì không drag
                    var $target = $(ev.target);
                    if ($target.hasClass('page-field-resizer') || 
                        $target.hasClass('page-field-resize-handle-right') || 
                        $target.hasClass('page-field-resize-handle-bottom') ||
                        $target.closest('.page-field-resizer, .page-field-resize-handle-right, .page-field-resize-handle-bottom').length) {
                        return false;
                    }
                    
                    dragStartTime = Date.now();
                    dragStartPos = { x: ev.clientX, y: ev.clientY };
                    $field.addClass("page-field-dragging");
                    builder.beginDragSelection(cfg.id);
                },
                move: function (ev) {
                    // Nếu đang resize thì không drag
                    if (isResizing) return;

                    var dx = ev.dx;
                    var dy = ev.dy;

                    // --- NEW: không cho kéo ra ngoài top/left của canvas ---
                    var $sel = $("#canvas .page-field.page-field-selected");
                    if ($sel.length) {
                        var minLeft = Infinity;
                        var minTop = Infinity;

                        $sel.each(function () {
                            var l = parseFloat($(this).css("left")) || 0;
                            var t = parseFloat($(this).css("top")) || 0;
                            if (l < minLeft) minLeft = l;
                            if (t < minTop) minTop = t;
                        });

                        if (minLeft + dx < 0) dx = -minLeft; // không cho < 0
                        if (minTop + dy < 0) dy = -minTop;
                    }
                    // --------------------------------------------------------

                    // Di chuyển selection (builder sẽ lo phần auto-extend canvas)
                    builder.dragSelectionMove(dx, dy);
                    
                    // ✅ Nếu field thuộc group nhưng không được chọn, di chuyển cả group
                    if (cfg.groupId && builder && typeof builder.moveGroupControls === "function") {
                        // Kiểm tra xem field này có trong _dragSelectionIds không
                        var isInDragSelection = builder._dragSelectionIds && builder._dragSelectionIds.indexOf(cfg.id) >= 0;
                        if (!isInDragSelection) {
                            // Field này không được chọn nhưng thuộc group → di chuyển cả group
                            builder.moveGroupControls(cfg.groupId, dx, dy);
                        }
                    }
                    
                    builder.updateSelectionSizeHint();
                },
                end: function () {
                    $field.removeClass("page-field-dragging");
                    updateFieldParent(cfg);
                    builder.endDragSelection();
                    isResizing = false;
                    dragStartTime = 0;
                    dragStartPos = null;
                }
            }
        });

        // RESIZE - chỉ cho phép từ resize handles
        fieldInteractable.resizable({
            edges: { left: false, top: false, right: true, bottom: true },
            // Chỉ cho resize từ các handles
            allowFrom: ".page-field-resizer, .page-field-resize-handle-right, .page-field-resize-handle-bottom",
            // Tăng margin để dễ bắt
            margin: 5,
            listeners: {
                start: function (ev) {
                    isResizing = true;
                },
                move: function (ev) {
                    var target = ev.target;
                    var id = $(target).attr("data-id");
                    var cfg = builder.getControlConfig(id);
                    if (!cfg) return;

                    var newW = (cfg.width || target.offsetWidth) + ev.deltaRect.width;
                    var newH = (cfg.height || target.offsetHeight) + ev.deltaRect.height;

                    if (newW < 40) newW = 40;
                    if (newH < 20) newH = 20;

                    if (builder.snapEnabled) {
                        newW = Math.round(newW / builder.snapStep) * builder.snapStep;
                        newH = Math.round(newH / builder.snapStep) * builder.snapStep;
                    } else {
                        newW = Math.round(newW);
                        newH = Math.round(newH);
                    }

                    cfg.width = newW;
                    cfg.height = newH;

                    $(target).css({
                        width: newW + "px",
                        height: newH + "px"
                    });

                    if (cfg.ftype && cfg.ftype !== "groupbox" && cfg.ftype !== "section" && cfg.ftype !== "language") {
                        applyLayout($(target), cfg);
                    }

                    // ESS: cập nhật height bên trong
                    applyEssInnerHeight($(target), cfg);

                    builder.updateSelectionSizeHint();
                },
                end: function () {
                    isResizing = false;
                    builder.refreshJson();
                }
            }
        });

        // chọn field
        $field.on("mousedown", function (e) {
            e.stopPropagation();

            if (window.controlPopup && typeof controlPopup.clearSelection === "function") {
                controlPopup.clearSelection();
            }

            if (e.ctrlKey || e.metaKey) {
                var idx = multiSelectedIds.indexOf(cfg.id);
                if (idx >= 0) {
                    multiSelectedIds.splice(idx, 1);
                    $(this).removeClass("page-field-selected");
                } else {
                    multiSelectedIds.push(cfg.id);
                    $(this).addClass("page-field-selected");
                }
            } else {
                var alreadySelected = $(this).hasClass("page-field-selected");
                var multiDomCount = $("#canvas .page-field.page-field-selected").length;

                if (alreadySelected && multiDomCount > 1) {
                    multiSelectedIds = [];
                    $("#canvas .page-field.page-field-selected").each(function () {
                        var id = $(this).attr("data-id");
                        if (id) multiSelectedIds.push(id);
                    });
                } else {
                    multiSelectedIds = [cfg.id];
                    $(".canvas-control").removeClass("canvas-control-selected");
                    $(".page-field").removeClass("page-field-selected");
                    $(this).addClass("page-field-selected");
                }
            }

            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "field";
            builder.highlightOutlineSelection();
            showProperties(cfg);
            builder.updateSelectionSizeHint();
        });
    }
    function showProperties(cfg) {
        if (typeof cfg.width === "number") cfg.width = Math.round(cfg.width);
        if (typeof cfg.height === "number") cfg.height = Math.round(cfg.height);

        var isContainer = (cfg.ftype === "groupbox" || cfg.ftype === "section");
        var isCombo = cfg.ftype === "combo";
        var isMultiSelect = cfg.ftype === "multiselect";
        var isCheckRadio = (cfg.ftype === "checkbox" || cfg.ftype === "radio");
        var isButton = (cfg.ftype === "button");
        var isTag = (cfg.ftype === "tag");
        var isProgress = (cfg.ftype === "progress");
        var isImage = (cfg.ftype === "image");
        var isEssButton = isButton && (cfg.uiMode === "ess");
        var isEssTag = isTag && (cfg.uiMode === "ess");


        var imageModeHtml = "";
        if (isImage) {
            var imode = cfg.imageMode || "fit";
            imageModeHtml = '<div class="ess-col-card" style="margin-bottom:12px;">' +
                '<div class="ess-col-card-header">' +
                '<span style="font-size:12px; color:#0078d4; font-weight:600;">🖼️ Image Mode</span>' +
                '</div>' +
                '<div class="ess-col-card-body">' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">🖼️</span><strong>Mode:</strong></label>' +
                '<select id="pfImageMode" class="ess-col-input">' +
                '<option value="fit"' + (imode === "fit" ? " selected" : "") + '>Fit (contain)</option>' +
                '<option value="fill"' + (imode === "fill" ? " selected" : "") + '>Fill (cover)</option>' +
                '<option value="stretch"' + (imode === "stretch" ? " selected" : "") + '>Stretch (distort)</option>' +
                '<option value="center"' + (imode === "center" ? " selected" : "") + '>Center (original)</option>' +
                '</select>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        if (isCheckRadio && !cfg.captionPosition) {
            cfg.captionPosition = "left";
        }

        var capPosHtml = "";
        if (isCheckRadio) {
            var capPos = cfg.captionPosition || "left";
            capPosHtml = '<div class="ess-col-card" style="margin-bottom:12px;">' +
                '<div class="ess-col-card-header">' +
                '<span style="font-size:12px; color:#0078d4; font-weight:600;">📍 Caption Position</span>' +
                '</div>' +
                '<div class="ess-col-card-body">' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">📍</span><strong>Position:</strong></label>' +
                '<select id="pfCapPos" class="ess-col-input">' +
                '<option value="left"' + (capPos === "left" ? " selected" : "") + '>Left of control</option>' +
                '<option value="right"' + (capPos === "right" ? " selected" : "") + '>Right of control</option>' +
                '</select>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        var defaultLabel;
        if (isButton) defaultLabel = "Button text:";
        else if (isTag) defaultLabel = "Tag text:";
        else defaultLabel = "Default value:";

        var hideDefaultSection = isContainer || isImage;

        var buttonColorHtml = "";
        var tagColorHtml = "";

        function normalizeColor(val, fallback) {
            if (!val) return fallback;
            val = $.trim(val);

            // "fff" -> "#FFFFFF"
            if (/^[0-9a-f]{3}$/i.test(val)) {
                var r = val[0], g = val[1], b = val[2];
                return ("#" + r + r + g + g + b + b).toUpperCase();
            }

            // "ffffff" -> "#FFFFFF"
            if (/^[0-9a-f]{6}$/i.test(val)) {
                return ("#" + val).toUpperCase();
            }

            // "#fff" -> "#FFFFFF"
            if (/^#[0-9a-f]{3}$/i.test(val)) {
                var r2 = val[1], g2 = val[2], b2 = val[3];
                return ("#" + r2 + r2 + g2 + g2 + b2 + b2).toUpperCase();
            }

            // "#ffffff" -> "#FFFFFF"
            if (/^#[0-9a-f]{6}$/i.test(val)) {
                return val.toUpperCase();
            }

            return fallback;
        }

        if (isEssButton) {
            var back = normalizeColor(cfg.btnBackColor, "#ed120b");
            var text = normalizeColor(cfg.btnTextColor, "#ffffff");
            var border = normalizeColor(cfg.btnBorderColor, "#0A75BA");

            cfg.btnBackColor = back;
            cfg.btnTextColor = text;
            cfg.btnBorderColor = border;

            buttonColorHtml = '<div class="ess-col-card" style="margin-bottom:12px;">' +
                '<div class="ess-col-card-header">' +
                '<span style="font-size:12px; color:#0078d4; font-weight:600;">🎨 Button Colors</span>' +
                '</div>' +
                '<div class="ess-col-card-body">' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">🎨</span><strong>Background:</strong></label>' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                '<input id="pfBtnBackColorPicker" type="color" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + back + '">' +
                '<input id="pfBtnBackColor" type="text" class="ess-col-input" style="flex:1;" value="' + back + '">' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">🎨</span><strong>Text:</strong></label>' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                '<input id="pfBtnTextColorPicker" type="color" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + text + '">' +
                '<input id="pfBtnTextColor" type="text" class="ess-col-input" style="flex:1;" value="' + text + '">' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">🎨</span><strong>Border:</strong></label>' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                '<input id="pfBtnBorderColorPicker" type="color" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + border + '">' +
                '<input id="pfBtnBorderColor" type="text" class="ess-col-input" style="flex:1;" value="' + border + '">' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        if (isEssTag) {
            var tBack = normalizeColor(cfg.tagBackColor, "#0D9EFF");
            var tText = normalizeColor(cfg.tagTextColor, "#ffffff");

            cfg.tagBackColor = tBack;
            cfg.tagTextColor = tText;

            tagColorHtml = '<div class="ess-col-card" style="margin-bottom:12px;">' +
                '<div class="ess-col-card-header">' +
                '<span style="font-size:12px; color:#0078d4; font-weight:600;">🏷️ Tag Colors</span>' +
                '</div>' +
                '<div class="ess-col-card-body">' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">🏷️</span><strong>Background:</strong></label>' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                '<input id="pfTagBackColorPicker" type="color" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + tBack + '">' +
                '<input id="pfTagBackColor" type="text" class="ess-col-input" style="flex:1;" value="' + tBack + '">' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">🏷️</span><strong>Text:</strong></label>' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                '<input id="pfTagTextColorPicker" type="color" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + tText + '">' +
                '<input id="pfTagTextColor" type="text" class="ess-col-input" style="flex:1;" value="' + tText + '">' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        var progressHtml = "";
        if (isProgress) {
            var val = (typeof cfg.progressValue === "number") ? cfg.progressValue : 0;
            val = Math.max(0, Math.min(100, val));
            cfg.progressValue = val;
            progressHtml = '<div class="ess-col-card" style="margin-bottom:12px;">' +
                '<div class="ess-col-card-header">' +
                '<span style="font-size:12px; color:#0078d4; font-weight:600;">📊 Progress</span>' +
                '</div>' +
                '<div class="ess-col-card-body">' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                '<label><span style="color:#0078d4;">📊</span><strong>Progress (%):</strong></label>' +
                '<input id="pfProgressValue" type="number" min="0" max="100" class="ess-col-input" style="max-width:150px;" value="' + val + '" />' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        // Cải cách Properties panel với style chuyên nghiệp
        var html = [];
        html.push('<div class="ess-prop-tab-content ess-prop-tab-active" style="padding:12px;">');
        html.push('<h3 style="margin:0 0 12px 0; font-size:14px; font-weight:600; color:#0078d4;">Field Properties</h3>');
        
        // Basic Info Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">ℹ️ Basic Info</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div style="display:grid; grid-template-columns: auto 1fr; gap:8px 12px; font-size:11px;">');
        html.push('<span style="color:#666;">ID:</span><span style="color:#333; font-weight:500;">' + cfg.id + '</span>');
        html.push('<span style="color:#666;">Type:</span><span style="color:#333; font-weight:500;">' + cfg.ftype + '</span>');
        html.push('<span style="color:#666;">UI mode:</span><span style="color:#333; font-weight:500;">' + (cfg.uiMode || "core") + '</span>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Caption Section
        if (!(isButton || isTag || isImage || isProgress)) {
            html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
            html.push('<div class="ess-col-card-header">');
            html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">📝 Caption</span>');
            html.push('</div>');
            html.push('<div class="ess-col-card-body">');
            // Caption input - label và input cùng hàng
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-col-field-full">');
            html.push('<label><span style="color:#0078d4;">📝</span><strong>Caption:</strong></label>');
            html.push('<input id="pfCaption" type="text" class="ess-col-input" value="' + (cfg.caption != null ? cfg.caption : "") + '" />');
            html.push('</div>');
            html.push('</div>');
            // Bold và Italic cùng hàng
            html.push('<div class="ess-col-row" style="margin-top:8px;">');
            html.push('<div class="ess-col-field">');
            html.push('<label style="display:flex; align-items:center; gap:6px; padding:8px; background:#fafafa; border-radius:4px; cursor:pointer;"><input type="checkbox" id="pfBold" ' + (cfg.captionBold ? "checked" : "") + '/><strong>Bold</strong></label>');
            html.push('</div>');
            html.push('<div class="ess-col-field">');
            html.push('<label style="display:flex; align-items:center; gap:6px; padding:8px; background:#fafafa; border-radius:4px; cursor:pointer;"><input type="checkbox" id="pfItalic" ' + (cfg.captionItalic ? "checked" : "") + '/><i>Italic</i></label>');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>');
        }
        
        // Options Section - Required và Disabled cùng hàng
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">⚙️ Options</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div class="ess-col-row">');
        if (!(isButton || isTag || isImage || isProgress || isContainer)) {
            html.push('<div class="ess-col-field">');
            html.push('<label style="display:flex; align-items:center; gap:6px; padding:8px; background:#fafafa; border-radius:4px; cursor:pointer;"><input type="checkbox" id="pfRequired" ' + (cfg.required ? "checked" : "") + '/><strong>Required</strong></label>');
            html.push('</div>');
        }
        html.push('<div class="ess-col-field">');
        html.push('<label style="display:flex; align-items:center; gap:6px; padding:8px; background:#fafafa; border-radius:4px; cursor:pointer;"><input type="checkbox" id="pfDisabled" ' + (cfg.disabled ? "checked" : "") + '/><strong>Disabled</strong></label>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Caption Position (for checkbox/radio)
        if (capPosHtml) {
            html.push(capPosHtml);
        }
        
        // Default Value Section - Label và input cùng hàng
        if (!hideDefaultSection) {
            html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
            html.push('<div class="ess-col-card-header">');
            html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">💬 Default Value</span>');
            html.push('</div>');
            html.push('<div class="ess-col-card-body">');
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-col-field-full">');
            html.push('<label><span style="color:#0078d4;">💬</span><strong>' + defaultLabel + '</strong></label>');
            html.push('<input id="pfDefault" type="text" class="ess-col-input" value="' + ((cfg.defaultValue !== undefined && cfg.defaultValue !== null) ? cfg.defaultValue : "") + '" />');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>');
        }
        
        // ESS Button Icon Selection
        var buttonIconHtml = "";
        if (isEssButton) {
            var currentIcon = cfg.btnIcon || "";
            var iconType = cfg.btnIconType || ""; // "menu" or "glyphicon" or ""
            var iconPreview = "";
            var iconTypeText = "";
            var iconName = ""; // Original icon name
            
            if (currentIcon && iconType) {
                if (iconType === "glyphicon") {
                    iconPreview = '<span class="' + currentIcon + '" style="font-size:24px;"></span>';
                    iconTypeText = "Bootstrap Glyphicon";
                    // Find icon name from BOOTSTRAP_GLYPHICON_LIST
                    var glyphiconItem = (window.BOOTSTRAP_GLYPHICON_LIST || []).find(function(icon) {
                        return icon.class === currentIcon;
                    });
                    iconName = glyphiconItem ? (glyphiconItem.description || glyphiconItem.class) : currentIcon;
                } else if (iconType === "menu") {
                    iconPreview = '<img src="' + currentIcon + '" style="width:24px;height:24px;" />';
                    iconTypeText = "Menu Icons";
                    // Find icon name from MENU_ICON_LIST
                    var menuItem = (window.MENU_ICON_LIST || []).find(function(icon) {
                        return icon.value === currentIcon;
                    });
                    iconName = menuItem ? menuItem.text : (currentIcon.split('/').pop() || currentIcon);
                }
            }
            
            buttonIconHtml = '<div class="ess-col-card" style="margin-bottom:12px;">' +
                '<div class="ess-col-card-header">' +
                '<span style="font-size:12px; color:#0078d4; font-weight:600;">🖼️ Button Icon</span>' +
                '</div>' +
                '<div class="ess-col-card-body">' +
                '<div class="ess-col-row">' +
                '<div class="ess-col-field ess-col-field-full">' +
                (iconTypeText ? '<div id="btnIconTypeLabel" style="margin-bottom:6px; font-size:11px; color:#0078d4; font-weight:600;">' + iconTypeText + '</div>' : '<div id="btnIconTypeLabel" style="margin-bottom:6px; font-size:11px; color:#0078d4; font-weight:600; display:none;"></div>') +
                '<div id="btnIconPreview" style="margin-bottom:8px; padding:12px; background:#f5f5f5; border-radius:4px; min-height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;">' +
                (iconPreview || '<span style="color:#999; font-size:11px;">No icon selected</span>') +
                (iconName ? '<span style="font-size:10px; color:#666; margin-top:4px; text-align:center;">' + iconName + '</span>' : '') +
                '</div>' +
                '<div style="display:flex; gap:8px;">' +
                '<button type="button" id="btnBrowseIcon" class="ess-btn-primary" style="flex:1; padding:6px 12px;">Browse...</button>' +
                (currentIcon ? '<button type="button" id="btnRemoveIcon" class="ess-btn-secondary" style="padding:6px 12px; background:#ff4444; color:#fff; border:none;">Remove</button>' : '') +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }
        
        // Image Mode, Progress, Items
        if (imageModeHtml) html.push(imageModeHtml);
        if (progressHtml) html.push(progressHtml);
        if (buttonIconHtml) html.push(buttonIconHtml);
        if (isCombo) {
            html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
            html.push('<div class="ess-col-card-header">');
            html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">📋 Items</span>');
            html.push('</div>');
            html.push('<div class="ess-col-card-body">');
            html.push('<label style="display:block; margin-bottom:6px; font-size:11px; color:#666;">Items (one per line):</label>');
            var itemsText = (cfg.items || []).map(function(item) {
                return typeof item === "string" ? item : (item.text || item.value || "");
            }).join("\n");
            html.push('<textarea id="pfItems" class="ess-col-input" style="min-height:80px; resize:vertical; font-family:monospace;">' + itemsText + '</textarea>');
            html.push('</div>');
            html.push('</div>');
        }
        
        // Multi-select configuration - User-friendly form for BA
        if (isMultiSelect) {
            var columns = cfg.multiselectColumns || [];
            var items = cfg.multiselectItems || [];
            
            // Ensure all columns have auto-generated names
            columns.forEach(function(col, idx) {
                if (!col.name || col.name === '') {
                    // Find max number from existing names
                    var maxNum = 0;
                    columns.forEach(function(c) {
                        if (c.name && c.name.startsWith('name-')) {
                            var num = parseInt(c.name.replace('name-', ''), 10);
                            if (!isNaN(num) && num > maxNum) {
                                maxNum = num;
                            }
                        }
                    });
                    col.name = 'name-' + (maxNum + idx + 1);
                }
            });
            
            // Columns section with form inputs (only Caption and Width visible)
            html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
            html.push('<div class="ess-col-card-header" style="display:flex; justify-content:space-between; align-items:center;">');
            html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">📊 Columns</span>');
            html.push('<button type="button" id="btnAddColumn" class="ess-btn-primary" style="padding:4px 12px; font-size:11px;">＋ Add Column</button>');
            html.push('</div>');
            html.push('<div class="ess-col-card-body">');
            html.push('<div id="multiselectColumnsList" style="max-height:300px; overflow-y:auto;">');
            columns.forEach(function(col, idx) {
                html.push('<div class="multiselect-column-item" data-index="' + idx + '" style="border:1px solid #e0e0e0; border-radius:4px; padding:8px; margin-bottom:8px; background:#fafafa;">');
                html.push('<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">');
                html.push('<strong style="font-size:11px; color:#0078d4;">Column ' + (idx + 1) + '</strong>');
                html.push('<button type="button" class="btnDeleteColumn" data-index="' + idx + '" style="background:#ff4444; color:white; border:none; padding:2px 8px; border-radius:3px; cursor:pointer; font-size:10px;">Delete</button>');
                html.push('</div>');
                html.push('<div class="ess-col-row" style="margin-bottom:6px;">');
                html.push('<div class="ess-col-field" style="flex:1; margin-right:6px;">');
                html.push('<label style="font-size:11px; color:#666;">Caption:</label>');
                html.push('<input type="text" class="ess-col-input column-caption" data-index="' + idx + '" value="' + (col.caption || '').replace(/"/g, '&quot;') + '" placeholder="Column caption" style="font-size:11px; padding:4px;" />');
                html.push('</div>');
                html.push('<div class="ess-col-field" style="flex:0 0 100px;">');
                html.push('<label style="font-size:11px; color:#666;">Width:</label>');
                html.push('<input type="number" class="ess-col-input column-width" data-index="' + idx + '" value="' + (col.width || 150) + '" placeholder="150" style="font-size:11px; padding:4px;" />');
                html.push('</div>');
                html.push('</div>');
                // Hidden field to store auto-generated name
                html.push('<input type="hidden" class="column-name" data-index="' + idx + '" value="' + (col.name || '').replace(/"/g, '&quot;') + '" />');
                html.push('</div>');
            });
            if (columns.length === 0) {
                html.push('<div style="padding:12px; text-align:center; color:#999; font-size:11px;">No columns yet. Click "Add Column" to add one.</div>');
            }
            html.push('</div>');
            html.push('</div>');
            html.push('</div>');
            
            // Items section with form inputs
            html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
            html.push('<div class="ess-col-card-header" style="display:flex; justify-content:space-between; align-items:center;">');
            html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">📋 Items</span>');
            html.push('<button type="button" id="btnAddItem" class="ess-btn-primary" style="padding:4px 12px; font-size:11px;">＋ Add Item</button>');
            html.push('</div>');
            html.push('<div class="ess-col-card-body">');
            html.push('<div id="multiselectItemsList" style="max-height:400px; overflow-y:auto;">');
            items.forEach(function(item, idx) {
                html.push('<div class="multiselect-item-item" data-index="' + idx + '" style="border:1px solid #e0e0e0; border-radius:4px; padding:8px; margin-bottom:8px; background:#fafafa;">');
                html.push('<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">');
                html.push('<strong style="font-size:11px; color:#0078d4;">Item ' + (idx + 1) + '</strong>');
                html.push('<button type="button" class="btnDeleteItem" data-index="' + idx + '" style="background:#ff4444; color:white; border:none; padding:2px 8px; border-radius:3px; cursor:pointer; font-size:10px;">Delete</button>');
                html.push('</div>');
                // Dynamic fields based on columns
                columns.forEach(function(col) {
                    html.push('<div class="ess-col-row" style="margin-bottom:6px;">');
                    html.push('<div class="ess-col-field ess-col-field-full">');
                    html.push('<label style="font-size:11px; color:#666;">' + (col.caption || col.name) + ':</label>');
                    html.push('<input type="text" class="ess-col-input item-field" data-index="' + idx + '" data-field="' + col.name + '" value="' + (item[col.name] || '') + '" placeholder="' + (col.caption || col.name) + '" style="font-size:11px; padding:4px;" />');
                    html.push('</div>');
                    html.push('</div>');
                });
                // If no columns, show default value and label fields
                if (columns.length === 0) {
                    html.push('<div class="ess-col-row" style="margin-bottom:6px;">');
                    html.push('<div class="ess-col-field" style="flex:1; margin-right:6px;">');
                    html.push('<label style="font-size:11px; color:#666;">Value:</label>');
                    html.push('<input type="text" class="ess-col-input item-field" data-index="' + idx + '" data-field="value" value="' + (item.value || '') + '" placeholder="value" style="font-size:11px; padding:4px;" />');
                    html.push('</div>');
                    html.push('<div class="ess-col-field" style="flex:1;">');
                    html.push('<label style="font-size:11px; color:#666;">Label:</label>');
                    html.push('<input type="text" class="ess-col-input item-field" data-index="' + idx + '" data-field="label" value="' + (item.label || '') + '" placeholder="Label" style="font-size:11px; padding:4px;" />');
                    html.push('</div>');
                    html.push('</div>');
                }
                html.push('</div>');
            });
            if (items.length === 0) {
                html.push('<div style="padding:12px; text-align:center; color:#999; font-size:11px;">No items yet. Click "Add Item" to add one.</div>');
            }
            html.push('</div>');
            html.push('</div>');
            html.push('</div>');
        }
        
        // Size & Position Section
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">📏 Size & Position</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        // Width và Height cùng hàng
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-width">');
        html.push('<label><span style="color:#0078d4;">📐</span><strong>Width:</strong></label>');
        html.push('<input id="pfWidth" type="number" class="ess-col-input" value="' + cfg.width + '" />');
        html.push('</div>');
        html.push('<div class="ess-col-field ess-col-field-width">');
        html.push('<label><span style="color:#0078d4;">📐</span><strong>Height:</strong></label>');
        html.push('<input id="pfHeight" type="number" class="ess-col-input" value="' + cfg.height + '" />');
        html.push('</div>');
        html.push('</div>');
        // Caption Width và Z-index cùng hàng
        html.push('<div class="ess-col-row">');
        if (!(isContainer || cfg.ftype === "language" || isButton || isTag || isImage || isProgress)) {
            html.push('<div class="ess-col-field ess-col-field-width">');
            html.push('<label><span style="color:#0078d4;">📏</span><strong>Caption width:</strong></label>');
            html.push('<input id="pfLabelWidth" type="number" class="ess-col-input" value="' + (cfg.labelWidth || 120) + '" />');
            html.push('</div>');
        }
        html.push('<div class="ess-col-field ess-col-field-width">');
        html.push('<label><span style="color:#0078d4;">🔢</span><strong>Z-index:</strong></label>');
        html.push('<input id="pfZIndex" type="number" class="ess-col-input" value="' + (cfg.zIndex != null ? cfg.zIndex : "") + '" />');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Button/Tag Colors
        if (buttonColorHtml) html.push(buttonColorHtml);
        if (tagColorHtml) html.push(tagColorHtml);
        
        // Save Button
        html.push('<div class="ess-col-card">');
        html.push('<button type="button" class="ess-btn-primary" style="width:100%;" onclick="builder.saveControlToServer(\'' + cfg.id + '\')">💾 Lưu control này vào DB</button>');
        html.push('</div>');
        
        html.push('</div>'); // Close ess-prop-tab-content
        
        var htmlStr = html.join('');

        $("#propPanel").html(htmlStr);

        var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');

        // ====== ESS BUTTON COLOR BINDING ======
        if (isEssButton) {
            var $btn = $dom.find(".page-field-editor button");

            function applyEssBtnColors() {
                var bg = cfg.btnBackColor || "#ed120b";
                var tc = cfg.btnTextColor || "#ffffff";
                var bc = cfg.btnBorderColor || "#0A75BA";

                $btn.css({
                    "background-color": bg,
                    "color": tc,
                    "border-color": bc
                });
                
                // Update Glyphicon icon color to match border color
                if (cfg.btnIconType === "glyphicon" && cfg.btnIcon) {
                    // Find icon by matching any of its classes
                    var iconClasses = cfg.btnIcon.split(" ").filter(function(c) { return c.length > 0; });
                    var $icon = null;
                    for (var i = 0; i < iconClasses.length; i++) {
                        $icon = $btn.find("span." + iconClasses[i]);
                        if ($icon.length) break;
                    }
                    if ($icon && $icon.length) {
                        $icon.css("color", bc);
                    }
                }
            }

            function bindColorPair(txtSel, pickSel, cfgKey) {
                var $txt = $(txtSel);
                var $pick = $(pickSel);

                function normalize(val) {
                    if (!val) return "";
                    val = $.trim(val);

                    // "fff" / "ffffff"
                    if (/^[0-9a-f]{3}$/i.test(val)) {
                        var r = val[0], g = val[1], b = val[2];
                        return ("#" + r + r + g + g + b + b).toUpperCase();
                    }
                    if (/^[0-9a-f]{6}$/i.test(val)) {
                        return ("#" + val).toUpperCase();
                    }

                    // "#fff" / "#ffffff"
                    if (/^#[0-9a-f]{3}$/i.test(val)) {
                        var r2 = val[1], g2 = val[2], b2 = val[3];
                        return ("#" + r2 + r2 + g2 + g2 + b2 + b2).toUpperCase();
                    }
                    if (/^#[0-9a-f]{6}$/i.test(val)) {
                        return val.toUpperCase();
                    }

                    return val; // format lạ thì để nguyên
                }

                if ($txt.length) {
                    $txt.on("change blur", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($pick.length && /^#[0-9a-f]{6}$/i.test(v)) {
                            $pick.val(v);
                        }
                        applyEssBtnColors();
                        builder.refreshJson();
                    });
                }

                if ($pick.length) {
                    $pick.on("input change", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($txt.length) $txt.val(v);
                        applyEssBtnColors();
                        builder.refreshJson();
                    });
                }
            }

            bindColorPair("#pfBtnBackColor", "#pfBtnBackColorPicker", "btnBackColor");
            bindColorPair("#pfBtnTextColor", "#pfBtnTextColorPicker", "btnTextColor");
            bindColorPair("#pfBtnBorderColor", "#pfBtnBorderColorPicker", "btnBorderColor");

            // áp màu lần đầu
            applyEssBtnColors();
            
            // ====== ESS BUTTON ICON BINDING ======
            function updateButtonIcon() {
                var iconType = cfg.btnIconType || "";
                var iconValue = cfg.btnIcon || "";
                var $btn = $dom.find(".page-field-editor button");
                
                // Remove existing icon
                $btn.find("img, span.glyphicon").remove();
                
                if (iconValue && iconType) {
                    if (iconType === "glyphicon") {
                        var $icon = $('<span class="' + iconValue + '"></span>');
                        // Set color for Glyphicon icon to match button border color
                        var iconColor = cfg.btnBorderColor || "#0A75BA";
                        $icon.css({
                            "font-size": "14px",
                            "margin-right": "4px",
                            "color": iconColor
                        });
                        $btn.prepend($icon);
                    } else if (iconType === "menu" && iconValue) {
                        var $icon = $('<img src="' + iconValue + '" />');
                        $icon.css({
                            "width": "16px",
                            "height": "16px",
                            "vertical-align": "middle",
                            "margin-right": "4px"
                        });
                        $btn.prepend($icon);
                    }
                }
                builder.refreshJson();
            }
            
            function updateIconPreview() {
                var iconType = cfg.btnIconType || "";
                var iconValue = cfg.btnIcon || "";
                var $preview = $("#btnIconPreview");
                var $iconTypeLabel = $("#btnIconTypeLabel");
                
                if (!iconValue || !iconType) {
                    $preview.html('<span style="color:#999; font-size:11px;">No icon selected</span>');
                    if ($iconTypeLabel.length) {
                        $iconTypeLabel.hide();
                    }
                    // Hide Remove button if no icon
                    $("#btnRemoveIcon").hide();
                    return;
                }
                
                var iconHtml = "";
                var iconTypeText = "";
                var iconName = "";
                
                if (iconType === "glyphicon") {
                    iconHtml = '<span class="' + iconValue + '" style="font-size:24px;"></span>';
                    iconTypeText = "Bootstrap Glyphicon";
                    // Find icon name from BOOTSTRAP_GLYPHICON_LIST
                    var glyphiconItem = (window.BOOTSTRAP_GLYPHICON_LIST || []).find(function(icon) {
                        return icon.class === iconValue;
                    });
                    iconName = glyphiconItem ? (glyphiconItem.description || glyphiconItem.class) : iconValue;
                } else if (iconType === "menu" && iconValue) {
                    iconHtml = '<img src="' + iconValue + '" style="width:24px;height:24px;" />';
                    iconTypeText = "Menu Icons";
                    // Find icon name from MENU_ICON_LIST
                    var menuItem = (window.MENU_ICON_LIST || []).find(function(icon) {
                        return icon.value === iconValue;
                    });
                    iconName = menuItem ? menuItem.text : (iconValue.split('/').pop() || iconValue);
                }
                
                // Update icon type label
                if ($iconTypeLabel.length) {
                    $iconTypeLabel.text(iconTypeText).show();
                }
                
                $preview.html(iconHtml + (iconName ? '<span style="font-size:10px; color:#666; margin-top:4px; text-align:center;">' + iconName + '</span>' : ''));
                // Show Remove button if has icon
                $("#btnRemoveIcon").show();
            }
            
            // Browse Icon button
            $("#btnBrowseIcon").off("click").on("click", function(e) {
                e.stopPropagation();
                e.preventDefault();
                showIconPicker();
            });
            
            // Remove Icon button
            $("#btnRemoveIcon").off("click").on("click", function(e) {
                e.stopPropagation();
                e.preventDefault();
                cfg.btnIcon = "";
                cfg.btnIconType = "";
                
                // Hide icon type label when removing icon
                var $iconTypeLabel = $("#btnIconTypeLabel");
                if ($iconTypeLabel.length) {
                    $iconTypeLabel.hide();
                }
                
                updateIconPreview();
                updateButtonIcon();
            });
            
            // Update preview on load
            updateIconPreview();
        }

        // ====== ESS TAG COLOR BINDING ======
        if (isEssTag) {
            var $tag = $dom.find(".ess-tag");

            function applyEssTagColors() {
                var bg = cfg.tagBackColor || "#0D9EFF";
                var tc = cfg.tagTextColor || "#ffffff";
                $tag.css({
                    "background-color": bg,
                    "color": tc
                });
            }

            function bindTagColorPair(txtSel, pickSel, cfgKey) {
                var $txt = $(txtSel);
                var $pick = $(pickSel);

                function normalize(val) {
                    if (!val) return "";
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

                if ($txt.length) {
                    $txt.on("change blur", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($pick.length && /^#[0-9a-f]{6}$/i.test(v)) {
                            $pick.val(v);
                        }
                        applyEssTagColors();
                        builder.refreshJson();
                    });
                }

                if ($pick.length) {
                    $pick.on("input change", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($txt.length) $txt.val(v);
                        applyEssTagColors();
                        builder.refreshJson();
                    });
                }
            }

            bindTagColorPair("#pfTagBackColor", "#pfTagBackColorPicker", "tagBackColor");
            bindTagColorPair("#pfTagTextColor", "#pfTagTextColorPicker", "tagTextColor");

            applyEssTagColors();
        }

        // ====== BIND COMMON PROPERTIES ======
        $("#pfCaption").on("input", function () {
            cfg.caption = this.value;

            if (cfg.ftype === "groupbox") {
                $dom.find(".page-field-groupbox-title").text(cfg.caption || "");
            } else if (cfg.ftype === "button") {
                $dom.find(".page-field-editor button").text(cfg.caption || "");
            } else if (cfg.ftype === "section") {
                $dom.find(".page-field-section-header").text(cfg.caption || "");
            } else {
                var $cap = $dom.find(".page-field-caption");
                $cap.text(cfg.caption || "");
                applyLayout($dom, cfg);
            }
            builder.refreshJson();
        });

        $("#pfBold").on("change", function () {
            cfg.captionBold = this.checked;
            $dom.find(".page-field-caption")
                .css("font-weight", cfg.captionBold ? "700" : "normal");
            builder.refreshJson();
        });

        $("#pfItalic").on("change", function () {
            cfg.captionItalic = this.checked;
            $dom.find(".page-field-caption")
                .css("font-style", cfg.captionItalic ? "italic" : "normal");
            builder.refreshJson();
        });

        $("#pfDisabled").on("change", function () {
            cfg.disabled = this.checked;

            if (cfg.ftype === "button") {
                $dom.find(".page-field-editor button").prop("disabled", cfg.disabled);
            } else if (cfg.ftype !== "label") {
                $dom.find(".page-field-editor")
                    .find("input,select,textarea,button")
                    .prop("disabled", cfg.disabled);
            }

            if (cfg.disabled) $dom.addClass("page-field-disabled");
            else $dom.removeClass("page-field-disabled");

            builder.refreshJson();
        });

        $("#pfRequired").on("change", function () {
            cfg.required = this.checked;
            var $cap = $dom.find(".page-field-caption");
            if (cfg.required) {
                $cap.addClass("page-field-caption-required");
            } else {
                $cap.removeClass("page-field-caption-required");
            }
            builder.refreshJson();
        });

        if (isCheckRadio) {
            $("#pfCapPos").on("change", function () {
                cfg.captionPosition = this.value;
                applyLayout($dom, cfg);
                builder.refreshJson();
            });
        }

        $("#pfDefault").on("input", function () {
            cfg.defaultValue = this.value;
            if (cfg.ftype === "label") {
                $dom.find(".page-field-editor span, .page-field-editor").first().text(cfg.defaultValue);
            } else if (cfg.ftype === "checkbox" || cfg.ftype === "radio") {
                $dom.find(".page-field-editor span").text(cfg.defaultValue);
            } else if (cfg.ftype === "button") {
                $dom.find(".page-field-editor button").text(cfg.defaultValue);
            } else if (cfg.ftype === "tag") {
                $dom.find(".ess-tag-text").text(cfg.defaultValue);
            } else if (!isContainer && cfg.ftype !== "combo" && cfg.ftype !== "language" && !isImage && !isProgress) {
                $dom.find(".page-field-editor").find("input,textarea").val(cfg.defaultValue);
            }
            builder.refreshJson();
        });

        if (isProgress) {
            $("#pfProgressValue").on("input change", function () {
                var v = parseInt(this.value || "0", 10);
                if (isNaN(v)) v = 0;
                if (v < 0) v = 0;
                if (v > 100) v = 100;
                this.value = v;
                cfg.progressValue = v;

                $dom.find(".ess-progress-fill").css("width", v + "%");
                $dom.find(".ess-progress-text").text(v + "%");

                builder.refreshJson();
            });
        }

        $("#pfItems").on("input", function () {
            if (!isCombo) return;
            var lines = this.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
            cfg.items = lines;
            var $sel = $dom.find("select");
            $sel.empty();
            lines.forEach(function (it) {
                $("<option>").text(it).val(it).appendTo($sel);
            });
            builder.refreshJson();
        });
        
        // Multi-select columns and items - User-friendly form handlers
        if (isMultiSelect) {
            function updateMultiselectFromForm() {
                // Update columns from form
                var cols = [];
                $('#multiselectColumnsList .multiselect-column-item').each(function() {
                    var $item = $(this);
                    var name = $item.find('.column-name').val().trim();
                    var caption = $item.find('.column-caption').val().trim();
                    var width = parseInt($item.find('.column-width').val() || '150', 10);
                    if (name) {
                        cols.push({
                            name: name,
                            caption: caption || name,
                            width: width || 150
                        });
                    }
                });
                cfg.multiselectColumns = cols;
                
                // Update items from form
                var items = [];
                $('#multiselectItemsList .multiselect-item-item').each(function() {
                    var $item = $(this);
                    var itemData = {};
                    var hasData = false;
                    $item.find('.item-field').each(function() {
                        var $field = $(this);
                        var fieldName = $field.data('field');
                        var fieldValue = $field.val().trim();
                        if (fieldValue) {
                            itemData[fieldName] = fieldValue;
                            hasData = true;
                        }
                    });
                    if (hasData) {
                        items.push(itemData);
                    }
                });
                cfg.multiselectItems = items;
                
                // Update dropdown
                var $wrapper = $dom.find('.core-multiselect-wrapper');
                if ($wrapper.length) {
                    var $dropdown = $wrapper.find('.core-multiselect-dropdown');
                    updateMultiSelectDropdown(cfg, $dropdown);
                    updateMultiSelectButton($wrapper.find('.core-multiselect-btn'), cfg);
                }
                
                builder.refreshJson();
            }
            
            function generateColumnName(existingColumns) {
                var maxNum = 0;
                existingColumns.forEach(function(col) {
                    if (col.name && col.name.startsWith('name-')) {
                        var num = parseInt(col.name.replace('name-', ''), 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                });
                return 'name-' + (maxNum + 1);
            }
            
            // Column input handlers (only caption and width, name is auto-generated)
            $('#multiselectColumnsList').on('input', '.column-caption, .column-width', function() {
                updateMultiselectFromForm();
            });
            
            // Item input handlers
            $('#multiselectItemsList').on('input', '.item-field', function() {
                updateMultiselectFromForm();
            });
            
            // Add Column button
            $("#btnAddColumn").on("click", function() {
                var cols = cfg.multiselectColumns || [];
                var newName = generateColumnName(cols);
                cols.push({ name: newName, caption: '', width: 150 });
                cfg.multiselectColumns = cols;
                showProperties(cfg);
            });
            
            // Delete Column button
            $('#multiselectColumnsList').on('click', '.btnDeleteColumn', function() {
                var idx = parseInt($(this).data('index'), 10);
                var cols = cfg.multiselectColumns || [];
                var deletedCol = cols[idx];
                cols.splice(idx, 1);
                cfg.multiselectColumns = cols;
                
                // Remove corresponding fields from items
                var items = cfg.multiselectItems || [];
                items.forEach(function(item) {
                    if (deletedCol && deletedCol.name && item[deletedCol.name] !== undefined) {
                        delete item[deletedCol.name];
                    }
                });
                cfg.multiselectItems = items;
                
                // Refresh properties panel to update UI
                showProperties(cfg);
            });
            
            // Add Item button
            $("#btnAddItem").on("click", function() {
                var items = cfg.multiselectItems || [];
                var newItem = {};
                var cols = cfg.multiselectColumns || [];
                if (cols.length > 0) {
                    cols.forEach(function(col) {
                        newItem[col.name] = '';
                    });
                } else {
                    newItem.value = '';
                    newItem.label = '';
                }
                items.push(newItem);
                cfg.multiselectItems = items;
                showProperties(cfg);
            });
            
            // Delete Item button
            $('#multiselectItemsList').on('click', '.btnDeleteItem', function() {
                var idx = parseInt($(this).data('index'), 10);
                var items = cfg.multiselectItems || [];
                items.splice(idx, 1);
                cfg.multiselectItems = items;
                updateMultiselectFromForm();
            });
        }

        if (isImage) {
            $("#pfImageMode").on("change", function () {
                cfg.imageMode = this.value || "fit";
                applyImageDomForField(cfg);
                builder.refreshJson();
            });
        }

        $("#pfLabelWidth").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.labelWidth = v;
                applyLayout($dom, cfg);
                builder.refreshJson();
            }
        });

        $("#pfWidth").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.width = v;
                $dom.css("width", v);
                if (!isContainer && cfg.ftype !== "language") applyLayout($dom, cfg);
                builder.refreshJson();
            }
        });

        $("#pfHeight").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.height = v;
                $dom.css("height", v);

                if (cfg.ftype && cfg.ftype !== "groupbox" && cfg.ftype !== "section" && cfg.ftype !== "language") {
                    applyLayout($dom, cfg);
                }
                applyEssInnerHeight($dom, cfg);

                builder.refreshJson();
            }
        });

        $("#pfZIndex").on("change", function () {
            var v = this.value.trim();
            if (v === "") {
                cfg.zIndex = null;
                $dom.css("z-index", "");

                // Nếu là container, có thể reset con về 1 (tuỳ ý)
                if (cfg.ftype === "groupbox" || cfg.ftype === "section") {
                    updateDescendantsZIndex(cfg.id, 1);
                }
            } else {
                var n = parseInt(v, 10);
                if (!isNaN(n)) {
                    cfg.zIndex = n;
                    $dom.css("z-index", n);

                    // ✅ Container: cập nhật luôn cho các field con
                    if (cfg.ftype === "groupbox" || cfg.ftype === "section") {
                        updateDescendantsZIndex(cfg.id, n + 1);
                    }
                }
            }
            builder.refreshJson();
        });

    }

    return {
        addNew: function (ftype, uiMode) {
            if (!ftype) ftype = "text";
            uiMode = uiMode || "core";

            var cfg = newConfig(ftype, uiMode);
            render(cfg);
            builder.registerControl(cfg);

            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "field";
            builder.highlightOutlineSelection();
            showProperties(cfg);
            builder.updateSelectionSizeHint();
        },

        renderExisting: function (cfg) {
            render(cfg);
        },

        deleteWithChildren: deleteFieldWithChildren,
        moveDescendants: moveDescendants,
        applyTabVisibilityFor: applyTabVisibilityFor,

        // ==== multi-select helpers ====
        getSelectedIds: function () {
            return multiSelectedIds.slice();
        },
        clearSelection: function () {
            multiSelectedIds = [];
            $(".page-field").removeClass("page-field-selected");
        },
        reapplyLayout: function (fieldId) {
            var cfg = builder.getControlConfig(fieldId);
            if (!cfg) return;
            if (cfg.ftype === "groupbox" || cfg.ftype === "section" || cfg.ftype === "language") return;

            var $dom = $('.canvas-control.page-field[data-id="' + fieldId + '"]');
            if (!$dom.length) return;

            applyLayout($dom, cfg);
        },
        
        // Expose icon picker for use by other controls
        showIconPicker: showIconPicker
    };
})();

// Expose controlField globally so other controls can access it
if (typeof window !== 'undefined') {
    window.controlField = controlField;
}
