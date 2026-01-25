var controlGrid = {

    // Tạo grid mới khi kéo từ toolbox
    addNew: function (popupId, dropPoint) {
        var id = "grid_" + new Date().getTime();
        var index = builder.controls.length || 0;

        var cfg = {
            id: id,
            type: "grid",
            columns: [
                { name: "Code", caption: "Code", width: 150 },
                { name: "Name", caption: "Name", width: 250 }
            ],
            filterRow: true,
            allowAdd: true,
            allowEdit: true,
            allowGrouping: true,

            showCheckbox: true,
            showViewColumn: true,
            showEditColumn: true,
            showDeleteColumn: true,
            showSearchBox: true,
            showTitle: true,
            titleText: "Gridview Title",
            titleBold: false,
            titleItalic: false,

            showToolbar: true,
            toolbarItems: [
                { text: "Add", icon: "/Content/images/icon-menu/menu-add.png" }
            ],
            showLocalDataLanguage: true,

            showDataHeader: true,
            dataHeaderCaption: "View Data",
            dataHeaderValue: "Company Data",

            rowActionColumns: [
                { key: "view", text: "View", icon: "/Content/images/grid-view.png", visible: true, width: 40 },
                { key: "edit", text: "Edit", icon: "/Content/images/grid-edit.png", visible: true, width: 40 },
                { key: "delete", text: "Delete", icon: "/Content/images/grid-delete.png", visible: true, width: 40 }
            ],

            // width theo px, không 100% canvas nữa
            width: 900,
            left: 10,
            top: 10 + index * 260,

            rowPermissions: {}
        };

        // ✅ Nếu có dropPoint, convert về tọa độ canvas và set vị trí
        if (dropPoint && dropPoint.clientX != null && dropPoint.clientY != null) {
            if (window.builder && typeof builder.clientToCanvasPoint === "function") {
                var canvasPoint = builder.clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY);
                cfg.left = canvasPoint.x;
                cfg.top = canvasPoint.y;
            }
        }

        // ✅ Nếu drop vào popup hoặc collapsible-section → gán parentId và điều chỉnh vị trí
        if (popupId && dropPoint) {
            cfg.parentId = popupId;
            
            // Check xem là popup hay collapsible-section
            var parentCfg = (builder.controls || []).find(function(c) { return c.id === popupId; });
            if (parentCfg) {
                // Convert drop point về tọa độ canvas
                var canvasPoint = builder.clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY);
                
                if (parentCfg.type === "popup") {
                    // Tính vị trí relative với popup (cả popup và drop point đều là canvas coordinates)
                    var relativeX = canvasPoint.x - (parentCfg.left || 0);
                    var relativeY = canvasPoint.y - (parentCfg.top || 0);
                    
                    // Lưu relative position (relative với popup body, trừ header ~50px)
                    cfg.left = Math.max(10, relativeX);
                    cfg.top = Math.max(50, relativeY); // Tránh header
                    
                    // Đảm bảo nằm trong popup
                    var popupWidth = parentCfg.width || 800;
                    var popupHeight = parentCfg.height || 600;
                    if (cfg.left > (popupWidth - 100)) cfg.left = popupWidth - 100;
                    if (cfg.top > (popupHeight - 100)) cfg.top = popupHeight - 100;
                } else if (parentCfg.type === "collapsible-section") {
                    // Tính vị trí relative với collapsible section content area
                    var headerHeight = 50;
                    var contentPadding = parentCfg.contentPadding || 12;
                    var relativeX = canvasPoint.x - (parentCfg.left || 0) - contentPadding;
                    var relativeY = canvasPoint.y - (parentCfg.top || 0) - headerHeight - contentPadding;
                    
                    cfg.left = Math.max(0, relativeX);
                    cfg.top = Math.max(0, relativeY);
                }
                
                console.log("Grid: Set parentId=" + cfg.parentId + ", type=" + parentCfg.type + ", left=" + cfg.left + ", top=" + cfg.top);
            }
        }

        this.renderExisting(cfg);
        builder.registerControl(cfg);
        
        // ✅ LUÔN LUÔN check popup sau khi render (giống field controls)
        // Vì tọa độ clientX/clientY có thể không chính xác do drag hint
        // Đợi một chút để DOM được render xong
        var self = this;
        setTimeout(function() {
            if (!cfg.parentId) {
                console.log("Grid: Checking for popup after render, cfg.left=" + cfg.left + ", cfg.top=" + cfg.top);
                var foundPopupId = builder.findParentPopupForControl(cfg);
                if (foundPopupId) {
                    cfg.parentId = foundPopupId;
                    console.log("Grid: ✅ Detected popup after render:", foundPopupId, "- Re-rendering...");
                    // Re-render với parentId mới
                    self.renderExisting(cfg);
                    builder.refreshJson();
                } else {
                    console.log("Grid: ❌ No popup found after render");
                }
            }
        }, 50); // Đợi 50ms để DOM render xong
    },

    // trạng thái nút theo từng dòng
    getButtonState: function (cfg, rowIndex, kind) {
        if (!cfg.rowPermissions) return "enabled";
        var rp = cfg.rowPermissions[rowIndex];
        if (!rp || !rp[kind]) return "enabled";
        return rp[kind]; // enabled / disabled / hidden
    },

    // ====== HEADER VIEW DATA / APPLIED FOR + TITLE / TOOLBAR / LOCAL LANG ======
    renderHeaderAndTitle: function (cfg) {
        var root = $(".canvas-control[data-id='" + cfg.id + "']");

        // --- View Data / Applied for ---
        var dataHeader = root.find(".grid-data-header");
        var dataCaption = root.find(".grid-data-caption");
        var dataSelect = root.find(".grid-data-select");

        if (cfg.showDataHeader) {
            dataHeader.show();
            dataCaption.text(cfg.dataHeaderCaption || "View Data");
            dataSelect.find("option").text(cfg.dataHeaderValue || "Company Data");
        } else {
            dataHeader.hide();
        }

        // --- Title & toolbar ---
        var bar = root.find(".grid-title-bar");
        var titleSpan = bar.find(".grid-title-text");
        var toolbarSpan = bar.find(".grid-toolbar");
        var rightDiv = bar.find(".grid-title-right");

        if (cfg.showTitle === false) {
            bar.hide();
        } else {
            bar.show();
            titleSpan.text(cfg.titleText || cfg.id);
        }

        titleSpan.css("font-weight", cfg.titleBold ? "700" : "normal");
        titleSpan.css("font-style", cfg.titleItalic ? "italic" : "normal");

        // toolbar menu
        toolbarSpan.empty();
        if (cfg.showToolbar !== false && cfg.toolbarItems && cfg.toolbarItems.length > 0) {
            cfg.toolbarItems.forEach(function (it) {
                var btn = $("<button type='button' class='grid-toolbar-btn'>");
                if (it.icon) {
                    var iconType = it.iconType || "menu";
                    if (iconType === "glyphicon") {
                        // Bootstrap Glyphicon
                        var iconColor = it.iconColor || "#333333";
                        var $icon = $("<span>").addClass(it.icon);
                        $icon.css({
                            "font-size": "14px",
                            "margin-right": "4px",
                            "color": iconColor
                        });
                        $icon.appendTo(btn);
                    } else {
                        // Menu icon (image)
                    $("<img>").attr("src", it.icon).appendTo(btn);
                    }
                }
                $("<span>").text(it.text || "").appendTo(btn);
                toolbarSpan.append(btn);
            });
        }

        // right side: Local Data Language
        rightDiv.empty();
        if (cfg.showLocalDataLanguage) {
            var langHtml = [
                '<span class="grid-local-lang">',
                '  <span class="grid-local-lang-label">Local Data Language</span>',
                '  <select class="grid-local-lang-select">',
                '       <option>English</option>',
                '  </select>',
                '</span>'
            ].join("");
            rightDiv.append(langHtml);
        }
    },

    // ====== CỘT DATA + CỘT ICON ======
    buildDxColumns: function (cfg) {
        var self = this;

        var dataColumns = (cfg.columns || []).map(function (c) {
            var col = {
                dataField: c.name,
                caption: c.caption
            };
            if (c.width) {
                col.width = c.width; // giữ width đã lưu trong cfg
            }
            return col;
        });

        var dxColumns = [];

        // ========== CÁC CỘT ACTION (icon theo dòng) ==========
        var actions = cfg.rowActionColumns || [];
        actions.forEach(function (act) {
            if (act.visible === false) return;

            dxColumns.push({
                caption: "",
                width: act.width || 40,
                alignment: "center",
                cssClass: "grid-icon-col",
                cellTemplate: function (container, options) {
                    var rowIndex = options.row.rowIndex;

                    // dùng rowPermissions nếu có (key: act.key)
                    var state = self.getButtonState(cfg, rowIndex, act.key);
                    if (state === "hidden") return;

                    // Support both menu icons (img) and glyphicons (span)
                    var iconType = act.iconType || "menu";
                    var iconSrc = act.icon || "/Content/images/grid-view.png";
                    
                    var $icon;
                    if (iconType === "glyphicon" && iconSrc) {
                        // Bootstrap Glyphicon
                        var iconColor = act.iconColor || "#333333";
                        $icon = $("<span>")
                            .addClass(iconSrc)
                            .addClass("grid-icon-" + act.key)
                            .css({
                                "font-size": "16px",
                                "color": iconColor,
                                "cursor": "pointer"
                            });
                    } else {
                        // Menu icon (image)
                        $icon = $("<img>")
                            .attr("src", iconSrc)
                        .addClass("grid-icon-" + act.key);
                    }

                    if (state === "disabled") {
                        $icon.addClass("grid-icon-disabled");
                        if (iconType === "glyphicon") {
                            $icon.css("opacity", "0.5");
                        }
                    } else {
                        if (act.key === "edit") {
                            $icon.on("click", function () {
                                options.component.editRow(rowIndex);
                            });
                        } else if (act.key === "delete") {
                            $icon.on("click", function () {
                                options.component.deleteRow(rowIndex);
                            });
                        }
                    }

                    if (act.tooltip) {
                        $icon.attr("title", act.tooltip);
                    }

                    $icon.appendTo(container);
                }
            });
        });

        // ========== CÁC CỘT DATA ==========
        dxColumns = dxColumns.concat(dataColumns);
        return dxColumns;
    },

    // ====== RENDER GRID ======
    renderExisting: function (cfg) {
        // ✅ XÓA DOM element cũ trước khi render mới để tránh duplicate
        var $oldGrid = $('.canvas-control[data-id="' + cfg.id + '"]');
        if ($oldGrid.length) {
            $oldGrid.remove();
        }
        
        if (typeof cfg.showSearchBox === "undefined") {
            cfg.showSearchBox = true;
        }

        var html = [
            '<div class="canvas-control" data-id="' + cfg.id + '" data-type="grid">',
            '  <div class="grid-header-panel-row"></div>',
            '  <div class="grid-data-header">',
            '      <div class="grid-data-left">',
            '          <span class="grid-data-caption"></span>',
            '          <select class="grid-data-select"><option></option></select>',
            '      </div>',
            '      <div class="grid-data-right">',
            '          <span class="grid-applied-label">Applied for</span>',
            '          <select class="grid-applied-select" disabled>',
            '              <option>Cadena Singapore Co., Ltd</option>',
            '          </select>',
            '      </div>',
            '  </div>',
            '  <div class="grid-title-bar">',
            '      <div class="grid-title-left">',
            '          <span class="grid-title-text"></span>',
            '          <span class="grid-toolbar"></span>',
            '      </div>',
            '      <div class="grid-title-right"></div>',
            '  </div>',
            '  <div id="' + cfg.id + '_dxGrid"></div>',
            '</div>'
        ].join("");

        // chuẩn hoá width về number (px)
        if (typeof cfg.width !== "number") {
            var w = parseFloat(cfg.width);
            if (isNaN(w) || w <= 0) w = 900;
            cfg.width = w;
        }

        // ✅ Nếu có parentId (popup hoặc collapsible-section) → append vào đúng container
        var $root;
        if (cfg.parentId) {
            var parentCfg = (builder.controls || []).find(function(c) { return c.id === cfg.parentId; });
            
            if (parentCfg && parentCfg.type === "collapsible-section") {
                // Append vào collapsible section content area
                var $section = $('.ess-collapsible-section[data-id="' + cfg.parentId + '"]');
                var $content = $section.find('.ess-collapsible-content');
                
                if ($content.length) {
                    $content.append(html);
                    $root = $content.find(".canvas-control[data-id='" + cfg.id + "']");
                    
                    // Position relative với content area
                    var finalLeft = cfg.left != null ? cfg.left : 0;
                    var finalTop = cfg.top != null ? cfg.top : 0;
                    
                    // Set z-index
                    var sectionZ = parseInt(parentCfg.zIndex || "0", 10);
                    if (isNaN(sectionZ)) sectionZ = 0;
                    $root.css("z-index", sectionZ + 1);
                    
                    $root.css({
                        position: "absolute",
                        left: finalLeft + "px",
                        top: finalTop + "px",
                        width: cfg.width + "px"
                    });
                } else {
                    // Fallback: append vào canvas
                    $("#canvas").append(html);
                    $root = $(".canvas-control[data-id='" + cfg.id + "']");
                    $root.css({
                        position: "absolute",
                        left: cfg.left || 10,
                        top: cfg.top || 10,
                        width: cfg.width + "px"
                    });
                }
            } else {
                // Logic cũ cho popup
                var $popup = $('.popup-design[data-id="' + cfg.parentId + '"]');
                var $popupBody = $popup.find('.popup-body');
                
                if ($popupBody.length) {
                    // Append vào popup-body
                    $popupBody.append(html);
                    $root = $popupBody.find(".canvas-control[data-id='" + cfg.id + "']");
                    
                    if (!$root.length) {
                        // Fallback: tìm trong toàn bộ DOM
                        $root = $(".canvas-control[data-id='" + cfg.id + "']");
                    }
                    
                    // Position relative với popup-body (không cần cộng popup offset)
                    var finalLeft = cfg.left != null ? cfg.left : 10;
                    var finalTop = cfg.top != null ? cfg.top : 50; // Tránh header
                    
                    // Set z-index cao hơn để hiển thị trên popup
                    var popupZ = parseInt($popup.css("z-index") || "0", 10);
                    if (isNaN(popupZ)) popupZ = 0;
                    $root.css("z-index", popupZ + 10);
                    
                    $root.css({
                        position: "absolute",
                        left: finalLeft + "px",
                        top: finalTop + "px",
                        width: cfg.width + "px"
                    });
                } else {
                    // Fallback: append vào canvas
                    $("#canvas").append(html);
                    $root = $(".canvas-control[data-id='" + cfg.id + "']");
                    $root.css({
                        position: "absolute",
                        left: (cfg.left != null ? cfg.left : 10) + "px",
                        top: (cfg.top != null ? cfg.top : 10) + "px",
                        width: cfg.width + "px"
                    });
                }
            }
        } else {
            // Không có parentId → append vào canvas
            $("#canvas").append(html);
            $root = $(".canvas-control[data-id='" + cfg.id + "']");
            $root.css({
                position: "absolute",
                left: (cfg.left != null ? cfg.left : 10) + "px",
                top: (cfg.top != null ? cfg.top : 10) + "px",
                width: cfg.width + "px"
            });
        }

        // kéo grid trên canvas (move)
        // CHỈ cho kéo khi bấm vào các thanh phía trên (View Data, Title...)
        // KHÔNG cho kéo khi bấm trong vùng dxDataGrid → để DevExtreme xử lý resize column
        interact($root[0]).draggable({
            // chỉ được start drag từ các vùng này
            allowFrom: ".grid-header-panel-row, .grid-data-header, .grid-title-bar",

            listeners: {
                move: function (event) {
                    var curLeft = parseFloat($root.css("left")) || cfg.left || 0;
                    var curTop = parseFloat($root.css("top")) || cfg.top || 0;

                    var newLeft = curLeft + event.dx;
                    var newTop = curTop + event.dy;

                    $root.css({ left: newLeft, top: newTop });
                    cfg.left = newLeft;
                    cfg.top = newTop;

                    // ✅ Nếu grid thuộc group, di chuyển tất cả controls trong group cùng lúc
                    if (cfg.groupId && builder && typeof builder.moveGroupControls === "function") {
                        builder.moveGroupControls(cfg.groupId, event.dx, event.dy);
                    }

                    if (window.builder && typeof builder.updateSelectionSizeHint === "function") {
                        builder.updateSelectionSizeHint();
                    }
                    builder.refreshJson();
                }
            }
        });




        // resize ngang grid (kéo cạnh phải)
        interact($root[0]).resizable({
            edges: { left: false, right: true, top: false, bottom: false },
            listeners: {
                move: function (event) {
                    var newW = event.rect.width;
                    if (newW < 200) newW = 200;

                    $root.css("width", newW + "px");
                    cfg.width = newW;

                    var inst = $("#" + cfg.id + "_dxGrid").dxDataGrid("instance");
                    if (inst) {
                        inst.option("width", "100%");
                    }

                    builder.refreshJson();
                }
            }
        });

        var dxColumns = this.buildDxColumns(cfg);
        var selectionOpt;

        if (cfg.showCheckbox === false) {
            selectionOpt = { mode: "none" };
        } else {
            selectionOpt = {
                mode: "multiple",
                showCheckBoxesMode: "always"
            };
        }

        var sampleData = controlGrid.createSampleData(cfg);

        var gridInstance = $("#" + cfg.id + "_dxGrid").dxDataGrid({
            dataSource: sampleData,
            columns: dxColumns,
            filterRow: { visible: cfg.filterRow === true },
            headerFilter: { visible: true },
            searchPanel: {
                visible: cfg.showSearchBox !== false,
                placeholder: "Search..."
            },
            groupPanel: {
                visible: cfg.allowGrouping !== false,
                allowColumnDragging: true
            },
            editing: {
                mode: "row",
                allowAdding: cfg.allowAdd === true,
                allowUpdating: cfg.allowEdit === true,
                allowDeleting: cfg.showDeleteColumn !== false
            },
            selection: selectionOpt,

            // QUAN TRỌNG: bật resize cột, mỗi cột độc lập, có thể scroll ngang
            columnAutoWidth: false,          // không tự auto-fit
            allowColumnResizing: true,       // bật resize
            columnResizingMode: "widget",
            columnMinWidth: 40,

            showBorders: true,
            showRowLines: true,
            showColumnLines: true,
            width: "100%",
            onColumnResized: function (e) {
                var col = e.component.columnOption(e.columnIndex);

                (cfg.columns || []).forEach(function (c) {
                    if (c.name === col.dataField || c.caption === col.caption) {
                        c.width = col.width;
                    }
                });

                (cfg.rowActionColumns || []).forEach(function (ac) {
                    if (ac.caption && ac.caption === col.caption) {
                        ac.width = col.width;
                    }
                });

                builder.refreshJson();
            },
            onRowInserted: function (e) {
                controlGrid.syncSampleDataFromGrid(cfg, e.component);
            },
            onRowUpdated: function (e) {
                controlGrid.syncSampleDataFromGrid(cfg, e.component);
            },
            onRowRemoved: function (e) {
                controlGrid.syncSampleDataFromGrid(cfg, e.component);
            }
        }).dxDataGrid("instance");


        // clear flag khi thả chuột
        $(document).off("mouseup.dxResize").on("mouseup.dxResize", function () {
            console.log("Tha chuot")
            builder.isGridColumnResizing = false;
        });

        // Lắng nghe mousedown ở capture phase để DevExtreme không chặn được
        document.addEventListener("mousedown", function (e) {
            // Chỉ xử lý nếu click vào handle resize của DevExtreme
            var handle = e.target.closest(".dx-col-resize-handle, .dx-resize-handle, .dx-datagrid-columns-separator");
            if (!handle) return;

            // Đảm bảo nó thuộc về grid trong canvas của mình (tránh dính grid nơi khác nếu có)
            var canvasRoot = handle.closest(".canvas-control");
            if (!canvasRoot) return;

            console.log("Set Resize", true);
            builder.isGridColumnResizing = true;
        }, true); // <-- quan trọng: capture = true


        // Đưa header panel lên hàng trên cùng
        var headerPanel = $root.find(".dx-datagrid-header-panel").detach();
        $root.find(".grid-header-panel-row").append(headerPanel);

        this.renderHeaderAndTitle(cfg);

        var self = this;

        // chọn grid khi click
        $root.on("mousedown", function (e) {
            // Nếu click bên trong vùng DevExtreme grid
            // => cho user tương tác (resize column, sort, filter...)
            // Không select control, không chặn event
            if ($(e.target).closest(".dx-datagrid").length) {
                return;
            }

            // Còn lại (click vào viền, header View Data, title...)
            // => chọn control trong canvas
            e.stopPropagation();

            $(".canvas-control").removeClass("canvas-control-selected");
            $(".popup-design").removeClass("popup-selected");
            $(".popup-field").removeClass("popup-field-selected");

            if (typeof controlPopup !== "undefined" &&
                typeof controlPopup.clearSelection === "function") {
                controlPopup.clearSelection();
            }

            $root.addClass("canvas-control-selected");
            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "grid";

            self.showProperties(cfg.id);
        });

        // ✅ Contextmenu: Giữ focus khi click chuột phải (giống ESS GridView)
        $root.on("contextmenu", function (e) {
            // Đảm bảo gridview được select trước khi hiện menu
            if (builder.selectedControlId !== cfg.id) {
                $(".canvas-control").removeClass("canvas-control-selected");
                $(".popup-design").removeClass("popup-selected");
                $(".popup-field").removeClass("popup-field-selected");

                if (typeof controlPopup !== "undefined" &&
                    typeof controlPopup.clearSelection === "function") {
                    controlPopup.clearSelection();
                }

                $root.addClass("canvas-control-selected");
                builder.selectedControlId = cfg.id;
                builder.selectedControlType = "grid";
            }
            // Không preventDefault để contextmenu event vẫn bubble lên document
        });
    },

    syncSampleDataFromGrid: function (cfg, gridInstance) {
        var ds = gridInstance.getDataSource();
        if (!ds) return;
        var items = ds.items();
        cfg.sampleData = items;     // lưu full array
        builder.refreshJson();
    },

    // ====== PANEL THUỘC TÍNH ======
    showProperties: function (id, preserveTab) {
        var cfg = builder.findControl(id);
        if (!cfg) return;

        // default cho config cũ
        cfg.showTitle = (cfg.showTitle !== false);
        cfg.titleText = cfg.titleText || ("Grid " + cfg.id);
        cfg.showToolbar = (cfg.showToolbar !== false);
        cfg.toolbarItems = cfg.toolbarItems || [];
        cfg.rowPermissions = cfg.rowPermissions || {};
        cfg.dataHeaderCaption = cfg.dataHeaderCaption || "View Data";
        cfg.dataHeaderValue = cfg.dataHeaderValue || "Company Data";
        if (typeof cfg.showSearchBox === "undefined") {
            cfg.showSearchBox = true;
        }

        cfg.rowActionColumns = cfg.rowActionColumns || [];

        if (!cfg.rowActionColumns.length) {
            var pushAct = function (key, text, icon, flag) {
                cfg.rowActionColumns.push({
                    key: key,
                    text: text,
                    icon: icon,
                    visible: (flag !== false),
                    width: 40
                });
            };
            pushAct("view", "View", "/Content/images/grid-view.png", cfg.showViewColumn);
            pushAct("edit", "Edit", "/Content/images/grid-edit.png", cfg.showEditColumn);
            pushAct("delete", "Delete", "/Content/images/grid-delete.png", cfg.showDeleteColumn);
        }

        function getActVisible(key, fallback) {
            var a = (cfg.rowActionColumns || []).find(function (x) { return x.key === key; });
            if (!a) return (fallback !== false);
            return (a.visible !== false);
        }

        // chuẩn hoá width về px
        if (typeof cfg.width !== "number") {
            var w = parseFloat(cfg.width);
            if (isNaN(w) || w <= 0) w = 900;
            cfg.width = w;
        }
        var widthVal = cfg.width;

        // Lưu tab hiện tại nếu không preserve
        var currentTab = preserveTab;
        if (!currentTab) {
            var $activeTab = $("#propPanel").find('.ess-prop-tab.ess-prop-tab-active');
            if ($activeTab.length) {
                currentTab = $activeTab.data('tab') || 'general';
            } else {
                currentTab = 'general';
            }
        }

        var html = [];
        html.push('<div class="ess-grid-props-wrapper">');
        html.push('<div class="ess-grid-props-header">');
        html.push('<h3 style="margin:0 0 8px 0; font-size:14px; font-weight:600;">Core GridView</h3>');
        html.push('<div class="ess-grid-props-tabs">');
        var generalActive = currentTab === 'general' ? ' ess-prop-tab-active' : '';
        var columnsActive = currentTab === 'columns' ? ' ess-prop-tab-active' : '';
        var toolbarActive = currentTab === 'toolbar' ? ' ess-prop-tab-active' : '';
        var actionsActive = currentTab === 'actions' ? ' ess-prop-tab-active' : '';
        var permissionsActive = currentTab === 'permissions' ? ' ess-prop-tab-active' : '';
        html.push('<button type="button" class="ess-prop-tab' + generalActive + '" data-tab="general">⚙️ General</button>');
        html.push('<button type="button" class="ess-prop-tab' + columnsActive + '" data-tab="columns">📊 Columns (' + (cfg.columns ? cfg.columns.length : 0) + ')</button>');
        html.push('<button type="button" class="ess-prop-tab' + toolbarActive + '" data-tab="toolbar">🔧 Toolbar (' + (cfg.toolbarItems ? cfg.toolbarItems.length : 0) + ')</button>');
        html.push('<button type="button" class="ess-prop-tab' + actionsActive + '" data-tab="actions">🔘 Actions (' + (cfg.rowActionColumns ? cfg.rowActionColumns.length : 0) + ')</button>');
        html.push('<button type="button" class="ess-prop-tab' + permissionsActive + '" data-tab="permissions">🔐 Permissions</button>');
        html.push('</div>');
        html.push('</div>');
        html.push('<div class="ess-grid-props-content">');

        // GENERAL TAB
        var generalTabActive = currentTab === 'general' ? ' ess-prop-tab-active' : '';
        html.push('<div class="ess-prop-tab-content' + generalTabActive + '" data-tab-content="general">');
        html.push('<div style="font-size:11px;color:#666;margin-bottom:8px;"><b>ID:</b> ' + cfg.id + '</div>');

        // Checkboxes - 2 cột để tiết kiệm diện tích
        html.push('<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px;">');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkFilterRow" ' + (cfg.filterRow ? "checked" : "") + '/> Show Filter Row</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkAllowAdd" ' + (cfg.allowAdd ? "checked" : "") + '/> Allow Add Row</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkAllowEdit" ' + (cfg.allowEdit ? "checked" : "") + '/> Allow Edit</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowSearch" ' + ((cfg.showSearchBox !== false) ? "checked" : "") + '/> Show search box</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowCheckbox" ' + ((cfg.showCheckbox !== false) ? "checked" : "") + '/> Show select checkbox</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowViewCol" ' + (getActVisible("view", cfg.showViewColumn) ? "checked" : "") + '/> Show View column</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowEditCol" ' + (getActVisible("edit", cfg.showEditColumn) ? "checked" : "") + '/> Show Edit column</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowDeleteCol" ' + (getActVisible("delete", cfg.showDeleteColumn) ? "checked" : "") + '/> Show Delete column</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkAllowGroup" ' + ((cfg.allowGrouping !== false) ? "checked" : "") + '/> Allow Group</label>');
        html.push('</div>');
        html.push('</div>'); // Close grid container
        html.push('<div class="mt-1">');
        html.push('<label>Grid width (px):</label><br/>');
        html.push('<input type="number" id="txtGridWidth" value="' + widthVal + '" style="width:100%;" placeholder="vd: 900" />');
        html.push('</div>');
        html.push('<hr style="margin:12px 0;"/>');
        html.push('<h4 style="margin:8px 0 4px 0; font-size:13px;">View Data / Applied for</h4>');
        // Checkbox này chỉ có 1 nên không cần grid
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowDataHeader" ' + (cfg.showDataHeader ? "checked" : "") + '/> Show View Data header</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label>View data caption:</label><br/>');
        html.push('<input type="text" id="txtDataCaption" value="' + (cfg.dataHeaderCaption || "") + '" style="width:100%;" />');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label>View data value:</label><br/>');
        html.push('<input type="text" id="txtDataValue" value="' + (cfg.dataHeaderValue || "") + '" style="width:100%;" />');
        html.push('</div>');
        html.push('<hr style="margin:12px 0;"/>');
        html.push('<h4 style="margin:8px 0 4px 0; font-size:13px;">Title & Toolbar</h4>');
        // Checkboxes - 2 cột
        html.push('<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px;">');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowTitle" ' + (cfg.showTitle ? "checked" : "") + '/> Show title</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowToolbar" ' + (cfg.showToolbar ? "checked" : "") + '/> Show toolbar menu</label>');
        html.push('</div>');
        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" id="chkShowLocalLang" ' + (cfg.showLocalDataLanguage ? "checked" : "") + '/> Show Local Data Language</label>');
        html.push('</div>');
        html.push('</div>'); // Close grid container
        // Title text input - riêng 1 dòng
        html.push('<div class="mt-1" style="margin-top:8px;">');
        html.push('<label>Title text:</label><br/>');
        html.push('<input type="text" id="txtGridTitle" value="' + (cfg.titleText || "") + '" style="width:100%;" />');
        html.push('</div>');
        // Title formatting checkboxes - riêng 1 dòng
        html.push('<div class="mt-1" style="margin-top:8px;">');
        html.push('<label><input type="checkbox" id="chkTitleBold" ' + (cfg.titleBold ? "checked" : "") + '/> <b>Bold</b></label>&nbsp;&nbsp;');
        html.push('<label><input type="checkbox" id="chkTitleItalic" ' + (cfg.titleItalic ? "checked" : "") + '/> <i>Italic</i></label>');
        html.push('</div>');
        html.push('</div>'); // ess-prop-tab-content general

        // COLUMNS TAB - Compact card view
        var columnsTabActive = currentTab === 'columns' ? ' ess-prop-tab-active' : '';
        html.push('<div class="ess-prop-tab-content' + columnsTabActive + '" data-tab-content="columns">');
        html.push('<div class="ess-col-header">');
        html.push('<input type="text" class="ess-search-input" id="coreColSearch" placeholder="🔍 Search columns..." style="width:100%; margin-bottom:8px; padding:6px 8px; border:1px solid #ddd; border-radius:4px; font-size:12px;"/>');
        html.push('<button type="button" class="ess-btn-primary" id="btnAddCol" style="width:100%; margin-bottom:12px;">＋ Add Column</button>');
        html.push('</div>');
        html.push('<div class="ess-columns-list-wrapper">');
        html.push('<div class="ess-columns-list" id="gridColumnsPanel">');
        
        // Render columns as compact cards với styling chuyên nghiệp
        (cfg.columns || []).forEach(function (col, idx) {
            html.push('<div class="ess-col-card" data-col-index="' + idx + '">');
            html.push('<div class="ess-col-card-header">');
            html.push('<span class="ess-col-number">' + (idx + 1) + '</span>');
            html.push('<div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">');
            html.push('<span style="font-size:11px; color:#0078d4; font-weight:600; white-space:nowrap; flex-shrink:0;">📋 Field:</span>');
            html.push('<input type="text" class="ess-col-caption" data-col-field="name" data-col-index="' + idx + '" value="' + (col.name || "") + '" placeholder="Field name (e.g. Code, Name)"/>');
            html.push('</div>');
            html.push('<button type="button" class="ess-col-expand" data-cmd="toggle-col-expand" title="Expand/Collapse">▼</button>');
            html.push('<button type="button" class="ess-col-delete btnDelCol" data-col-index="' + idx + '" title="Delete">🗑</button>');
            html.push('</div>');
            html.push('<div class="ess-col-card-body">');
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-col-field-full">');
            html.push('<label><span style="color:#0078d4;">📝</span><strong>Caption:</strong></label>');
            html.push('<input type="text" class="ess-col-input" data-col-field="caption" data-col-index="' + idx + '" value="' + (col.caption || "") + '" placeholder="Column caption"/>');
            html.push('</div>');
            html.push('</div>');
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-col-field-width">');
            html.push('<label><span style="color:#0078d4;">📏</span><strong>Width:</strong></label>');
            html.push('<input type="number" min="60" max="1500" class="ess-col-input" data-col-field="width" data-col-index="' + idx + '" value="' + (col.width || "") + '" placeholder="Auto"/>');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>'); // ess-col-card-body
            html.push('</div>'); // ess-col-card
        });
        
        html.push('</div>'); // ess-columns-list
        html.push('</div>'); // ess-columns-list-wrapper
        html.push('</div>'); // ess-prop-tab-content columns

        // Icon options HTML - dùng chung cho toolbar và actions
        var iconOptionsHtml = (window.MENU_ICON_LIST || []).map(function (ic) {
            return '<option value="' + ic.value + '">' + ic.text + '</option>';
        }).join("");

        // TOOLBAR TAB - Compact card view
        var toolbarTabActive = currentTab === 'toolbar' ? ' ess-prop-tab-active' : '';
        html.push('<div class="ess-prop-tab-content' + toolbarTabActive + '" data-tab-content="toolbar">');
        html.push('<div class="ess-col-header">');
        html.push('<button type="button" class="ess-btn-primary" id="btnAddToolbarItem" style="width:100%; margin-bottom:12px;">＋ Add Toolbar Item</button>');
        html.push('</div>');
        html.push('<div class="ess-actions-list-wrapper">');
        html.push('<div class="ess-actions-list" id="toolbarItemsPanel">');
        
        // Render toolbar items as cards với styling chuyên nghiệp
        (cfg.toolbarItems || []).forEach(function (item, idx) {
            var preview = item.icon ? "<img src='" + item.icon + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />" : "";
            html.push('<div class="ess-action-card" data-toolbar-index="' + idx + '">');
            html.push('<div class="ess-action-card-header">');
            html.push('<span class="ess-action-number">' + (idx + 1) + '</span>');
            html.push('<div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">');
            //html.push('<span style="font-size:11px; color:#0078d4; font-weight:600; white-space:nowrap; flex-shrink:0;">🔧 Menu:</span>');
            html.push('<input type="text" class="ess-action-caption" data-toolbar-field="text" data-toolbar-index="' + idx + '" value="' + (item.text || "") + '" placeholder="Menu text"/>');
            html.push('<span class="toolbar-icon-preview" data-toolbar-index="' + idx + '">' + preview + '</span>');
            html.push('</div>');
            html.push('<button type="button" class="ess-action-expand" data-cmd="toggle-toolbar-expand" title="Expand/Collapse">▼</button>');
            html.push('<button type="button" class="ess-action-delete btnDelToolbar" data-toolbar-index="' + idx + '" title="Delete">🗑</button>');
            html.push('</div>');
            html.push('<div class="ess-action-card-body">');
            html.push('<div class="ess-action-row">');
            html.push('<div class="ess-action-field ess-action-field-icon ess-action-field-full">');
            html.push('<label><span style="color:#0078d4;">🖼️</span><strong>Icon:</strong></label>');
            // Icon picker UI for toolbar items in gridview title
            var currentIcon = item.icon || "";
            var iconType = item.iconType || ""; // "menu" or "glyphicon" or ""
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
            
            var iconColor = item.iconColor || "#333333";
            html.push('<div class="toolbar-icon-picker-wrapper" data-toolbar-index="' + idx + '" style="display:flex; align-items:center; gap:8px;">');
            html.push('<div class="toolbar-icon-preview-full" style="flex:1; padding:6px 8px; background:#f5f5f5; border-radius:4px; min-height:32px; display:flex; flex-direction:row; align-items:center; justify-content:flex-start; gap:8px;">');
            html.push(iconPreview || '<span style="color:#999; font-size:11px;">No icon selected</span>');
            html.push(iconName ? '<span style="font-size:11px; color:#666;">' + iconName + '</span>' : '');
            html.push('</div>');
            html.push('<button type="button" class="ess-btn-primary toolbar-browse-icon" data-toolbar-index="' + idx + '" style="padding:6px 12px; white-space:nowrap; flex-shrink:0;">Browse...</button>');
            html.push('</div>');
            html.push('</div>'); // Close ess-action-field
            html.push('</div>'); // Close ess-action-row for Icon
            // Color picker for Glyphicon (only show when iconType is glyphicon) - separate row
            if (iconType === "glyphicon" && currentIcon) {
                html.push('<div class="ess-action-row" style="margin-top:8px;">');
                html.push('<div class="ess-action-field ess-action-field-full" style="flex:1;">');
                html.push('<label><span style="color:#0078d4;">🎨</span><strong>Icon Color:</strong></label>');
                html.push('<div style="display:flex; align-items:center; gap:8px;">');
                html.push('<input type="color" class="toolbar-icon-color-picker" data-toolbar-index="' + idx + '" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + iconColor + '">');
                html.push('<input type="text" class="toolbar-icon-color-text ess-col-input" data-toolbar-index="' + idx + '" style="flex:1;" value="' + iconColor + '">');
                html.push('</div>');
                html.push('</div>');
                html.push('</div>');
            }
            html.push('</div>'); // ess-action-card-body
            html.push('</div>'); // ess-action-card
        });
        
        html.push('</div>'); // ess-actions-list
        html.push('</div>'); // ess-actions-list-wrapper
        html.push('</div>'); // ess-prop-tab-content toolbar

        // ACTIONS TAB - Compact card view
        var actionsTabActive = currentTab === 'actions' ? ' ess-prop-tab-active' : '';
        html.push('<div class="ess-prop-tab-content' + actionsTabActive + '" data-tab-content="actions">');
        html.push('<div class="ess-col-header">');
        html.push('<button type="button" class="ess-btn-primary" id="btnAddRowActionCol" style="width:100%; margin-bottom:12px;">＋ Add Action Column</button>');
        html.push('</div>');
        html.push('<div class="ess-actions-list-wrapper">');
        html.push('<div class="ess-actions-list" id="rowActionColsPanel">');
        
        // Render row action columns as cards với styling chuyên nghiệp
        (cfg.rowActionColumns || []).forEach(function (ac, idx) {
            var preview = ac.icon ? "<img src='" + ac.icon + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />" : "";
            html.push('<div class="ess-action-card" data-action-index="' + idx + '">');
            html.push('<div class="ess-action-card-header">');
            html.push('<span class="ess-action-number">' + (idx + 1) + '</span>');
            html.push('<div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">');
            //html.push('<span style="font-size:11px; color:#0078d4; font-weight:600; white-space:nowrap; flex-shrink:0;">🔘 Action:</span>');
            html.push('<input type="text" class="ess-action-caption" data-action-field="text" data-action-index="' + idx + '" value="' + (ac.text || "") + '" placeholder="Action text"/>');
            html.push('<span class="rowact-icon-preview" data-action-index="' + idx + '">' + preview + '</span>');
            html.push('</div>');
            html.push('<button type="button" class="ess-action-expand" data-cmd="toggle-action-expand" title="Expand/Collapse">▼</button>');
            html.push('<button type="button" class="ess-action-delete btnDelRowAction" data-action-index="' + idx + '" title="Delete">🗑</button>');
            html.push('</div>');
            html.push('<div class="ess-action-card-body">');
            html.push('<div class="ess-action-row">');
            html.push('<div class="ess-action-field ess-action-field-key">');
            html.push('<label><span style="color:#0078d4;">🔑</span><strong>Key:</strong></label>');
            html.push('<input type="text" class="ess-action-input" data-action-field="key" data-action-index="' + idx + '" value="' + (ac.key || "") + '" placeholder="key"/>');
            html.push('</div>');
            html.push('<div class="ess-action-field ess-action-field-width">');
            html.push('<label><span style="color:#0078d4;">📏</span><strong>Width:</strong></label>');
            html.push('<input type="number" class="ess-action-input" data-action-field="width" data-action-index="' + idx + '" value="' + (ac.width || "") + '" placeholder="40"/>');
            html.push('</div>');
            html.push('</div>');
            html.push('<div class="ess-action-row">');
            html.push('<div class="ess-action-field ess-action-field-icon ess-action-field-full">');
            html.push('<label><span style="color:#0078d4;">🖼️</span><strong>Icon:</strong></label>');
            // Icon picker UI (similar to button icon picker, but without Remove button for action columns)
            var currentIcon = ac.icon || "";
            var iconType = ac.iconType || ""; // "menu" or "glyphicon" or ""
            var iconPreview = "";
            var iconTypeText = "";
            var iconName = "";
            
            if (currentIcon && iconType) {
                if (iconType === "glyphicon") {
                    var iconColor = ac.iconColor || "#333333";
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
            
            var iconColor = ac.iconColor || "#333333";
            html.push('<div class="rowact-icon-picker-wrapper" data-action-index="' + idx + '" style="display:flex; align-items:center; gap:8px;">');
            html.push('<div class="rowact-icon-preview-full" style="flex:1; padding:6px 8px; background:#f5f5f5; border-radius:4px; min-height:32px; display:flex; flex-direction:row; align-items:center; justify-content:flex-start; gap:8px;">');
            html.push(iconPreview || '<span style="color:#999; font-size:11px;">No icon selected</span>');
            html.push(iconName ? '<span style="font-size:11px; color:#666;">' + iconName + '</span>' : '');
            html.push('</div>');
            html.push('<button type="button" class="ess-btn-primary rowact-browse-icon" data-action-index="' + idx + '" style="padding:6px 12px; white-space:nowrap; flex-shrink:0;">Browse...</button>');
            html.push('</div>');
            html.push('</div>'); // Close ess-action-field
            html.push('</div>'); // Close ess-action-row for Icon
            
            // Color picker for Glyphicon (only show when iconType is glyphicon) - separate row
            if (iconType === "glyphicon" && currentIcon) {
                html.push('<div class="ess-action-row" style="margin-top:8px;">');
                html.push('<div class="ess-action-field ess-action-field-full" style="flex:1;">');
                html.push('<label><span style="color:#0078d4;">🎨</span><strong>Icon Color:</strong></label>');
                html.push('<div style="display:flex; align-items:center; gap:8px;">');
                html.push('<input type="color" class="rowact-icon-color-picker" data-action-index="' + idx + '" style="width:50px; height:32px; border:1px solid #ddd; border-radius:4px; cursor:pointer;" value="' + iconColor + '">');
                html.push('<input type="text" class="rowact-icon-color-text ess-col-input" data-action-index="' + idx + '" style="flex:1;" value="' + iconColor + '">');
                html.push('</div>');
                html.push('</div>');
                html.push('</div>');
            }
            html.push('<div class="ess-action-row">');
            html.push('<div class="ess-action-field">');
            html.push('<label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" data-action-field="visible" data-action-index="' + idx + '" ' + ((ac.visible !== false) ? "checked" : "") + '/><span style="color:#0078d4;">👁️</span><strong>Show</strong></label>');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>'); // ess-action-card-body
            html.push('</div>'); // ess-action-card
        });
        
        html.push('</div>'); // ess-actions-list
        html.push('</div>'); // ess-actions-list-wrapper
        html.push('</div>'); // ess-prop-tab-content actions

        // PERMISSIONS TAB - Card view cho row permissions
        var permissionsTabActive = currentTab === 'permissions' ? ' ess-prop-tab-active' : '';
        html.push('<div class="ess-prop-tab-content' + permissionsTabActive + '" data-tab-content="permissions">');
        html.push('<div class="ess-col-header">');
        html.push('<div style="font-size:12px; color:#666; margin-bottom:8px; padding:8px; background:#f8f9fa; border-radius:4px;">');
        html.push('🔐 <strong>Row Permissions:</strong> Configure permissions for each row based on action columns');
        html.push('</div>');
        html.push('</div>');
        html.push('<div class="ess-columns-list-wrapper">');
        html.push('<div class="ess-columns-list" id="rowPermPanel">');
        // Permissions sẽ được render bằng hàm renderRowPerm() sau
        html.push('</div>');
        html.push('</div>');
        html.push('</div>'); // ess-prop-tab-content permissions
        html.push('</div>'); // ess-grid-props-content
        html.push('</div>'); // ess-grid-props-wrapper

        var htmlStr = html.join('');

        $("#propPanel").html(htmlStr);

        // Tab switching logic
        $("#propPanel").off("click.coreGridTab").on("click.coreGridTab", ".ess-prop-tab", function(e) {
            e.stopPropagation();
            var tab = $(this).data('tab');
            $("#propPanel").find('.ess-prop-tab').removeClass('ess-prop-tab-active');
            $("#propPanel").find('.ess-prop-tab-content').removeClass('ess-prop-tab-active');
            $(this).addClass('ess-prop-tab-active');
            $("#propPanel").find('.ess-prop-tab-content[data-tab-content="' + tab + '"]').addClass('ess-prop-tab-active');
        });

        var self = this;

        // ==== basic flags ====
        $("#chkFilterRow").on("change", function () {
            cfg.filterRow = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkAllowAdd").on("change", function () {
            cfg.allowAdd = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkAllowEdit").on("change", function () {
            cfg.allowEdit = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkShowSearch").on("change", function () {
            cfg.showSearchBox = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkShowCheckbox").on("change", function () {
            cfg.showCheckbox = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkShowViewCol").on("change", function () {
            cfg.showViewColumn = this.checked;
            var a = (cfg.rowActionColumns || []).find(function (x) { return x.key === "view"; });
            if (a) a.visible = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkShowEditCol").on("change", function () {
            cfg.showEditColumn = this.checked;
            var a = (cfg.rowActionColumns || []).find(function (x) { return x.key === "edit"; });
            if (a) a.visible = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkShowDeleteCol").on("change", function () {
            cfg.showDeleteColumn = this.checked;
            var a = (cfg.rowActionColumns || []).find(function (x) { return x.key === "delete"; });
            if (a) a.visible = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkAllowGroup").on("change", function () {
            cfg.allowGrouping = this.checked;
            self.refreshGrid(cfg);
        });
        $("#txtGridWidth").on("change blur", function () {
            var v = parseFloat(this.value);
            if (isNaN(v) || v <= 0) return;
            cfg.width = v;
            self.refreshGrid(cfg);
        });

        // ==== View Data header ====
        $("#chkShowDataHeader").on("change", function () {
            cfg.showDataHeader = this.checked;
            self.refreshGrid(cfg);
        });
        $("#txtDataCaption").on("change blur", function () {
            cfg.dataHeaderCaption = this.value;
            self.refreshGrid(cfg);
        });
        $("#txtDataValue").on("change blur", function () {
            cfg.dataHeaderValue = this.value;
            self.refreshGrid(cfg);
        });

        // ==== title & toolbar ====
        $("#chkShowTitle").on("change", function () {
            cfg.showTitle = this.checked;
            self.refreshGrid(cfg);
        });
        $("#txtGridTitle").on("change blur", function () {
            cfg.titleText = this.value;
            self.refreshGrid(cfg);
        });
        $("#chkTitleBold").on("change", function () {
            cfg.titleBold = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkTitleItalic").on("change", function () {
            cfg.titleItalic = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkShowToolbar").on("change", function () {
            cfg.showToolbar = this.checked;
            self.refreshGrid(cfg);
        });
        $("#chkShowLocalLang").on("change", function () {
            cfg.showLocalDataLanguage = this.checked;
            self.refreshGrid(cfg);
        });

        // ==== toolbar items ==== - Card view đã được render trong HTML, chỉ wire events
        function renderToolbarItems() {
            // Card view đã được render trong HTML, chỉ cần wire events
            // Set giá trị icon cho các select đã render
            // Wire events cho toolbar items
            $("#toolbarItemsPanel input[data-toolbar-field='text']").off("change.coreGridToolbar").on("change.coreGridToolbar", function () {
                var idx = parseInt($(this).data('toolbar-index'), 10);
                cfg.toolbarItems[idx].text = $(this).val();
                self.refreshGrid(cfg);
            });

            // Wire up icon picker for toolbar items in gridview title
            // Use event delegation on #propPanel to ensure it works even if elements are re-rendered
            $("#propPanel").off("click.coreGridToolbarIcon", ".toolbar-browse-icon").on("click.coreGridToolbarIcon", ".toolbar-browse-icon", function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log("Core GridView Toolbar: Browse icon clicked");
                var idx = parseInt($(this).data("toolbar-index"), 10);
                var item = cfg.toolbarItems[idx];
                if (!item) {
                    console.warn("Core GridView Toolbar: Item not found for index:", idx);
                    return;
                }
                
                // Use the icon picker from control-field.js
                if (window.controlField && typeof controlField.showIconPicker === "function") {
                    // Save current tab to restore after icon selection
                    var $panel = $("#propPanel");
                    var currentTab = $panel.find('.ess-prop-tab.ess-prop-tab-active').data('tab') || 'toolbar';
                    console.log("Core GridView Toolbar: Opening icon picker, currentTab:", currentTab);
                    controlField.showIconPicker(item.iconType || "menu", function(selectedIcon, selectedIconType) {
                        console.log("Core GridView Toolbar: Icon selected:", selectedIcon, selectedIconType);
                        if (selectedIcon && selectedIconType) {
                            item.icon = selectedIcon;
                            item.iconType = selectedIconType;
                            // Set default color for Glyphicon if not set
                            if (selectedIconType === "glyphicon" && !item.iconColor) {
                                item.iconColor = "#333333";
                            }
                            // Update preview
                            updateToolbarIconPreview(idx, item);
                            self.refreshGrid(cfg);
                            // Re-show properties to update preview, but keep the same tab
                            self.showProperties(cfg.id, currentTab);
                        }
                    });
                } else {
                    console.error("Core GridView Toolbar: controlField.showIconPicker is not available");
                }
            });
            
            // Update icon previews on load
            function updateToolbarIconPreview(idx, item) {
                var $wrapper = $("#toolbarItemsPanel .toolbar-icon-picker-wrapper[data-toolbar-index='" + idx + "']");
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
                
                var $preview = $wrapper.find('.toolbar-icon-preview-full');
                var $headerPreview = $("#toolbarItemsPanel .toolbar-icon-preview[data-toolbar-index='" + idx + "']");
                
                if (iconPreview) {
                    $preview.html(iconPreview + (iconName ? '<span style="font-size:11px; color:#666;">' + iconName + '</span>' : ''));
                    // Update header preview too
                    if ($headerPreview.length) {
                        if (iconType === "glyphicon") {
                            var iconColor = item.iconColor || "#333333";
                            $headerPreview.html('<span class="' + currentIcon + '" style="font-size:16px; color:' + iconColor + ';"></span>');
                } else {
                            $headerPreview.html("<img src='" + currentIcon + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />");
                        }
                    }
                } else {
                    $preview.html('<span style="color:#999; font-size:11px;">No icon selected</span>');
                    if ($typeLabel.length) {
                        $typeLabel.hide();
                    }
                    if ($headerPreview.length) {
                        $headerPreview.empty();
                    }
                }
            }
            
            // Initialize icon previews for all toolbar items
            (cfg.toolbarItems || []).forEach(function(item, idx) {
                updateToolbarIconPreview(idx, item);
            });
            
            // Color picker handlers for toolbar items
            function bindToolbarColorPair(pickerSel, textSel, idx) {
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
                    $text.off("change.coreGridToolbarColor blur.coreGridToolbarColor").on("change.coreGridToolbarColor blur.coreGridToolbarColor", function () {
                        var v = normalizeColor($(this).val());
                        var item = cfg.toolbarItems[idx];
                        if (item && item.iconType === "glyphicon") {
                            item.iconColor = v;
                            if ($picker.length && /^#[0-9a-f]{6}$/i.test(v)) {
                                $picker.val(v);
                            }
                            updateToolbarIconPreview(idx, item);
                            self.refreshGrid(cfg);
                            builder.refreshJson();
                        }
                    });
                }
                
                if ($picker.length) {
                    $picker.off("input.coreGridToolbarColor change.coreGridToolbarColor").on("input.coreGridToolbarColor change.coreGridToolbarColor", function () {
                        var v = normalizeColor($(this).val());
                        var item = cfg.toolbarItems[idx];
                        if (item && item.iconType === "glyphicon") {
                            item.iconColor = v;
                            if ($text.length) $text.val(v);
                            updateToolbarIconPreview(idx, item);
                            self.refreshGrid(cfg);
                            builder.refreshJson();
                        }
                    });
                }
            }
            
            // Wire color pickers for all toolbar items
            (cfg.toolbarItems || []).forEach(function(item, idx) {
                if (item.iconType === "glyphicon" && item.icon) {
                    bindToolbarColorPair(
                        ".toolbar-icon-color-picker[data-toolbar-index='" + idx + "']",
                        ".toolbar-icon-color-text[data-toolbar-index='" + idx + "']",
                        idx
                    );
                }
            });

            $("#toolbarItemsPanel .btnDelToolbar").off("click.coreGridToolbar").on("click.coreGridToolbar", function () {
                var idx = parseInt($(this).data('toolbar-index'), 10);
                cfg.toolbarItems.splice(idx, 1);
                // Re-render properties để cập nhật card view
                self.showProperties(cfg.id, 'toolbar');
                self.refreshGrid(cfg);
            });
        }

        // ==== columns ==== - Card view đã được render trong HTML, chỉ wire events
        function renderColumns() {
            // Card view đã được render trong HTML, chỉ cần wire events
            $("#gridColumnsPanel").find("input[data-col-field]").off("change.coreGridCol").on("change.coreGridCol", function () {
                var idx = parseInt($(this).data('col-index'), 10);
                var field = $(this).data('col-field');
                if (field === "width") {
                    var val = parseFloat($(this).val());
                    cfg.columns[idx].width = isNaN(val) || val <= 0 ? null : val;
                } else {
                    cfg.columns[idx][field] = $(this).val();
                }
                self.refreshGrid(cfg);
            });

            $("#gridColumnsPanel").find(".btnDelCol").off("click.coreGridCol").on("click.coreGridCol", function () {
                var idx = parseInt($(this).data('col-index'), 10);
                cfg.columns.splice(idx, 1);
                // Re-render properties để cập nhật card view
                self.showProperties(cfg.id, 'columns');
                self.refreshGrid(cfg);
            });
        }

        $("#btnAddToolbarItem").off("click.coreGridAdd").on("click.coreGridAdd", function () {
            cfg.toolbarItems = cfg.toolbarItems || [];
            cfg.toolbarItems.push({
                text: "Menu " + (cfg.toolbarItems.length + 1),
                icon: ""
            });
            // Re-render properties để cập nhật card view
            self.showProperties(cfg.id, 'toolbar');
            self.refreshGrid(cfg);
        });

        // ==== row permission: dynamic theo rowActionColumns ==== - Card view
        function renderRowPerm() {
            var maxRows = 5;
            var actions = cfg.rowActionColumns || [];
            var html = [];

            if (!actions.length) {
                html.push('<div class="ess-col-card" style="padding:20px; text-align:center; color:#999;">');
                html.push('🔐 <strong>No row action columns.</strong><br/>');
                html.push('<span style="font-size:11px;">Add action columns in the Actions tab first.</span>');
                html.push('</div>');
                $("#rowPermPanel").html(html.join(''));
                return;
            }

            for (var i = 0; i < maxRows; i++) {
                var rp = cfg.rowPermissions[i] || {};

                html.push('<div class="ess-col-card" data-row-index="' + i + '">');
                html.push('<div class="ess-col-card-header">');
                html.push('<span class="ess-col-number">' + (i + 1) + '</span>');
                html.push('<div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">');
                html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">🔐 Row ' + (i + 1) + ' Permissions</span>');
                html.push('</div>');
                html.push('</div>');
                html.push('<div class="ess-col-card-body">');

                actions.forEach(function (act, idx) {
                    if (act.visible === false) return;

                    var key = act.key || ("action" + (idx + 1));
                    var label = act.text || key;
                    var state = rp[key] || "enabled";

                    html.push('<div class="ess-col-row">');
                    html.push('<div class="ess-col-field ess-col-field-full">');
                    html.push('<label><span style="color:#0078d4;">🔘</span><strong>' + label + ':</strong></label>');
                    html.push('<select class="ess-col-input" data-row="' + i + '" data-key="' + key + '">');
                    html.push('<option value="enabled"' + (state === "enabled" ? " selected" : "") + '>✅ Enabled</option>');
                    html.push('<option value="disabled"' + (state === "disabled" ? " selected" : "") + '>❌ Disabled</option>');
                    html.push('<option value="hidden"' + (state === "hidden" ? " selected" : "") + '>👁️‍🗨️ Hidden</option>');
                    html.push('</select>');
                    html.push('</div>');
                    html.push('</div>');
                });
                
                html.push('</div>'); // ess-col-card-body
                html.push('</div>'); // ess-col-card
            }

            $("#rowPermPanel").html(html.join(''));

            $("#rowPermPanel select").off("change.rowPerm").on("change.rowPerm", function () {
                var rowIndex = parseInt($(this).data('row'), 10);
                var key = $(this).data('key');
                var val = $(this).val();

                cfg.rowPermissions[rowIndex] = cfg.rowPermissions[rowIndex] || {};
                cfg.rowPermissions[rowIndex][key] = val;

                self.refreshGrid(cfg);
            });
        }

        function renderRowActionCols() {
            // Card view đã được render trong HTML, chỉ cần wire events
            // Icon picker is now used instead of select dropdown, so this is no longer needed
            // $("#rowActionColsPanel .rowact-icon-select").each(function () {
            //     var idx = parseInt($(this).closest('.ess-action-card').data('action-index'), 10);
            //     var icon = (cfg.rowActionColumns[idx] && cfg.rowActionColumns[idx].icon) || "";
            //     $(this).val(icon);
            // });

            // Wire events cho row action columns
            $("#rowActionColsPanel input[data-action-field!='visible']").off("change.coreGridAction").on("change.coreGridAction", function () {
                var idx = parseInt($(this).data('action-index'), 10);
                var field = $(this).data('action-field');
                if (field === "width") {
                    var val = parseFloat($(this).val());
                    cfg.rowActionColumns[idx].width = isNaN(val) || val <= 0 ? null : val;
                } else {
                    cfg.rowActionColumns[idx][field] = $(this).val();
                }
                self.refreshGrid(cfg);
                renderRowPerm();
            });

            $("#rowActionColsPanel input[data-action-field='visible']").off("change.coreGridAction").on("change.coreGridAction", function () {
                var idx = parseInt($(this).data('action-index'), 10);
                cfg.rowActionColumns[idx].visible = $(this).is(':checked');
                self.refreshGrid(cfg);
                renderRowPerm();
            });

            // Wire up icon picker for core gridview action columns
            // Use event delegation on #propPanel to ensure it works even if elements are re-rendered
            $("#propPanel").off("click.coreGridActionIcon", ".rowact-browse-icon").on("click.coreGridActionIcon", ".rowact-browse-icon", function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log("Core GridView Action: Browse icon clicked");
                var idx = parseInt($(this).data("action-index"), 10);
                var ac = cfg.rowActionColumns[idx];
                if (!ac) {
                    console.warn("Core GridView: Action column not found for index:", idx);
                    return;
                }
                
                // Use the icon picker from control-field.js
                if (window.controlField && typeof controlField.showIconPicker === "function") {
                    // Save current tab to restore after icon selection
                    var $panel = $("#propPanel");
                    var currentTab = $panel.find('.ess-prop-tab.ess-prop-tab-active').data('tab') || 'actions';
                    console.log("Core GridView Action: Opening icon picker, currentTab:", currentTab);
                    controlField.showIconPicker(ac.iconType || "menu", function(selectedIcon, selectedIconType) {
                        console.log("Core GridView Action: Icon selected:", selectedIcon, selectedIconType);
                        if (selectedIcon && selectedIconType) {
                            ac.icon = selectedIcon;
                            ac.iconType = selectedIconType;
                            // Set default color for Glyphicon if not set
                            if (selectedIconType === "glyphicon" && !ac.iconColor) {
                                ac.iconColor = "#333333";
                            }
                            // Update preview
                            updateCoreGridActionIconPreview(idx, ac);
                            self.refreshGrid(cfg);
            renderRowPerm();
                            // Re-show properties to update preview, but keep the same tab
                            self.showProperties(cfg.id, currentTab);
                        }
                    });
                } else {
                    console.error("Core GridView: controlField.showIconPicker is not available");
                }
            });
            
            // Update icon previews on load
            function updateCoreGridActionIconPreview(idx, ac) {
                var $wrapper = $("#rowActionColsPanel .rowact-icon-picker-wrapper[data-action-index='" + idx + "']");
                if (!$wrapper.length) return;
                
                var currentIcon = ac.icon || "";
                var iconType = ac.iconType || "";
                var iconPreview = "";
                var iconTypeText = "";
                var iconName = "";
                
                if (currentIcon && iconType) {
                    if (iconType === "glyphicon") {
                        var iconColor = ac.iconColor || "#333333";
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
                
                var $preview = $wrapper.find('.rowact-icon-preview-full');
                var $headerPreview = $("#rowActionColsPanel .rowact-icon-preview[data-action-index='" + idx + "']");
                
                if (iconPreview) {
                    $preview.html(iconPreview + (iconName ? '<span style="font-size:11px; color:#666;">' + iconName + '</span>' : ''));
                    // Update header preview too
                    if ($headerPreview.length) {
                        if (iconType === "glyphicon") {
                            var iconColor = ac.iconColor || "#333333";
                            $headerPreview.html('<span class="' + currentIcon + '" style="font-size:16px; color:' + iconColor + ';"></span>');
                } else {
                            $headerPreview.html("<img src='" + currentIcon + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />");
                        }
                    }
                } else {
                    $preview.html('<span style="color:#999; font-size:11px;">No icon selected</span>');
                    if ($typeLabel.length) {
                        $typeLabel.hide();
                    }
                    if ($headerPreview.length) {
                        $headerPreview.empty();
                    }
                }
            }
            
            // Initialize icon previews for all action columns
            (cfg.rowActionColumns || []).forEach(function(ac, idx) {
                updateCoreGridActionIconPreview(idx, ac);
            });
            
            // Color picker handlers for action columns
            function bindActionColorPair(pickerSel, textSel, idx) {
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
                    $text.off("change.coreGridActionColor blur.coreGridActionColor").on("change.coreGridActionColor blur.coreGridActionColor", function () {
                        var v = normalizeColor($(this).val());
                        var ac = cfg.rowActionColumns[idx];
                        if (ac && ac.iconType === "glyphicon") {
                            ac.iconColor = v;
                            if ($picker.length && /^#[0-9a-f]{6}$/i.test(v)) {
                                $picker.val(v);
                            }
                            updateCoreGridActionIconPreview(idx, ac);
                            self.refreshGrid(cfg);
                            builder.refreshJson();
                        }
                    });
                }
                
                if ($picker.length) {
                    $picker.off("input.coreGridActionColor change.coreGridActionColor").on("input.coreGridActionColor change.coreGridActionColor", function () {
                        var v = normalizeColor($(this).val());
                        var ac = cfg.rowActionColumns[idx];
                        if (ac && ac.iconType === "glyphicon") {
                            ac.iconColor = v;
                            if ($text.length) $text.val(v);
                            updateCoreGridActionIconPreview(idx, ac);
                            self.refreshGrid(cfg);
                            builder.refreshJson();
                        }
                    });
                }
            }
            
            // Wire color pickers for all action columns
            (cfg.rowActionColumns || []).forEach(function(ac, idx) {
                if (ac.iconType === "glyphicon" && ac.icon) {
                    bindActionColorPair(
                        ".rowact-icon-color-picker[data-action-index='" + idx + "']",
                        ".rowact-icon-color-text[data-action-index='" + idx + "']",
                        idx
                    );
                }
            });

            $("#rowActionColsPanel .btnDelRowAction").off("click.coreGridAction").on("click.coreGridAction", function () {
                var idx = parseInt($(this).data('action-index'), 10);
                cfg.rowActionColumns.splice(idx, 1);
                // Re-render properties để cập nhật card view
                self.showProperties(cfg.id, 'actions');
                self.refreshGrid(cfg);
            });
            
            renderRowPerm();
        }

        $("#btnAddRowActionCol").off("click.coreGridAdd").on("click.coreGridAdd", function () {
            cfg.rowActionColumns = cfg.rowActionColumns || [];
            var n = cfg.rowActionColumns.length + 1;
            cfg.rowActionColumns.push({
                key: "action" + n,
                text: "Action " + n,
                icon: "",
                visible: true,
                width: 40
            });
            // Re-render properties để cập nhật card view
            self.showProperties(cfg.id, 'actions');
            self.refreshGrid(cfg);
        });

        $("#btnAddCol").off("click.coreGridAdd").on("click.coreGridAdd", function () {
            cfg.columns = cfg.columns || [];
            cfg.columns.push({
                name: "Field" + (cfg.columns.length + 1),
                caption: "Column " + (cfg.columns.length + 1),
                width: 150
            });
            // Re-render properties để cập nhật card view
            self.showProperties(cfg.id, 'columns');
            self.refreshGrid(cfg);
        });

        // Wire events cho card view đã render
        renderToolbarItems();
        renderColumns();
        renderRowActionCols();
        
        // Wire expand/collapse buttons
        $("#propPanel").off("click.coreGridExpand").on("click.coreGridExpand", "[data-cmd='toggle-col-expand'], [data-cmd='toggle-action-expand'], [data-cmd='toggle-toolbar-expand']", function(e) {
            e.stopPropagation();
            var $card = $(this).closest('.ess-col-card, .ess-action-card');
            $card.toggleClass('ess-col-card-collapsed ess-action-card-collapsed');
            var isCollapsed = $card.hasClass('ess-col-card-collapsed') || $card.hasClass('ess-action-card-collapsed');
            $(this).text(isCollapsed ? '▶' : '▼');
        });
    },

    // ====== REFRESH GRID ======
    refreshGrid: function (cfg) {
        var grid = $("#" + cfg.id + "_dxGrid").dxDataGrid("instance");
        if (!grid) return;

        var dxColumns = this.buildDxColumns(cfg);

        var selectionOpt;
        if (cfg.showCheckbox === false) {
            selectionOpt = { mode: "none" };
        } else {
            selectionOpt = {
                mode: "multiple",
                showCheckBoxesMode: "always"
            };
        }

        // chuẩn hoá width container
        if (typeof cfg.width !== "number") {
            var w = parseFloat(cfg.width);
            if (isNaN(w) || w <= 0) w = 900;
            cfg.width = w;
        }

        grid.option({
            columns: dxColumns,
            selection: selectionOpt,
            'filterRow.visible': cfg.filterRow === true,
            'groupPanel.visible': cfg.allowGrouping !== false,
            'editing.allowAdding': cfg.allowAdd === true,
            'editing.allowUpdating': cfg.allowEdit === true,
            'editing.allowDeleting': cfg.showDeleteColumn !== false,
            'searchPanel.visible': cfg.showSearchBox !== false,

            columnAutoWidth: false,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnMinWidth: 40,
            width: "100%"
        });

        var $root = $(".canvas-control[data-id='" + cfg.id + "']");
        $root.css("width", cfg.width + "px");

        var headerPanel = $root.find(".dx-datagrid-header-panel").detach();
        $root.find(".grid-header-panel-row").append(headerPanel);

        this.renderHeaderAndTitle(cfg);
        builder.refreshJson();
    },


    // ====== DATA MẪU ======
    createSampleData: function (cfg) {
        if (cfg.sampleData && cfg.sampleData.length > 0) {
            return cfg.sampleData;
        }
        var cols = (cfg.columns || []).map(function (c) { return c.name; });
        if (cols.length === 0) return [];

        var data = [];
        for (var i = 1; i <= 5; i++) {
            var row = {};
            cols.forEach(function (c) {
                if (c.toLowerCase() === "code") {
                    row[c] = "Code " + i;
                } else if (c.toLowerCase() === "name") {
                    row[c] = "Name " + i;
                } else {
                    row[c] = c + " " + i;
                }
            });
            data.push(row);
        }
        return data;
    }
};
