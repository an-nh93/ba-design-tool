/* ==========================================================
   ESS HTML GRID CONTROL (v3.1 – fix CSS / progress / resize)
========================================================== */

var controlGridEss = (function () {
    "use strict";

    // ----------------- helpers -----------------
    function makeId(prefix) {
        return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj || {}));
    }

    function findColumnIndex(cfg, colId) {
        if (!cfg.columns) return -1;
        for (var i = 0; i < cfg.columns.length; i++) {
            if (cfg.columns[i].id === colId) return i;
        }
        return -1;
    }

    function findActionById(cfg, actId) {
        if (!cfg.rowActions) return null;
        for (var i = 0; i < cfg.rowActions.length; i++) {
            if (cfg.rowActions[i].id === actId) return cfg.rowActions[i];
        }
        return null;
    }

    function hasActionColumn(cfg) {
        return cfg.showActionColumn !== false &&
            cfg.rowActions && cfg.rowActions.length > 0;
    }

    // ----------------- chuẩn hoá config -----------------
    function ensureConfig(cfg) {
        cfg = cfg || {};
        if (!cfg.columns) cfg.columns = [];
        if (!cfg.uiMode) cfg.uiMode = "ess";

        if (typeof cfg.showCheckbox === "undefined") cfg.showCheckbox = true;
        if (typeof cfg.showTitle === "undefined") cfg.showTitle = true;
        if (typeof cfg.titleBold === "undefined") cfg.titleBold = true;
        if (typeof cfg.titleItalic === "undefined") cfg.titleItalic = false;
        if (typeof cfg.sampleRowCount === "undefined") cfg.sampleRowCount = 5;
        if (typeof cfg.allowAddRow === "undefined") cfg.allowAddRow = true;
        if (typeof cfg.showActionColumn === "undefined") cfg.showActionColumn = true;
        if (typeof cfg.sampleDisplayMode === "undefined") cfg.sampleDisplayMode = "edit";

        // migrate actions cũ
        if (!cfg.rowActions || !cfg.rowActions.length) {
            cfg.rowActions = [];

            var defIcons = {
                view: "/Content/images/grid-view.png",
                edit: "/Content/images/grid-edit.png",
                delete: "/Content/images/grid-delete.png",
                detail: "/Content/images/grid-detail.png"
            };

            var oldActions = cfg.actions || {};
            var oldPerm = cfg.rowPermissionSample || {};

            function pushFromOld(key, caption, flagProp, modeKey) {
                var show = (typeof oldActions[flagProp] === "undefined")
                    ? (flagProp === "showDelete" ? true : false)
                    : !!oldActions[flagProp];
                if (!show) return;

                cfg.rowActions.push({
                    id: makeId("act"),
                    key: key,
                    caption: caption,
                    icon: defIcons[key] || defIcons.view,
                    modeSample: oldPerm[modeKey] || "normal"
                });
            }

            pushFromOld("view", "View", "showView", "viewMode");
            pushFromOld("edit", "Edit", "showEdit", "editMode");
            pushFromOld("delete", "Delete", "showDelete", "deleteMode");
            pushFromOld("detail", "Detail", "showDetail", "detailMode");
        }

        if (!cfg.rowActions.length) {
            cfg.rowActions.push({
                id: makeId("act"),
                key: "view",
                caption: "View",
                icon: "/Content/images/grid-view.png",
                modeSample: "normal"
            });
        }

        // chuẩn hoá cho từng column (tag / progress)
        (cfg.columns || []).forEach(function (col) {
            var t = (col.type || "text").toLowerCase();

            if (t === "tag") {
                if (typeof col.tagText === "undefined") col.tagText = "Pending";
                if (!col.tagBackColor) col.tagBackColor = "#0D9EFF";
                if (!col.tagTextColor) col.tagTextColor = "#ffffff";
            } else if (t === "progress") {
                if (typeof col.progressValue !== "number") {
                    var v = parseInt(col.progressValue, 10);
                    if (isNaN(v)) v = 40;
                    col.progressValue = v;
                }
                if (isNaN(col.progressValue)) col.progressValue = 40;
                if (col.progressValue < 0) col.progressValue = 0;
                if (col.progressValue > 100) col.progressValue = 100;
            }
        });

        return cfg;
    }

    // ----------------- default config -----------------
    function newConfig() {
        var id = makeId("essgrid");

        var cfg = {
            id: id,
            type: "ess-grid",
            uiMode: "ess",

            left: 40,
            top: 40,
            width: 1000,
            height: 260,

            title: "ESS Grid",
            showTitle: true,
            titleBold: true,
            titleItalic: false,

            showCheckbox: true,
            showActionColumn: true,

            allowAddRow: true,
            sampleRowCount: 5,
            sampleDisplayMode: "edit",


            columns: [
                {
                    id: makeId("col"),
                    key: "TimeAttendanceId",
                    caption: "Time Attendance ID",
                    type: "text",
                    align: "left",
                    headerBold: false,
                    headerItalic: false,
                    width: 200
                },
                {
                    id: makeId("col"),
                    key: "GuestName",
                    caption: "Guest Name",
                    type: "text",
                    align: "left",
                    headerBold: false,
                    headerItalic: false,
                    width: 220
                },
                {
                    id: makeId("col"),
                    key: "Remark",
                    caption: "Remark",
                    type: "textarea",
                    align: "left",
                    headerBold: false,
                    headerItalic: false,
                    width: 300
                },
                {
                    id: makeId("col"),
                    key: "Status",
                    caption: "Status / Others",
                    type: "tag",
                    align: "left",
                    headerBold: false,
                    headerItalic: false,
                    width: 220,
                    tagText: "Pending"
                }
            ],

            rowActions: [
                {
                    id: makeId("act"),
                    key: "view",
                    caption: "View",
                    icon: "/Content/images/grid-view.png",
                    modeSample: "normal"
                },
                {
                    id: makeId("act"),
                    key: "edit",
                    caption: "Edit",
                    icon: "/Content/images/grid-edit.png",
                    modeSample: "normal"
                },
                {
                    id: makeId("act"),
                    key: "delete",
                    caption: "Delete",
                    icon: "/Content/images/grid-delete.png",
                    modeSample: "normal"
                }
            ]
        };

        return ensureConfig(cfg);
    }

    // Bảo đảm sampleData có số dòng đúng bằng sampleRowCount
    function ensureSampleData(cfg) {
        var rows = cfg.sampleRowCount || 5;   // <== SỬA Ở ĐÂY
        if (!cfg.sampleData) cfg.sampleData = [];

        while (cfg.sampleData.length < rows) {
            cfg.sampleData.push({});
        }
        if (cfg.sampleData.length > rows) {
            cfg.sampleData.length = rows;
        }
    }


    // Lấy giá trị của 1 ô (rowIndex, col)
    function getCellSampleValue(cfg, rowIndex, col) {
        if (cfg.sampleData &&
            cfg.sampleData[rowIndex] &&
            cfg.sampleData[rowIndex][col.id] != null) {

            return cfg.sampleData[rowIndex][col.id];
        }
        // fallback nếu chưa có thì dùng sampleText cũ
        return col.sampleText || "";
    }


    // ----------------- editor (EDIT mode) -----------------
    // ----------------- editor (EDIT mode) -----------------
    function buildEditorForColumn(cfg, col, rowIndex) {
        var t = (col.type || "text").toLowerCase();
        // giá trị đã lưu cho ô này (nếu có), fallback về col.sampleText
        var val = getCellSampleValue(cfg, rowIndex, col);

        if (t === "text") {
            var $txt = $('<input type="text" class="ess-grid-input ess-grid-editor-text" />');
            if (val != null && val !== "") $txt.val(val);
            return $txt;
        }

        if (t === "textarea") {
            var $ta = $('<textarea class="ess-grid-input ess-grid-editor-textarea"></textarea>');
            if (val != null && val !== "") $ta.val(val);
            return $ta;
        }

        if (t === "number") {
            var $wrap = $(
                '<div class="ess-number ess-grid-editor ess-grid-editor-number">' +
                '  <input type="number" class="ess-number-input" />' +
                '  <button type="button" class="ess-spin-up"></button>' +
                '  <button type="button" class="ess-spin-down"></button>' +
                '</div>'
            );
            if (val != null && val !== "") {
                $wrap.find("input").val(val);
            }
            return $wrap;
        }

        if (t === "date") {
            var $wrapDate = $(
                '<div class="ess-grid-editor ess-grid-editor-date">' +
                '  <input type="text" class="ess-grid-date-input" />' +
                '  <span class="ess-grid-date-icon"><i class="bi bi-calendar3"></i></span>' +
                '</div>'
            );
            if (val != null && val !== "") {
                $wrapDate.find("input").val(val);
            }
            return $wrapDate;
        }

        if (t === "combo" || t === "combobox" || t === "select") {
            var $sel = $('<select class="ess-grid-input ess-grid-editor-combo"></select>');
            // Ưu tiên dùng options, nếu không có thì dùng items, nếu không có thì dùng default
            var items = [];
            if (col.options && Array.isArray(col.options) && col.options.length > 0) {
                items = col.options;
            } else if (col.items && Array.isArray(col.items) && col.items.length > 0) {
                items = col.items;
            } else {
                items = ["Option 1", "Option 2", "Option 3"];
            }
            items.forEach(function (it) {
                $("<option/>").val(it).text(it).appendTo($sel);
            });
            if (val != null && val !== "") {
                $sel.val(val);
            }
            return $sel;
        }

        if (t === "tag") {
            // nếu người dùng đã lưu text riêng cho ô này thì ưu tiên dùng
            var text = (val != null && val !== "") ? val : (col.tagText || "Pending");
            var back = col.tagBackColor || "#0D9EFF";
            var color = col.tagTextColor || "#ffffff";

            var $tag = $(
                '<div class="ess-tag ess-grid-tag">' +
                '  <span class="ess-tag-icon"><i class="bi bi-tag-fill"></i></span>' +
                '  <span class="ess-tag-text"></span>' +
                '</div>'
            );
            $tag.find(".ess-tag-text").text(text);
            $tag.css({ "background-color": back, "color": color });
            return $tag;
        }

        if (t === "progress") {
            var v = (typeof col.progressValue === "number") ? col.progressValue : 40;
            if (isNaN(v)) v = 0;
            if (v < 0) v = 0;
            if (v > 100) v = 100;
            col.progressValue = v;

            return $(
                '<div class="ess-progress ess-grid-progress">' +
                '  <div class="ess-progress-track">' +
                '    <div class="ess-progress-fill" style="width:' + v + '%;"></div>' +
                '    <div class="ess-progress-text">' + v + '%</div>' +
                '  </div>' +
                '</div>'
            );
        }

        // default
        var $defaultTxt = $('<input type="text" class="form-control ess-grid-input ess-grid-editor-text" />');
        if (val != null && val !== "") $defaultTxt.val(val);
        return $defaultTxt;
    }

    // ----------------- view (VIEW mode) -----------------
    function buildViewForColumn(cfg, col, rowIndex) {
        var t = (col.type || "text").toLowerCase();
        var caption = col.caption || "";
        // giá trị đã lưu cho từng ô, nếu chưa có thì trả về sampleText
        var v = getCellSampleValue(cfg, rowIndex, col);

        if (t === "date") {
            var txtDate = v || "11/26/2025 08:56";
            return $('<div class="ess-grid-cell-view"></div>').text(txtDate);
        }

        if (t === "number") {
            var num = v || ((rowIndex + 1) * 10);
            return $('<div class="ess-grid-cell-view ess-grid-cell-view-right"></div>').text(num);
        }

        if (t === "tag") {
            var text = v || col.tagText || "Pending";
            var back = col.tagBackColor || "#0D9EFF";
            var color = col.tagTextColor || "#ffffff";

            var $tag = $(
                '<div class="ess-tag ess-grid-tag">' +
                '  <span class="ess-tag-icon"><i class="bi bi-tag-fill"></i></span>' +
                '  <span class="ess-tag-text"></span>' +
                '</div>'
            );
            $tag.find(".ess-tag-text").text(text);
            $tag.css({ "background-color": back, "color": color });
            return $tag;
        }

        if (t === "progress") {
            var val = (typeof col.progressValue === "number") ? col.progressValue : 40;
            if (isNaN(val)) val = 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            var $p = $(
                '<div class="ess-progress ess-grid-progress">' +
                '  <div class="ess-progress-track">' +
                '    <div class="ess-progress-fill" style="width:' + val + '%;"></div>' +
                '    <div class="ess-progress-text">' + val + '%</div>' +
                '  </div>' +
                '</div>'
            );
            return $p;
        }

        if (t === "combo" || t === "combobox" || t === "select") {
            var comboTxt = v || ("Option " + ((rowIndex % 3) + 1));
            return $('<div class="ess-grid-cell-view"></div>').text(comboTxt);
        }

        var txt = v || (caption ? (caption + " " + (rowIndex + 1)) : ("Column " + (rowIndex + 1)));
        return $('<div class="ess-grid-cell-view"></div>').text(txt);
    }

    // ----------------- render grid -----------------
    function render(cfg, $parent) {
        cfg = ensureConfig(cfg);

        // ✅ XÓA DOM element cũ trước khi render mới để tránh duplicate
        var $oldGrid = $('.canvas-control[data-id="' + cfg.id + '"]');
        if ($oldGrid.length) {
            $oldGrid.remove();
        }

        var $root = $("#" + cfg.id);
        var isNew = false;

        if (!$root.length) {
            isNew = true;
            $root = $("<div/>")
                .attr("id", cfg.id)
                .attr("data-id", cfg.id)
                .addClass("canvas-control ess-grid-control")
                .attr("data-type", "ess-grid");

            // ✅ Nếu có parentId (popup) → append vào popup-body
            if (cfg.parentId) {
                var $popup = $('.popup-design[data-id="' + cfg.parentId + '"]');
                var $popupBody = $popup.find('.popup-body');
                
                // Debug: kiểm tra xem có tìm thấy popup và popup-body không
                if (!$popup.length) {
                    console.warn("ESS Grid: Popup not found:", cfg.parentId);
                }
                if (!$popupBody.length) {
                    console.warn("ESS Grid: Popup body not found for popup:", cfg.parentId);
                }
                
                if ($popupBody.length) {
                    // Append vào popup-body (grid sẽ là child của popup)
                    $popupBody.append($root);
                    
                    // Position relative với popup-body (không cần cộng popup offset)
                    var finalLeft = cfg.left || 20;
                    var finalTop = cfg.top || 50; // Tránh header
                    
                    // Set z-index cao hơn để hiển thị trên popup
                    var popupZ = parseInt($popup.css("z-index") || "0", 10);
                    if (isNaN(popupZ)) popupZ = 0;
                    $root.css("z-index", popupZ + 10);
                    
                    $root.css({
                        position: "absolute",
                        left: finalLeft + "px",
                        top: finalTop + "px",
                        width: (cfg.width || 900) + "px"
                    });
                } else if ($parent && $parent.length) {
                    // Fallback: append vào canvas
                    console.warn("ESS Grid: Fallback: appending to canvas instead of popup-body");
                    $parent.append($root);
                    $root.css({
                        position: "absolute",
                        left: (cfg.left || 20) + "px",
                        top: (cfg.top || 20) + "px",
                        width: (cfg.width || 900) + "px"
                    });
                }
            } else if ($parent && $parent.length) {
                // Không có parentId → append vào canvas
                $parent.append($root);
                $root.css({
                    position: "absolute",
                    left: (cfg.left || 20) + "px",
                    top: (cfg.top || 20) + "px",
                    width: (cfg.width || 900) + "px"
                });
            }
        } else {
            $root.empty();
            $root.css({
                left: (cfg.left || 20) + "px",
                top: (cfg.top || 20) + "px",
                width: (cfg.width || 900) + "px"
            });
        }

        // Header
        var $header = $('<div class="ess-grid-header"></div>');
        var $title = $('<div class="ess-grid-title"></div>');
        if (cfg.showTitle) {
            $title.text(cfg.title || "");
            if (cfg.titleBold) $title.css("font-weight", "600");
            if (cfg.titleItalic) $title.css("font-style", "italic");
        } else {
            $title.hide();
        }
        $header.append($title);

        var $rightHeader = $('<div class="ess-grid-header-right"></div>');
        if (cfg.allowAddRow) {
            var $btnAdd = $('<button type="button" class="ess-grid-add-row ess-grid-btn">+ Add row</button>');
            $rightHeader.append($btnAdd);
        }
        $header.append($rightHeader);
        $root.append($header);

        // Table
        var $wrap = $('<div class="ess-grid-table-wrapper"></div>');
        var $table = $('<table class="ess-grid-table"></table>')
            .css({ "table-layout": "fixed", "width": "auto" });

        var $thead = $("<thead/>");
        var $hrow = $("<tr/>");

        if (cfg.showCheckbox) {
            $hrow.append('<th class="ess-grid-th ess-grid-th-check"><input type="checkbox" disabled /></th>');
        }

        if (hasActionColumn(cfg)) {
            $hrow.append('<th class="ess-grid-th ess-grid-th-actions"></th>');
        }

        (cfg.columns || []).forEach(function (col) {
            var $th = $('<th class="ess-grid-th" />')
                .attr("data-col-id", col.id);

            var $caption = $('<span class="ess-grid-th-caption"></span>')
                .text(col.caption || "");
            if (col.headerBold) $caption.css("font-weight", "600");
            if (col.headerItalic) $caption.css("font-style", "italic");

            if (col.align === "center") {
                $th.css("text-align", "center");
            } else if (col.align === "right") {
                $th.css("text-align", "right");
            }

            if (col.width) {
                $th.css("width", col.width + "px");
            }

            var $resizer = $('<span class="ess-grid-col-resizer"></span>');

            $th.append($caption).append($resizer);
            $hrow.append($th);
        });

        $thead.append($hrow);
        $table.append($thead);

        // Body
        var $tbody = $("<tbody/>");
        var rowCount = cfg.sampleRowCount || 3;
        var displayMode = cfg.sampleDisplayMode || "edit";

        for (var r = 0; r < rowCount; r++) {
            var $row = $("<tr/>");

            if (cfg.showCheckbox) {
                $row.append('<td class="ess-grid-td ess-grid-td-check"><input type="checkbox" /></td>');
            }

            if (hasActionColumn(cfg)) {
                var $actTd = $('<td class="ess-grid-td ess-grid-td-actions"></td>');
                (cfg.rowActions || []).forEach(function (act) {
                    var mode = act.modeSample || "normal";
                    if (mode === "hidden") return;

                    var $wrapIcon = $('<span class="ess-grid-action-icon-wrap"></span>');
                    if (mode === "disabled") {
                        $wrapIcon.addClass("ess-grid-icon-disabled");
                    }

                    var $img = $('<img class="ess-grid-action-icon" />')
                        .attr("src", act.icon || "/Content/images/grid-view.png")
                        .attr("title", act.caption || act.key || "");
                    $wrapIcon.append($img);
                    $actTd.append($wrapIcon);
                });
                $row.append($actTd);
            }

            (cfg.columns || []).forEach(function (col) {
                var $td = $('<td class="ess-grid-td ess-grid-td-cell" data-col-id="' + col.id + '"></td>');
                var $inner = $('<div class="ess-grid-cell-inner"></div>');

                // TRUYỀN THÊM cfg + rowIndex để dùng sampleData
                var $content = (displayMode === "view")
                    ? buildViewForColumn(cfg, col, r)
                    : buildEditorForColumn(cfg, col, r);

                if (col.align === "right") {
                    $inner.addClass("ess-grid-cell-right");
                } else if (col.align === "center") {
                    $inner.addClass("ess-grid-cell-center");
                }

                $inner.append($content);
                $td.append($inner);
                $row.append($td);
            });


            $tbody.append($row);
        }

        $table.append($tbody);
        $wrap.append($table);
        $root.append($wrap);

        // áp width cột xuống cell (để không kéo nhau)
        $table.find("thead th[data-col-id]").each(function () {
            var $th = $(this);
            var colId = $th.data("col-id");
            var idxCol = findColumnIndex(cfg, colId);
            if (idxCol < 0) return;

            var col = cfg.columns[idxCol];
            if (!col.width) return;

            var w = col.width;
            var colIndex = $th.index();

            $table.find("tr").each(function () {
                var $cells = $(this).children();
                if ($cells.length > colIndex) {
                    $cells.eq(colIndex).css("width", w + "px");
                }
            });
        });

        enableColumnResize($root, cfg);

        // Add row (demo)
        $root.off("click.essGridAddRow")
            .on("click.essGridAddRow", ".ess-grid-add-row", function () {
                // LƯU LẠI DỮ LIỆU CÁC DÒNG HIỆN CÓ
                snapshotSampleDataFromGrid(cfg);

                cfg.sampleRowCount = (cfg.sampleRowCount || 0) + 1;
                render(cfg);
                if (window.builder) builder.refreshJson();
            });

        return $root;
    }

    function snapshotSampleDataFromGrid(cfg) {
        var $root = $("#" + cfg.id);
        if (!$root.length) return;

        var $table = $root.find("table.ess-grid-table");
        if (!$table.length) return;

        // Lấy mapping: index cell -> colId
        var cols = [];
        $table.find("thead th[data-col-id]").each(function () {
            cols.push({
                colId: $(this).data("col-id"),
                cellIndex: $(this).index()
            });
        });

        var $rows = $table.find("tbody tr");
        if (!$rows.length) return;

        cfg.sampleData = cfg.sampleData || [];

        $rows.each(function (rowIndex) {
            var $tr = $(this);
            var rowData = cfg.sampleData[rowIndex] || {};

            cols.forEach(function (c) {
                var $td = $tr.children().eq(c.cellIndex);

                // ưu tiên input / textarea / select
                var $input = $td.find("input, textarea, select").first();
                var val = "";

                if ($input.length) {
                    val = $input.val() || "";
                } else {
                    // fallback nếu không có input (trường hợp view mode khác)
                    val = $.trim($td.text());
                }

                rowData[c.colId] = val;
            });

            cfg.sampleData[rowIndex] = rowData;
        });
    }


    // ----------------- column resize -----------------
    function enableColumnResize($root, cfg) {
        var $table = $root.find("table.ess-grid-table");
        if (!$table.length) return;

        $table.find(".ess-grid-col-resizer").off(".essGridColResize");

        $table.find("th[data-col-id]").each(function () {
            var $th = $(this);
            var colId = $th.data("col-id");
            var $res = $th.find(".ess-grid-col-resizer");

            $res.on("mousedown.essGridColResize", function (e) {
                e.preventDefault();
                e.stopPropagation();

                var startX = e.clientX;
                var startWidth = $th.outerWidth();
                var colIndex = $th.index();

                $(document)
                    .on("mousemove.essGridColResize", function (ev) {
                        var dx = ev.clientX - startX;
                        var newW = Math.max(80, startWidth + dx);
                        $th.css("width", newW + "px");

                        // chỉ set width cho cột này
                        $table.find("tr").each(function () {
                            var $cells = $(this).children();
                            if ($cells.length > colIndex) {
                                $cells.eq(colIndex).css("width", newW + "px");
                            }
                        });

                        var idx = findColumnIndex(cfg, colId);
                        if (idx >= 0) cfg.columns[idx].width = newW;
                    })
                    .on("mouseup.essGridColResize", function () {
                        $(document).off(".essGridColResize");
                        if (window.builder) builder.refreshJson();
                    });
            });
        });
    }


    // ----------------- move + resize toàn grid -----------------
    function enableMoveAndResize($root, cfg) {
        if (typeof interact === "undefined") return;

        var isResizing = false;

        // Thêm resize handle cho grid
        if ($root.find('.ess-grid-resize-handle').length === 0) {
            var $resizeHandle = $('<div class="ess-grid-resize-handle"></div>');
            $root.append($resizeHandle);
        }

        interact($root[0]).draggable({
            allowFrom: ".ess-grid-header",
            ignoreFrom: ".ess-grid-resize-handle, .ess-grid-table-wrapper, .ess-grid-table, .ess-grid-th, .ess-grid-td",
            listeners: {
                start: function (event) {
                    if (isResizing) return false;
                },
                move: function (event) {
                    if (isResizing) return;
                    var curLeft = parseFloat($root.css("left")) || cfg.left || 0;
                    var curTop = parseFloat($root.css("top")) || cfg.top || 0;
                    var newLeft = curLeft + event.dx;
                    var newTop = curTop + event.dy;
                    $root.css({ left: newLeft, top: newTop });
                    cfg.left = newLeft;
                    cfg.top = newTop;
                    if (window.builder) builder.refreshJson();
                }
            }
        });

        interact($root[0]).resizable({
            edges: { left: false, right: true, top: false, bottom: false },
            allowFrom: ".ess-grid-resize-handle",
            margin: 5,
            listeners: {
                start: function (event) {
                    isResizing = true;
                },
                move: function (event) {
                    var newW = event.rect.width;
                    if (newW < 300) newW = 300;
                    $root.css("width", newW + "px");
                    cfg.width = newW;
                    if (window.builder) builder.refreshJson();
                },
                end: function () {
                    isResizing = false;
                }
            }
        });
    }

    // ----------------- properties panel -----------------
    function showProperties(cfg, preserveTab) {
        cfg = ensureConfig(cfg);

        var $panel = $("#propPanel");
        if (!$panel.length) return;

        // Lưu tab hiện tại nếu không preserve
        var currentTab = preserveTab;
        if (!currentTab) {
            var $activeTab = $panel.find('.ess-prop-tab.ess-prop-tab-active');
            if ($activeTab.length) {
                currentTab = $activeTab.data('tab') || 'general';
            } else {
                currentTab = 'general';
            }
        }

        var html = [];

        html.push('<div class="ess-grid-props-header">');
        html.push('<h3 style="margin:0 0 8px 0; font-size:14px; font-weight:600;">ESS Grid</h3>');
        html.push('<div class="ess-grid-props-tabs">');
        var generalActive = currentTab === 'general' ? ' ess-prop-tab-active' : '';
        var columnsActive = currentTab === 'columns' ? ' ess-prop-tab-active' : '';
        var actionsActive = currentTab === 'actions' ? ' ess-prop-tab-active' : '';
        var showActionsTab = cfg.showActionColumn !== false; // Ẩn tab nếu checkbox không được check
        html.push('<button type="button" class="ess-prop-tab' + generalActive + '" data-tab="general">⚙️ General</button>');
        html.push('<button type="button" class="ess-prop-tab' + columnsActive + '" data-tab="columns">📊 Columns (' + (cfg.columns ? cfg.columns.length : 0) + ')</button>');
        if (showActionsTab) {
            html.push('<button type="button" class="ess-prop-tab' + actionsActive + '" data-tab="actions">🔘 Actions (' + (cfg.rowActions ? cfg.rowActions.length : 0) + ')</button>');
        }
        html.push('</div>');
        html.push('</div>');

        // GENERAL TAB
        var generalTabActive = currentTab === 'general' ? ' ess-prop-tab-active' : '';
        html.push('<div class="ess-prop-tab-content' + generalTabActive + '" data-tab-content="general">');
        html.push('<label>Grid title</label>');
        html.push('<input type="text" class="form-control" data-prop="title" value="' + (cfg.title || "") + '"/>');

        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" data-prop="showTitle" ' + (cfg.showTitle ? "checked" : "") + '> Show title</label>&nbsp;&nbsp;');
        html.push('<label><input type="checkbox" data-prop="titleBold" ' + (cfg.titleBold ? "checked" : "") + '> <b>Bold</b></label>&nbsp;&nbsp;');
        html.push('<label><input type="checkbox" data-prop="titleItalic" ' + (cfg.titleItalic ? "checked" : "") + '> <i>Italic</i></label>');
        html.push('</div>');

        html.push('<div class="mt-1">');
        html.push('<label>Sample rows:&nbsp;</label>');
        html.push('<input type="number" min="1" max="50" style="width:70px;" data-prop="sampleRowCount" value="' + (cfg.sampleRowCount || 1) + '"/>');
        html.push('</div>');

        html.push('<div class="mt-1">');
        html.push('<span>Sample display:&nbsp;</span>');
        var mode = cfg.sampleDisplayMode || "edit";
        html.push('<label><input type="radio" name="essGridDisplayMode" value="edit" ' + (mode === "edit" ? "checked" : "") + '> Edit mode</label>&nbsp;');
        html.push('<label><input type="radio" name="essGridDisplayMode" value="view" ' + (mode === "view" ? "checked" : "") + '> View mode</label>');
        html.push('</div>');

        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" data-prop="allowAddRow" ' + (cfg.allowAddRow ? "checked" : "") + '> Show "Add row" button</label>');
        html.push('</div>');

        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" data-prop="showCheckbox" ' + (cfg.showCheckbox ? "checked" : "") + '> Show selection checkbox column</label>');
        html.push('</div>');

        html.push('<div class="mt-1">');
        html.push('<label><input type="checkbox" data-prop="showActionColumn" ' + (cfg.showActionColumn !== false ? "checked" : "") + '> Show action buttons column</label>');
        html.push('</div>');
        html.push('</div>'); // ess-prop-tab-content

        // COLUMNS TAB - Compact card view
        var columnsTabActive = currentTab === 'columns' ? ' ess-prop-tab-active' : '';
        html.push('<div class="ess-prop-tab-content' + columnsTabActive + '" data-tab-content="columns">');
        html.push('<div class="ess-col-header">');
        html.push('<input type="text" class="ess-search-input" id="essColSearch" placeholder="🔍 Search columns..." style="width:100%; margin-bottom:8px; padding:6px 8px; border:1px solid #ddd; border-radius:4px; font-size:12px;"/>');
        html.push('<button type="button" class="ess-btn-primary" data-cmd="add-col" style="width:100%; margin-bottom:12px;">＋ Add Column</button>');
        html.push('</div>');
        html.push('<div class="ess-columns-list-wrapper">');
        html.push('<div class="ess-columns-list" id="essColumnsList">');

        // Render columns as compact cards
        (cfg.columns || []).forEach(function (col, idx) {
            var type = (col.type || "text").toLowerCase();
            var typeIcons = {
                'text': '📝',
                'textarea': '📄',
                'number': '🔢',
                'date': '📅',
                'combo': '📋',
                'tag': '🏷',
                'progress': '📊'
            };
            var typeIcon = typeIcons[type] || '📝';
            
            html.push('<div class="ess-col-card" data-col-id="' + col.id + '" data-col-index="' + idx + '">');
            html.push('<div class="ess-col-card-header">');
            html.push('<span class="ess-col-number">' + (idx + 1) + '</span>');
            html.push('<input type="text" class="ess-col-caption" data-col-prop="caption" value="' + (col.caption || "") + '" placeholder="Column name"/>');
            html.push('<button type="button" class="ess-col-expand" data-cmd="toggle-col-expand" title="Expand/Collapse">▼</button>');
            html.push('<button type="button" class="ess-col-delete" data-cmd="del-col" title="Delete">🗑</button>');
            html.push('</div>');
            html.push('<div class="ess-col-card-body">');
            
            // Type và Align trên cùng 1 hàng
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-col-field-type">');
            html.push('<label>Type</label>');
            html.push('<select class="ess-col-input" data-col-prop="type">');
            html.push('<option value="text"' + (type === "text" ? " selected" : "") + '>📝 Text box</option>');
            html.push('<option value="textarea"' + (type === "textarea" ? " selected" : "") + '>📄 Textarea</option>');
            html.push('<option value="number"' + (type === "number" ? " selected" : "") + '>🔢 Number</option>');
            html.push('<option value="date"' + (type === "date" ? " selected" : "") + '>📅 Date</option>');
            html.push('<option value="combo"' + ((type === "combo" || type === "combobox" || type === "select") ? " selected" : "") + '>📋 Combobox</option>');
            html.push('<option value="tag"' + (type === "tag" ? " selected" : "") + '>🏷 Tag / Status</option>');
            html.push('<option value="progress"' + (type === "progress" ? " selected" : "") + '>📊 Progress bar</option>');
            html.push('</select>');
            html.push('</div>');
            
            var align = col.align || "left";
            html.push('<div class="ess-col-field ess-col-field-align">');
            html.push('<label>Align</label>');
            html.push('<select class="ess-col-input" data-col-prop="align">');
            html.push('<option value="left"' + (align === "left" ? " selected" : "") + '>⬅ Left</option>');
            html.push('<option value="center"' + (align === "center" ? " selected" : "") + '>⬌ Center</option>');
            html.push('<option value="right"' + (align === "right" ? " selected" : "") + '>➡ Right</option>');
            html.push('</select>');
            html.push('</div>');
            html.push('</div>');
            
            // Width và Header style
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-col-field-width">');
            html.push('<label>Width</label>');
            html.push('<input type="number" min="60" max="1500" class="ess-col-input" data-col-prop="width" value="' + (col.width || "") + '" placeholder="Auto"/>');
            html.push('</div>');
            html.push('<div class="ess-col-field">');
            html.push('<label>Header</label>');
            html.push('<div class="ess-col-checkboxes">');
            html.push('<label><input type="checkbox" data-col-prop="headerBold" ' + (col.headerBold ? "checked" : "") + '> <b>B</b></label>');
            html.push('<label><input type="checkbox" data-col-prop="headerItalic" ' + (col.headerItalic ? "checked" : "") + '> <i>I</i></label>');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>');
            
            // Sample/Tag/Progress value - dòng riêng, canh đều với header
            html.push('<div class="ess-col-row ess-col-row-sample">');
            html.push('<div class="ess-col-field ess-col-field-full">');
            if (type === "tag") {
                html.push('<label>Tag Text</label>');
                html.push('<input type="text" class="ess-col-input" data-col-prop="tagText" value="' + (col.tagText || "") + '" placeholder="e.g. Pending"/>');
            } else if (type === "progress") {
                var pval = (typeof col.progressValue === "number" ? col.progressValue : 40);
                html.push('<label>Progress (%)</label>');
                html.push('<input type="number" min="0" max="100" class="ess-col-input" data-col-prop="progressValue" value="' + pval + '"/>');
            } else if (type === "combo" || type === "combobox" || type === "select") {
                html.push('<label>Options (mỗi dòng một option)</label>');
                var optionsText = '';
                if (col.options && Array.isArray(col.options)) {
                    optionsText = col.options.join('\n');
                } else if (typeof col.options === 'string') {
                    optionsText = col.options;
                }
                html.push('<textarea class="ess-col-input" data-col-prop="options" rows="4" placeholder="Option 1&#10;Option 2&#10;Option 3" style="min-height:80px; resize:vertical;">' + (optionsText || '') + '</textarea>');
            } else {
                html.push('<label>Sample Text</label>');
                html.push('<input type="text" class="ess-col-input" data-col-prop="sampleText" value="' + (col.sampleText || "") + '" placeholder="Sample value"/>');
            }
            html.push('</div>');
            html.push('</div>');
            
            html.push('</div>'); // ess-col-card-body
            html.push('</div>'); // ess-col-card
        });
        
        html.push('</div>'); // ess-columns-list
        html.push('</div>'); // ess-columns-list-wrapper
        html.push('</div>'); // ess-prop-tab-content

        // ACTIONS TAB
        var actionsTabActive = currentTab === 'actions' ? ' ess-prop-tab-active' : '';
        if (showActionsTab) {
            html.push('<div class="ess-prop-tab-content' + actionsTabActive + '" data-tab-content="actions">');
        } else {
            html.push('<div class="ess-prop-tab-content" data-tab-content="actions" style="display:none;">');
        }
        html.push('<div class="ess-col-header">');
        html.push('<button type="button" class="ess-btn-primary" data-cmd="add-action" style="width:100%; margin-bottom:12px;">＋ Add Action</button>');
        html.push('</div>');
        html.push('<div class="ess-actions-list-wrapper">');
        html.push('<div class="ess-actions-list">');
        
        var iconOptionsHtml = (window.MENU_ICON_LIST || []).map(function (ic) {
            return '<option value="' + ic.value + '">' + ic.text + '</option>';
        }).join("");

        (cfg.rowActions || []).forEach(function (act, idx) {
            html.push('<div class="ess-action-card" data-act-id="' + act.id + '">');
            html.push('<div class="ess-action-card-header">');
            html.push('<span class="ess-action-number">' + (idx + 1) + '</span>');
            html.push('<input type="text" class="ess-action-caption" data-act-prop="caption" value="' + (act.caption || "") + '" placeholder="Action name"/>');
            html.push('<button type="button" class="ess-action-expand" data-cmd="toggle-action-expand" title="Expand/Collapse">▼</button>');
            html.push('<button type="button" class="ess-action-delete" data-cmd="del-action" title="Delete">🗑</button>');
            html.push('</div>');
            html.push('<div class="ess-action-card-body">');
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-action-field-key">');
            html.push('<label>Key</label>');
            html.push('<input type="text" class="ess-col-input" data-act-prop="key" value="' + (act.key || "") + '" placeholder="e.g. view"/>');
            html.push('</div>');
            html.push('<div class="ess-col-field ess-action-field-icon">');
            html.push('<label>Icon</label>');
            html.push('<select class="ess-col-input" data-act-prop="icon"><option value="">-- None --</option>' + iconOptionsHtml + '</select>');
            html.push('</div>');
            html.push('</div>');
            var modeSample = act.modeSample || "normal";
            html.push('<div class="ess-col-row">');
            html.push('<div class="ess-col-field ess-col-field-full">');
            html.push('<label>Sample Mode</label>');
            html.push('<select class="ess-col-input" data-act-prop="modeSample">');
            html.push('<option value="normal"' + (modeSample === "normal" ? " selected" : "") + '>Normal</option>');
            html.push('<option value="disabled"' + (modeSample === "disabled" ? " selected" : "") + '>Disabled</option>');
            html.push('<option value="hidden"' + (modeSample === "hidden" ? " selected" : "") + '>Hidden</option>');
            html.push('</select>');
            html.push('</div>');
            html.push('</div>');
            html.push('</div>'); // ess-action-card-body
            html.push('</div>'); // ess-action-card
        });
        
        html.push('</div>'); // ess-actions-list
        html.push('</div>'); // ess-actions-list-wrapper
        html.push('</div>'); // ess-prop-tab-content

        $panel.html(html.join(""));

        // Wire up tab switching
        $panel.find(".ess-prop-tab").on("click", function() {
            var tab = $(this).data("tab");
            $panel.find(".ess-prop-tab").removeClass("ess-prop-tab-active");
            $panel.find(".ess-prop-tab-content").removeClass("ess-prop-tab-active");
            $(this).addClass("ess-prop-tab-active");
            $panel.find('[data-tab-content="' + tab + '"]').addClass("ess-prop-tab-active");
        });

        // Wire up search filter for columns
        $panel.find("#essColSearch").on("input", function() {
            var search = $(this).val().toLowerCase();
            $panel.find(".ess-col-card").each(function() {
                var caption = $(this).find(".ess-col-caption").val().toLowerCase();
                if (caption.indexOf(search) >= 0 || search === "") {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });

        // Set icon values for actions
        $panel.find(".ess-action-card select[data-act-prop='icon']").each(function () {
            var $sel = $(this);
            var actId = $sel.closest(".ess-action-card").data("act-id");
            var act = findActionById(cfg, actId);
            if (act && act.icon) $sel.val(act.icon);
        });

        wirePropertyEvents(cfg);
    }

    function wirePropertyEvents(cfg) {
        var $panel = $("#propPanel");
        if (!$panel.length) return;

        $panel.off(".essGridProps");

        // GENERAL
        $panel.on("input.essGridProps change.essGridProps", "[data-prop='title']", function () {
            cfg.title = $(this).val();
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("change.essGridProps", "[data-prop='showTitle']", function () {
            cfg.showTitle = $(this).is(":checked");
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("change.essGridProps", "[data-prop='titleBold']", function () {
            cfg.titleBold = $(this).is(":checked");
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("change.essGridProps", "[data-prop='titleItalic']", function () {
            cfg.titleItalic = $(this).is(":checked");
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("change.essGridProps input.essGridProps", "[data-prop='sampleRowCount']", function () {
            var v = parseInt($(this).val(), 10);
            if (isNaN(v) || v < 1) v = 1;
            cfg.sampleRowCount = v;
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("change.essGridProps", "input[name='essGridDisplayMode']", function () {
            var mode = $(this).val();

            // Nếu chuyển sang View -> chụp sample từ hàng đầu tiên
            if (mode === "view") {
                snapshotSampleDataFromGrid(cfg);
            }

            cfg.sampleDisplayMode = mode;
            render(cfg);
            if (window.builder) builder.refreshJson();
        });



        $panel.on("change.essGridProps", "[data-prop='allowAddRow']", function () {
            cfg.allowAddRow = $(this).is(":checked");
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("change.essGridProps", "[data-prop='showCheckbox']", function () {
            cfg.showCheckbox = $(this).is(":checked");
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("change.essGridProps", "[data-prop='showActionColumn']", function () {
            cfg.showActionColumn = $(this).is(":checked");
            // Lưu tab hiện tại
            var $activeTab = $panel.find('.ess-prop-tab.ess-prop-tab-active');
            var currentTab = $activeTab.length ? ($activeTab.data('tab') || 'general') : 'general';
            showProperties(cfg, currentTab);
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        // ACTIONS - Updated for card view
        $panel.on("input.essGridProps change.essGridProps", ".ess-action-card [data-act-prop]", function () {
            var $card = $(this).closest(".ess-action-card");
            var actId = $card.data("act-id");
            var prop = $(this).data("act-prop");
            var act = findActionById(cfg, actId);
            if (!act) return;

            if (prop === "key" || prop === "caption") {
                act[prop] = $(this).val();
            } else if (prop === "icon") {
                act.icon = $(this).val();
            } else if (prop === "modeSample") {
                act.modeSample = $(this).val();
            }
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("click.essGridProps", "[data-cmd='add-action']", function () {
            cfg.rowActions = cfg.rowActions || [];
            var n = cfg.rowActions.length + 1;
            cfg.rowActions.push({
                id: makeId("act"),
                key: "action" + n,
                caption: "Action " + n,
                icon: "",
                modeSample: "normal"
            });
            // Switch to Actions tab and show properties
            showProperties(cfg);
            $panel.find('.ess-prop-tab[data-tab="actions"]').click();
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("click.essGridProps", "[data-cmd='del-action']", function () {
            var $card = $(this).closest(".ess-action-card");
            var actId = $card.data("act-id");
            cfg.rowActions = (cfg.rowActions || []).filter(function (x) { return x.id !== actId; });
            showProperties(cfg);
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        // COLUMNS - Updated for card view
        $panel.on("input.essGridProps change.essGridProps", ".ess-col-card [data-col-prop]", function () {
            var $card = $(this).closest(".ess-col-card");
            var colId = $card.data("col-id");
            var prop = $(this).data("col-prop");
            var idx = findColumnIndex(cfg, colId);
            if (idx < 0) return;

            var col = cfg.columns[idx];

            if (prop === "caption") {
                col.caption = $(this).val();
            } else if (prop === "type") {
                col.type = $(this).val();
                // đổi type → rebuild properties để ô Sample/Tag/% đổi đúng control
                // Giữ nguyên tab hiện tại (columns) và scroll position
                var $columnsList = $panel.find('.ess-columns-list');
                var scrollTop = $columnsList.length ? $columnsList.scrollTop() : 0;
                var $currentCard = $card;
                var cardIndex = $currentCard.data('col-index') || idx;
                
                // Hiển thị loading overlay để tránh cảm giác giật
                var $loadingOverlay = $('<div class="ess-props-loading-overlay"><div class="ess-props-loading-spinner"></div></div>');
                $panel.append($loadingOverlay);
                
                // Sử dụng requestAnimationFrame để đảm bảo UI update mượt mà
                requestAnimationFrame(function() {
                    ensureConfig(cfg);
                    showProperties(cfg, 'columns');
                    
                    // Restore scroll position và focus lại card đang edit sau khi render xong
                    requestAnimationFrame(function() {
                        var $newColumnsList = $panel.find('.ess-columns-list');
                        if ($newColumnsList.length && scrollTop > 0) {
                            $newColumnsList.scrollTop(scrollTop);
                        }
                        // Focus lại card vừa thay đổi
                        var $newCard = $panel.find('.ess-col-card[data-col-index="' + cardIndex + '"]');
                        if ($newCard.length) {
                            var $typeSelect = $newCard.find('[data-col-prop="type"]');
                            if ($typeSelect.length) {
                                $typeSelect.focus();
                            }
                        }
                        // Ẩn loading overlay
                        $loadingOverlay.fadeOut(150, function() {
                            $(this).remove();
                        });
                    });
                });
                
                render(cfg);
                if (window.builder) builder.refreshJson();
                return; // tránh render 2 lần
            } else if (prop === "align") {
                col.align = $(this).val();
            } else if (prop === "width") {
                var v2 = parseInt($(this).val(), 10);
                if (!isNaN(v2) && v2 > 0) col.width = v2;
            } else if (prop === "headerBold") {
                col.headerBold = $(this).is(":checked");
            } else if (prop === "headerItalic") {
                col.headerItalic = $(this).is(":checked");
            } else if (prop === "tagText") {
                col.tagText = $(this).val();
            } else if (prop === "progressValue") {
                var v3 = parseInt($(this).val(), 10);
                if (isNaN(v3)) v3 = 0;
                if (v3 < 0) v3 = 0;
                if (v3 > 100) v3 = 100;
                col.progressValue = v3;
                $(this).val(v3);
            } else if (prop === "sampleText") {
                col.sampleText = $(this).val();
            } else if (prop === "options") {
                var optionsText = $(this).val();
                if (optionsText && optionsText.trim()) {
                    // Chia thành mảng các dòng, loại bỏ dòng trống
                    col.options = optionsText.split('\n').map(function(line) {
                        return line.trim();
                    }).filter(function(line) {
                        return line.length > 0;
                    });
                } else {
                    col.options = [];
                }
            }

            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("click.essGridProps", "[data-cmd='add-col']", function () {
            cfg.columns = cfg.columns || [];
            cfg.columns.push({
                id: makeId("col"),
                key: "Col" + (cfg.columns.length + 1),
                caption: "Column " + (cfg.columns.length + 1),
                type: "text",
                align: "left",
                headerBold: false,
                headerItalic: false,
                width: 150
            });
            // Switch to Columns tab and show properties
            showProperties(cfg, 'columns');
            // Scroll to new column sau khi render xong
            setTimeout(function() {
                var $columnsList = $panel.find('.ess-columns-list');
                var $newCard = $panel.find('.ess-col-card').last();
                if ($newCard.length && $columnsList.length) {
                    // Scroll đến card mới
                    var cardOffset = $newCard.position().top;
                    var listScrollTop = $columnsList.scrollTop();
                    var targetScroll = listScrollTop + cardOffset - 20;
                    $columnsList.scrollTop(targetScroll);
                    // Focus vào caption để edit ngay
                    setTimeout(function() {
                        $newCard.find('.ess-col-caption').focus().select();
                    }, 50);
                }
            }, 150);
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        // Toggle expand/collapse cho columns
        $panel.on("click.essGridProps", "[data-cmd='toggle-col-expand']", function () {
            var $card = $(this).closest(".ess-col-card");
            var $body = $card.find(".ess-col-card-body");
            var $btn = $(this);
            $card.toggleClass("ess-col-card-collapsed");
            if ($card.hasClass("ess-col-card-collapsed")) {
                $btn.text("▶");
            } else {
                $btn.text("▼");
            }
        });

        // Toggle expand/collapse cho actions
        $panel.on("click.essGridProps", "[data-cmd='toggle-action-expand']", function () {
            var $card = $(this).closest(".ess-action-card");
            var $body = $card.find(".ess-action-card-body");
            var $btn = $(this);
            $card.toggleClass("ess-action-card-collapsed");
            if ($card.hasClass("ess-action-card-collapsed")) {
                $btn.text("▶");
            } else {
                $btn.text("▼");
            }
        });

        $panel.on("click.essGridProps", "[data-cmd='del-col']", function () {
            var $card = $(this).closest(".ess-col-card");
            var colId = $card.data("col-id");
            var idx = findColumnIndex(cfg, colId);
            if (idx >= 0) cfg.columns.splice(idx, 1);
            // Giữ nguyên tab hiện tại khi xóa column
            var $activeTab = $panel.find('.ess-prop-tab.ess-prop-tab-active');
            var currentTab = $activeTab.length ? ($activeTab.data('tab') || 'columns') : 'columns';
            showProperties(cfg, currentTab);
            render(cfg);
            if (window.builder) builder.refreshJson();
        });
    }

    // ----------------- selection -----------------
    function wireSelectEvents(cfg) {
        var $root = $("#" + cfg.id);
        if (!$root.length) return;

        $root.off("mousedown.essGridSelect")
            .on("mousedown.essGridSelect", function (e) {
                if (e.button !== 0) return;
                e.stopPropagation();

                if (window.builder) {
                    if (typeof builder.clearSelection === "function") builder.clearSelection();
                    $(".canvas-control").removeClass("canvas-control-selected");

                    builder.selectedControlId = cfg.id;
                    builder.selectedControlType = "ess-grid";
                    $root.addClass("canvas-control-selected");

                    if (typeof builder.highlightOutlineSelection === "function") {
                        builder.highlightOutlineSelection();
                    }
                    if (typeof builder.updateSelectionSizeHint === "function") {
                        builder.updateSelectionSizeHint();
                    }
                }

                showProperties(cfg);
            });

        enableMoveAndResize($root, cfg);
    }

    // ----------------- public API -----------------
    function addNew(uiMode, popupId, dropPoint) {
        var cfg = newConfig();
        cfg.uiMode = uiMode || "ess";

        // ✅ Nếu có dropPoint, convert về tọa độ canvas và set vị trí
        if (dropPoint && dropPoint.clientX != null && dropPoint.clientY != null) {
            if (window.builder && typeof builder.clientToCanvasPoint === "function") {
                var canvasPoint = builder.clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY);
                cfg.left = canvasPoint.x;
                cfg.top = canvasPoint.y;
            }
        }

        // ✅ Nếu drop vào popup → gán parentId và điều chỉnh vị trí
        if (popupId && dropPoint) {
            console.log("ESS Grid: Drop vào popup:", popupId, dropPoint);
            cfg.parentId = popupId;
            
            // Tìm popup config để lấy tọa độ canvas
            var popupCfg = (window.builder && builder.controls) ? 
                builder.controls.find(function(c) { return c.id === popupId && c.type === "popup"; }) : null;
            
            if (popupCfg && window.builder && typeof builder.clientToCanvasPoint === "function") {
                // Convert drop point về tọa độ canvas
                var canvasPoint = builder.clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY);
                
                // Tính vị trí relative với popup (cả popup và drop point đều là canvas coordinates)
                var relativeX = canvasPoint.x - (popupCfg.left || 0);
                var relativeY = canvasPoint.y - (popupCfg.top || 0);
                
                // Lưu relative position (relative với popup body, trừ header ~50px)
                cfg.left = Math.max(10, relativeX);
                cfg.top = Math.max(50, relativeY); // Tránh header
                
                // Đảm bảo nằm trong popup
                var popupWidth = popupCfg.width || 800;
                var popupHeight = popupCfg.height || 600;
                if (cfg.left > (popupWidth - 100)) cfg.left = popupWidth - 100;
                if (cfg.top > (popupHeight - 100)) cfg.top = popupHeight - 100;
                
                console.log("ESS Grid: Set parentId=" + cfg.parentId + ", left=" + cfg.left + ", top=" + cfg.top);
            } else {
                console.warn("ESS Grid: Popup config not found or builder not available:", popupId);
            }
        } else {
            console.log("ESS Grid: Không drop vào popup, popupId=", popupId, "dropPoint=", dropPoint);
        }

        var $canvas = $("#canvas");
        render(cfg, $canvas);
        wireSelectEvents(cfg);

        if (window.builder) {
            builder.controls = builder.controls || [];
            builder.controls.push(cfg);
            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "ess-grid";
            if (typeof builder.highlightOutlineSelection === "function") {
                builder.highlightOutlineSelection();
            }
            if (typeof builder.updateSelectionSizeHint === "function") {
                builder.updateSelectionSizeHint();
            }
            
            // ✅ LUÔN LUÔN check popup sau khi render (giống field controls)
            // Vì tọa độ clientX/clientY có thể không chính xác do drag hint
            // Đợi một chút để DOM được render xong
            setTimeout(function() {
                if (!cfg.parentId && typeof builder.findParentPopupForControl === "function") {
                    console.log("ESS Grid: Checking for popup after render, cfg.left=" + cfg.left + ", cfg.top=" + cfg.top);
                    var foundPopupId = builder.findParentPopupForControl(cfg);
                    if (foundPopupId) {
                        cfg.parentId = foundPopupId;
                        console.log("ESS Grid: ✅ Detected popup after render:", foundPopupId, "- Re-rendering...");
                        // Re-render với parentId mới
                        render(cfg, $canvas);
                        wireSelectEvents(cfg);
                        if (typeof builder.refreshJson === "function") {
                            builder.refreshJson();
                        }
                    } else {
                        console.log("ESS Grid: ❌ No popup found after render");
                    }
                }
            }, 50); // Đợi 50ms để DOM render xong
            
            builder.refreshJson();
        }
    }

    function renderExisting(cfg) {
        cfg = ensureConfig(cfg);
        if (typeof cfg.left === "undefined") cfg.left = 40;
        if (typeof cfg.top === "undefined") cfg.top = 40;

        var $canvas = $("#canvas");
        render(cfg, $canvas);
        wireSelectEvents(cfg);
    }

    return {
        newConfig: newConfig,
        render: render,
        showProperties: showProperties,
        addNew: addNew,
        renderExisting: renderExisting,
        toJson: function (cfg) { return clone(cfg); },
        fromJson: function (json) { return ensureConfig(clone(json)); }
    };
})();
