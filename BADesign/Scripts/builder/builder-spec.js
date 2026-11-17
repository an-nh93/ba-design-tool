(function (window, $) {
    "use strict";

    var FIELD_KIND = {
        text: "Text box", number: "Numeric", "numberic-test": "Numeric", combo: "Combobox", multiselect: "Multi-select Dropdown",
        date: "Date", memo: "Memo", checkbox: "Checkbox", radio: "Radio", label: "Label", button: "Button",
        language: "Language combo", tag: "Tag", progress: "Progress", image: "Image", tree: "Tree"
    };
    var HEADERS = ["STT", "Khu vực", "Tên field", "Loại control", "Bắt buộc", "Chỉ đọc", "Mặc định / danh sách", "Kiểu dữ liệu, độ dài", "Mô tả, quy tắc"];
    var NO_DATA_SPEC = { button: 1, label: 1, image: 1, tag: 1, progress: 1, tree: 1 };

    var spec = {};

    function byPosition(list) {
        var sorted = list.slice().sort(function (a, b) {
            return ((a.top || 0) - (b.top || 0)) || ((a.left || 0) - (b.left || 0));
        });
        var lines = [], line = null;
        sorted.forEach(function (c) {
            if (!line || Math.abs((c.top || 0) - line.top) > 10) {
                line = { top: c.top || 0, items: [] };
                lines.push(line);
            }
            line.items.push(c);
        });
        var out = [];
        lines.forEach(function (ln) {
            ln.items.sort(function (a, b) { return (a.left || 0) - (b.left || 0); });
            out = out.concat(ln.items);
        });
        return out;
    }

    spec.collect = function (options) {
        options = options || {};
        var controls = (builder.controls || []).filter(function (c) { return c && c.type !== "annotation"; });
        var rows = [];

        function tabOf(c) {
            if (!c.tabPageId) return null;
            var tab = builder.getControlConfig(c.tabPageId);
            return tab && tab.type === "tabpage" && builder.containerOf(tab) === builder.containerOf(c) ? tab : null;
        }
        function childrenOf(parentId) {
            return controls.filter(function (c) { return builder.containerOf(c) === parentId && !tabOf(c); });
        }
        function tabMembers(tab, index) {
            return controls.filter(function (c) { return tabOf(c) === tab && (c.tabIndex || 0) === index; });
        }
        function add(area, target, name, kind, extra) {
            rows.push($.extend({
                area: area.join(" › "), target: target, name: name || "", kind: kind,
                required: false, readOnly: false, defaultValue: "", dataSpec: true
            }, extra || {}));
        }
        function fieldRow(c, area) {
            var isButton = c.ftype === "button";
            var textAsName = c.ftype === "checkbox" || c.ftype === "radio" || c.ftype === "label" || c.ftype === "tag";
            var name = isButton ? (c.defaultValue || c.caption) : (c.caption || (textAsName ? c.defaultValue : ""));
            var defaultValue = "";
            if (c.ftype === "combo") {
                defaultValue = (c.items || []).length ? "Danh sách: " + c.items.join("; ") : "";
            } else if (!isButton && !textAsName && !NO_DATA_SPEC[c.ftype] && c.ftype !== "multiselect" && c.defaultValue != null) {
                defaultValue = String(c.defaultValue);
            }
            add(area, c, name, (c.uiMode === "ess" ? "ESS " : "") + (FIELD_KIND[c.ftype] || c.ftype), {
                required: !!c.required, readOnly: !!c.disabled, defaultValue: defaultValue, dataSpec: !NO_DATA_SPEC[c.ftype]
            });
        }
        function walk(list, area) {
            byPosition(list).forEach(function (c) {
                if (c.type === "popup") {
                    walk(childrenOf(c.id), area.concat("Popup: " + (c.headerText || c.titleText || "")));
                } else if (c.type === "collapsible-section") {
                    walk(childrenOf(c.id), area.concat("Section: " + (c.caption || "")));
                } else if (c.type === "tabpage") {
                    (c.tabs || []).forEach(function (tab, index) {
                        walk(tabMembers(c, index), area.concat("Tab: " + (tab.caption || ("Tab " + (index + 1)))));
                    });
                } else if (c.type === "grid") {
                    var gridArea = area.concat("Lưới: " + (c.titleText || ""));
                    (c.toolbarItems || []).forEach(function (item) { add(gridArea, item, item.text, "Grid toolbar button", { dataSpec: false }); });
                    (c.columns || []).forEach(function (col) {
                        add(gridArea, col, col.caption || col.name, "Grid column" + (col.type === "tag" ? " (Tag)" : col.type === "checkbox" ? " (Checkbox)" : ""));
                    });
                } else if (c.type === "ess-grid") {
                    var essArea = area.concat("Lưới: " + (c.title || ""));
                    (c.columns || []).forEach(function (col) {
                        add(essArea, col, col.caption || col.key, "ESS Grid column" + (col.type && col.type !== "text" ? " (" + col.type + ")" : ""));
                    });
                } else if (c.type === "toolbar") {
                    (c.items || []).forEach(function (item) { add(area, item, item.text, "Toolbar button", { dataSpec: false }); });
                } else if (c.type === "field") {
                    if (c.ftype === "groupbox" || c.ftype === "section") {
                        walk(childrenOf(c.id), area.concat((c.ftype === "groupbox" ? "Group: " : "Section: ") + (c.caption || "")));
                    } else if ((c.ftype !== "label" && c.ftype !== "image") || options.all) {
                        fieldRow(c, area);
                    }
                }
            });
        }

        walk(childrenOf(null), []);
        return rows;
    };

    spec.tableData = function (rows) {
        var data = [HEADERS.slice()];
        rows.forEach(function (row, index) {
            data.push([
                String(index + 1), row.area, row.name, row.kind, row.required ? "Có" : "", row.readOnly ? "Có" : "",
                row.defaultValue, row.target.dataSpec || "", row.target.description || ""
            ]);
        });
        return data;
    };

    function esc(text) {
        return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    spec.toHtml = function (data) {
        var html = ['<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:10pt;">'];
        data.forEach(function (cells, r) {
            html.push("<tr>");
            cells.forEach(function (cell) {
                html.push(r === 0
                    ? '<th style="background:#d9e2f3;text-align:left;">' + esc(cell) + "</th>"
                    : "<td>" + esc(cell).replace(/\r?\n/g, "<br>") + "</td>");
            });
            html.push("</tr>");
        });
        html.push("</table>");
        return html.join("");
    };

    spec.toText = function (data) {
        return data.map(function (cells) {
            return cells.map(function (cell) { return String(cell).replace(/[\t\r\n]+/g, " "); }).join("\t");
        }).join("\r\n");
    };

    spec.toCsv = function (data) {
        return "﻿" + data.map(function (cells) {
            return cells.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(",");
        }).join("\r\n");
    };

    function copyLegacy(html) {
        var holder = document.createElement("div");
        holder.setAttribute("contenteditable", "true");
        holder.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
        holder.innerHTML = html;
        document.body.appendChild(holder);
        var range = document.createRange();
        range.selectNodeContents(holder);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        selection.removeAllRanges();
        document.body.removeChild(holder);
        return ok;
    }

    spec.copy = function (data) {
        var html = spec.toHtml(data), text = spec.toText(data);
        function done(ok) {
            builder.showToast(ok ? "Đã chép bảng mô tả. Dán (Ctrl+V) vào Word hoặc Excel." : "Trình duyệt không cho chép. Hãy dùng nút Tải CSV.", ok ? "success" : "warning");
        }
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            navigator.clipboard.write([new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([text], { type: "text/plain" })
            })]).then(function () { done(true); }, function () { done(copyLegacy(html)); });
            return;
        }
        done(copyLegacy(html));
    };

    spec.download = function (data) {
        var fileName = builder.exportFileName("mô tả field", "csv");
        builder.downloadBlob(new Blob([spec.toCsv(data)], { type: "text/csv;charset=utf-8" }), fileName);
        builder.showToast("Đã tải '" + fileName + "'.", "success");
    };

    function refreshSelectedPanel() {
        var ids = builder.getAllSelectedControlIds();
        if (ids.length !== 1) return;
        var cfg = builder.getControlConfig(ids[0]);
        if (!cfg) return;
        var tab = builderProps.activeTab();
        if (cfg.type === "grid" && window.controlGrid) controlGrid.showProperties(cfg.id, tab);
        else if (cfg.type === "ess-grid" && window.controlGridEss) controlGridEss.showProperties(cfg, tab);
        else builder.showPropertiesFor(cfg);
    }

    function setValue(target, key, value) {
        if (value) target[key] = value;
        else delete target[key];
    }

    spec.open = function () {
        var state = { all: false, rows: [], changed: false };
        var body = document.createElement("div");
        body.className = "ub-spec";

        var bar = document.createElement("div");
        bar.className = "ub-spec-bar";
        var toggle = document.createElement("label");
        var check = document.createElement("input");
        check.type = "checkbox";
        toggle.appendChild(check);
        toggle.appendChild(document.createTextNode(" Gồm cả Label và Image"));
        var hint = document.createElement("span");
        hint.className = "ub-spec-hint";
        hint.textContent = "Gõ trực tiếp vào hai cột cuối; nội dung được lưu cùng thiết kế.";
        bar.appendChild(toggle);
        bar.appendChild(hint);

        var wrap = document.createElement("div");
        wrap.className = "ub-spec-wrap";
        body.appendChild(bar);
        body.appendChild(wrap);

        function cell(tag, text, className) {
            var node = document.createElement(tag);
            if (className) node.className = className;
            node.textContent = text;
            return node;
        }

        function draw() {
            state.rows = spec.collect({ all: state.all });
            wrap.textContent = "";
            if (!state.rows.length) {
                wrap.appendChild(cell("div", "Thiết kế chưa có field nào để mô tả.", "ub-spec-empty"));
                return;
            }
            var table = document.createElement("table");
            table.className = "ub-spec-table";
            var head = document.createElement("tr");
            HEADERS.forEach(function (text) { head.appendChild(cell("th", text)); });
            var thead = document.createElement("thead");
            thead.appendChild(head);
            table.appendChild(thead);
            var tbody = document.createElement("tbody");
            state.rows.forEach(function (row, index) {
                var tr = document.createElement("tr");
                tr.appendChild(cell("td", String(index + 1), "ub-spec-no"));
                tr.appendChild(cell("td", row.area));
                tr.appendChild(cell("td", row.name, "ub-spec-name"));
                tr.appendChild(cell("td", row.kind));
                tr.appendChild(cell("td", row.required ? "Có" : "", "ub-spec-flag"));
                tr.appendChild(cell("td", row.readOnly ? "Có" : "", "ub-spec-flag"));
                tr.appendChild(cell("td", row.defaultValue));

                var dataCell = document.createElement("td");
                if (row.dataSpec) {
                    var input = document.createElement("input");
                    input.type = "text";
                    input.maxLength = 200;
                    input.className = "ub-spec-input";
                    input.value = row.target.dataSpec || "";
                    input.addEventListener("input", function () { setValue(row.target, "dataSpec", $.trim(input.value)); state.changed = true; });
                    dataCell.appendChild(input);
                }
                tr.appendChild(dataCell);

                var descCell = document.createElement("td");
                var area = document.createElement("textarea");
                area.rows = 1;
                area.maxLength = 2000;
                area.className = "ub-spec-input";
                area.value = row.target.description || "";
                area.addEventListener("input", function () {
                    setValue(row.target, "description", $.trim(area.value));
                    state.changed = true;
                    area.style.height = "auto";
                    area.style.height = Math.min(160, area.scrollHeight + 2) + "px";
                });
                descCell.appendChild(area);
                tr.appendChild(descCell);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            wrap.appendChild(table);
            $(wrap).find("textarea").each(function () {
                if (this.value) this.style.height = Math.min(160, this.scrollHeight + 2) + "px";
            });
        }

        check.addEventListener("change", function () { state.all = check.checked; draw(); });

        builderDialog.open({
            title: "Bảng mô tả field cho SRS",
            wide: true,
            body: body,
            buttons: [
                { text: "Chép bảng", close: false, onClick: function () { spec.copy(spec.tableData(state.rows)); } },
                { text: "Tải CSV", close: false, onClick: function () { spec.download(spec.tableData(state.rows)); } },
                { text: "Đóng", primary: true }
            ],
            onClose: function () {
                if (!state.changed) return;
                builder.refreshJson();
                refreshSelectedPanel();
            }
        });
        draw();
    };

    function injectCard() {
        var $panel = $("#propPanel");
        if (!$panel.length || $panel.find(".ub-spec-card").length || builder.readOnly) return;
        var ids = builder.getAllSelectedControlIds();
        if (ids.length !== 1) return;
        var cfg = builder.getControlConfig(ids[0]);
        if (!cfg || cfg.type === "annotation") return;
        var P = builderProps;
        var $host = P.host();
        if (!$host.length) return;

        var withDataSpec = cfg.type === "field" && cfg.ftype !== "groupbox" && cfg.ftype !== "section" && !NO_DATA_SPEC[cfg.ftype];
        var body = (withDataSpec
            ? P.line(P.field("Kiểu dữ liệu, độ dài", P.text({ "data-spec": "dataSpec", maxlength: 200, placeholder: "VD: Chữ, tối đa 50 ký tự", value: cfg.dataSpec || "" }), "pp-field--stack"))
            : "") +
            P.line(P.field("Mô tả, quy tắc", P.textarea({ "data-spec": "description", rows: 3, maxlength: 2000, placeholder: "Ý nghĩa, quy tắc nhập, điều kiện hiển thị..." }, cfg.description || ""), "pp-field--stack"));
        var $card = $(P.section("Mô tả cho SRS", body, { cls: "ub-spec-card" }));
        $card.find("[data-spec]")
            .on("input", function () { setValue(cfg, $(this).attr("data-spec"), $.trim(this.value)); })
            .on("change", function () { builder.refreshJson(); });
        $host.append($card);
    }

    $(function () {
        var panel = document.getElementById("propPanel");
        if (!panel || !window.MutationObserver) return;
        new MutationObserver(function () { injectCard(); }).observe(panel, { childList: true });
        injectCard();
    });

    window.builderSpec = spec;
})(window, jQuery);
