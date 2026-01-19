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
    showProperties: function (id) {
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

        var html = `
            <h3>Grid Properties</h3>
            <div><b>ID:</b> ${cfg.id}</div>

            <div>
                <label><input type="checkbox" id="chkFilterRow" ${cfg.filterRow ? "checked" : ""}/> Show Filter Row</label>
            </div>
            <div>
                <label><input type="checkbox" id="chkAllowAdd" ${cfg.allowAdd ? "checked" : ""}/> Allow Add Row</label>
            </div>
            <div>
                <label><input type="checkbox" id="chkAllowEdit" ${cfg.allowEdit ? "checked" : ""}/> Allow Edit</label>
            </div>

            <div>
                <label><input type="checkbox" id="chkShowSearch" ${(cfg.showSearchBox !== false) ? "checked" : ""}/> Show search box</label>
            </div>

            <div style="margin-top:8px;">
                <label><input type="checkbox" id="chkShowCheckbox" ${(cfg.showCheckbox !== false) ? "checked" : ""}/> Show select checkbox</label>
            </div>
           <div>
               <label><input type="checkbox" id="chkShowViewCol" ${getActVisible("view", cfg.showViewColumn) ? "checked" : ""}/> Show View column</label>
           </div>
           <div>
               <label><input type="checkbox" id="chkShowEditCol" ${getActVisible("edit", cfg.showEditColumn) ? "checked" : ""}/> Show Edit column</label>
           </div>
           <div>
               <label><input type="checkbox" id="chkShowDeleteCol" ${getActVisible("delete", cfg.showDeleteColumn) ? "checked" : ""}/> Show Delete column</label>
           </div>

            <div style="margin-top:8px;">
                <label>Grid width (px):</label><br/>
                <input type="number" id="txtGridWidth" value="${widthVal}" style="width:100%;"
                       placeholder="vd: 900" />
            </div>

            <hr/>
            <h4>View Data / Applied for</h4>
            <div>
                <label><input type="checkbox" id="chkShowDataHeader" ${cfg.showDataHeader ? "checked" : ""}/> Show View Data header</label>
            </div>
            <div>
                <label>View data caption:</label><br/>
                <input type="text" id="txtDataCaption" value="${cfg.dataHeaderCaption}" style="width:100%;" />
            </div>
            <div>
                <label>View data value:</label><br/>
                <input type="text" id="txtDataValue" value="${cfg.dataHeaderValue}" style="width:100%;" />
            </div>

            <hr/>
            <h4>Title & Toolbar</h4>
            <div>
                <label><input type="checkbox" id="chkShowTitle" ${cfg.showTitle ? "checked" : ""}/> Show title</label>
            </div>
            <div>
                <label>Title text:</label><br/>
                <input type="text" id="txtGridTitle" value="${cfg.titleText}" style="width:100%;" />
            </div>
            <div>
                <label><input type="checkbox" id="chkTitleBold" ${cfg.titleBold ? "checked" : ""}/> Bold</label>
                <label style="margin-left:10px;"><input type="checkbox" id="chkTitleItalic" ${cfg.titleItalic ? "checked" : ""}/> Italic</label>
            </div>
            <div>
                <label><input type="checkbox" id="chkShowToolbar" ${cfg.showToolbar ? "checked" : ""}/> Show toolbar menu</label>
            </div>
            <div>
                <label><input type="checkbox" id="chkShowLocalLang" ${cfg.showLocalDataLanguage ? "checked" : ""}/> Show Local Data Language</label>
            </div>

            <div style="margin-top:6px;">
                <strong>Toolbar menus</strong>
                <div id="toolbarItemsPanel"></div>
                <button type="button" id="btnAddToolbarItem">+ Add menu</button>
            </div>

            <hr/>
            <h4>Row action columns</h4>
            <div id="rowActionColsPanel"></div>
            <button type="button" id="btnAddRowActionCol">+ Add action column</button>

            <hr/>
            <h4>Columns</h4>
            <div id="gridColumnsPanel"></div>
            <button type="button" id="btnAddCol">+ Add Column</button>

            <hr/>
            <h4>Row permission sample</h4>
            <div id="rowPermPanel"></div>

            <hr/>
            <button type="button" onclick="builder.saveControlToServer('${cfg.id}')">
                💾 Lưu control này vào DB
            </button>
        `;

        $("#propPanel").html(html);

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

        // ==== toolbar items ====
        function renderToolbarItems() {
            var panelHtml = "";

            var iconOptionsHtml = (window.MENU_ICON_LIST || []).map(function (ic) {
                return '<option value="' + ic.value + '">' + ic.text + '</option>';
            }).join("");

            (cfg.toolbarItems || []).forEach(function (it, index) {

                var preview = it.icon
                    ? "<img src='" + it.icon + "' style='width:14px;height:14px;vertical-align:middle;' />"
                    : "";

                panelHtml +=
                    "<div style='margin-bottom:4px;'>" +
                    "Text: <input type='text' data-idx='" + index + "' data-field='text' value='" + (it.text || "") + "' style='width:110px;' />" +
                    " Icon: <select data-idx='" + index + "' data-field='icon' class='toolbar-icon-select' style='width:160px;margin-right:4px;'>" +
                    iconOptionsHtml +
                    "</select>" +
                    "<span class='toolbar-icon-preview' data-idx='" + index + "'>" + preview + "</span>" +
                    " <button type='button' class='btnDelToolbar' data-idx='" + index + "'>x</button>" +
                    "</div>";
            });

            $("#toolbarItemsPanel").html(panelHtml);

            $("#toolbarItemsPanel .toolbar-icon-select").each(function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                var icon = (cfg.toolbarItems[idx] && cfg.toolbarItems[idx].icon) || "";
                $(this).val(icon);
            });

            $("#toolbarItemsPanel input[data-field='text']").on("change", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.toolbarItems[idx].text = this.value;
                controlGrid.refreshGrid(cfg);
            });

            $("#toolbarItemsPanel .toolbar-icon-select").on("change", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                var val = this.value;

                cfg.toolbarItems[idx].icon = val;

                var $preview = $("#toolbarItemsPanel .toolbar-icon-preview[data-idx='" + idx + "']");
                if (val) {
                    $preview.html("<img src='" + val + "' style='width:14px;height:14px;vertical-align:middle;' />");
                } else {
                    $preview.empty();
                }

                controlGrid.refreshGrid(cfg);
            });

            $(".btnDelToolbar").on("click", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.toolbarItems.splice(idx, 1);
                renderToolbarItems();
                controlGrid.refreshGrid(cfg);
            });
        }

        // ==== columns ====
        function renderColumns() {
            var panelHtml = "";
            (cfg.columns || []).forEach(function (c, index) {
                var w = c.width != null ? c.width : "";
                panelHtml += `
                    <div style="margin-bottom:4px;">
                        <input type="text" data-idx="${index}" data-field="name" value="${c.name}" placeholder="FieldName" style="width:110px;"/>
                        <input type="text" data-idx="${index}" data-field="caption" value="${c.caption}" placeholder="Caption" style="width:110px;"/>
                        <input type="number" data-idx="${index}" data-field="width" value="${w}" placeholder="Width(px)" style="width:80px;"/>
                        <button type="button" data-idx="${index}" class="btnDelCol">x</button>
                    </div>`;
            });
            $("#gridColumnsPanel").html(panelHtml);

            $("#gridColumnsPanel").find("input").on("change", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                var field = this.getAttribute("data-field");
                if (field === "width") {
                    var val = parseFloat(this.value);
                    cfg.columns[idx].width = isNaN(val) || val <= 0 ? null : val;
                } else {
                    cfg.columns[idx][field] = this.value;
                }
                self.refreshGrid(cfg);
            });

            $(".btnDelCol").on("click", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.columns.splice(idx, 1);
                renderColumns();
                self.refreshGrid(cfg);
            });
        }

        $("#btnAddToolbarItem").on("click", function () {
            cfg.toolbarItems = cfg.toolbarItems || [];
            cfg.toolbarItems.push({
                text: "Menu " + (cfg.toolbarItems.length + 1),
                icon: ""
            });
            renderToolbarItems();
            self.refreshGrid(cfg);
        });

        // ==== row permission: dynamic theo rowActionColumns ====
        function renderRowPerm() {
            var maxRows = 5;
            var actions = cfg.rowActionColumns || [];
            var html = "";

            if (!actions.length) {
                html = "<div style='font-size:11px;color:#777;'>No row action columns.</div>";
                $("#rowPermPanel").html(html);
                return;
            }

            for (var i = 0; i < maxRows; i++) {
                var rp = cfg.rowPermissions[i] || {};

                html += "<div style='margin-bottom:4px;'>Row " + (i + 1) + ": ";

                actions.forEach(function (act, idx) {
                    if (act.visible === false) return;

                    var key = act.key || ("action" + (idx + 1));
                    var label = act.text || key;
                    var state = rp[key] || "enabled";

                    html += label + ": "
                        + "<select data-row='" + i + "' data-key='" + key + "'>"
                        + "<option value='enabled'" + (state === "enabled" ? " selected" : "") + ">Enabled</option>"
                        + "<option value='disabled'" + (state === "disabled" ? " selected" : "") + ">Disabled</option>"
                        + "<option value='hidden'" + (state === "hidden" ? " selected" : "") + ">Hidden</option>"
                        + "</select> ";
                });

                html += "</div>";
            }

            $("#rowPermPanel").html(html);

            $("#rowPermPanel select").on("change", function () {
                var rowIndex = parseInt(this.getAttribute("data-row"), 10);
                var key = this.getAttribute("data-key");
                var val = this.value;

                cfg.rowPermissions[rowIndex] = cfg.rowPermissions[rowIndex] || {};
                cfg.rowPermissions[rowIndex][key] = val;

                self.refreshGrid(cfg);
            });
        }

        function renderRowActionCols() {
            var panelHtml = "";

            var iconOptionsHtml = (window.MENU_ICON_LIST || []).map(function (ic) {
                return '<option value="' + ic.value + '">' + ic.text + '</option>';
            }).join("");

            (cfg.rowActionColumns || []).forEach(function (ac, index) {
                var visibleChecked = (ac.visible !== false) ? "checked" : "";
                var w = ac.width != null ? ac.width : "";

                panelHtml +=
                    "<div style='margin-bottom:4px;'>" +
                    "Key: <input type='text' data-idx='" + index + "' data-field='key' value='" + (ac.key || "") + "' style='width:70px;' /> " +
                    "Text: <input type='text' data-idx='" + index + "' data-field='text' value='" + (ac.text || "") + "' style='width:90px;' /> " +
                    "Width: <input type='number' data-idx='" + index + "' data-field='width' value='" + w + "' style='width:70px;' /> " +
                    "Icon: <select data-idx='" + index + "' data-field='icon' class='rowact-icon-select' style='width:160px;margin-right:4px;'>" +
                    iconOptionsHtml +
                    "</select>" +
                    "<label><input type='checkbox' data-idx='" + index + "' data-field='visible' " + visibleChecked + "/> Show</label> " +
                    "<button type='button' class='btnDelRowAction' data-idx='" + index + "'>x</button>" +
                    "</div>";
            });

            $("#rowActionColsPanel").html(panelHtml);
            renderRowPerm();

            $("#rowActionColsPanel .rowact-icon-select").each(function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                var icon = (cfg.rowActionColumns[idx] && cfg.rowActionColumns[idx].icon) || "";
                $(this).val(icon);
            });

            $("#rowActionColsPanel input[data-field!='visible']").on("change", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                var field = this.getAttribute("data-field");
                if (field === "width") {
                    var val = parseFloat(this.value);
                    cfg.rowActionColumns[idx].width = isNaN(val) || val <= 0 ? null : val;
                } else {
                    cfg.rowActionColumns[idx][field] = this.value;
                }
                controlGrid.refreshGrid(cfg);
                renderRowPerm();
            });

            $("#rowActionColsPanel input[data-field='visible']").on("change", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.rowActionColumns[idx].visible = this.checked;
                controlGrid.refreshGrid(cfg);
                renderRowPerm();
            });

            $("#rowActionColsPanel .rowact-icon-select").on("change", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.rowActionColumns[idx].icon = this.value;
                controlGrid.refreshGrid(cfg);
                renderRowPerm();
            });

            $(".btnDelRowAction").on("click", function () {
                var idx = parseInt(this.getAttribute("data-idx"), 10);
                cfg.rowActionColumns.splice(idx, 1);
                renderRowActionCols();
                controlGrid.refreshGrid(cfg);
            });
        }

        $("#btnAddRowActionCol").on("click", function () {
            cfg.rowActionColumns = cfg.rowActionColumns || [];
            var n = cfg.rowActionColumns.length + 1;
            cfg.rowActionColumns.push({
                key: "action" + n,
                text: "Action " + n,
                icon: "",
                visible: true,
                width: 40
            });
            renderRowActionCols();
            self.refreshGrid(cfg);
        });

        $("#btnAddCol").on("click", function () {
            cfg.columns = cfg.columns || [];
            cfg.columns.push({
                name: "Field" + (cfg.columns.length + 1),
                caption: "Column " + (cfg.columns.length + 1),
                width: 150
            });
            renderColumns();
            renderRowActionCols();
            self.refreshGrid(cfg);
        });

        renderToolbarItems();
        renderColumns();
        renderRowActionCols();
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
