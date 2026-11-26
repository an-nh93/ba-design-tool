/* ==========================================================
   ESS HTML GRID CONTROL (v3.1 – fix CSS / progress / resize)
========================================================== */

var controlGridEss = (function () {
    "use strict";

    var MIN_WIDTH = 300;
    var MIN_HEIGHT = 150;

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
            
            // ✅ Escape HTML để tránh XSS và đảm bảo text được render đúng
            var escapedText = $('<div>').text(text || "Pending").html();

            var $tag = $(
                '<div class="ess-tag ess-grid-tag">' +
                '  <span class="ess-tag-icon"><i class="bi bi-tag-fill"></i></span>' +
                '  <span class="ess-tag-text">' + escapedText + '</span>' +
                '</div>'
            );
            // ✅ Set text trực tiếp vào HTML và đảm bảo nó không bị mất
            $tag.find(".ess-tag-text").html(escapedText);
            $tag.find(".ess-tag-text").text(text || "Pending"); // Set cả text() để đảm bảo
            $tag.css({ 
                "background-color": back, 
                "color": color 
            });
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

        var txt = v || (caption ? (caption + " " + (rowIndex + 1)) : "");
        return $('<div class="ess-grid-cell-view"></div>').text(txt);
    }

    // ----------------- render grid -----------------
    function render(cfg, $parent) {
        cfg = ensureConfig(cfg);

        var $root = $("#" + cfg.id);
        var isNew = false;

        // ✅ Nếu element đã tồn tại, chỉ empty và update, không remove
        if ($root.length) {
            // Element đã tồn tại, chỉ cần empty và update
            $root.empty();
            isNew = false;
        } else {
            // Element chưa tồn tại, tạo mới
            isNew = true;
            $root = $("<div/>")
                .attr("id", cfg.id)
                .attr("data-id", cfg.id)
                .addClass("canvas-control ess-grid-control")
                .attr("data-type", "ess-grid");

            // ✅ Nếu có parentId (popup hoặc collapsible-section) → append vào đúng container
            if (cfg.parentId) {
                var parentCfg = (window.builder && builder.controls) ? 
                    builder.controls.find(function(c) { return c.id === cfg.parentId; }) : null;
                
                if (parentCfg && parentCfg.type === "collapsible-section") {
                    // Append vào collapsible section content area
                    var $section = $('.ess-collapsible-section[data-id="' + cfg.parentId + '"]');
                    var $content = $section.find('.ess-collapsible-content');
                    
                    if ($content.length) {
                        $content.append($root);
                        
                        // Position relative với content area
                        var finalLeft = cfg.left || 0;
                        var finalTop = cfg.top || 0;

                        $root.css({
                            position: "absolute",
                            left: finalLeft + "px",
                            top: finalTop + "px",
                            width: (cfg.width || 900) + "px"
                        });
                    } else if ($parent && $parent.length) {
                        // Fallback: append vào canvas
                        $parent.append($root);
            $root.css({
                position: "absolute",
                left: (cfg.left || 20) + "px",
                top: (cfg.top || 20) + "px",
                width: (cfg.width || 900) + "px"
            });
                    }
                } else {
                    // Logic cũ cho popup
                    var $popup = $('.popup-design[data-id="' + cfg.parentId + '"]');
                    var $popupBody = $popup.find('.popup-body');
                    
                    if ($popupBody.length) {
                        // Append vào popup-body (grid sẽ là child của popup)
                        $popupBody.append($root);
                        
                        // Position relative với popup-body (không cần cộng popup offset)
                        var finalLeft = cfg.left || 20;
                        var finalTop = cfg.top || 50; // Tránh header

                        $root.css({
                            position: "absolute",
                            left: finalLeft + "px",
                            top: finalTop + "px",
                            width: (cfg.width || 900) + "px"
                        });
                    } else if ($parent && $parent.length) {
                        // Fallback: append vào canvas
                $parent.append($root);
                        $root.css({
                            position: "absolute",
                            left: (cfg.left || 20) + "px",
                            top: (cfg.top || 20) + "px",
                            width: (cfg.width || 900) + "px"
                        });
                    }
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
            builder.applyStacking(cfg, $root);
        }

        // ✅ Update CSS cho element đã tồn tại
        if (!isNew) {
            $root.css({
                left: (cfg.left || 20) + "px",
                top: (cfg.top || 20) + "px",
                width: (cfg.width || 900) + "px"
            });
        }
        applyHeight(cfg, $root);

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

                    // Support both menu icons (img) and glyphicons (span)
                    var iconType = act.iconType || "menu";
                    var iconSrc = act.icon || "/Content/images/grid-view.png";
                    
                    var $icon;
                    if (iconType === "glyphicon" && iconSrc) {
                        // Bootstrap Glyphicon
                        var iconColor = act.iconColor || "#333333";
                        $icon = $("<span>")
                            .addClass(iconSrc)
                            .addClass("ess-grid-action-icon")
                            .css({
                                "font-size": "16px",
                                "color": iconColor,
                                "cursor": "pointer"
                            });
                    } else {
                        // Menu icon (image)
                        $icon = $("<img>")
                            .attr("src", iconSrc)
                            .addClass("ess-grid-action-icon");
                    }
                    
                    if (act.caption || act.key) {
                        $icon.attr("title", act.caption || act.key || "");
                    }
                    
                    if (mode === "disabled") {
                        if (iconType === "glyphicon") {
                            $icon.css("opacity", "0.5");
                        }
                    }
                    
                    $wrapIcon.append($icon);
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
        enableMoveAndResize($root, cfg);

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

    // ----------------- wire select events -----------------
    function wireSelectEvents(cfg) {
        var $root = $("#" + cfg.id);
        if (!$root.length) return;

        // ✅ Chọn grid khi click (giống Core GridView)
        $root.off("mousedown.essGridSelect").on("mousedown.essGridSelect", function (e) {
            // Nếu click vào table hoặc các phần tử con của table → không select
            if ($(e.target).closest(".ess-grid-table-wrapper, .ess-grid-table, .ess-grid-th, .ess-grid-td").length) {
                return; // Cho phép tương tác với table
            }

            // Còn lại (click vào header, viền...) → chọn control
            e.stopPropagation();

            $(".canvas-control").removeClass("canvas-control-selected");
            $(".popup-design").removeClass("popup-selected");
            $(".popup-field").removeClass("popup-field-selected");

            if (typeof controlPopup !== "undefined" &&
                typeof controlPopup.clearSelection === "function") {
                controlPopup.clearSelection();
            }

            $root.addClass("canvas-control-selected");
            if (window.builder) {
                builder.selectedControlId = cfg.id;
                builder.selectedControlType = "ess-grid";
                showProperties(cfg.id);
            }
        });

        // ✅ Contextmenu: Giữ focus khi click chuột phải
        $root.off("contextmenu.essGridSelect").on("contextmenu.essGridSelect", function (e) {
            // Đảm bảo gridview được select trước khi hiện menu
            if (window.builder && builder.selectedControlId !== cfg.id) {
                $(".canvas-control").removeClass("canvas-control-selected");
                $(".popup-design").removeClass("popup-selected");
                $(".popup-field").removeClass("popup-field-selected");

                if (typeof controlPopup !== "undefined" &&
                    typeof controlPopup.clearSelection === "function") {
                    controlPopup.clearSelection();
                }

                $root.addClass("canvas-control-selected");
                builder.selectedControlId = cfg.id;
                builder.selectedControlType = "ess-grid";
            }
            // Không preventDefault để contextmenu event vẫn bubble lên document
        });
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

        if (!$root.children(".ub-resize").length) {
            $root.append('<div class="ub-resize ub-resize-right"></div><div class="ub-resize ub-resize-bottom"></div><div class="ub-resize ub-resize-corner"></div>');
        }

        builder.ensureMoveHandle($root);

        interact($root[0]).draggable({
            allowFrom: ".ess-grid-header, .ub-move",
            ignoreFrom: ".ub-resize, .ess-grid-table-wrapper, .ess-grid-table, .ess-grid-th, .ess-grid-td",
            listeners: {
                start: function (event) {
                    if (isResizing) return false;
                },
                move: function (event) {
                    if (isResizing) return;
                    builder.dragControlBy(cfg, $root, event.dx, event.dy);
                },
                end: function (event) {
                    builder.finishControlDrag(cfg, $root, event);
                }
            }
        });

        // Tay nắm mép phải đổi bề rộng, mép dưới đổi chiều cao (lưới thôi cao theo số dòng), góc đổi cả hai.
        interact($root[0]).resizable({
            edges: { right: ".ub-resize-right, .ub-resize-corner", bottom: ".ub-resize-bottom, .ub-resize-corner" },
            modifiers: controlSplitter.resizeLimits(MIN_WIDTH, MIN_HEIGHT),
            listeners: {
                start: function (event) {
                    isResizing = true;
                },
                move: function (event) {
                    var scale = builder.cssScale();
                    if (event.edges.right) cfg.width = Math.round(event.rect.width / scale);
                    if (event.edges.bottom) setOwnHeight(cfg, Math.round(event.rect.height / scale));
                    applySize(cfg);
                },
                end: function () {
                    isResizing = false;
                    builder.refreshJson();
                }
            }
        });
    }

    // Lưới có ownHeight thì giữ đúng chiều cao cfg.height: bảng lấp chỗ còn lại và tự cuộn.
    // Không có ownHeight thì lưới cao theo số dòng; cfg.height khi đó chỉ là chiều cao ước tính (lưới mới, bộ chụp), không dùng để vẽ.
    function hasOwnHeight(cfg) {
        return cfg.ownHeight === true && typeof cfg.height === "number" && cfg.height > 0;
    }

    // height là undefined: bỏ chiều cao riêng, lưới cao theo số dòng; cfg.height thành chiều cao ước tính: estimate khi có,
    // không có thì đo chiều cao theo số dòng trên canvas.
    function setOwnHeight(cfg, height, estimate) {
        if (height === undefined) {
            delete cfg.ownHeight;
            if (estimate !== undefined) {
                cfg.height = estimate;
                return;
            }
            var natural = naturalHeight(cfg);
            if (natural !== null) cfg.height = Math.round(natural);
            return;
        }
        cfg.height = height;
        cfg.ownHeight = true;
    }

    // Chiều cao của lưới khi cao theo số dòng (đơn vị thiết kế), đo trên canvas; lưới đang vẽ theo chiều cao riêng thì tạm bỏ để đo.
    // Lưới chưa vẽ hoặc đang ẩn (tab không mở): null.
    function naturalHeight(cfg) {
        var $root = builder.controlElement(cfg);
        if (!$root.length) return null;
        var fixed = $root.hasClass("grid-fixed-height"), height = $root[0].style.height;
        if (fixed) $root.removeClass("grid-fixed-height").css("height", "");
        var measured = $root[0].getBoundingClientRect().height;
        if (fixed) $root.addClass("grid-fixed-height").css("height", height);
        return measured > 0 ? measured / builder.cssScale() : null;
    }

    function applyHeight(cfg, $root) {
        var own = hasOwnHeight(cfg);
        $root.toggleClass("grid-fixed-height", own).css("height", own ? cfg.height + "px" : "");
    }

    function applySize(cfg) {
        var $root = builder.controlElement(cfg);
        applyHeight(cfg, $root);
        $root.css("width", cfg.width + "px");
    }

    // ----------------- properties panel -----------------
    function showProperties(cfg, preserveTab) {
        cfg = ensureConfig(cfg);

        var P = builderProps;
        var showActionsTab = cfg.showActionColumn !== false;
        var currentTab = P.validTab(showActionsTab ? ["general", "columns", "actions"] : ["general", "columns"], preserveTab);
        var columns = cfg.columns || [];
        var rowActions = cfg.rowActions || [];
        var mode = cfg.sampleDisplayMode || "edit";
        var columnTypes = [["text", "Text box"], ["textarea", "Textarea"], ["number", "Number"], ["date", "Date"], ["combo", "Combobox"], ["tag", "Tag / trạng thái"], ["progress", "Progress bar"]];

        var general =
            P.section("Tiêu đề",
                P.line(P.field("Tiêu đề lưới", P.text({ "data-prop": "title", value: cfg.title || "" }) + P.toggles(
                    P.toggle({ "data-prop": "titleBold", title: "Tiêu đề in đậm" }, { html: "<b>B</b>" }, cfg.titleBold),
                    P.toggle({ "data-prop": "titleItalic", title: "Tiêu đề in nghiêng" }, { html: "<i>I</i>" }, cfg.titleItalic)))) +
                P.checks([P.check({ "data-prop": "showTitle" }, "Hiện tiêu đề", cfg.showTitle)])) +
            P.section("Dữ liệu mẫu",
                P.line(P.field("Số dòng mẫu", P.number({ min: 1, max: 50, "data-prop": "sampleRowCount", value: cfg.sampleRowCount || 1 }), "pp-field--num")) +
                P.line(P.field("Trạng thái dòng", P.checks([
                    P.radio({ name: "essGridDisplayMode", value: "edit" }, "Đang sửa", mode === "edit"),
                    P.radio({ name: "essGridDisplayMode", value: "view" }, "Chỉ xem", mode === "view")
                ])))) +
            P.section("Thành phần của lưới",
                P.checks([
                    P.check({ "data-prop": "allowAddRow" }, 'Hiện nút "Add row"', cfg.allowAddRow),
                    P.check({ "data-prop": "showCheckbox" }, "Hiện cột checkbox chọn dòng", cfg.showCheckbox),
                    P.check({ "data-prop": "showActionColumn" }, "Hiện cột nút thao tác", showActionsTab)
                ], "pp-checks--stack"));

        var columnRows = columns.map(function (col, idx) {
            var type = (col.type || "text").toLowerCase();
            if (type === "combobox" || type === "select") type = "combo";
            var sample;
            if (type === "tag") {
                sample = P.field("Chữ trên tag", P.text({ "data-col-prop": "tagText", value: col.tagText || "", placeholder: "vd: Pending" }));
            } else if (type === "progress") {
                sample = P.field("Tiến độ (%)", P.number({ min: 0, max: 100, "data-col-prop": "progressValue", value: typeof col.progressValue === "number" ? col.progressValue : 40 }), "pp-field--num");
            } else if (type === "combo") {
                sample = P.field("Options (mỗi dòng một option)", P.textarea({ "data-col-prop": "options", rows: 3, placeholder: "Option 1\nOption 2\nOption 3" },
                    Array.isArray(col.options) ? col.options.join("\n") : (typeof col.options === "string" ? col.options : "")), "pp-field--stack");
            } else {
                sample = P.field("Chữ mẫu", P.text({ "data-col-prop": "sampleText", value: col.sampleText || "", placeholder: "Giá trị mẫu" }));
            }
            return P.row({
                attrs: { "class": "pp-cols-2", "data-col-id": col.id, "data-col-index": idx },
                open: P.isRowOpen(cfg.id, "col", idx),
                head: P.rowNo(idx + 1) +
                    P.text({ "data-col-prop": "caption", value: col.caption || "", placeholder: "Tên cột", title: "Tiêu đề cột" }) +
                    P.select({ "data-col-prop": "type", title: "Loại ô trong cột" }, columnTypes, type),
                tools: P.iconButton({ "data-cmd": "move-col", "data-dir": "-1", title: "Đưa cột này lên trước", disabled: idx === 0 }, "↑") +
                    P.iconButton({ "data-cmd": "move-col", "data-dir": "1", title: "Đưa cột này ra sau", disabled: idx === columns.length - 1 }, "↓") +
                    P.iconButton({ "data-cmd": "insert-col", title: "Chèn một cột mới ngay sau cột này" }, "＋") +
                    P.rowToggle("Căn lề, độ rộng, giá trị mẫu") +
                    P.iconButton({ "class": "pp-icon-btn--danger", "data-cmd": "del-col", title: "Xóa cột" }, "×"),
                body: P.line(
                        P.field("Căn lề", P.select({ "data-col-prop": "align" }, [["left", "Trái"], ["center", "Giữa"], ["right", "Phải"]], col.align || "left")),
                        P.field("Rộng", P.number({ min: 60, max: 1500, "data-col-prop": "width", value: col.width || "", placeholder: "Tự động" }), "pp-field--num")) +
                    P.line(P.field("Chữ tiêu đề", P.toggles(
                        P.toggle({ "data-col-prop": "headerBold", title: "Tiêu đề cột in đậm" }, { html: "<b>B</b>" }, col.headerBold),
                        P.toggle({ "data-col-prop": "headerItalic", title: "Tiêu đề cột in nghiêng" }, { html: "<i>I</i>" }, col.headerItalic)))) +
                    P.line(sample)
            });
        }).join("");

        var actionRows = rowActions.map(function (act, idx) {
            return P.row({
                attrs: { "class": "pp-cols-1", "data-act-id": act.id },
                open: P.isRowOpen(cfg.id, "action", idx),
                head: P.rowNo(idx + 1) +
                    P.text({ "data-act-prop": "caption", value: act.caption || "", placeholder: "Tên nút" }) +
                    P.iconCell(act, act.id),
                tools: P.rowToggle("Mã, biểu tượng, trạng thái mẫu") + P.iconButton({ "class": "pp-icon-btn--danger", "data-cmd": "del-action", title: "Xóa nút" }, "×"),
                body: P.line(P.field("Mã", P.text({ "data-act-prop": "key", value: act.key || "", placeholder: "vd: view" }))) +
                    P.line(P.field("Trạng thái", P.select({ "data-act-prop": "modeSample", title: "Trạng thái của nút trên dòng dữ liệu mẫu" },
                        [["normal", "Bình thường"], ["disabled", "Khóa"], ["hidden", "Ẩn"]], act.modeSample || "normal"))) +
                    P.iconEditor(act, act.id)
            });
        }).join("");

        var tabs = [{ key: "general", text: "Chung" }, { key: "columns", text: "Cột", count: columns.length }];
        if (showActionsTab) tabs.push({ key: "actions", text: "Nút dòng", count: rowActions.length });

        P.render(P.tabbedPanel("ESS Grid", "ID: " + cfg.id, tabs, currentTab,
            P.tabPanel("general", currentTab, general) +
            P.tabPanel("columns", currentTab,
                P.bar(P.text({ id: "essColSearch", "class": "pp-search", placeholder: "Tìm cột..." }), P.button({ "class": "pp-btn--primary", "data-cmd": "add-col" }, "＋ Thêm cột")) +
                P.listHead("pp-cols-2", ["#", "Tiêu đề cột", "Loại", ""]) +
                P.list({ id: "essColumnsList", "data-pp-owner": cfg.id, "data-pp-kind": "col" }, columnRows), "pp-tab-panel--list") +
            (showActionsTab ? P.tabPanel("actions", currentTab,
                P.bar(P.button({ "class": "pp-btn--primary", "data-cmd": "add-action" }, "＋ Thêm nút"), P.barHint("Nút thao tác ở đầu mỗi dòng")) +
                P.list({ id: "essActionsList", "data-pp-owner": cfg.id, "data-pp-kind": "action" }, actionRows), "pp-tab-panel--list") : "")));

        $("#essColSearch").on("input", function () {
            var search = $(this).val().toLowerCase();
            $("#essColumnsList > .pp-row").each(function () {
                var caption = String($(this).find("[data-col-prop='caption']").val() || "").toLowerCase();
                $(this).toggle(search === "" || caption.indexOf(search) >= 0);
            });
        });

        P.bindIcons("#essActionsList", {
            item: function (key) { return findActionById(cfg, key); },
            changed: function (structural) {
                render(cfg);
                builder.refreshJson();
                if (structural) showProperties(cfg);
            }
        });

        wirePropertyEvents(cfg);
    }

    function wirePropertyEvents(cfg) {
        var $panel = $("#propPanel > .pp-panel");

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
            showProperties(cfg, builderProps.activeTab() || 'general');
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        // ACTIONS - Updated for card view
        $panel.on("input.essGridProps change.essGridProps", "[data-act-prop]", function () {
            var $card = $(this).closest(".pp-row");
            var actId = $card.data("act-id");
            var prop = $(this).data("act-prop");
            var act = findActionById(cfg, actId);
            if (!act) return;

            if (prop === "key" || prop === "caption") {
                act[prop] = $(this).val();
            } else if (prop === "icon") {
                // Icon is now handled by icon picker, skip select dropdown
                // act.icon = $(this).val();
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
            showProperties(cfg, 'actions');
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("click.essGridProps", "[data-cmd='del-action']", function () {
            var $card = $(this).closest(".pp-row");
            var actId = $card.data("act-id");
            var idx = (cfg.rowActions || []).findIndex(function (x) { return x.id === actId; });
            cfg.rowActions = (cfg.rowActions || []).filter(function (x) { return x.id !== actId; });
            builderProps.rowRemoved(cfg.id, 'action', idx);
            showProperties(cfg);
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        // COLUMNS - Updated for card view
        $panel.on("input.essGridProps change.essGridProps", "[data-col-prop]", function () {
            var $card = $(this).closest(".pp-row");
            var colId = $card.data("col-id");
            var prop = $(this).data("col-prop");
            var idx = findColumnIndex(cfg, colId);
            if (idx < 0) return;

            var col = cfg.columns[idx];

            if (prop === "caption") {
                col.caption = $(this).val();
            } else if (prop === "type") {
                col.type = $(this).val();
                if (col.type === "combo" || col.type === "tag" || col.type === "progress") builderProps.setRowOpen(cfg.id, 'col', idx);
                builderProps.keepListScroll(0, function () { showProperties(cfg, 'columns'); });
                $("#essColumnsList > .pp-row").eq(idx).find('[data-col-prop="type"]').trigger("focus");
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
            var newCaption = $("#essColumnsList > .pp-row").last().find('[data-col-prop="caption"]')[0];
            if (newCaption) {
                newCaption.focus();
                newCaption.select();
            }
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("click.essGridProps", "[data-cmd='del-col']", function () {
            var $card = $(this).closest(".pp-row");
            var colId = $card.data("col-id");
            var idx = findColumnIndex(cfg, colId);
            if (idx >= 0) {
                cfg.columns.splice(idx, 1);
                builderProps.rowRemoved(cfg.id, 'col', idx);
            }
            builderProps.keepListScroll(0, function () { showProperties(cfg, builderProps.activeTab() || 'columns'); });
            render(cfg);
            if (window.builder) builder.refreshJson();
        });

        $panel.on("click.essGridProps", "[data-cmd='move-col']", function () {
            var $card = $(this).closest(".pp-row");
            var idx = findColumnIndex(cfg, $card.data("col-id"));
            var dir = parseInt($(this).data("dir"), 10);
            var to = idx + dir;
            if (idx < 0 || !(to >= 0 && to < cfg.columns.length)) return;
            var shift = dir * (dir > 0 ? $card.next() : $card.prev()).outerHeight(true);
            cfg.columns.splice(to, 0, cfg.columns.splice(idx, 1)[0]);
            builderProps.rowMoved(cfg.id, 'col', idx, to);
            builderProps.keepListScroll(shift, function () { showProperties(cfg, 'columns'); });
            builderProps.flashRow($("#essColumnsList > .pp-row").eq(to), "[data-cmd='move-col'][data-dir='" + dir + "']");
            render(cfg);
            builder.refreshJson();
        });

        $panel.on("click.essGridProps", "[data-cmd='insert-col']", function () {
            var idx = findColumnIndex(cfg, $(this).closest(".pp-row").data("col-id"));
            if (idx < 0) return;
            var used = {};
            cfg.columns.forEach(function (c) { used[c.key] = true; });
            var n = cfg.columns.length + 1;
            while (used["Col" + n]) n++;
            cfg.columns.splice(idx + 1, 0, {
                id: makeId("col"),
                key: "Col" + n,
                caption: "Column " + n,
                type: "text",
                align: "left",
                headerBold: false,
                headerItalic: false,
                width: 150
            });
            builderProps.rowInserted(cfg.id, 'col', idx + 1);
            builderProps.keepListScroll(0, function () { showProperties(cfg, 'columns'); });
            builderProps.flashRow($("#essColumnsList > .pp-row").eq(idx + 1));
            render(cfg);
            builder.refreshJson();
        });
    }

    // ----------------- selection -----------------
    function wireSelectEvents(cfg) {
        var $root = $("#" + cfg.id);
        if (!$root.length) return;

        $root.off("mousedown.essGridSelect")
            .on("mousedown.essGridSelect", function (e) {
                // Nếu click vào table hoặc các phần tử con của table → không select
                if ($(e.target).closest(".ess-grid-table-wrapper, .ess-grid-table, .ess-grid-th, .ess-grid-td").length) {
                    return; // Cho phép tương tác với table
                }

                if (e.button !== 0) return;
                e.stopPropagation();

                if (window.builder) {
                    if (typeof builder.clearSelection === "function") builder.clearSelection();
                    $(".canvas-control").removeClass("canvas-control-selected");
                    $(".popup-design").removeClass("popup-selected");
                    $(".popup-field").removeClass("popup-field-selected");

                    if (typeof controlPopup !== "undefined" &&
                        typeof controlPopup.clearSelection === "function") {
                        controlPopup.clearSelection();
                    }

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

        // ✅ Contextmenu: Giữ focus khi click chuột phải
        $root.off("contextmenu.essGridSelect").on("contextmenu.essGridSelect", function (e) {
            // Đảm bảo gridview được select trước khi hiện menu
            if (window.builder && builder.selectedControlId !== cfg.id) {
                $(".canvas-control").removeClass("canvas-control-selected");
                $(".popup-design").removeClass("popup-selected");
                $(".popup-field").removeClass("popup-field-selected");

                if (typeof controlPopup !== "undefined" &&
                    typeof controlPopup.clearSelection === "function") {
                    controlPopup.clearSelection();
                }

                $root.addClass("canvas-control-selected");
                builder.selectedControlId = cfg.id;
                builder.selectedControlType = "ess-grid";
            }
            // Không preventDefault để contextmenu event vẫn bubble lên document
            });

        enableMoveAndResize($root, cfg);
    }

    // ----------------- public API -----------------
    function addNew(uiMode, dropPoint) {
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

        var $canvasInner = $("#canvas-zoom-inner");
        render(cfg, $canvasInner);
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
            
            builder.refreshJson();
        }
    }

    function renderExisting(cfg) {
        cfg = ensureConfig(cfg);
        if (typeof cfg.left === "undefined") cfg.left = 40;
        if (typeof cfg.top === "undefined") cfg.top = 40;

        render(cfg, $("#canvas-zoom-inner"));
        wireSelectEvents(cfg);
    }

    return {
        MIN_WIDTH: MIN_WIDTH,
        newConfig: newConfig,
        render: render,
        hasOwnHeight: hasOwnHeight,
        setOwnHeight: setOwnHeight,
        naturalHeight: naturalHeight,
        applyHeight: applyHeight,
        applySize: applySize,
        showProperties: showProperties,
        addNew: addNew,
        renderExisting: renderExisting,
        toJson: function (cfg) { return clone(cfg); },
        fromJson: function (json) { return ensureConfig(clone(json)); }
    };
})();
