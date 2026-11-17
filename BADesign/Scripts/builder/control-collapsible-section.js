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
                var $parent = parentCfg.type === "popup"
                    ? $('.popup-design[data-id="' + cfg.parentId + '"]')
                    : $('.canvas-control[data-id="' + cfg.parentId + '"]');
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
        
        // Nếu là con của popup, GIỮ BÊN TRONG popup-body để di chuyển theo popup
        if (parentCfg && parentCfg.type === "popup") {
            var $popup = $('.popup-design[data-id="' + parentCfg.id + '"]');
            if ($popup.length && $container.length) {
                $root.css({ left: (cfg.left || 0) + "px", top: (cfg.top || 0) + "px" });
                $container.append($root);
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

        function applyExpandedState(expanded, silent) {
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

            if (!silent && window.builder && typeof builder.refreshJson === "function") {
                builder.refreshJson();
            }
        }

        // Áp trạng thái ban đầu
        applyExpandedState(cfg.expanded !== false, true);

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
                    builder.adoptControlsIntoGroup(cfg.id);
                },
                move: function(event) {
                    // Chỉ di chuyển bản thân ESS Collapsible Section,
                    // các control con đã position:absolute relative với content nên KHÔNG cần cộng dx/dy cho con.
                    isDragging = true; // Set flag để prevent toggle
                    builder.dragControlBy(cfg, $root, event.dx, event.dy);
                },
                end: function(event) {
                    // Restore cursor và opacity
                    $header.css("cursor", "grab");
                    $dragHandle.css("cursor", "grab");
                    $root.css("opacity", "1");
                    builder.finishControlDrag(cfg, $root, event);
                    // Reset flag sau một chút để cho phép toggle lại
                    setTimeout(function() {
                        isDragging = false;
                    }, 100);
                }
            }
        });

        // Make resizable
        $root.append('<div class="ub-resize ub-resize-right"></div><div class="ub-resize ub-resize-bottom"></div><div class="ub-resize ub-resize-corner"></div>');
        interact($root[0]).resizable({
            edges: { right: ".ub-resize-right, .ub-resize-corner", bottom: ".ub-resize-bottom, .ub-resize-corner" },
            listeners: {
                move: function(event) {
                    var scale = builder.cssScale();
                    var newWidth = Math.max(200, Math.round(event.rect.width / scale));
                    var newHeight = Math.max(80, Math.round(event.rect.height / scale));
                    $root.css({
                        width: newWidth + "px",
                        minHeight: newHeight + "px"
                    });
                    cfg.width = newWidth;
                    cfg.height = newHeight;
                    $content.css("minHeight", (newHeight - 50) + "px");
                },
                end: function () {
                    builder.refreshJson();
                }
            }
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
        var P = builderProps;
        P.render(P.panel("ESS Collapsible Section", "ID: " + cfg.id,
            P.section("Nội dung", P.line(P.field("Tiêu đề", P.text({ id: "csCaption", value: cfg.caption || "", placeholder: "Tiêu đề section" }), null, "csCaption"))) +
            P.section("Kích thước", P.grid(
                P.field("Rộng", P.number({ id: "csWidth", value: cfg.width || 400 }), "pp-field--num", "csWidth"),
                P.field("Cao", P.number({ id: "csHeight", value: cfg.height || 200 }), "pp-field--num", "csHeight"),
                P.field("Lề trong", P.number({ id: "csPadding", value: cfg.contentPadding || 12, min: 0 }), "pp-field--num", "csPadding"))) +
            P.section("Màu sắc", P.grid(
                P.field("Nền tiêu đề", P.colorPick({ id: "csBgColor", value: cfg.backgroundColor || "#f5f5f5" }), null, "csBgColor"),
                P.field("Chữ tiêu đề", P.colorPick({ id: "csHeaderColor", value: cfg.headerColor || "#0078d4" }), null, "csHeaderColor"),
                P.field("Viền", P.colorPick({ id: "csBorderColor", value: cfg.borderColor || "#e0e0e0" }), null, "csBorderColor"))) +
            P.section("Trạng thái", P.checks([P.check({ id: "csExpanded" }, "Mở sẵn", cfg.expanded !== false)]))));

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
            builder.placeAtDropPoint(cfg, dropPoint);
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
