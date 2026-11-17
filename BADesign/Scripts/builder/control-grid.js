var controlGrid = {

    // Tạo grid mới khi kéo từ toolbox
    addNew: function (dropPoint) {
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

        this.renderExisting(cfg);
        builder.registerControl(cfg);
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
        root.toggleClass("grid-no-panel", cfg.allowGrouping === false && cfg.showSearchBox === false);

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
            if (c.type === "tag") {
                col.cellTemplate = function (container, options) {
                    var tag = self.tagFor(c, options.value, options.rowIndex);
                    $("<span>").addClass("grid-cell-tag").text(tag.text).css({ background: tag.backColor, color: tag.textColor }).appendTo(container);
                };
            } else if (c.type === "checkbox") {
                col.alignment = "center";
                col.cellTemplate = function (container, options) {
                    var value = options.value;
                    var on = typeof value === "boolean" ? value : (value === "true" || value === 1 || (value !== "false" && value !== 0 && options.rowIndex % 2 === 0));
                    $("<span>").addClass("grid-cell-check" + (on ? " checked" : "")).appendTo(container);
                };
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
        dxColumns.push({ type: "buttons", name: "baRowCommands", visible: false });
        return dxColumns;
    },

    showRowCommands: function (grid, visible) {
        window.setTimeout(function () {
            try { grid.columnOption("baRowCommands", "visible", visible); } catch (e) { }
        }, 0);
    },

    tagList: function (col) {
        if (col.tags && col.tags.length) return col.tags;
        return [{ text: col.tagText || "Pending", backColor: col.tagBackColor || "#0D9EFF", textColor: col.tagTextColor || "#ffffff" }];
    },

    tagFor: function (col, value, rowIndex) {
        var list = this.tagList(col), text = value == null ? "" : String(value);
        for (var i = 0; i < list.length; i++) {
            if (list[i].text === text) return list[i];
        }
        return list[Math.max(0, rowIndex || 0) % list.length];
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
                    $("#canvas-zoom-inner").append(html);
                    $root = $(".canvas-control[data-id='" + cfg.id + "']");
                    $root.css({
                        position: "absolute",
                        left: cfg.left || 10,
                        top: cfg.top || 10,
                        width: cfg.width + "px"
                    });
                }
            } else {
                var $popup = $('.popup-design[data-id="' + cfg.parentId + '"]');
                var $popupBody = $popup.find('.popup-body');
                
                if ($popupBody.length) {
                    $popupBody.append(html);
                    $root = $popupBody.find(".canvas-control[data-id='" + cfg.id + "']");
                    
                    if (!$root.length) {
                        $root = $(".canvas-control[data-id='" + cfg.id + "']");
                    }
                    
                    var finalLeft = cfg.left != null ? cfg.left : 10;
                    var finalTop = cfg.top != null ? cfg.top : 50;
                    
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
                    $("#canvas-zoom-inner").append(html);
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
            $("#canvas-zoom-inner").append(html);
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
                    var oldLeft = cfg.left || 0;
                    var oldTop = cfg.top || 0;
                    builder.dragControlBy(cfg, $root, event.dx, event.dy);

                    // ✅ Nếu grid thuộc group, di chuyển tất cả controls trong group cùng lúc
                    if (cfg.groupId && builder && typeof builder.moveGroupControls === "function") {
                        builder.moveGroupControls(cfg.groupId, cfg.left - oldLeft, cfg.top - oldTop, cfg.id);
                    }
                },
                end: function (event) { builder.finishControlDrag(cfg, $root, event); }        // thả chuột: 1 bước Undo duy nhất (về vị trí trước khi nắm)
            }
        });




        // resize ngang grid (kéo cạnh phải)
        $root.append('<div class="ub-resize ub-resize-right"></div>');
        interact($root[0]).resizable({
            edges: { right: ".ub-resize-right" },
            listeners: {
                move: function (event) {
                    var newW = Math.round(event.rect.width / builder.cssScale());
                    if (newW < 200) newW = 200;

                    $root.css("width", newW + "px");
                    cfg.width = newW;

                    var inst = $("#" + cfg.id + "_dxGrid").dxDataGrid("instance");
                    if (inst) {
                        inst.option("width", "100%");
                    }

                    builder.refreshJson({ skipHistory: true });
                },
                end: function () { builder.refreshJson(); }
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
            paging: { pageSize: cfg.pageSize || 20 },
            pager: { visible: cfg.showPager === true, showInfo: true, showNavigationButtons: true, showPageSizeSelector: true, allowedPageSizes: [10, 20, 50], infoText: "Page {0} of {1} ({2} items)", displayMode: "full" },
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
            },
            onEditingStart: function (e) { controlGrid.showRowCommands(e.component, true); },
            onInitNewRow: function (e) { controlGrid.showRowCommands(e.component, true); },
            onSaved: function (e) { controlGrid.showRowCommands(e.component, false); },
            onEditCanceled: function (e) { controlGrid.showRowCommands(e.component, false); }
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

        var P = builderProps;
        var currentTab = P.validTab(["general", "columns", "toolbar", "actions", "permissions"], preserveTab);
        var columns = cfg.columns || [];
        var toolbarItems = cfg.toolbarItems || [];
        var rowActions = cfg.rowActionColumns || [];

        var general =
            P.section("Tiêu đề và toolbar",
                P.line(P.field("Tiêu đề", P.text({ id: "txtGridTitle", value: cfg.titleText || "" }) + P.toggles(
                    P.toggle({ id: "chkTitleBold", title: "Tiêu đề in đậm" }, { html: "<b>B</b>" }, cfg.titleBold),
                    P.toggle({ id: "chkTitleItalic", title: "Tiêu đề in nghiêng" }, { html: "<i>I</i>" }, cfg.titleItalic)), null, "txtGridTitle")) +
                P.checks([
                    P.check({ id: "chkShowTitle" }, "Hiện tiêu đề", cfg.showTitle),
                    P.check({ id: "chkShowToolbar" }, "Hiện toolbar", cfg.showToolbar),
                    P.check({ id: "chkShowLocalLang" }, "Hiện Local Data Language", cfg.showLocalDataLanguage)
                ])) +
            P.section("Hiện trên lưới",
                P.checks([
                    P.check({ id: "chkFilterRow" }, "Dòng lọc (Filter Row)", cfg.filterRow),
                    P.check({ id: "chkShowSearch" }, "Ô tìm kiếm", cfg.showSearchBox !== false),
                    P.check({ id: "chkShowPager" }, "Phân trang (pager)", cfg.showPager === true),
                    P.check({ id: "chkShowCheckbox" }, "Cột chọn dòng", cfg.showCheckbox !== false),
                    P.check({ id: "chkShowViewCol" }, "Cột View", getActVisible("view", cfg.showViewColumn)),
                    P.check({ id: "chkShowEditCol" }, "Cột Edit", getActVisible("edit", cfg.showEditColumn)),
                    P.check({ id: "chkShowDeleteCol" }, "Cột Delete", getActVisible("delete", cfg.showDeleteColumn))
                ], "pp-checks--cols2")) +
            P.section("Cho phép",
                P.checks([
                    P.check({ id: "chkAllowAdd" }, "Thêm dòng", cfg.allowAdd),
                    P.check({ id: "chkAllowEdit" }, "Sửa dòng", cfg.allowEdit),
                    P.check({ id: "chkAllowGroup" }, "Nhóm theo cột (Group)", cfg.allowGrouping !== false)
                ], "pp-checks--cols2")) +
            P.section("View Data / Applied for",
                P.checks([P.check({ id: "chkShowDataHeader" }, "Hiện dòng View Data", cfg.showDataHeader)]) +
                P.line(P.field("Nhãn View Data", P.text({ id: "txtDataCaption", value: cfg.dataHeaderCaption || "" }), null, "txtDataCaption")) +
                P.line(P.field("Giá trị View Data", P.text({ id: "txtDataValue", value: cfg.dataHeaderValue || "" }), null, "txtDataValue"))) +
            P.section("Kích thước",
                P.line(P.field("Rộng lưới (px)", P.number({ id: "txtGridWidth", value: widthVal, placeholder: "vd: 900" }), "pp-field--num", "txtGridWidth")));

        var columnRows = columns.map(function (col, idx) {
            var body = P.line(
                P.field("Hiển thị", P.select({ "data-col-field": "type", "data-col-index": idx }, [["", "Chữ"], ["tag", "Tag / trạng thái"], ["checkbox", "Checkbox"]], col.type || "")),
                P.field("Rộng", P.number({ min: 60, max: 1500, "data-col-field": "width", "data-col-index": idx, value: col.width || "", placeholder: "Tự động" }), "pp-field--num"));
            if (col.type === "tag") {
                body += P.line(P.field("Tag (mỗi dòng: Chữ|#màu)", P.textarea({ rows: 3, "data-col-field": "tags", "data-col-index": idx },
                    controlGrid.tagList(col).map(function (t) { return t.text + "|" + t.backColor; }).join("\n")), "pp-field--stack"));
            }
            return P.row({
                attrs: { "class": "pp-cols-2", "data-col-index": idx },
                open: P.isRowOpen(cfg.id, "col", idx),
                head: P.rowNo(idx + 1) +
                    P.text({ "data-col-field": "name", "data-col-index": idx, value: col.name || "", placeholder: "Tên field", title: "Tên field (vd: Code, Name)" }) +
                    P.text({ "data-col-field": "caption", "data-col-index": idx, value: col.caption || "", placeholder: "Tiêu đề", title: "Tiêu đề cột" }),
                tools: P.iconButton({ "class": "btnMoveCol", "data-col-index": idx, "data-dir": "-1", title: "Đưa cột này lên trước", disabled: idx === 0 }, "↑") +
                    P.iconButton({ "class": "btnMoveCol", "data-col-index": idx, "data-dir": "1", title: "Đưa cột này ra sau", disabled: idx === columns.length - 1 }, "↓") +
                    P.iconButton({ "class": "btnInsertCol", "data-col-index": idx, title: "Chèn một cột mới ngay sau cột này" }, "＋") +
                    P.rowToggle("Kiểu hiển thị và độ rộng") +
                    P.iconButton({ "class": "pp-icon-btn--danger btnDelCol", "data-col-index": idx, title: "Xóa cột" }, "×"),
                body: body
            });
        }).join("");

        var toolbarRows = toolbarItems.map(function (item, idx) {
            return P.row({
                attrs: { "class": "pp-cols-1", "data-toolbar-index": idx },
                open: P.isRowOpen(cfg.id, "toolbar", idx),
                head: P.rowNo(idx + 1) +
                    P.text({ "data-toolbar-field": "text", "data-toolbar-index": idx, value: item.text || "", placeholder: "Chữ trên nút" }) +
                    P.iconCell(item, idx),
                tools: P.rowToggle("Biểu tượng và màu") + P.iconButton({ "class": "pp-icon-btn--danger btnDelToolbar", "data-toolbar-index": idx, title: "Xóa nút" }, "×"),
                body: P.iconEditor(item, idx)
            });
        }).join("");

        var actionRows = rowActions.map(function (ac, idx) {
            return P.row({
                attrs: { "class": "pp-cols-1", "data-action-index": idx },
                open: P.isRowOpen(cfg.id, "action", idx),
                head: P.rowNo(idx + 1) +
                    P.text({ "data-action-field": "text", "data-action-index": idx, value: ac.text || "", placeholder: "Tên nút" }) +
                    P.iconCell(ac, idx),
                tools: P.rowToggle("Mã, độ rộng, biểu tượng, ẩn hiện") + P.iconButton({ "class": "pp-icon-btn--danger btnDelRowAction", "data-action-index": idx, title: "Xóa cột nút" }, "×"),
                body: P.line(
                        P.field("Mã", P.text({ "data-action-field": "key", "data-action-index": idx, value: ac.key || "", placeholder: "key" })),
                        P.field("Rộng", P.number({ "data-action-field": "width", "data-action-index": idx, value: ac.width || "", placeholder: "40" }), "pp-field--num")) +
                    P.iconEditor(ac, idx) +
                    P.checks([P.check({ "data-action-field": "visible", "data-action-index": idx }, "Hiện cột nút này", ac.visible !== false)])
            });
        }).join("");

        P.render(P.tabbedPanel("Core GridView", "ID: " + cfg.id, [
                { key: "general", text: "Chung" },
                { key: "columns", text: "Cột", count: columns.length },
                { key: "toolbar", text: "Toolbar", count: toolbarItems.length },
                { key: "actions", text: "Nút dòng", count: rowActions.length },
                { key: "permissions", text: "Quyền", title: "Quyền theo dòng" }
            ], currentTab,
            P.tabPanel("general", currentTab, general) +
            P.tabPanel("columns", currentTab,
                P.bar(P.text({ id: "coreColSearch", "class": "pp-search", placeholder: "Tìm cột..." }), P.button({ id: "btnAddCol", "class": "pp-btn--primary" }, "＋ Thêm cột")) +
                P.listHead("pp-cols-2", ["#", "Tên field", "Tiêu đề", ""]) +
                P.list({ id: "gridColumnsPanel", "data-pp-owner": cfg.id, "data-pp-kind": "col" }, columnRows), "pp-tab-panel--list") +
            P.tabPanel("toolbar", currentTab,
                P.bar(P.button({ id: "btnAddToolbarItem", "class": "pp-btn--primary" }, "＋ Thêm nút"), P.barHint("Nút trên dải tiêu đề của lưới")) +
                P.list({ id: "toolbarItemsPanel", "data-pp-owner": cfg.id, "data-pp-kind": "toolbar" }, toolbarRows), "pp-tab-panel--list") +
            P.tabPanel("actions", currentTab,
                P.bar(P.button({ id: "btnAddRowActionCol", "class": "pp-btn--primary" }, "＋ Thêm cột nút"), P.barHint("Cột nút ở đầu mỗi dòng")) +
                P.list({ id: "rowActionColsPanel", "data-pp-owner": cfg.id, "data-pp-kind": "action" }, actionRows), "pp-tab-panel--list") +
            P.tabPanel("permissions", currentTab,
                P.bar(P.barHint("Quyền của từng cột nút trên 5 dòng dữ liệu mẫu")) +
                P.scroll({ id: "rowPermPanel" }, ""), "pp-tab-panel--list")));

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
        $("#chkShowPager").on("change", function () {
            cfg.showPager = this.checked;
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
            $("#toolbarItemsPanel input[data-toolbar-field='text']").off("change.coreGridToolbar").on("change.coreGridToolbar", function () {
                var idx = parseInt($(this).data('toolbar-index'), 10);
                cfg.toolbarItems[idx].text = $(this).val();
                self.refreshGrid(cfg);
            });

            builderProps.bindIcons("#toolbarItemsPanel", {
                defaultColor: true,
                item: function (key) { return cfg.toolbarItems[key]; },
                changed: function (structural) {
                    self.refreshGrid(cfg);
                    if (structural) self.showProperties(cfg.id);
                }
            });

            $("#toolbarItemsPanel .btnDelToolbar").off("click.coreGridToolbar").on("click.coreGridToolbar", function () {
                var idx = parseInt($(this).data('toolbar-index'), 10);
                cfg.toolbarItems.splice(idx, 1);
                builderProps.rowRemoved(cfg.id, 'toolbar', idx);
                self.showProperties(cfg.id, 'toolbar');
                self.refreshGrid(cfg);
            });
        }

        // ==== columns ==== - Card view đã được render trong HTML, chỉ wire events
        function renderColumns() {
            // Card view đã được render trong HTML, chỉ cần wire events
            $("#gridColumnsPanel").find("input[data-col-field], select[data-col-field], textarea[data-col-field]").off("change.coreGridCol").on("change.coreGridCol", function () {
                var idx = parseInt($(this).data('col-index'), 10);
                var field = $(this).data('col-field');
                if (field === "width") {
                    var val = parseFloat($(this).val());
                    cfg.columns[idx].width = isNaN(val) || val <= 0 ? null : val;
                } else if (field === "type") {
                    var kind = $(this).val();
                    if (kind) cfg.columns[idx].type = kind; else delete cfg.columns[idx].type;
                    if (kind === "tag" && !(cfg.columns[idx].tags && cfg.columns[idx].tags.length)) cfg.columns[idx].tags = self.tagList(cfg.columns[idx]);
                    self.showProperties(cfg.id, 'columns');
                } else if (field === "tags") {
                    var tags = String($(this).val() || "").split("\n").map(function (line) {
                        var parts = line.split("|"), text = (parts[0] || "").trim(), color = (parts[1] || "").trim();
                        return text ? { text: text.slice(0, 40), backColor: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#0D9EFF", textColor: "#ffffff" } : null;
                    }).filter(Boolean).slice(0, 12);
                    cfg.columns[idx].tags = tags.length ? tags : self.tagList({});
                } else {
                    cfg.columns[idx][field] = $(this).val();
                }
                self.refreshGrid(cfg);
            });

            $("#gridColumnsPanel").find(".btnDelCol").off("click.coreGridCol").on("click.coreGridCol", function () {
                var idx = parseInt($(this).data('col-index'), 10);
                cfg.columns.splice(idx, 1);
                builderProps.rowRemoved(cfg.id, 'col', idx);
                builderProps.keepListScroll(0, function () { self.showProperties(cfg.id, 'columns'); });
                self.refreshGrid(cfg);
            });

            $("#gridColumnsPanel").find(".btnMoveCol").off("click.coreGridCol").on("click.coreGridCol", function () {
                var idx = parseInt($(this).data('col-index'), 10);
                var dir = parseInt($(this).data('dir'), 10);
                var to = idx + dir;
                if (!(to >= 0 && to < cfg.columns.length)) return;
                var $card = $(this).closest(".pp-row");
                var shift = dir * (dir > 0 ? $card.next() : $card.prev()).outerHeight(true);
                cfg.columns.splice(to, 0, cfg.columns.splice(idx, 1)[0]);
                builderProps.rowMoved(cfg.id, 'col', idx, to);
                builderProps.keepListScroll(shift, function () { self.showProperties(cfg.id, 'columns'); });
                builderProps.flashRow($("#gridColumnsPanel > .pp-row").eq(to), ".btnMoveCol[data-dir='" + dir + "']");
                self.refreshGrid(cfg);
            });

            $("#gridColumnsPanel").find(".btnInsertCol").off("click.coreGridCol").on("click.coreGridCol", function () {
                var idx = parseInt($(this).data('col-index'), 10);
                var used = {};
                cfg.columns.forEach(function (c) { used[c.name] = true; });
                var n = cfg.columns.length + 1;
                while (used["Field" + n]) n++;
                cfg.columns.splice(idx + 1, 0, { name: "Field" + n, caption: "Column " + n, width: 150 });
                builderProps.rowInserted(cfg.id, 'col', idx + 1);
                builderProps.keepListScroll(0, function () { self.showProperties(cfg.id, 'columns'); });
                builderProps.flashRow($("#gridColumnsPanel > .pp-row").eq(idx + 1));
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
            var P = builderProps;
            var maxRows = 5;
            var actions = cfg.rowActionColumns || [];
            var shown = [];
            actions.forEach(function (act, idx) {
                if (act.visible === false) return;
                var key = act.key || ("action" + (idx + 1));
                shown.push({ key: key, label: act.text || key });
            });

            if (!shown.length) {
                $("#rowPermPanel").html(P.empty(actions.length
                    ? "Các cột nút đang bị ẩn. Hãy bật Hiện ở tab Nút dòng trước."
                    : "Chưa có cột nút theo dòng. Hãy thêm cột nút ở tab Nút dòng trước."));
                return;
            }

            var rowTitles = [];
            for (var i = 0; i < maxRows; i++) rowTitles.push("Dòng " + (i + 1));
            $("#rowPermPanel").html(P.matrix(shown.map(function (item) { return item.label; }), rowTitles, function (rowIndex, columnIndex) {
                var item = shown[columnIndex];
                var state = (cfg.rowPermissions[rowIndex] || {})[item.key] || "enabled";
                return P.select({ "data-row": rowIndex, "data-key": item.key, "data-state": state, title: rowTitles[rowIndex] + " - " + item.label },
                    [["enabled", "Bật"], ["disabled", "Khóa"], ["hidden", "Ẩn"]], state);
            }));

            $("#rowPermPanel select").off("change.rowPerm").on("change.rowPerm", function () {
                var rowIndex = parseInt($(this).data('row'), 10);
                var key = $(this).data('key');
                var val = $(this).val();

                cfg.rowPermissions[rowIndex] = cfg.rowPermissions[rowIndex] || {};
                cfg.rowPermissions[rowIndex][key] = val;
                $(this).attr("data-state", val);

                self.refreshGrid(cfg);
            });
        }

        function renderRowActionCols() {
            $("#rowActionColsPanel input[data-action-field]").off("change.coreGridAction").on("change.coreGridAction", function () {
                var action = cfg.rowActionColumns[parseInt($(this).data('action-index'), 10)];
                var field = $(this).data('action-field');
                if (field === "visible") {
                    action.visible = $(this).is(':checked');
                } else if (field === "width") {
                    var val = parseFloat($(this).val());
                    action.width = isNaN(val) || val <= 0 ? null : val;
                } else {
                    action[field] = $(this).val();
                }
                self.refreshGrid(cfg);
                renderRowPerm();
            });

            builderProps.bindIcons("#rowActionColsPanel", {
                defaultColor: true,
                item: function (key) { return cfg.rowActionColumns[key]; },
                changed: function (structural) {
                    self.refreshGrid(cfg);
                    if (structural) self.showProperties(cfg.id);
                }
            });

            $("#rowActionColsPanel .btnDelRowAction").off("click.coreGridAction").on("click.coreGridAction", function () {
                var idx = parseInt($(this).data('action-index'), 10);
                cfg.rowActionColumns.splice(idx, 1);
                builderProps.rowRemoved(cfg.id, 'action', idx);
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
        
        $("#coreColSearch").off("input.coreGridCol").on("input.coreGridCol", function () {
            var query = $.trim(this.value).toLowerCase();
            $("#gridColumnsPanel > .pp-row").each(function () {
                var text = ($(this).find("[data-col-field='name']").val() + " " + $(this).find("[data-col-field='caption']").val()).toLowerCase();
                $(this).toggle(!query || text.indexOf(query) >= 0);
            });
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
            'pager.visible': cfg.showPager === true,
            'paging.pageSize': cfg.pageSize || 20,
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
