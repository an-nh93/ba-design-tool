var controlField = (function () {
    var multiSelectedIds = [];
    var SELF_DRAWN = { tree: controlTree, splitter: controlSplitter };

    function selfDrawnModule(ftype) {
        return Object.prototype.hasOwnProperty.call(SELF_DRAWN, ftype) ? SELF_DRAWN[ftype] : null;
    }

    function drawnHook(cfg, name) {
        var drawn = selfDrawnModule(cfg.ftype);
        if (drawn && typeof drawn[name] === "function") drawn[name](cfg);
    }

    function dragIgnoreOf(cfg) {
        var drawn = selfDrawnModule(cfg.ftype);
        return drawn && drawn.dragIgnore ? ", " + drawn.dragIgnore : "";
    }

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
                '<span>Biểu tượng Cadena (Menu Icons)</span>' +
                '</label>' +
                '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:14px;">' +
                '<input type="radio" name="iconPickerType" value="glyphicon" style="cursor:pointer;" />' +
                '<span>Biểu tượng Glyphicon</span>' +
                '</label>' +
                '</div>' +
                '</div>' +
                '<div>' +
                '<input type="text" id="iconPickerSearchInput" class="ess-col-input" placeholder="Tìm biểu tượng theo tên hoặc class (vd: add, delete, search)..." style="width:100%; padding:8px;" />' +
                '</div>' +
                '</div>' +
                '<div id="iconPickerIconList" style="flex:1; overflow-y:auto; display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:8px; padding:16px; border:1px solid #e0e0e0; border-radius:4px; background:#fafafa; min-height:0; align-items:start;">' +
                '</div>' +
                '<style>' +
                '.icon-picker-item { height: auto !important; min-height: 70px !important; max-height: 70px !important; }' +
                '</style>' +
                '<div class="ess-modal-footer" style="padding:12px 16px; border-top:1px solid #e0e0e0; display:flex; justify-content:flex-end; gap:8px; flex-shrink:0;">' +
                '<button type="button" id="iconPickerCancel" class="ess-btn-secondary" style="padding:6px 16px; background:#f0f0f0; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:13px;">Hủy</button>' +
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
                $iconList.html('<div style="grid-column:1/-1; text-align:center; padding:20px; color:#999;">Không tìm thấy biểu tượng</div>');
                return;
            }
            
            filteredIcons.forEach(function(icon) {
                var $item;
                if (iconType === "menu") {
                    var iconHtml = icon.value ? '<img src="' + icon.value + '" style="width:20px;height:20px;" />' : '<span style="font-size:11px; color:#999;">(Không có biểu tượng)</span>';
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
        
        // Close handlers - restore focus immediately to prevent losing focus
        // Use mousedown (fires before click) to restore focus EARLY
        $("#iconPickerClose, #iconPickerCancel").off("mousedown.iconPickerClose click.iconPickerClose").on("mousedown.iconPickerClose", function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            // CRITICAL: Restore focus IMMEDIATELY in mousedown (before click event)
            // Use saved values (saved when popup opened)
            var currentControlId = savedControlId;
            var currentControlType = savedControlType;
            var cfg = savedCfg;
            
            // Restore focus IMMEDIATELY (before any other handlers run)
            if (currentControlId && currentControlType) {
                builder.selectedControlId = currentControlId;
                builder.selectedControlType = currentControlType;
                builder.highlightOutlineSelection();
            }
        }).on("click.iconPickerClose", function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            // Use saved values (saved when popup opened)
            var currentControlId = savedControlId;
            var currentControlType = savedControlType;
            var cfg = savedCfg;
            
            // Restore focus again in click handler (double-check)
            if (currentControlId && currentControlType) {
                builder.selectedControlId = currentControlId;
                builder.selectedControlType = currentControlType;
                builder.highlightOutlineSelection();
            }
            
            // Hide modal FIRST
            $modal.hide();
            selectedIcon = null;
            selectedIconType = null;
            
            // Delay removing document-level handler to ensure it still prevents clearSelection
            setTimeout(function() {
                // Remove document-level event handler AFTER modal is hidden
                $(document).off("mousedown.iconPickerPrevent");
                
                // Restore properties panel after modal closes
                if (currentControlId && currentControlType) {
                    builder.selectedControlId = currentControlId;
                    builder.selectedControlType = currentControlType;
                    var $control = $('.canvas-control[data-id="' + currentControlId + '"]');
                    if ($control.length) {
                        builder.highlightOutlineSelection();
                        if (cfg) {
                            // Call showProperties based on control type
                            if (currentControlType === "grid") {
                                if (window.controlGrid && typeof controlGrid.showProperties === "function") {
                                    controlGrid.showProperties(currentControlId);
                                }
                            } else if (currentControlType === "ess-grid") {
                                if (window.controlGridEss && typeof controlGridEss.showProperties === "function") {
                                    controlGridEss.showProperties(cfg);
                                }
                            } else if (currentControlType === "toolbar") {
                                if (window.controlToolbar && typeof controlToolbar.showProperties === "function") {
                                    controlToolbar.showProperties(cfg);
                                }
                            } else if (cfg) {
                                showProperties(cfg);
                            }
                        }
                    }
                }
            }, 100);
        });
        
        // OK handler - restore focus immediately to prevent losing focus
        $("#iconPickerOk").off("mousedown.iconPickerOk click.iconPickerOk").on("mousedown.iconPickerOk click.iconPickerOk", function(e) {
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
            
            // CRITICAL: Restore focus IMMEDIATELY before processing icon selection
            if (currentControlId && currentControlType) {
                builder.selectedControlId = currentControlId;
                builder.selectedControlType = currentControlType;
                builder.highlightOutlineSelection();
            }
            
            if (selectedIcon !== null && selectedIcon !== undefined && selectedIconType) {
                // If callback provided, call it instead of default button handling
                if (onIconSelected && typeof onIconSelected === "function") {
                    // CRITICAL: Restore focus BEFORE calling callback
                    if (currentControlId && currentControlType) {
                        builder.selectedControlId = currentControlId;
                        builder.selectedControlType = currentControlType;
                        builder.highlightOutlineSelection();
                    }
                    // Call callback first
                    onIconSelected(selectedIcon, selectedIconType);
                    // Don't call showProperties for callback-based usage - let the callback handle it
                    // Hide modal FIRST - must be done synchronously
                    $modal.hide();
                    selectedIcon = null;
                    selectedIconType = null;
                    
                    // Delay removing document-level handler to ensure it still prevents clearSelection
                    setTimeout(function() {
                        // Remove document-level event handler AFTER modal is hidden
                        $(document).off("mousedown.iconPickerPrevent");
                    }, 100);
                    
                    return; // Exit early - callback will handle the rest
                }
            } else {
                console.warn("No icon selected or invalid selection");
            }
            
            // Hide modal FIRST - must be done synchronously
            $modal.hide();
            selectedIcon = null;
            selectedIconType = null;
            
            // Delay removing document-level handler to ensure it still prevents clearSelection
            setTimeout(function() {
                // Remove document-level event handler AFTER modal is hidden
                $(document).off("mousedown.iconPickerPrevent");
                
                // Restore focus and properties panel after modal closes
                if (currentControlId && currentControlType) {
                    builder.selectedControlId = currentControlId;
                    builder.selectedControlType = currentControlType;
                    var $control = $('.canvas-control[data-id="' + currentControlId + '"]');
                    if ($control.length) {
                        builder.highlightOutlineSelection();
                        if (currentCfg) {
                            // Call showProperties based on control type
                            if (currentControlType === "grid") {
                                if (window.controlGrid && typeof controlGrid.showProperties === "function") {
                                    controlGrid.showProperties(currentControlId);
                                }
                            } else if (currentControlType === "ess-grid") {
                                if (window.controlGridEss && typeof controlGridEss.showProperties === "function") {
                                    controlGridEss.showProperties(currentCfg);
                                }
                            } else if (currentControlType === "toolbar") {
                                if (window.controlToolbar && typeof controlToolbar.showProperties === "function") {
                                    controlToolbar.showProperties(currentCfg);
                                }
                            } else if (currentCfg) {
                                showProperties(currentCfg);
                            }
                        }
                    }
                }
            }, 100);
        });
        
        // CRITICAL: Prevent ALL clicks inside modal from bubbling to canvas
        // This prevents losing focus when clicking anywhere in the popup
        // NOTE: Clicking outside (on overlay) will NOT close modal - only X and Cancel buttons can close
        $modal.off("click.iconPicker").on("click.iconPicker", function(e) {
            // If click is on overlay (outside modal content), prevent closing but maintain focus
            if ($(e.target).hasClass("ess-modal-overlay")) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
                // Restore saved control selection immediately to maintain focus
                if (savedControlId && savedControlType) {
                    builder.selectedControlId = savedControlId;
                    builder.selectedControlType = savedControlType;
                    builder.highlightOutlineSelection();
                }
                // Don't close modal - user must use X or Cancel button
                return;
            }
            // Prevent all other clicks from bubbling
            e.stopPropagation();
            e.preventDefault();
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
        
        // CRITICAL: Also handle mousedown on overlay to maintain focus when clicking outside
        $modal.off("mousedown.iconPickerOverlay").on("mousedown.iconPickerOverlay", function(e) {
            // If click is on overlay (outside modal content), prevent losing focus
            if ($(e.target).hasClass("ess-modal-overlay")) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
                // Restore saved control selection immediately to maintain focus
                if (savedControlId && savedControlType) {
                    builder.selectedControlId = savedControlId;
                    builder.selectedControlType = savedControlType;
                    builder.highlightOutlineSelection();
                }
                // Don't close modal - user must use X or Cancel button
                return;
            }
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
            // If click is inside modal (including overlay, close buttons, cancel/ok buttons), prevent it from reaching canvas
            var $target = $(e.target);
            if ($target.closest("#iconPickerModal").length || 
                $target.hasClass("ess-modal-overlay") ||
                $target.is("#iconPickerClose, #iconPickerCancel, #iconPickerOk") ||
                $target.closest("#iconPickerClose, #iconPickerCancel, #iconPickerOk").length) {
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
            $inner.append('<span class="ess-image-placeholder">Thả hoặc dán ảnh vào đây</span>');
        }
    }

    function setFieldImage(cfg, dataUrl) {
        var base = newConfig("image", cfg.uiMode || "ess");
        var fit = !cfg.imageData && cfg.width === base.width && cfg.height === base.height;
        cfg.imageData = dataUrl;
        applyImageDomForField(cfg);
        if (!fit) { builder.refreshJson(); return; }
        var probe = new Image();
        probe.onload = function () {
            var $field = $('.canvas-control.page-field[data-id="' + cfg.id + '"]');
            var $inner = $field.find(".ess-image-inner");
            if ($field.length && $inner.length && probe.naturalWidth && probe.naturalHeight) {
                var padX = Math.max(0, Math.round($field.outerWidth() - $inner.width()));
                var padY = Math.max(0, Math.round($field.outerHeight() - $inner.height()));
                cfg.width = probe.naturalWidth + padX;
                cfg.height = probe.naturalHeight + padY;
                $field.css({ width: cfg.width + "px", height: cfg.height + "px" });
                applyLayout($field, cfg);
                applyEssInnerHeight($field, cfg);
                builder.updateSelectionSizeHint();
            }
            builder.refreshJson();
        };
        probe.onerror = function () { builder.refreshJson(); };
        probe.src = dataUrl;
    }

    function loadImageFileToField(file, cfg) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (re) {
            setFieldImage(cfg, re.target.result);
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
            if ($(e.target).is("input.ess-image-file")) {
                e.stopPropagation();
                return;
            }
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
            });
            $input[0].click();
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

            // Xoá style nền cũ nếu còn
            $drop
                .removeClass("ess-image-has-image")
                .css({
                    "background-image": "",
                    "background-size": "",
                    "background-position": ""
                });

            setFieldImage(cfg, dataUrl);
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
        var created = false;
        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image") {
            if (window.controlField && typeof controlField.addNew === "function") {
                controlField.addNew("image", "ess");
                if (builder.selectedControlId) {
                    cfg = builder.getControlConfig(builder.selectedControlId) || null;
                    created = !!cfg;
                }
            }
        }

        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image") {
            return;
        }

        var $field = $('.canvas-control.page-field[data-id="' + cfg.id + '"]');
        var $drop = $field.find(".ess-image-drop").first();
        if (!$drop.length) return;

        if (created && window.builderSnippet && typeof builderSnippet.viewOrigin === "function") {
            var origin = builderSnippet.viewOrigin();
            cfg.left = origin.left;
            cfg.top = origin.top;
            $field.css({ left: cfg.left + "px", top: cfg.top + "px" });
        }

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
            //   vd <option value="right">Bên phải control</option>
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
        if (ftype === "tree") {
            defWidth = 382;
            defHeight = 252;
        }
        if (ftype === "splitter") {
            var blockSize = controlSplitter.defaultSize();
            defWidth = blockSize.width;
            defHeight = blockSize.height;
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
            zIndex: (ftype === "groupbox" || ftype === "section" || ftype === "splitter") ? 0 : 1
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

        var selfDrawn = selfDrawnModule(ftype);
        if (selfDrawn) {
            cfg.caption = "";
            cfg.defaultValue = "";
            cfg.labelWidth = 0;
            selfDrawn.ensure(cfg);
        }

        return cfg;
    }

    var TEXT_ONLY_TYPES = { label: 1, button: 1, tag: 1 };
    var TOGGLE_TYPES = { checkbox: 1, radio: 1 };
    var PLAIN_VALUE_TYPES = { text: 1, memo: 1 };
    var CARRIED_KEYS = ["left", "top", "parentId", "tabPageId", "tabIndex", "zIndex", "groupId", "groupOffsetX", "groupOffsetY", "required", "disabled", "captionBold", "captionItalic"];

    function fieldDisplayText(cfg) {
        return (TEXT_ONLY_TYPES[cfg.ftype] ? cfg.defaultValue : cfg.caption) || "";
    }

    function convertedConfig(old, ftype, uiMode) {
        var next = newConfig(ftype, uiMode);
        var defaultHeight = next.height;
        var oldHeight = old.height || defaultHeight;
        var text = fieldDisplayText(old);
        var oldHasEditor = !TEXT_ONLY_TYPES[old.ftype] && !TOGGLE_TYPES[old.ftype] && old.ftype !== "image" && old.ftype !== "progress";
        var value = old.ftype === "combo" && (old.items || []).length === 1 ? old.items[0]
            : (PLAIN_VALUE_TYPES[old.ftype] ? old.defaultValue : "");

        next.id = old.id;
        CARRIED_KEYS.forEach(function (key) {
            if (old[key] !== undefined) next[key] = old[key];
        });
        next.width = old.width || next.width;
        next.height = ftype === "memo" ? Math.max(oldHeight, 40)
            : (oldHeight > defaultHeight * 1.6 || oldHeight < defaultHeight * 0.5 ? defaultHeight : oldHeight);

        if (TEXT_ONLY_TYPES[ftype]) {
            next.caption = "";
            next.labelWidth = 0;
            next.defaultValue = text || value || (ftype === "label" ? "Label" : next.defaultValue);
        } else if (TOGGLE_TYPES[ftype]) {
            next.caption = text || next.caption;
            if (TOGGLE_TYPES[old.ftype]) {
                next.captionPosition = old.captionPosition || next.captionPosition;
                next.labelWidth = old.labelWidth != null ? old.labelWidth : next.labelWidth;
            }
        } else if (oldHasEditor) {
            next.caption = old.caption || "";
            next.labelWidth = old.labelWidth != null ? old.labelWidth : next.labelWidth;
            next.captionPosition = old.captionPosition || next.captionPosition;
            if (value && ftype === "combo") next.items = [value];
            else if (value && PLAIN_VALUE_TYPES[ftype]) next.defaultValue = value;
        } else if (text) {
            next.caption = text;
            next.labelWidth = Math.max(60, Math.min(260, (old.width || 100) + 6));
            next.width = next.labelWidth + 160;
        } else {
            next.caption = "";
            next.labelWidth = 0;
        }
        return next;
    }

    function changeFieldType(fieldId, ftype, uiMode) {
        var old = builder.getControlConfig(fieldId);
        if (!old || old.type !== "field" || !ftype) return null;
        if (old.ftype === "groupbox" || old.ftype === "section") return null;
        uiMode = uiMode || old.uiMode || "core";
        if (old.ftype === ftype && (old.uiMode || "core") === uiMode) return null;

        var next = convertedConfig(old, ftype, uiMode);
        var index = builder.controls.indexOf(old);
        if (index < 0) return null;
        builder.controls[index] = next;
        $('#canvas [data-id="' + old.id + '"]').remove();
        next._fromRestore = true;
        render(next);
        delete next._fromRestore;
        if (next.tabPageId && window.controlTabPage && controlTabPage.syncMember) controlTabPage.syncMember(next);
        return next;
    }


    // Lấy danh sách id mọi control là con/cháu/chắt của rootId (bao gồm field, grid, ess-grid, toolbar, collapsible-section)
    function getDescendantFieldIds(rootId, includeRoot) {
        var result = [];
        // Lấy tất cả controls (không chỉ field) để support collapsible-section và các control khác
        var allControls = (builder.controls || []).filter(function (c) {
            return c && (c.type === "field" || c.type === "collapsible-section" || c.type === "grid" || c.type === "ess-grid" || c.type === "toolbar");
        });

        var map = {};
        allControls.forEach(function (f) {
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

        allControls.forEach(function (f) {
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
            var $child = $('.canvas-control[data-id="' + cid + '"]');
            if ($child.length) {
                $child.css("z-index", baseZ);
            }
        });
        
        (builder.controls || []).forEach(function (c) {
            if (!c || c.parentId !== rootId || c.type === "field") return;
            var $child = $('.canvas-control[data-id="' + c.id + '"]');
            if (builder.derivesStacking(c)) {
                builder.applyStacking(c, $child);
                return;
            }
            c.zIndex = baseZ;
            $child.css("z-index", baseZ);
        });
    }



    // Hiển thị/ẩn field theo Tab đang active
    function applyTabVisibilityFor(tabCfg) {
        var tabId = tabCfg.id;
        var activeIndex = tabCfg.activeTabIndex || 0;

        (builder.controls || []).forEach(function (c) {
            if (!c || c.tabPageId !== tabId) return;

            var $dom = c.type === "field"
                ? $('.canvas-control.page-field[data-id="' + c.id + '"]')
                : $('.canvas-control[data-id="' + c.id + '"]');
            var idx = (typeof c.tabIndex === "number") ? c.tabIndex : 0;
            if (idx === activeIndex) $dom.show();
            else $dom.hide();
        });
    }

    function applyParentZIndex(fieldCfg, $dom) {
        var isContainer = builder.isContainerConfig(fieldCfg);
        var parentCfg = fieldCfg.parentId ? builder.getControlConfig(fieldCfg.parentId) : null;
        var z = isContainer ? 0 : 1;
        if (parentCfg) {
            var base = parseInt(parentCfg.type === "popup" ? builder.controlElement(parentCfg).css("z-index") : parentCfg.zIndex, 10);
            z = (isNaN(base) ? 0 : base) + 1;
        }
        fieldCfg.zIndex = z;
        $dom.css("z-index", z);
        if (isContainer && parentCfg) updateDescendantsZIndex(fieldCfg.id, z + 1);
    }

    function updateFieldParent(fieldCfg, point) {
        var $dom = builder.controlElement(fieldCfg);
        if (!$dom.length) return;
        builder.dropControl(fieldCfg, point);
        applyParentZIndex(fieldCfg, $dom);
    }

    function collectDescendants(rootId) {
        var result = [];

        function dfs(parentId) {
            var owner = builder.containerOf(builder.getControlConfig(parentId));
            (builder.controls || []).forEach(function (c) {
                if (!c || c.type !== "field") return;
                if (c.parentId === parentId || (c.tabPageId === parentId && builder.containerOf(c) === owner)) {
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

        var looseIds = builder.controls.filter(function (c) {
            return c && c.type !== "field" && c.tabPageId === fieldId;
        }).map(function (c) { return c.id; });
        looseIds.forEach(function (id) {
            $('.canvas-control[data-id="' + id + '"]').remove();
        });
        builder.controls = builder.controls.filter(function (c) {
            return !(c && looseIds.indexOf(c.id) >= 0);
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
        var isButtonLike = isButton || isTag || isProgress || isImage || !!selfDrawnModule(cfg.ftype);

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
                    display: "inline-block",
                    flex: isEss ? "0 0 auto" : "",
                    "align-self": isEss ? "center" : ""
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
        if (cfg.uiMode !== "ess") {
            if (cfg.ftype === "memo" && cfg.height) $field.find(".page-field-editor textarea").css("max-height", Math.max(22, cfg.height - 4) + "px");
            return;
        }
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
                "padding-bottom": "2px",
                "align-self": cfg.ftype === "memo" ? "" : "center"
            });
        }

        if (TOGGLE_TYPES[cfg.ftype]) return;

        // ==== ESS DATE: input-group + icon calendar ====
        if (cfg.ftype === "date") {
            var $grp = $field.find(".ess-date.input-group");
            if ($grp.length) {
                $grp.css("height", innerH + "px");

                var $input = $grp.find("input.form-control");

                $input.css({
                    height: innerH + "px",
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
        $dropdown.on('change', 'tbody input[type="checkbox"]', function() {
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
            $thead.append('<th style="width: ' + (parseInt(col.width, 10) || 150) + 'px;">' + builder.escapeHtml(col.caption || col.name) + '</th>');
        });
        
        // Build body
        var $tbody = $dropdown.find('tbody');
        $tbody.empty();
        items.forEach(function(item) {
            var $row = $('<tr></tr>');
            var value = multiSelectItemValue(cfg, item);
            var isSelected = selectedValues.indexOf(value) !== -1;
            
            $row.append('<td><input type="checkbox" value="' + builder.escapeHtml(value) + '" ' + (isSelected ? 'checked' : '') + ' /></td>');
            columns.forEach(function(col) {
                var cellValue = item[col.name] || '';
                $row.append('<td>' + builder.escapeHtml(cellValue) + '</td>');
            });
            $tbody.append($row);
        });
        
        // Select all handler
        $dropdown.find('.core-multiselect-select-all').off('change').on('change', function() {
            var checked = $(this).is(':checked');
            $dropdown.find('tbody input[type="checkbox"]').prop('checked', checked);
            if (checked) {
                cfg.multiselectSelectedValues = items.map(function(item) {
                    return multiSelectItemValue(cfg, item);
                });
            } else {
                cfg.multiselectSelectedValues = [];
            }
            updateMultiSelectButton($dropdown.closest('.core-multiselect-wrapper').find('.core-multiselect-btn'), cfg);
            builder.refreshJson();
        });
    }
    
    var MULTISELECT_ALL_VALUE = "all";
    var MULTISELECT_SEPARATOR = "; ";

    function multiSelectItemValue(cfg, item) {
        var columns = cfg.multiselectColumns || [];
        return item.value || (columns[0] ? item[columns[0].name] : "") || "";
    }

    function multiSelectItemLabel(cfg, item) {
        var columns = cfg.multiselectColumns || [];
        var fields = ["label"].concat(columns.slice(1, 2).map(function (col) { return col.name; }), columns.slice(0, 1).map(function (col) { return col.name; }));
        for (var i = 0; i < fields.length; i++) {
            if (item[fields[i]]) return item[fields[i]];
        }
        return multiSelectItemValue(cfg, item);
    }

    function multiSelectText(cfg) {
        var selectedValues = cfg.multiselectSelectedValues || [];
        var chosen = (cfg.multiselectItems || []).filter(function (item) {
            return selectedValues.indexOf(multiSelectItemValue(cfg, item)) !== -1;
        });
        var all = chosen.filter(function (item) {
            return String(multiSelectItemValue(cfg, item)).toLowerCase() === MULTISELECT_ALL_VALUE;
        })[0];
        if (all) return multiSelectItemLabel(cfg, all);
        return chosen.map(function (item) { return multiSelectItemLabel(cfg, item); }).join(MULTISELECT_SEPARATOR);
    }

    function updateMultiSelectButton($button, cfg) {
        $button.find('.core-multiselect-text').text(multiSelectText(cfg) || 'Select...');
    }

    // Biểu tượng của nút ESS. Class và đường dẫn ảnh là dữ liệu của thiết kế nên chỉ gán qua addClass / attr, không ghép vào chuỗi HTML.
    function essButtonIcon(cfg) {
        if (!cfg.btnIcon) return null;
        if (cfg.btnIconType === "glyphicon") {
            return $("<span></span>").addClass(cfg.btnIcon).css({ "font-size": "14px", "margin-right": "4px", "color": cfg.btnBorderColor || "#0A75BA" });
        }
        if (cfg.btnIconType === "menu") {
            return $("<img />").attr("src", cfg.btnIcon).css({ "width": "16px", "height": "16px", "vertical-align": "middle", "margin-right": "4px" });
        }
        return null;
    }

    function render(cfg) {
        var $canvas = $("#canvas-zoom-inner");

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
<div class="canvas-control page-field page-field-groupbox${extraClass}${cfg.bare ? ' page-field-groupbox-bare' : ''}" data-id="${cfg.id}">
  <div class="page-field-groupbox-title">${builder.escapeHtml(cfg.caption != null ? cfg.caption : "Group")}</div>
  <div class="page-field-groupbox-content"></div>
  <div class="page-field-resizer"></div>
</div>`);
        } else if (cfg.ftype === "section") {
            $field = $(`
<div class="canvas-control page-field page-field-section${extraClass}" data-id="${cfg.id}">
  <div class="page-field-section-header">${builder.escapeHtml(cfg.caption != null ? cfg.caption : "Section")}</div>
  <div class="page-field-section-content"></div>
  <div class="page-field-resizer"></div>
</div>`);
        } else {
            $field = $(`
<div class="canvas-control page-field${extraClass}${selfDrawnModule(cfg.ftype) ? " page-field-" + cfg.ftype : ""}" data-id="${cfg.id}">
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
                        $editor = $(`
<div class="core-date">
    <input type="text" class="core-date-input" />
    <span class="core-date-button"><i class="bi bi-calendar3"></i></span>
</div>`);
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
                        builder.escapeHtml(cfg.defaultValue || "") + '</span></label>');
                    break;
                case "radio":
                    $editor = $('<label><input type="radio" /> <span>' +
                        builder.escapeHtml(cfg.defaultValue || "") + '</span></label>');
                    break;
                case "language":
                    $editor = $('<select class="page-lang-select-en"><option>English</option></select>');
                    break;
                case "button":
                    var btnCls = "page-field-button-editor" + (cfg.uiMode === "ess" ? " ess-button" : "");
                    $editor = $('<button type="button" class="' + btnCls + '"></button>');
                    
                    var $buttonIcon = cfg.uiMode === "ess" ? essButtonIcon(cfg) : null;
                    if ($buttonIcon) $editor.append($buttonIcon);


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
                        ? '<img class="ess-image-img" src="' + builder.escapeHtml(cfg.imageData) + '" />'
                        : '<span class="ess-image-placeholder">Thả hoặc dán ảnh vào đây</span>';

                    $editor = $(`
<div class="ess-image-drop">
  <div class="ess-image-inner ess-image-mode-${mode}">
    ${innerHtml}
  </div>
</div>`);
                    break;

                case "tree":
                case "splitter":
                    $editor = selfDrawnModule(cfg.ftype).build(cfg);
                    break;

                default:
                    $editor = $('<input type="text" />');
                    break;
            }

            // Gán defaultValue cho vài loại đặc biệt
            if (cfg.ftype === "label") {
                $editor.css({ "font-weight": cfg.captionBold ? "700" : "", "font-style": cfg.captionItalic ? "italic" : "" });
            }
            if (cfg.ftype === "label" && cfg.defaultValue) {
                $editor.text(cfg.defaultValue);
            } else if ((cfg.ftype === "checkbox" || cfg.ftype === "radio") && cfg.defaultValue) {
                $editor.find("span").text(cfg.defaultValue);
            } else if (cfg.ftype === "number" || cfg.ftype === "numberic-test" && cfg.defaultValue) {
                $editor.find("input[type='number']").val(cfg.defaultValue);
            } else if (cfg.ftype === "button" && cfg.defaultValue) {
                $editor.text(cfg.defaultValue);
            } else if (cfg.ftype === "date" && cfg.defaultValue) {
                $editor.find("input").val(cfg.defaultValue);
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

        // ✅ FIX: Nếu field nằm trong collapsible-section, append vào content area
        var $container = $canvas;
        if (cfg.parentId) {
            var parentCfg = (builder.controls || []).find(function(c) { return c.id === cfg.parentId; });
            if (parentCfg && parentCfg.type === "collapsible-section") {
                var $parent = $('.ess-collapsible-section[data-id="' + cfg.parentId + '"]');
                if ($parent.length) {
                    var $content = $parent.find(".ess-collapsible-content");
                    if ($content.length) {
                        $container = $content;
                        // Position relative với content area
                        $field.css({
                            position: "absolute",
                            left: cfg.left + "px",
                            top: cfg.top + "px",
                            width: cfg.width + "px",
                            height: cfg.height + "px"
                        });
                    }
                }
            } else {
                // Logic cho popup/tabpage
                if (parentCfg && parentCfg.type === "popup") {
                    var $popup = $('.popup-design[data-id="' + cfg.parentId + '"]');
                    if ($popup.length) {
                        $container = $popup.find(".popup-body").first();
                        if ($container.length) {
                            $field.css({
                                position: "absolute",
                                left: (cfg.left || 0) + "px",
                                top: (cfg.top || 0) + "px",
                                width: (cfg.width || 150) + "px",
                                height: (cfg.height || 24) + "px"
                            });
                        }
                        if (!$container.length) $container = $canvas;
                    }
                } else if (parentCfg && parentCfg.type === "tabpage") {
                    var $tabpage = $('.canvas-tabpage[data-id="' + cfg.parentId + '"]');
                    if ($tabpage.length) {
                        $container = $tabpage.find(".tabpage-body").first();
                        if (!$container.length) $container = $canvas;
                    }
                } else if (parentCfg && parentCfg.type === "field" &&
                    (parentCfg.ftype === "groupbox" || parentCfg.ftype === "section")) {
                    // Field là con của groupbox/section - append vào content để di chuyển cùng
                    var $gb = $('.page-field-groupbox[data-id="' + cfg.parentId + '"], .popup-groupbox[data-id="' + cfg.parentId + '"], .page-field-section[data-id="' + cfg.parentId + '"], .popup-section[data-id="' + cfg.parentId + '"]');
                    if ($gb.length) {
                        var contentSel = parentCfg.ftype === "groupbox" ? ".page-field-groupbox-content" : ".page-field-section-content";
                        var $content = $gb.find(contentSel).first();
                        if ($content.length) {
                            $container = $content;
                            $field.css({
                                position: "absolute",
                                left: (cfg.left || 0) + "px",
                                top: (cfg.top || 0) + "px",
                                width: (cfg.width || 150) + "px",
                                height: (cfg.height || 24) + "px",
                                zIndex: 1
                            });
                        }
                    }
                }
            }
        }
        
        if ($container === $canvas) {
            // Position absolute với canvas (logic cũ)
            $field.css({
                left: cfg.left,
                top: cfg.top,
                width: cfg.width,
                height: cfg.height
            });
        }
        
        $container.append($field);

        if (cfg.ftype === "image") {
            initEssImageDrop($field, cfg);
        }

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
        var resizeStart = null;
        var dragStartTime = 0;
        var dragStartPos = null;

        // DRAG - chỉ cho phép khi không phải từ resize handles
        fieldInteractable.draggable({
            ignoreFrom: "input, select, textarea, .page-field-resizer, .page-field-resize-handle-right, .page-field-resize-handle-bottom, .page-field-groupbox-content, .page-field-section-content" + dragIgnoreOf(cfg),
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
                    if ((cfg.ftype === "groupbox" || cfg.ftype === "section") &&
                        builder.adoptControlsIntoGroup) {
                        builder.adoptControlsIntoGroup(cfg.id);
                    }
                    $field.addClass("page-field-dragging");
                    builder.beginDragSelection(cfg.id);
                },
                move: function (ev) {
                    // Nếu đang resize thì không drag
                    if (isResizing) return;

                    var scale = builder.cssScale();
                    var dx = ev.dx / scale;
                    var dy = ev.dy / scale;

                    // Di chuyển selection (builder sẽ lo phần auto-extend canvas)
                    var moved = builder.dragSelectionMove(dx, dy) || { dx: dx, dy: dy };

                    // ✅ Nếu field thuộc group nhưng không được chọn, di chuyển cả group
                    if (cfg.groupId && builder && typeof builder.moveGroupControls === "function") {
                        // Kiểm tra xem field này có trong _dragSelectionIds không
                        var isInDragSelection = builder._dragSelectionIds && builder._dragSelectionIds.indexOf(cfg.id) >= 0;
                        if (!isInDragSelection) {
                            // Field này không được chọn nhưng thuộc group → di chuyển cả group
                            builder.moveGroupControls(cfg.groupId, moved.dx, moved.dy);
                        }
                    }
                    
                    builder.updateSelectionSizeHint();
                },
                end: function (ev) {
                    $field.removeClass("page-field-dragging");
                    builder.dropDraggedControls(cfg.id, ev);
                    builder.endDragSelection();
                    isResizing = false;
                    dragStartTime = 0;
                    dragStartPos = null;
                }
            }
        });

        // RESIZE - chỉ cho phép từ resize handles
        fieldInteractable.resizable({
            edges: {
                right: ".page-field-resizer, .page-field-resize-handle-right",
                bottom: ".page-field-resizer, .page-field-resize-handle-bottom"
            },
            listeners: {
                start: function (ev) {
                    isResizing = true;
                    resizeStart = { width: cfg.width || $field[0].offsetWidth, height: cfg.height || $field[0].offsetHeight, dw: 0, dh: 0 };
                    // Khối tự xếp: người dùng chủ động đổi kích thước → thôi tự co giãn chiều cao, nếu không auto-layout sẽ trả về cỡ cũ khi buông chuột.
                    if (cfg.autoLayout && cfg.autoLayout.autoHeight !== false) {
                        cfg.autoLayout.autoHeight = false;
                    }
                    drawnHook(cfg, "beginResize");
                },
                move: function (ev) {
                    var target = ev.target;
                    var id = $(target).attr("data-id");
                    var cfg = builder.getControlConfig(id);
                    if (!cfg || !resizeStart) return;

                    var scale = builder.cssScale();
                    resizeStart.dw += ev.deltaRect.width / scale;
                    resizeStart.dh += ev.deltaRect.height / scale;
                    var step = builder.snapEnabled ? builder.snapStep : 1;
                    var newW = resizeStart.width;
                    var newH = resizeStart.height;
                    if (resizeStart.dw) newW = Math.max(40, Math.round((resizeStart.width + resizeStart.dw) / step) * step);
                    if (resizeStart.dh) newH = Math.max(20, Math.round((resizeStart.height + resizeStart.dh) / step) * step);

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
                    drawnHook(cfg, "resizing");

                    builder.updateSelectionSizeHint();
                },
                end: function () {
                    isResizing = false;
                    drawnHook(cfg, "endResize");
                    builder.refreshJson();
                }
            }
        });

        // chọn field
        $field.on("mousedown", function (e) {
            // Chỉ khi click đúng vào vùng content của CHÍNH control này → không chọn, để bật marquee. Tránh groupbox trong section bị coi là "click content" và không chọn được.
            var field = this;
            var inOwnContent = $(field).find(builder.containerContentSelector).filter(function () {
                return $(this).closest(".canvas-control")[0] === field && (this === e.target || $.contains(this, e.target));
            }).length > 0;
            if (inOwnContent) return;
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
        var selfDrawn = selfDrawnModule(cfg.ftype);
        var isEssButton = isButton && (cfg.uiMode === "ess");
        var isEssTag = isTag && (cfg.uiMode === "ess");


        var P = builderProps;

        if (isCheckRadio && !cfg.captionPosition) {
            cfg.captionPosition = "left";
        }

        function hexOr(value, fallback) {
            return P.hexColor(P.normalizeColor(value), fallback);
        }

        var general = "";
        if (!(isButton || isTag || isImage || isProgress || selfDrawn)) {
            general += P.line(P.field("Nhãn", P.text({ id: "pfCaption", value: cfg.caption != null ? cfg.caption : "" }) + P.toggles(
                P.toggle({ id: "pfBold", title: "Nhãn in đậm" }, { html: "<b>B</b>" }, cfg.captionBold),
                P.toggle({ id: "pfItalic", title: "Nhãn in nghiêng" }, { html: "<i>I</i>" }, cfg.captionItalic)), null, "pfCaption"));
        }
        if (isCheckRadio) {
            general += P.line(P.field("Vị trí nhãn", P.select({ id: "pfCapPos" }, [["left", "Bên trái control"], ["right", "Bên phải control"]], cfg.captionPosition || "left"), null, "pfCapPos"));
        }
        if (!(isContainer || isImage || selfDrawn)) {
            general += P.line(P.field(isButton ? "Chữ trên nút" : (isTag ? "Chữ trên tag" : "Giá trị mặc định"),
                P.text({ id: "pfDefault", value: (cfg.defaultValue !== undefined && cfg.defaultValue !== null) ? cfg.defaultValue : "" }), null, "pfDefault"));
        }
        if (isImage) {
            general += P.line(P.field("Kiểu hiện ảnh", P.select({ id: "pfImageMode" },
                [["fit", "Vừa khung (giữ tỉ lệ)"], ["fill", "Lấp đầy (cắt bớt)"], ["stretch", "Kéo giãn"], ["center", "Giữa (cỡ gốc)"]], cfg.imageMode || "fit"), null, "pfImageMode"));
        }
        if (isProgress) {
            cfg.progressValue = Math.max(0, Math.min(100, typeof cfg.progressValue === "number" ? cfg.progressValue : 0));
            general += P.line(P.field("Tiến độ (%)", P.number({ id: "pfProgressValue", min: 0, max: 100, value: cfg.progressValue }), "pp-field--num", "pfProgressValue"));
        }
        if (isCombo) {
            general += P.line(P.field("Danh sách giá trị (mỗi dòng một giá trị)", P.textarea({ id: "pfItems", rows: 4, "class": "pp-input--mono" },
                (cfg.items || []).map(function (item) { return typeof item === "string" ? item : (item.text || item.value || ""); }).join("\n")), "pp-field--stack", "pfItems"));
        }
        var states = [];
        if (!(isButton || isTag || isImage || isProgress || isContainer || selfDrawn)) states.push(P.check({ id: "pfRequired" }, "Bắt buộc", cfg.required));
        states.push(P.check({ id: "pfDisabled" }, "Khóa", cfg.disabled));
        general += P.checks(states);

        var sections = P.section("Chung", general);

        var buttonIcon = { icon: cfg.btnIcon || "", iconType: cfg.btnIconType || "" };
        if (isEssButton) sections += P.section("Biểu tượng nút", P.iconEditor(buttonIcon, "button", { color: false }));
        if (selfDrawn) sections += selfDrawn.propertiesHtml(cfg);

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

            var columnRows = columns.map(function (col, idx) {
                return P.row({
                    attrs: { "class": "pp-cols-ms multiselect-column-item", "data-index": idx },
                    head: P.rowNo(idx + 1) +
                        P.text({ "class": "column-caption", "data-index": idx, value: col.caption || "", placeholder: "Tiêu đề cột" }) +
                        P.number({ "class": "column-width", "data-index": idx, value: col.width || 150, placeholder: "150", title: "Độ rộng cột" }) +
                        '<input type="hidden" class="column-name" data-index="' + idx + '" value="' + P.esc(col.name || "") + '" />',
                    tools: P.iconButton({ "class": "pp-icon-btn--danger btnDeleteColumn", "data-index": idx, title: "Xóa cột" }, "×")
                });
            }).join("");

            var itemLabels = columns.length ? columns.map(function (col) { return col.caption || col.name; }) : ["Giá trị", "Nhãn"];
            var itemRows = items.map(function (item, idx) {
                var fields = columns.length
                    ? columns.map(function (col) {
                        return P.text({ "class": "item-field", "data-index": idx, "data-field": col.name, value: item[col.name] || "", placeholder: col.caption || col.name, title: col.caption || col.name });
                    }).join("")
                    : P.text({ "class": "item-field", "data-index": idx, "data-field": "value", value: item.value || "", placeholder: "value", title: "Giá trị" }) +
                      P.text({ "class": "item-field", "data-index": idx, "data-field": "label", value: item.label || "", placeholder: "Nhãn", title: "Nhãn" });
                return P.row({
                    attrs: { "class": "pp-row--fluid multiselect-item-item", "data-index": idx },
                    head: P.rowNo(idx + 1) + fields,
                    tools: P.iconButton({ "class": "pp-icon-btn--danger btnDeleteItem", "data-index": idx, title: "Xóa dòng" }, "×")
                });
            }).join("");

            sections += P.section("Cột",
                P.rows({ id: "multiselectColumnsList", "class": "pp-list--scroll" },
                    columns.length ? P.listHead("pp-cols-ms", ["#", "Tiêu đề cột", "Rộng", ""]) + columnRows : P.empty('Chưa có cột. Bấm "Thêm cột" để thêm.')),
                { count: columns.length, action: P.button({ id: "btnAddColumn", "class": "pp-btn--primary pp-btn--small" }, "＋ Thêm cột") });
            sections += P.section("Danh sách giá trị",
                P.rows({ id: "multiselectItemsList", "class": "pp-list--scroll" },
                    items.length ? P.listHead("pp-row--fluid", ["#"].concat(itemLabels, [""])) + itemRows : P.empty('Chưa có dòng. Bấm "Thêm dòng" để thêm.')),
                { count: items.length, action: P.button({ id: "btnAddItem", "class": "pp-btn--primary pp-btn--small" }, "＋ Thêm dòng") });
        }

        var size = [
            P.field("Rộng", P.number({ id: "pfWidth", value: cfg.width }), "pp-field--num", "pfWidth"),
            P.field("Cao", P.number({ id: "pfHeight", value: cfg.height }), "pp-field--num", "pfHeight")
        ];
        if (!(isContainer || cfg.ftype === "language" || isButton || isTag || isImage || isProgress || selfDrawn)) {
            size.push(P.field("Rộng nhãn", P.number({ id: "pfLabelWidth", value: cfg.labelWidth || 120 }), "pp-field--num", "pfLabelWidth"));
        }
        size.push(P.field("Z-index", P.number({ id: "pfZIndex", value: cfg.zIndex != null ? cfg.zIndex : "" }), "pp-field--num", "pfZIndex"));
        sections += P.section("Kích thước và vị trí", P.grid.apply(null, size));

        if (isEssButton) {
            cfg.btnBackColor = hexOr(cfg.btnBackColor, "#ed120b");
            cfg.btnTextColor = hexOr(cfg.btnTextColor, "#ffffff");
            cfg.btnBorderColor = hexOr(cfg.btnBorderColor, "#0A75BA");
            sections += P.section("Màu nút", P.grid(
                P.field("Nền", P.color({ id: "pfBtnBackColorPicker" }, { id: "pfBtnBackColor" }, cfg.btnBackColor)),
                P.field("Chữ", P.color({ id: "pfBtnTextColorPicker" }, { id: "pfBtnTextColor" }, cfg.btnTextColor)),
                P.field("Viền", P.color({ id: "pfBtnBorderColorPicker" }, { id: "pfBtnBorderColor" }, cfg.btnBorderColor))));
        }
        if (isEssTag) {
            cfg.tagBackColor = hexOr(cfg.tagBackColor, "#0D9EFF");
            cfg.tagTextColor = hexOr(cfg.tagTextColor, "#ffffff");
            sections += P.section("Màu tag", P.grid(
                P.field("Nền", P.color({ id: "pfTagBackColorPicker" }, { id: "pfTagBackColor" }, cfg.tagBackColor)),
                P.field("Chữ", P.color({ id: "pfTagTextColorPicker" }, { id: "pfTagTextColor" }, cfg.tagTextColor))));
        }

        P.render(P.panel("Thuộc tính field", "Loại: " + cfg.ftype + " · Giao diện: " + (cfg.uiMode || "core") + " · ID: " + cfg.id, sections, P.saveButton(cfg.id)));

        var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');

        function bindColor(textSelector, key, apply) {
            P.onColor(textSelector, function (value) {
                if (!value) return;
                cfg[key] = value;
                apply();
                builder.refreshJson();
            });
        }

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

            bindColor("#pfBtnBackColor", "btnBackColor", applyEssBtnColors);
            bindColor("#pfBtnTextColor", "btnTextColor", applyEssBtnColors);
            bindColor("#pfBtnBorderColor", "btnBorderColor", applyEssBtnColors);

            // áp màu lần đầu
            applyEssBtnColors();
            
            // ====== ESS BUTTON ICON BINDING ======
            function updateButtonIcon() {
                var $btn = $dom.find(".page-field-editor button");
                $btn.find("img, span.glyphicon").remove();
                var $icon = essButtonIcon(cfg);
                if ($icon) $btn.prepend($icon);
                builder.refreshJson();
            }
            
            P.bindIcons("#propPanel .pp-body", {
                item: function () { return buttonIcon; },
                changed: function () {
                    cfg.btnIcon = buttonIcon.icon;
                    cfg.btnIconType = buttonIcon.iconType;
                    updateButtonIcon();
                    showProperties(cfg);
                }
            });
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

            bindColor("#pfTagBackColor", "tagBackColor", applyEssTagColors);
            bindColor("#pfTagTextColor", "tagTextColor", applyEssTagColors);

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
            if (cfg.ftype === "label") $dom.find(".page-field-editor > span").css("font-weight", cfg.captionBold ? "700" : "");
            builder.refreshJson();
        });

        $("#pfItalic").on("change", function () {
            cfg.captionItalic = this.checked;
            $dom.find(".page-field-caption")
                .css("font-style", cfg.captionItalic ? "italic" : "normal");
            if (cfg.ftype === "label") $dom.find(".page-field-editor > span").css("font-style", cfg.captionItalic ? "italic" : "");
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

        if (selfDrawn) selfDrawn.bindProperties(cfg);

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
                drawnHook(cfg, "beginResize");
                cfg.width = v;
                $dom.css("width", v);
                if (!isContainer && cfg.ftype !== "language") applyLayout($dom, cfg);
                drawnHook(cfg, "endResize");
                builder.refreshJson();
            }
        });

        $("#pfHeight").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                drawnHook(cfg, "beginResize");
                cfg.height = v;
                $dom.css("height", v);

                if (cfg.ftype && cfg.ftype !== "groupbox" && cfg.ftype !== "section" && cfg.ftype !== "language") {
                    applyLayout($dom, cfg);
                }
                applyEssInnerHeight($dom, cfg);
                drawnHook(cfg, "endResize");

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
        addNew: function (ftype, uiMode, dropPoint) {
            if (!ftype) ftype = "text";
            uiMode = uiMode || "core";

            var cfg = newConfig(ftype, uiMode);
            
            builder.placeAtDropPoint(cfg, dropPoint);

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

        changeType: changeFieldType,
        showProperties: showProperties,
        updateParent: updateFieldParent,

        deleteWithChildren: deleteFieldWithChildren,
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
