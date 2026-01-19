var controlGrid = {

    // Tạo grid mới khi kéo từ toolbox
    addNew: function () {
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
                    $("<img>").attr("src", it.icon).appendTo(btn);
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

                    var $img = $("<img>")
                        .attr("src", act.icon || "/Content/images/grid-view.png")
                        .addClass("grid-icon-" + act.key);

                    if (state === "disabled") {
                        $img.addClass("grid-icon-disabled");
                    } else {
                        if (act.key === "edit") {
                            $img.on("click", function () {
                                options.component.editRow(rowIndex);
                            });
                        } else if (act.key === "delete") {
                            $img.on("click", function () {
                                options.component.deleteRow(rowIndex);
                            });
                        }
                    }

                    if (act.tooltip) {
                        $img.attr("title", act.tooltip);
                    }

                    $img.appendTo(container);
                }
            });
        });

        // ========== CÁC CỘT DATA ==========
        dxColumns = dxColumns.concat(dataColumns);
        return dxColumns;
    },

    // ====== RENDER GRID ======
    renderExisting: function (cfg) {
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

        $("#canvas").append(html);

        // chuẩn hoá width về number (px)
        if (typeof cfg.width !== "number") {
            var w = parseFloat(cfg.width);
            if (isNaN(w) || w <= 0) w = 900;
            cfg.width = w;
        }

        var $root = $(".canvas-control[data-id='" + cfg.id + "']");
        $root.css({
            position: "absolute",
            left: (cfg.left != null ? cfg.left : 10),
            top: (cfg.top != null ? cfg.top : 10),
            width: cfg.width + "px"
        });

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
            html.push('<span style="font-size:11px; color:#0078d4; font-weight:600; white-space:nowrap; flex-shrink:0;">🔧 Menu:</span>');
            html.push('<input type="text" class="ess-action-caption" data-toolbar-field="text" data-toolbar-index="' + idx + '" value="' + (item.text || "") + '" placeholder="Menu text"/>');
            html.push('<span class="toolbar-icon-preview" data-toolbar-index="' + idx + '">' + preview + '</span>');
            html.push('</div>');
            html.push('<button type="button" class="ess-action-expand" data-cmd="toggle-toolbar-expand" title="Expand/Collapse">▼</button>');
            html.push('<button type="button" class="ess-action-delete btnDelToolbar" data-toolbar-index="' + idx + '" title="Delete">🗑</button>');
            html.push('</div>');
            html.push('<div class="ess-action-card-body">');
            html.push('<div class="ess-action-row">');
            html.push('<div class="ess-action-field ess-action-field-icon">');
            html.push('<label><span style="color:#0078d4;">🖼️</span><strong>Icon:</strong></label>');
            html.push('<select class="ess-action-input toolbar-icon-select" data-toolbar-field="icon" data-toolbar-index="' + idx + '">' + iconOptionsHtml + '</select>');
            html.push('</div>');
            html.push('</div>');
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
            html.push('<span style="font-size:11px; color:#0078d4; font-weight:600; white-space:nowrap; flex-shrink:0;">🔘 Action:</span>');
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
            html.push('<div class="ess-action-field ess-action-field-icon">');
            html.push('<label><span style="color:#0078d4;">🖼️</span><strong>Icon:</strong></label>');
            html.push('<select class="ess-action-input rowact-icon-select" data-action-field="icon" data-action-index="' + idx + '">' + iconOptionsHtml + '</select>');
            html.push('</div>');
            html.push('</div>');
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
            $("#toolbarItemsPanel .toolbar-icon-select").each(function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('toolbar-index'), 10);
                var icon = (cfg.toolbarItems[idx] && cfg.toolbarItems[idx].icon) || "";
                $(this).val(icon);
            });

            // Wire events cho toolbar items
            $("#toolbarItemsPanel input[data-toolbar-field='text']").off("change.coreGridToolbar").on("change.coreGridToolbar", function () {
                var idx = parseInt($(this).data('toolbar-index'), 10);
                cfg.toolbarItems[idx].text = $(this).val();
                self.refreshGrid(cfg);
            });

            $("#toolbarItemsPanel .toolbar-icon-select").off("change.coreGridToolbar").on("change.coreGridToolbar", function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('toolbar-index'), 10);
                var val = $(this).val();
                cfg.toolbarItems[idx].icon = val;
                
                var $preview = $("#toolbarItemsPanel .toolbar-icon-preview[data-toolbar-index='" + idx + "']");
                if (val) {
                    $preview.html("<img src='" + val + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />");
                } else {
                    $preview.empty();
                }
                self.refreshGrid(cfg);
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
            // Set giá trị icon cho các select đã render
            $("#rowActionColsPanel .rowact-icon-select").each(function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('action-index'), 10);
                var icon = (cfg.rowActionColumns[idx] && cfg.rowActionColumns[idx].icon) || "";
                $(this).val(icon);
            });

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

            $("#rowActionColsPanel .rowact-icon-select").off("change.coreGridAction").on("change.coreGridAction", function () {
                var idx = parseInt($(this).closest('.ess-action-card').data('action-index'), 10);
                var val = $(this).val();
                cfg.rowActionColumns[idx].icon = val;
                
                var $preview = $("#rowActionColsPanel .rowact-icon-preview[data-action-index='" + idx + "']");
                if (val) {
                    $preview.html("<img src='" + val + "' style='width:16px;height:16px;vertical-align:middle; margin-left:4px;' />");
                } else {
                    $preview.empty();
                }
                self.refreshGrid(cfg);
                renderRowPerm();
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
