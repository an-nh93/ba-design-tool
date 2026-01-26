// control-collapsible-section.js
// ESS Collapsible Section - Expandable/Collapsible panel control (similar to groupbox)

var controlCollapsibleSection = (function () {
    "use strict";

    function newId() {
        return "collapsible_" + new Date().getTime();
    }

    function createDefaultConfig() {
        return {
            id: newId(),
            type: "collapsible-section",
            caption: "General Information",
            expanded: true,
            left: 40,
            top: 40,
            width: 1024,   // Kích thước mặc định lớn cho layout ESS
            height: 600,
            backgroundColor: "#f5f5f5",
            borderColor: "#e0e0e0",
            headerColor: "#0078d4",
            contentPadding: 12,
            zIndex: 0 // Giống groupbox, zIndex thấp để các control con nằm trên
        };
    }

    function render(cfg) {
        // Ensure defaults
        cfg = cfg || createDefaultConfig();
        cfg.caption = cfg.caption || "General Information";
        cfg.expanded = cfg.expanded !== false;
        cfg.width = cfg.width || 1024;
        cfg.height = cfg.height || 600;
        cfg.backgroundColor = cfg.backgroundColor || "#f5f5f5";
        cfg.borderColor = cfg.borderColor || "#e0e0e0";
        cfg.headerColor = cfg.headerColor || "#0078d4";
        cfg.contentPadding = cfg.contentPadding || 12;
        cfg.zIndex = cfg.zIndex != null ? cfg.zIndex : 0;

        // Find container và xử lý z-index (giống groupbox/section)
        var $container = $("#canvas-zoom-inner");
        var parentCfg = null;
        if (cfg.parentId) {
            parentCfg = (builder.controls || []).find(function (c) { return c.id === cfg.parentId; });
            if (parentCfg) {
                var $parent = $('.canvas-control[data-id="' + cfg.parentId + '"]');
                if ($parent.length) {
                    if (parentCfg.type === "popup") {
                        $container = $parent.find(".popup-body").first();
                        // Z-index: collapsible-section nằm trên popup
                        var popupZ = parseInt($parent.css("z-index") || "0", 10);
                        if (isNaN(popupZ)) popupZ = 0;
                        cfg.zIndex = popupZ + 1;
                    } else if (parentCfg.type === "tabpage") {
                        $container = $parent.find(".tabpage-body").first();
                        cfg.zIndex = 0; // Giống groupbox trong tabpage
                    } else if (parentCfg.type === "collapsible-section") {
                        $container = $parent.find(".ess-collapsible-content").first();
                        // Z-index: con nằm trên parent
                        var parentZ = parseInt(parentCfg.zIndex || "0", 10);
                        if (isNaN(parentZ)) parentZ = 0;
                        cfg.zIndex = parentZ + 1;
                    } else {
                        $container = $parent.find(".popup-body, .tabpage-body, .ess-collapsible-content").first();
                        if (!$container.length) $container = $parent;
                    }
                }
            }
        } else {
            // Không có parent -> z-index mặc định = 0 (giống groupbox)
            cfg.zIndex = 0;
        }

        // Remove old element if exists
        var $old = $('.canvas-control[data-id="' + cfg.id + '"]');
        if ($old.length) {
            $old.remove();
        }

        var headerHeight = 50;

        // Create main container
        var $root = $('<div class="canvas-control ess-collapsible-section" data-id="' + cfg.id + '"></div>')
            .css({
                position: "absolute",
                left: cfg.left + "px",
                top: cfg.top + "px",
                width: cfg.width + "px",
                minHeight: cfg.height + "px",
                border: "1px solid " + cfg.borderColor,
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                boxSizing: "border-box",
                overflow: "hidden",
                zIndex: cfg.zIndex
            });
        
        // Nếu là con của popup, đưa DOM nằm sau popup để đảm bảo vẽ phía trên
        if (parentCfg && parentCfg.type === "popup") {
            var $popup = $('.popup-design[data-id="' + parentCfg.id + '"]');
            if ($popup.length) {
                // Append vào popup-body nhưng DOM nằm sau popup
                $container.append($root);
                $root.insertAfter($popup);
            }
        }

        // Create header với drag handle
        var $header = $('<div class="ess-collapsible-header"></div>')
            .css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: cfg.backgroundColor,
                borderBottom: "1px solid " + cfg.borderColor,
                cursor: "grab",
                userSelect: "none",
                position: "relative"
            });

        // Drag handle icon (4 dots) ở bên trái
        var $dragHandle = $('<span class="ess-collapsible-drag-handle" style="margin-right:8px; color:#999; font-size:12px; cursor:grab;">⋮⋮</span>')
            .css({
                fontSize: "16px",
                color: "#999",
                cursor: "grab",
                marginRight: "8px",
                lineHeight: "1",
                letterSpacing: "-2px"
            });

        var $title = $('<span class="ess-collapsible-title" style="flex:1;"></span>')
            .text(cfg.caption)
            .css({
                fontSize: "13px",
                fontWeight: "600",
                color: cfg.headerColor,
                flex: "1"
            });

        var $icon = $('<span class="ess-collapsible-icon">^</span>')
            .css({
                fontSize: "14px",
                color: "#666",
                transition: "transform 0.2s",
                transform: cfg.expanded ? "rotate(0deg)" : "rotate(180deg)",
                marginLeft: "8px",
                cursor: "pointer"
            });

        $header.append($dragHandle);
        $header.append($title);
        $header.append($icon);

        // Hover effect cho header
        $header.on("mouseenter", function() {
            $(this).css({
                cursor: "grab",
                backgroundColor: cfg.backgroundColor === "#f5f5f5" ? "#eeeeee" : cfg.backgroundColor
            });
            $dragHandle.css("color", "#666");
        }).on("mouseleave", function() {
            $(this).css({
                cursor: "grab",
                backgroundColor: cfg.backgroundColor
            });
            $dragHandle.css("color", "#999");
        });

        // Create content area - đây là container để drop controls vào
        var $content = $('<div class="ess-collapsible-content"></div>')
            .css({
                position: "relative",
                padding: cfg.contentPadding + "px",
                backgroundColor: "#ffffff",
                minHeight: (cfg.height - headerHeight) + "px",
                display: cfg.expanded ? "block" : "none"
            });

        // (Bỏ placeholder "Drop controls here" theo yêu cầu BA)

        // Toggle expand/collapse - chỉ toggle khi click vào icon hoặc title, không toggle khi drag
        var isDragging = false;

        function applyExpandedState(expanded) {
            cfg.expanded = expanded;

            if (expanded) {
                $content.stop(true, true).slideDown(150);
                $icon.css("transform", "rotate(0deg)");
                $root.css("minHeight", cfg.height + "px");
            } else {
                $content.stop(true, true).slideUp(150);
                $icon.css("transform", "rotate(180deg)");
                // Khi collapse, chỉ giữ lại chiều cao header
                $root.css("minHeight", headerHeight + "px");
            }

            if (window.builder && typeof builder.refreshJson === "function") {
                builder.refreshJson();
            }
        }

        // Áp trạng thái ban đầu
        applyExpandedState(cfg.expanded !== false);

        $icon.on("click", function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (!isDragging) {
                applyExpandedState(!cfg.expanded);
            }
        });
        
        $title.on("click", function(e) {
            e.stopPropagation();
            if (!isDragging) {
                applyExpandedState(!cfg.expanded);
            }
        });

        $root.append($header);
        $root.append($content);

        // Make draggable - drag từ header (trừ icon toggle)
        var dragInteract = interact($root[0]);
        dragInteract.draggable({
            allowFrom: ".ess-collapsible-header",
            ignoreFrom: ".ess-collapsible-icon",
            listeners: {
                start: function(event) {
                    isDragging = false; // Reset flag
                    // Thay đổi cursor khi bắt đầu drag
                    $header.css("cursor", "grabbing");
                    $dragHandle.css("cursor", "grabbing");
                    $root.css("opacity", "0.8"); // Visual feedback khi đang drag
                },
                move: function(event) {
                    // Chỉ di chuyển bản thân ESS Collapsible Section,
                    // các control con đã position:absolute relative với content nên KHÔNG cần cộng dx/dy cho con.
                    isDragging = true; // Set flag để prevent toggle
                    var curLeft = parseFloat($root.css("left")) || cfg.left || 0;
                    var curTop = parseFloat($root.css("top")) || cfg.top || 0;
                    var newLeft = curLeft + event.dx;
                    var newTop = curTop + event.dy;

                    // Không cho kéo ra ngoài top/left của canvas (ruler boundary: 20px)
                    var rulerLeft = 20;
                    var rulerTop = 20;
                    if (newLeft < rulerLeft) newLeft = rulerLeft;
                    if (newTop < rulerTop) newTop = rulerTop;
                    $root.css({ left: newLeft + "px", top: newTop + "px" });
                    cfg.left = newLeft;
                    cfg.top = newTop;
                    
                    if (builder && typeof builder.refreshJson === "function") {
                        builder.refreshJson();
                    }
                },
                end: function(event) {
                    // Restore cursor và opacity
                    $header.css("cursor", "grab");
                    $dragHandle.css("cursor", "grab");
                    $root.css("opacity", "1");
                    // Reset flag sau một chút để cho phép toggle lại
                    setTimeout(function() {
                        isDragging = false;
                    }, 100);
                }
            }
        });

        // Make resizable
        interact($root[0]).resizable({
            edges: { right: true, bottom: true },
            listeners: {
                move: function(event) {
                    var newWidth = event.rect.width;
                    var newHeight = event.rect.height;
                    $root.css({
                        width: newWidth + "px",
                        minHeight: newHeight + "px"
                    });
                    cfg.width = newWidth;
                    cfg.height = newHeight;
                    $content.css("minHeight", (newHeight - 50) + "px");
                    builder.refreshJson();
                }
            },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: document.getElementById("canvas"),
                    endOnly: true
                })
            ]
        });

        // Append to container (nếu chưa append trong phần popup handling)
        if (!$root.parent().length) {
            $container.append($root);
        }

        // Click handler to select
        $root.off("mousedown.collapsibleSelect").on("mousedown.collapsibleSelect", function(e) {
            if (e.button !== 0) return; // chỉ click trái
            
            var $target = $(e.target);

            // Nếu click vào icon toggle, không select
            if ($target.closest(".ess-collapsible-icon").length) {
                return;
            }

            // Nếu click vào content area → cho phép bubble lên canvas để dùng marquee selection
            if ($target.closest(".ess-collapsible-content").length) {
                return;
            }
            
            // Nếu click vào header nhưng không phải icon, vẫn select (nhưng có thể drag)
            // Chỉ select nếu không phải đang drag
            if (!isDragging) {
                e.stopPropagation();
                
                $(".canvas-control").removeClass("canvas-control-selected");
                $root.addClass("canvas-control-selected");
                
                builder.selectedControlId = cfg.id;
                builder.selectedControlType = "collapsible-section";
                builder.highlightOutlineSelection();
                builder.updateSelectionSizeHint();
                
                showProperties(cfg);
            }
        });

        // Update selection
        builder.selectedControlId = cfg.id;
        builder.selectedControlType = "collapsible-section";
        builder.highlightOutlineSelection();
    }

    function showProperties(cfg) {
        var html = [];
        html.push('<div class="ess-prop-tab-content ess-prop-tab-active" style="padding:12px;">');
        html.push('<h3 style="margin:0 0 12px 0; font-size:14px; font-weight:600; color:#0078d4;">ESS Collapsible Section</h3>');

        // Basic Info
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">ℹ️ Basic Info</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">📝</span><strong>Caption:</strong></label>');
        html.push('<input type="text" id="csCaption" class="ess-col-input" value="' + (cfg.caption || "").replace(/"/g, '&quot;') + '" placeholder="Section title" />');
        html.push('</div>');
        html.push('</div>');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">📏</span><strong>Width:</strong></label>');
        html.push('<input type="number" id="csWidth" class="ess-col-input" value="' + (cfg.width || 400) + '" style="width:100%;" />');
        html.push('</div>');
        html.push('</div>');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">📏</span><strong>Height:</strong></label>');
        html.push('<input type="number" id="csHeight" class="ess-col-input" value="' + (cfg.height || 200) + '" style="width:100%;" />');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');

        // Appearance
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">🎨 Appearance</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">🎨</span><strong>Header Background:</strong></label>');
        html.push('<input type="color" id="csBgColor" class="ess-col-input" value="' + (cfg.backgroundColor || "#f5f5f5") + '" style="width:100%;" />');
        html.push('</div>');
        html.push('</div>');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">🎨</span><strong>Header Text Color:</strong></label>');
        html.push('<input type="color" id="csHeaderColor" class="ess-col-input" value="' + (cfg.headerColor || "#0078d4") + '" style="width:100%;" />');
        html.push('</div>');
        html.push('</div>');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">🎨</span><strong>Border Color:</strong></label>');
        html.push('<input type="color" id="csBorderColor" class="ess-col-input" value="' + (cfg.borderColor || "#e0e0e0") + '" style="width:100%;" />');
        html.push('</div>');
        html.push('</div>');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">📐</span><strong>Content Padding:</strong></label>');
        html.push('<input type="number" id="csPadding" class="ess-col-input" value="' + (cfg.contentPadding || 12) + '" min="0" style="width:100%;" />');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');

        // State
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">⚙️ State</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><input type="checkbox" id="csExpanded" ' + (cfg.expanded !== false ? "checked" : "") + ' /> Expanded by default</label>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');

        html.push('</div>'); // Close ess-prop-tab-content

        $("#propPanel").html(html.join(""));

        // Wire up handlers
        $("#csCaption").on("change blur", function() {
            cfg.caption = this.value || "General Information";
            var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
            $dom.find(".ess-collapsible-title").text(cfg.caption);
            builder.refreshJson();
        });

        $("#csWidth").on("change blur", function() {
            var w = parseInt(this.value, 10);
            if (!isNaN(w) && w > 0) {
                cfg.width = w;
                var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
                $dom.css("width", w + "px");
                builder.refreshJson();
            }
        });

        $("#csHeight").on("change blur", function() {
            var h = parseInt(this.value, 10);
            if (!isNaN(h) && h > 0) {
                cfg.height = h;
                var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
                $dom.css("minHeight", h + "px");
                $dom.find(".ess-collapsible-content").css("minHeight", (h - 50) + "px");
                builder.refreshJson();
            }
        });

        $("#csBgColor").on("change", function() {
            cfg.backgroundColor = this.value;
            var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
            $dom.find(".ess-collapsible-header").css("backgroundColor", cfg.backgroundColor);
            builder.refreshJson();
        });

        $("#csHeaderColor").on("change", function() {
            cfg.headerColor = this.value;
            var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
            $dom.find(".ess-collapsible-title").css("color", cfg.headerColor);
            builder.refreshJson();
        });

        $("#csBorderColor").on("change", function() {
            cfg.borderColor = this.value;
            var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
            $dom.css("borderColor", cfg.borderColor);
            $dom.find(".ess-collapsible-header").css("borderBottomColor", cfg.borderColor);
            builder.refreshJson();
        });

        $("#csPadding").on("change blur", function() {
            var p = parseInt(this.value, 10);
            if (!isNaN(p) && p >= 0) {
                cfg.contentPadding = p;
                var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
                $dom.find(".ess-collapsible-content").css("padding", p + "px");
                builder.refreshJson();
            }
        });

        $("#csExpanded").on("change", function() {
            cfg.expanded = this.checked;
            var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
            var $content = $dom.find(".ess-collapsible-content");
            var $icon = $dom.find(".ess-collapsible-icon");
            if (cfg.expanded) {
                $content.slideDown(200);
                $icon.css("transform", "rotate(0deg)");
            } else {
                $content.slideUp(200);
                $icon.css("transform", "rotate(180deg)");
            }
            builder.refreshJson();
        });
    }

    return {
        addNew: function(dropPoint) {
            var cfg = createDefaultConfig();
            
            // Detect drop vào groupbox/section/collapsible-section (giống logic trong builder.js)
            var parentId = null;
            if (dropPoint && dropPoint.clientX != null && dropPoint.clientY != null) {
                var $groups = $(".page-field-groupbox, .popup-groupbox, .page-field-section, .popup-section, .ess-collapsible-section");
                $groups.each(function() {
                    var $group = $(this);
                    var gid = $group.attr("data-id");
                    if (!gid) return;
                    
                    var rect = this.getBoundingClientRect();
                    var tolerance = 50;
                    var inside = (dropPoint.clientX >= (rect.left - tolerance) && 
                                 dropPoint.clientX <= (rect.right + tolerance) && 
                                 dropPoint.clientY >= (rect.top - tolerance) && 
                                 dropPoint.clientY <= (rect.bottom + tolerance));
                    
                    if (inside) {
                        var $content = $group.find(".page-field-editor, .ess-collapsible-content").first();
                        if ($content.length) {
                            var contentRect = $content[0].getBoundingClientRect();
                            var insideContent = (dropPoint.clientX >= contentRect.left && 
                                               dropPoint.clientX <= contentRect.right && 
                                               dropPoint.clientY >= contentRect.top && 
                                               dropPoint.clientY <= contentRect.bottom);
                            if (insideContent) {
                                parentId = gid;
                                return false; // Break
                            }
                        }
                    }
                });
            }
            
            if (dropPoint && dropPoint.clientX != null && dropPoint.clientY != null) {
                if (window.builder && typeof builder.clientToCanvasPoint === "function") {
                    var canvasPoint = builder.clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY);
                    cfg.left = canvasPoint.x;
                    cfg.top = canvasPoint.y;
                    
                    // Nếu drop vào collapsible section, adjust position relative to content
                    if (parentId) {
                        var $parent = $('.ess-collapsible-section[data-id="' + parentId + '"]');
                        if ($parent.length) {
                            var parentCfg = builder.getControlConfig(parentId);
                            if (parentCfg) {
                                var $content = $parent.find(".ess-collapsible-content");
                                if ($content.length) {
                                    var contentRect = $content[0].getBoundingClientRect();
                                    var parentRect = $parent[0].getBoundingClientRect();
                                    cfg.left = parentCfg.left + (dropPoint.clientX - contentRect.left);
                                    cfg.top = parentCfg.top + 50 + (dropPoint.clientY - contentRect.top); // 50 = header height
                                }
                            }
                        }
                    }
                }
            }
            
            cfg.parentId = parentId;
            render(cfg);
            builder.registerControl(cfg);
            builder.refreshJson();
        },

        renderExisting: function(cfg) {
            render(cfg);
        },

        showProperties: function(cfg) {
            showProperties(cfg);
        }
    };
})();

// Expose globally
if (typeof window !== 'undefined') {
    window.controlCollapsibleSection = controlCollapsibleSection;
}
