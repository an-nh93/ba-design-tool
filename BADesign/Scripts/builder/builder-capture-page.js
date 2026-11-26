(function (global) {
    "use strict";

    var MAX_NODES = 1500;
    var MAX_TEXT = 200;
    var MAX_GRID_ROWS = 10;
    var MAX_CELL_TEXT = 60;
    var MARK_ID = "ba-capture-mark";
    var SCREEN_GAP = 40;
    var DX_ORDER = [
        ["ASPxClientGridView", "grid"], ["ASPxClientTreeList", "tree"], ["ASPxClientCardView", "grid"],
        ["ASPxClientPageControl", "tabs"], ["ASPxClientTabControl", "tabs"],
        ["ASPxClientPopupMenu", "skip"], ["ASPxClientMenu", "toolbar"],
        ["ASPxClientPopupControl", "popup"],
        ["ASPxClientRadioButtonList", "radiolist"], ["ASPxClientCheckBoxList", "checklist"],
        ["ASPxClientRadioButton", "radio"], ["ASPxClientCheckBox", "checkbox"],
        ["ASPxClientButton", "button"],
        ["ASPxClientDateEdit", "date"], ["ASPxClientTimeEdit", "text"], ["ASPxClientSpinEdit", "number"],
        ["ASPxClientTokenBox", "multiselect"], ["ASPxClientGridLookup", "combo"], ["ASPxClientDropDownEdit", "combo"],
        ["ASPxClientComboBox", "combo"], ["ASPxClientListBox", "skip"], ["ASPxClientMemo", "memo"],
        ["ASPxClientButtonEdit", "text"], ["ASPxClientTextBox", "text"],
        ["ASPxClientHyperLink", "label"], ["ASPxClientLabel", "label"],
        ["ASPxClientUploadControl", "text"], ["ASPxClientCalendar", "skip"], ["ASPxClientPager", "skip"],
        ["ASPxClientProgressBar", "skip"], ["ASPxClientLoadingPanel", "skip"]
    ];

    var SAMPLE_VALUES = [
        [/manager|supervisor|approver/i, "Manager Name"],
        [/fullname|employeename|empname|username|^name$/i, "Employee Name"],
        [/position|jobtitle|title/i, "Job Title"],
        [/org|department|unit|company|branch/i, "Human Resources"],
        [/mail/i, "name@company.com"],
        [/phone|mobile/i, "0900 000 000"],
        [/date|day|birth/i, "01/01/2026"],
        [/address|town|place/i, "Sample Address"],
        [/employeeid|localid|code|number|no$|id$/i, "EMP001"]
    ];

    var PERSONAL_KEY = /employee|fullname|firstname|lastname|middlename|username|manager|supervisor|approver|phone|mobile|mail|address|birth|passport|idcard|identity|taxcode|bank|salary|wage|account/i;

    // Ký hiệu vẽ bằng chữ trong trang HTML thường: mũi tên sắp xếp ở cuối tiêu đề cột, mũi tên thả xuống ở cuối ô chọn.
    var SORT_MARK = /\s*[▲▼△▽↑↓↕⇅]+$/;
    var CARET_MARK = /\s*[▾▼▿▽⌄∨˅]$/;
    var DATE_VALUE = /^\d{1,4}([\/.\-])\d{1,2}\1\d{1,4}$/;
    var ACTIVE_MARK = /(^|[\s_-])(active|on|selected|current)([\s_-]|$)/i;

    function clean(text) {
        return String(text == null ? "" : text).replace(/->/g, "\u2192").replace(/<-/g, "\u2190").replace(/>=/g, "\u2265").replace(/<=/g, "\u2264").replace(/<>/g, "\u2260")
            .replace(/</g, "\uFF1C").replace(/>/g, "\uFF1E")
            .replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    }

    function isActiveTab(tab) {
        return tab.getAttribute("aria-selected") === "true" || ACTIVE_MARK.test(tab.getAttribute("class") || "");
    }

    // Phần tử mang tiêu đề của một hộp thoại: theo aria-labelledby, không có thì heading đầu tiên trong hộp.
    function dialogHeading(box) {
        var ids = (box.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
        var heading = ids.length ? box.ownerDocument.getElementById(ids[0]) : null;
        return heading && box.contains(heading) ? heading : box.querySelector("h1, h2, h3, h4, h5, h6, [role=heading]");
    }

    // plan (chỉ khi đọc một trang HTML bất kỳ, ví dụ mockup): { scope: phần tử cần chụp, popup: hộp popup nếu scope là một popup,
    // ignore: các phần tử bỏ qua }. Có plan thì control được nhận diện thêm theo cấu trúc và kiểu trình bày, không theo tên class.
    function captureDocument(doc, ui, withData, plan) {
        var win = doc.defaultView;
        var structural = !!plan;
        var scrollX = win.pageXOffset || 0, scrollY = win.pageYOffset || 0;
        var atoms = [];
        var claimed = [];
        var containers = [];
        var planPopup = null;

        function rectOf(el) {
            var r = el.getBoundingClientRect();
            return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
        }
        function visible(el) {
            if (!el || el.nodeType !== 1) return false;
            var r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0) return false;
            var cs = win.getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false;
            for (var p = el.parentElement; p && p !== doc.body; p = p.parentElement) {
                var ps = win.getComputedStyle(p);
                if (ps.display === "none" || ps.visibility === "hidden") return false;
                if ((ps.overflowY === "hidden" || ps.overflowX === "hidden") && (p.clientHeight < 2 || p.clientWidth < 2)) return false;
            }
            return true;
        }
        function isClaimed(el) {
            for (var i = 0; i < claimed.length; i++) {
                if (claimed[i] === el || claimed[i].contains(el)) return true;
            }
            return false;
        }
        function claim(el) { claimed.push(el); }
        function hex(color) {
            var m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(color || "");
            if (!m || (m[4] !== undefined && parseFloat(m[4]) < 0.5)) return null;
            return "#" + [m[1], m[2], m[3]].map(function (v) { var s = parseInt(v, 10).toString(16); return s.length < 2 ? "0" + s : s; }).join("");
        }
        function splitRequired(text) {
            var caption = clean(text);
            var required = /\(\*\)\s*:?$|\*\s*:?$/.test(caption);
            caption = caption.replace(/\s*\(\*\)\s*:?$/, "").replace(/\s*\*\s*:?$/, "").replace(/\s*:$/, "");
            return { caption: caption, required: required };
        }
        function push(atom) {
            if (atoms.length < MAX_NODES) atoms.push(atom);
        }
        function isDisabled(el) {
            return !!(el.disabled || el.getAttribute("aria-disabled") === "true" || /\bdxeDisabled|\bdxbDisabled|\bdisabled\b/.test(el.className || ""));
        }
        // Màu đang thấy ở chỗ một phần tử nền trong suốt: nền của phần tử cha gần nhất có màu; không cha nào có màu thì là nền trắng của trang.
        function paintBehind(el) {
            for (var p = el.parentElement; p; p = p.parentElement) {
                var paint = hex(win.getComputedStyle(p).backgroundColor);
                if (paint) return paint;
            }
            return "#ffffff";
        }
        // Một nút với ba màu như đang thấy trên trang: nền trong suốt lấy màu phía sau nút, nút không kẻ viền lấy viền trùng màu nền.
        // Thiếu một màu thì Builder vẽ màu của nút mới (nền đỏ, viền xanh).
        function buttonAtom(el, r, text, cs) {
            var bg = hex(cs.backgroundColor) || paintBehind(el);
            var ruled = parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== "none";
            return { t: "button", x: r.x, y: r.y, w: r.w, h: r.h, text: text, disabled: isDisabled(el), bg: bg, fg: hex(cs.color), border: (ruled && hex(cs.borderTopColor)) || bg, el: el };
        }
        var people = {}, peopleCount = 0;
        function scrub(value) {
            var cleaned = clean(value);
            if (/^[\d.,\s]+$/.test(cleaned) && cleaned.replace(/\D/g, "").length >= 7) return cleaned.replace(/\d/g, "0");
            if (/^[A-Za-z]{0,6}\d{3,}[A-Za-z]?\s+-\s+\D/.test(cleaned)) {
                if (!people[cleaned]) people[cleaned] = "EMP" + ("00" + (++peopleCount)).slice(-3) + " - Employee Name";
                return people[cleaned];
            }
            return cleaned.replace(/[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/g, "name@company.com");
        }

        function textOf(el, skipSelector, asShown) {
            if (!el) return "";
            var parts = [];
            var walker = doc.createTreeWalker(el, 4, null);
            var node;
            while ((node = walker.nextNode())) {
                var parent = node.parentElement;
                if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(parent.tagName)) continue;
                if (!/\S/.test(node.nodeValue) || !visible(parent)) continue;
                if (skipSelector) {
                    var owner = parent.closest(skipSelector);
                    if (owner && el.contains(owner)) continue;
                }
                parts.push(asShown ? node.nodeValue : (sampleFor(parent, clean(node.nodeValue)) || node.nodeValue));
            }
            return asShown ? clean(parts.join(" ")) : scrub(parts.join(" "));
        }

        function sampleFor(el, value) {
            var owner = el.closest("[data-name]");
            if (!owner || owner.hasAttribute("data-languagekey") || el.closest("[data-languagekey]")) return null;
            if (owner.closest("button, a, th, .btn, [role=button]")) return null;
            if (owner.querySelector("input, select, textarea, button")) return null;
            if (!/[A-Za-z\u00C0-\u1EF9]/.test(value)) {
                var date = /^(\d{1,4})([-\/.])(\d{1,2})\2(\d{1,4})$/.exec(value);
                if (date) return (date[1].length === 4 ? "2026" : "01") + date[2] + "01" + date[2] + (date[4].length === 4 ? "2026" : "01");
                return value.replace(/\d/g, "0");
            }
            if (/^\S+\s+-\s+\S/.test(value)) return "EMP001 - Employee Name";
            var name = (owner.getAttribute("data-name") || "").replace(/[^A-Za-z0-9]/g, "");
            var personal = PERSONAL_KEY.test(name) || !!owner.closest("#js-infouser, [class*='eprofile'], [class*='empl-info'], [class*='employee-info'], [class*='emp-info']");
            if (!personal) return null;
            for (var i = 0; i < SAMPLE_VALUES.length; i++) {
                if (SAMPLE_VALUES[i][0].test(name)) return SAMPLE_VALUES[i][1];
            }
            return "Sample";
        }

        var MENU_ITEMS = "li.dxm-item, td[class*='dxmMenuItem'], td[class*='dxmSubMenuItem']";
        function menuButtons(root) {
            var buttons = [];
            Array.prototype.slice.call(root.querySelectorAll(MENU_ITEMS)).forEach(function (item) {
                if (!visible(item)) return;
                var label = textOf(item);
                if (!label || buttons.length >= 40) return;
                var button = { text: label };
                var key = /(?:^|\s)([A-Za-z0-9-]+)-command-icon(?:\s|$)/.exec(item.className || "");
                if (key) button.icon = key[1].toLowerCase();
                buttons.push(button);
            });
            return buttons;
        }

        function iconAction(cell) {
            if (!cell || textOf(cell)) return null;
            var icons = Array.prototype.slice.call(cell.querySelectorAll("i, svg, img, [class*='icon']"));
            if (!icons.length) return null;
            var marks = icons.map(function (icon) { return (icon.getAttribute("class") || "") + " " + (icon.getAttribute("src") || "") + " " + (icon.getAttribute("title") || ""); }).join(" ");
            if (/eye|view|info|detail/i.test(marks)) return "view";
            if (/edit|pencil/i.test(marks)) return "edit";
            if (/delete|trash|bin|remove|close|times/i.test(marks)) return "delete";
            return null;
        }

        function channels(color) {
            return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
        }

        var TAG_MARKS = structural ? "span, div, label, a, b, button" : "span, div, label, a, b";
        function cellStyle(cell) {
            if (!cell) return null;
            var text = textOf(cell);
            if (!text) return cell.querySelector("input[type=checkbox], [class*='CheckBox'], [class*='checkbox']") ? { type: "checkbox" } : null;
            if (text.length > 24) return null;
            var marks = Array.prototype.slice.call(cell.querySelectorAll(TAG_MARKS));
            for (var i = 0; i < marks.length; i++) {
                var mark = marks[i];
                if (!visible(mark)) continue;
                var cs = win.getComputedStyle(mark), bg = hex(cs.backgroundColor);
                if (!bg || bg === "#ffffff") continue;
                var box = mark.getBoundingClientRect();
                if (box.height < 12 || box.height > 34 || box.width < 24) continue;
                var rgb = channels(bg);
                if (Math.max.apply(null, rgb) - Math.min.apply(null, rgb) < 40) continue;
                if (textOf(mark) !== text) continue;
                return { type: "tag", text: text, bg: bg, fg: hex(cs.color) };
            }
            return null;
        }

        var CHECK_BOX = "input[type=checkbox], [class*='dxWeb_edtCheckBox'], [class*='dxICheckBox']";
        function ticked(cell) {
            var input = cell.querySelector("input[type=checkbox]");
            return input ? !!input.checked : !!cell.querySelector("[class*='CheckBoxChecked']");
        }
        function cellValue(cell) {
            if (!cell) return "";
            var value = textOf(cell, null, true);
            if (value) return value.slice(0, MAX_CELL_TEXT);
            return cell.querySelector(CHECK_BOX) && ticked(cell) ? "x" : "";
        }

        // rows: selector của các dòng dữ liệu bên trong el, hoặc chính danh sách các phần tử dòng.
        function gridFromTable(el, headerCells, hasFilterRow, hasPager, title, rows, toolbar) {
            var r = rectOf(el);
            var box = el.getBoundingClientRect();
            var groupPanel = el.querySelector("[class*='dxgvGroupPanel']");
            var columns = [], cellIndexes = [], actions = [], checkbox = false;
            var bodyRows = (typeof rows === "string" ? Array.prototype.slice.call(el.querySelectorAll(rows)) : rows).filter(visible);
            var shownRows = bodyRows.filter(function (row) {
                var rr = row.getBoundingClientRect();
                return rr.top >= box.top - 2 && rr.bottom <= box.bottom + 2;
            });
            var firstRow = bodyRows[0];
            headerCells.forEach(function (cell, index) {
                if (!visible(cell)) return;
                var text = structural ? textOf(cell).replace(SORT_MARK, "") : textOf(cell);
                var width = Math.round(cell.getBoundingClientRect().width);
                var low = text.toLowerCase();
                var hasCheck = !!cell.querySelector("input[type=checkbox], .dxICheckBox, [class*='dxWeb_edtCheckBox'], [class*='CheckBox'], [class*='checkbox']");
                if (!text && (hasCheck || (index === 0 && width <= 50))) { checkbox = true; return; }
                if (low === "view" || low === "edit" || low === "delete") { if (actions.indexOf(low) < 0) actions.push(low); return; }
                var bodyCell = firstRow && firstRow.children[index];
                if (low === "remove" && width <= 110 && (!bodyCell || !textOf(bodyCell))) { if (actions.indexOf("delete") < 0) actions.push("delete"); return; }
                if (low === "#" && !columns.length && bodyCell && !textOf(bodyCell) && bodyCell.querySelector("input[type=checkbox], [class*='CheckBox'], [class*='checkbox']")) { checkbox = true; return; }
                if (!text || width <= 110) {
                    var action = iconAction(bodyCell);
                    if (action) { if (actions.indexOf(action) < 0) actions.push(action); return; }
                }
                if (!text && width <= 60) return;
                var column = { caption: text, w: Math.max(30, width) };
                var style = cellStyle(bodyCell);
                if (style) {
                    column.type = style.type;
                    if (style.type === "tag") {
                        column.text = style.text; column.bg = style.bg; if (style.fg) column.fg = style.fg;
                        var seen = {}, variants = [];
                        bodyRows.slice(0, 80).forEach(function (row) {
                            var other = cellStyle(row.children[index]);
                            if (!other || other.type !== "tag" || seen[other.text] || variants.length >= 6) return;
                            seen[other.text] = true;
                            variants.push(other.fg ? { text: other.text, bg: other.bg, fg: other.fg } : { text: other.text, bg: other.bg });
                        });
                        if (variants.length > 1) column.tags = variants;
                    }
                }
                columns.push(column);
                cellIndexes.push(index);
            });
            var grid = { t: "grid", x: r.x, y: r.y, w: r.w, h: r.h, title: clean(title), filterRow: !!hasFilterRow, pager: !!hasPager, checkbox: checkbox, columns: columns, actions: actions, toolbar: toolbar || [], rows: Math.max(1, Math.min(MAX_GRID_ROWS, shownRows.length)), groupPanel: !!(groupPanel && visible(groupPanel)), el: el };
            if (withData && shownRows.length) {
                grid.data = shownRows.slice(0, MAX_GRID_ROWS).map(function (row) {
                    return cellIndexes.map(function (index) { return cellValue(row.children[index]); });
                });
            }
            push(grid);
            claim(el);
            return grid;
        }

        function treeFromTable(el) {
            var r = rectOf(el), box = el.getBoundingClientRect();
            var rows = Array.prototype.slice.call(el.querySelectorAll("tr[class*='dxtlNode'], tr[class*='dxtlAltNode'], tr[class*='dxtlFocusedNode'], tr[class*='dxtlSelectedNode']")).filter(visible);
            var headers = Array.prototype.slice.call(el.querySelectorAll("td[class*='dxtlHeader'], th[class*='dxtlHeader']")).filter(visible);
            var mode = "none", items = [], branches = [], columns = null, scroll = false, rowHeight = 0, indent = 0;
            rows.forEach(function (row) {
                var rr = row.getBoundingClientRect();
                if (rr.top < box.top - 2 || rr.bottom > box.bottom + 2 || items.length >= 80) { scroll = true; return; }
                var cells = Array.prototype.slice.call(row.children);
                var indents = cells.filter(function (cell) { return /dxtlIndent/.test(cell.className || ""); });
                var selection = cells.filter(function (cell) { return /dxtlSelectionCell/.test(cell.className || ""); })[0];
                var data = cells.filter(function (cell) { return !/dxtlIndent|dxtlSelectionCell|dxtlHSEC/.test(cell.className || "") && visible(cell); });
                var item = { text: data[0] ? textOf(data[0]) : "", level: Math.max(0, indents.length - 1) };
                if (row.querySelector("[class*='dxTreeList_CollapsedButton']")) item.open = false;
                if (selection) {
                    mode = "box";
                    if (ticked(selection)) item.checked = true;
                } else {
                    var mark = data[0] ? data[0].querySelector("img") : null;
                    var src = mark ? (mark.getAttribute("src") || "") : "";
                    if (/check|tick/i.test(src)) {
                        mode = "mark";
                        item.checked = !/uncheck/i.test(src);
                    }
                }
                if (/dxtlFocusedNode/.test(row.className || "")) item.focused = true;
                if (data.length > 1) {
                    item.cells = data.slice(1).map(function (cell) { return cell.querySelector(CHECK_BOX) ? ticked(cell) : textOf(cell); });
                    if (!columns) {
                        columns = data.slice(1).map(function (cell, index) {
                            var check = cell.querySelector(CHECK_BOX);
                            var column = { caption: headers.length === data.length ? textOf(headers[index + 1]) : "", w: Math.max(20, Math.round(cell.getBoundingClientRect().width)), type: check ? "checkbox" : "text" };
                            if (check && /Disabled/.test(cell.innerHTML)) column.disabled = true;
                            return column;
                        });
                    }
                }
                if (!rowHeight) rowHeight = Math.round(rr.height);
                if (!indent && indents.length) indent = Math.round(indents[0].getBoundingClientRect().width);
                branches.push(!!row.querySelector("[class*='dxTreeList_ExpandedButton'], [class*='dxTreeList_CollapsedButton']"));
                items.push(item);
            });
            items.forEach(function (item, index) {
                var next = items[index + 1];
                if (branches[index] && !(next && next.level > item.level)) item.open = false;
            });
            push({ t: "tree", x: r.x, y: r.y, w: r.w, h: r.h, check: mode, rowHeight: rowHeight || 25, indent: indent || 23, header: headers.length > 0, caption: headers.length ? textOf(headers[0]) : "", columns: columns || [], items: items, scroll: scroll, el: el });
            claim(el);
        }

        function collectDevExpress() {
            var Base = win.ASPxClientControl;
            if (!Base || !Base.GetControlCollection) return;
            var kinds = DX_ORDER.filter(function (pair) { return typeof win[pair[0]] === "function"; });
            var list = [];
            Base.GetControlCollection().ForEachControl(function (control) {
                var kind = null;
                for (var i = 0; i < kinds.length; i++) {
                    if (control instanceof win[kinds[i][0]]) { kind = kinds[i][1]; break; }
                }
                if (!kind) return;
                var el = null;
                try { el = control.GetMainElement ? control.GetMainElement() : null; } catch (e) { el = null; }
                if (!el || !doc.documentElement.contains(el)) return;
                list.push({ control: control, kind: kind, el: el });
            });

            Array.prototype.slice.call(doc.querySelectorAll("[class*='dxpcDropDown'], [class*='LoadingPanel'], [class*='LoadingDiv']")).forEach(claim);
            Array.prototype.slice.call(doc.querySelectorAll("[class*='dxpcLite']")).forEach(function (el) {
                if (/dxpcDropDown/.test(el.className || "") || isClaimed(el) || !visible(el)) return;
                var box = el.querySelector(".dxpc-mainDiv") || el;
                if (!visible(box)) return;
                var r = rectOf(box);
                if (r.w < 120 || r.h < 60) return;
                var header = box.querySelector(".dxpc-headerText, .dxpc-header");
                var back = el.id ? doc.getElementById(el.id.replace(/_PW-?\d+$/, "") + "_DXPWMB-1") : null;
                var modal = !!(back && visible(back)) || r.w * r.h >= win.innerWidth * win.innerHeight * 0.3;
                containers.push({ t: "popup", x: r.x, y: r.y, w: r.w, h: r.h, title: textOf(header), el: box, skip: header ? header.closest(".dxpc-header") || header : null, modal: modal, z: parseInt(win.getComputedStyle(el).zIndex, 10) || 0 });
            });

            list.sort(function (a, b) { return (a.kind === "grid" || a.kind === "tree" ? 0 : 1) - (b.kind === "grid" || b.kind === "tree" ? 0 : 1); });
            list.forEach(function (x) {
                if (x.kind === "popup" || x.kind === "skip") { if (x.kind === "skip") claim(x.el); return; }
                if (!visible(x.el) || isClaimed(x.el)) return;
                var r = rectOf(x.el), text;
                if (x.kind === "grid") {
                    var headers = Array.prototype.slice.call(x.el.querySelectorAll("td[class*='dxgvHeader'], th[class*='dxgvHeader']"));
                    var titleEl = x.el.querySelector("[class*='dxgvTitlePanel']");
                    gridFromTable(x.el, headers, !!x.el.querySelector("[class*='dxgvFilterRow']"), !!x.el.querySelector("[class*='dxgvPagerBottomPanel'], [class*='dxgvPagerTopPanel']"), textOf(titleEl, MENU_ITEMS), "tr[class*='dxgvDataRow']", titleEl ? menuButtons(titleEl) : []);
                } else if (x.kind === "tree") {
                    treeFromTable(x.el);
                } else if (x.kind === "tabs") {
                    var tabEls = Array.prototype.slice.call(x.el.querySelectorAll("li.dxtc-tab, li.dxtc-activeTab, td[class*='dxtcTab'], td[class*='dxtcActiveTab']")).filter(visible);
                    var captions = [], active = -1;
                    tabEls.forEach(function (li) {
                        var caption = textOf(li);
                        if (!caption || captions.indexOf(caption) >= 0) return;
                        if (/activeTab|ActiveTab/.test(li.className)) active = captions.length;
                        captions.push(caption);
                    });
                    if (active < 0) {
                        try { active = x.control.GetActiveTabIndex ? Math.max(0, x.control.GetActiveTabIndex()) : 0; } catch (e) { active = 0; }
                    }
                    var strip = x.el.querySelector("ul.dxtc-strip, [class*='dxtc-stripContainer'], [class*='dxtcTabs']");
                    containers.push({ t: "tabs", x: r.x, y: r.y, w: r.w, h: r.h, tabs: captions, active: active, el: x.el, skip: strip });
                    if (strip) claim(strip);
                } else if (x.kind === "toolbar") {
                    var buttons = menuButtons(x.el);
                    if (buttons.length) push({ t: "toolbar", x: r.x, y: r.y, w: r.w, h: r.h, buttons: buttons, el: x.el });
                    claim(x.el);
                } else if (x.kind === "radiolist" || x.kind === "checklist") {
                    var itemKind = x.kind === "radiolist" ? "radio" : "checkbox";
                    Array.prototype.slice.call(x.el.querySelectorAll("label")).forEach(function (label) {
                        var cell = label.closest("td, li, span") || label;
                        var host = cell.parentElement && cell.parentElement.tagName === "TR" ? cell.parentElement : cell;
                        if (!visible(label)) return;
                        var lr = rectOf(label), hr = rectOf(host);
                        var left = Math.min(lr.x - 22, hr.x);
                        push({ t: itemKind, x: left, y: lr.y - 2, w: lr.x + lr.w - left, h: Math.max(18, lr.h + 4), caption: textOf(label), disabled: isDisabled(x.el), el: host });
                    });
                    claim(x.el);
                } else if (x.kind === "radio" || x.kind === "checkbox") {
                    text = "";
                    try { text = x.control.GetText ? x.control.GetText() : ""; } catch (e) { text = ""; }
                    if (!text) text = textOf(x.el.querySelector("label"));
                    push({ t: x.kind, x: r.x, y: r.y, w: r.w, h: r.h, caption: clean(text), disabled: isDisabled(x.el), el: x.el });
                    claim(x.el);
                } else if (x.kind === "button") {
                    text = "";
                    try { text = x.control.GetText ? x.control.GetText() : ""; } catch (e) { text = ""; }
                    if (!text) text = textOf(x.el);
                    var cs = win.getComputedStyle(x.el);
                    push(buttonAtom(x.el, r, clean(text), cs));
                    claim(x.el);
                } else if (x.kind === "label") {
                    text = "";
                    try { text = x.control.GetText ? x.control.GetText() : ""; } catch (e) { text = ""; }
                    if (!text) text = textOf(x.el);
                    if (clean(text)) push({ t: "label", x: r.x, y: r.y, w: r.w, h: r.h, text: clean(text), el: x.el });
                    claim(x.el);
                } else {
                    push({ t: x.kind, x: r.x, y: r.y, w: r.w, h: r.h, caption: "", disabled: isDisabled(x.el) || (function () { try { return x.control.GetEnabled && !x.control.GetEnabled(); } catch (e) { return false; } })(), el: x.el });
                    claim(x.el);
                }
            });
        }

        function hiddenBar(previous, r) {
            if (r.y >= previous.y + previous.h - 1) return { vertical: false, size: 0 };
            if (r.x >= previous.x + previous.w - 1) return { vertical: true, size: 0 };
            return null;
        }

        function splitterPanes(table) {
            var panes = [], bars = [], pending = null, known = true;
            Array.prototype.slice.call(table.rows).forEach(function (row) {
                Array.prototype.slice.call(row.cells).forEach(function (cell) {
                    if (!visible(cell)) return;
                    var r = rectOf(cell);
                    var bar = /(^|\s)dxspl([VH])Separator/.exec(cell.className || "");
                    if (bar) {
                        var vertical = bar[2] === "V";
                        pending = { vertical: vertical, size: vertical ? r.w : r.h };
                        claim(cell);
                        return;
                    }
                    if (panes.length) {
                        var between = pending || hiddenBar(panes[panes.length - 1].r, r);
                        if (!between) known = false;
                        bars.push(between);
                    }
                    pending = null;
                    panes.push({ cell: cell, r: r });
                });
            });
            return known && panes.length > 1 ? { panes: panes, bars: bars } : null;
        }

        // Một bảng splitter của DevExpress có n pane thành n - 1 khối Splitter lồng nhau: khối thứ k chia pane k (vùng 1) với phần còn lại (vùng 2).
        function collectSplitters() {
            Array.prototype.slice.call(doc.querySelectorAll("table[class*='dxsplControl'], table[class*='dxsplP']")).forEach(function (table) {
                if (!/(^|\s)dxspl(Control|P)(_\S+)?(\s|$)/.test(table.className || "") || !visible(table) || isClaimed(table)) return;
                var found = splitterPanes(table);
                if (!found) return;
                found.bars.forEach(function (bar, k) {
                    var rest = found.panes.slice(k);
                    var first = rest[0].r;
                    var frame = extentOf(rest.map(function (pane) { return pane.r; }), false);
                    var box = { t: "splitter", x: frame.x0, y: frame.y0, w: frame.x1 - frame.x0, h: frame.y1 - frame.y0, vertical: bar.vertical, split: bar.vertical ? first.w : first.h, bar: bar.size };
                    box.el = k ? rest[0].cell : table;
                    box.cells = rest.map(function (pane) { return pane.cell; });
                    box.rank = k / found.panes.length;
                    containers.push(box);
                });
            });
        }

        function headingParts(head) {
            var controls = Array.prototype.slice.call(head.querySelectorAll("[class*='dxm-main'], [class*='dxmLite'], [class*='dxeButtonEdit'], [class*='dxeTextBox'], [class*='dxeMemo'], [class*='dxbButton'], [class*='dxeRadioButtonList'], [class*='dxeCheckBoxList'], [class*='dxICheckBox'], [class*='dxeIRadioButton'], [class*='dxichSys'], input, select, button")).filter(visible);
            var limit = Infinity;
            controls.forEach(function (control) { limit = Math.min(limit, control.getBoundingClientRect().left); });
            var nodes = [], parts = [];
            var walker = doc.createTreeWalker(head, 4, null);
            var node;
            while ((node = walker.nextNode())) {
                var parent = node.parentElement;
                if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(parent.tagName)) continue;
                if (!/\S/.test(node.nodeValue) || !visible(parent)) continue;
                if (controls.some(function (control) { return control.contains(parent); })) continue;
                var range = doc.createRange();
                range.selectNodeContents(node);
                var box = range.getBoundingClientRect();
                if (box.left >= limit) continue;
                nodes.push(node);
                parts.push({ text: node.nodeValue, right: box.right, owner: parent });
            }
            if (parts.length > 1 && isFinite(limit)) {
                var last = parts[parts.length - 1];
                if (limit - last.right <= 24 && last.owner !== parts[0].owner) {
                    parts.pop();
                    nodes.pop();
                }
            }
            return { text: clean(parts.map(function (part) { return part.text; }).join(" ")), nodes: nodes };
        }

        function collectPlain() {
            Array.prototype.slice.call(doc.querySelectorAll("[class*='Breadcrumb'], [class*='breadcrumb']")).forEach(claim);
            Array.prototype.slice.call(doc.querySelectorAll("[class*='dxflGroupBox']")).forEach(function (el) {
                if (!/(^|\s)dxflGroupBox(_\S+)?(\s|$)/.test(el.className || "") || !visible(el) || isClaimed(el)) return;
                var captionEl = el.querySelector("[class*='dxflGroupBoxCaption']");
                var r = rectOf(el);
                if (/single-line-title/.test(el.className) || (r.h <= 24 && el.children.length <= 1)) {
                    var heading = textOf(captionEl || el);
                    var hr = captionEl && visible(captionEl) ? rectOf(captionEl) : r;
                    if (heading) push({ t: "label", x: hr.x, y: hr.y, w: hr.w, h: hr.h, text: heading, bold: true, el: el });
                    claim(el);
                    return;
                }
                containers.push({ t: "group", x: r.x, y: r.y, w: r.w, h: r.h, caption: textOf(captionEl), el: el, skip: captionEl });
            });
            Array.prototype.slice.call(doc.querySelectorAll("[class*='dxrpControl']")).forEach(function (el) {
                if (!visible(el) || isClaimed(el)) return;
                var head = el.querySelector("[class*='dxrpHeader'], [class*='dxrp-header']");
                if (!head || head.closest("[class*='dxrpControl']") !== el || !visible(head)) return;
                var parts = headingParts(head);
                if (!parts.text) return;
                var r = rectOf(el);
                containers.push({ t: "section", x: r.x, y: r.y, w: r.w, h: r.h, caption: parts.text, el: el, skipNodes: parts.nodes });
            });
            Array.prototype.slice.call(doc.querySelectorAll("fieldset")).forEach(function (el) {
                if (!visible(el) || isClaimed(el)) return;
                var legend = el.querySelector("legend");
                var r = rectOf(el);
                containers.push({ t: "group", x: r.x, y: r.y, w: r.w, h: r.h, caption: textOf(legend), el: el, skip: legend });
            });
            Array.prototype.slice.call(doc.querySelectorAll(".panel, .card, .box, .portlet")).forEach(function (el) {
                if (!visible(el) || isClaimed(el)) return;
                var head = el.querySelector(".panel-heading, .card-header, .box-header, .portlet-title");
                if (!head || !visible(head) || !textOf(head)) return;
                var r = rectOf(el);
                if (r.w < 200 || r.h < 60) return;
                containers.push({ t: "section", x: r.x, y: r.y, w: r.w, h: r.h, caption: textOf(head), el: el, skip: head });
            });
            Array.prototype.slice.call(structural ? [] : doc.querySelectorAll("div.title, div.title-2, div.box-title, div.card-title")).forEach(function (head) {
                var el = head.parentElement;
                if (!el || !visible(head) || !visible(el) || isClaimed(el)) return;
                if (containers.some(function (c) { return c.el === el; })) return;
                var caption = textOf(head, "button, input, select, .btn");
                var r = rectOf(el);
                if (!caption || r.w < 200 || r.h < (/title-2/.test(head.className) ? 30 : 60)) return;
                containers.push({ t: "section", x: r.x, y: r.y, w: r.w, h: r.h, caption: caption, el: el, skip: head });
            });
            Array.prototype.slice.call(doc.querySelectorAll(".accordion-item")).forEach(function (el) {
                if (!visible(el) || isClaimed(el)) return;
                var head = el.querySelector(".accordion-header, .accordion-button");
                if (!head || !visible(head) || !textOf(head)) return;
                var r = rectOf(el);
                if (r.w < 200 || r.h < 40) return;
                containers.push({ t: "section", x: r.x, y: r.y, w: r.w, h: r.h, caption: textOf(head), el: el, skip: head });
                claim(head);
            });
            Array.prototype.slice.call(doc.querySelectorAll("ul.nav-tabs, ul.nav-pills, ul[role=tablist]")).forEach(function (ul) {
                if (!visible(ul) || isClaimed(ul) || /dxtc/.test(ul.className || "")) return;
                var captions = [], active = 0;
                Array.prototype.slice.call(ul.querySelectorAll("li")).forEach(function (li) {
                    if (!visible(li) || !textOf(li)) return;
                    if (/\bactive\b/.test(li.className) || li.querySelector(".active")) active = captions.length;
                    captions.push(textOf(li));
                });
                var content = ul.parentElement.querySelector(".tab-content, .tab-pane");
                var host = content && visible(content) ? ul.parentElement : ul;
                var r = rectOf(host);
                if (!captions.length) return;
                containers.push({ t: "tabs", x: r.x, y: r.y, w: r.w, h: r.h, tabs: captions, active: active, el: host, skip: ul });
                claim(ul);
            });
            Array.prototype.slice.call(doc.querySelectorAll("tr")).forEach(function (row) {
                if (isClaimed(row) || !visible(row)) return;
                var cells = Array.prototype.slice.call(row.children).filter(function (cell) {
                    return /header-?cell/i.test(cell.className || "") || (cell.children.length === 1 && /header-?cell/i.test(cell.children[0].className || ""));
                }).filter(visible);
                if (cells.length < 3 || cells.length < row.children.length - 1) return;
                var table = row.closest("table");
                if (!table || isClaimed(table)) return;
                var columns = cells.map(function (cell) {
                    return { caption: textOf(cell), w: Math.max(30, Math.round(cell.getBoundingClientRect().width)) };
                }).filter(function (column) { return column.caption; });
                if (columns.length < 3) return;
                var r = rectOf(table);
                push({ t: "grid", x: r.x, y: r.y, w: r.w, h: r.h, title: "", filterRow: false, pager: false, checkbox: false, columns: columns, actions: [], toolbar: [], rows: 3, groupPanel: false, el: table });
                claim(table);
            });
            Array.prototype.slice.call(doc.querySelectorAll(".li-th")).forEach(function (head) {
                if (!visible(head) || isClaimed(head)) return;
                var table = null;
                for (var p = head.parentElement; p && p !== doc.body; p = p.parentElement) {
                    if (/(^|\s)dv-tbl(\s|$)/.test(p.className || "")) table = p;
                }
                if (!table) table = head.parentElement;
                if (!table || isClaimed(table)) return;
                var columns = [];
                var walker = doc.createTreeWalker(head, 4, null), node;
                while ((node = walker.nextNode())) {
                    var cell = node.parentElement;
                    var caption = scrub(node.nodeValue);
                    if (!caption || !cell || !visible(cell)) continue;
                    columns.push({ caption: caption, w: Math.max(30, Math.round(cell.getBoundingClientRect().width)) });
                }
                if (columns.length < 2) return;
                var rows = Array.prototype.slice.call(table.children).filter(function (row) {
                    return row !== head && !row.contains(head) && visible(row) && !row.querySelector("[data-languagekey='NoDataToDisplay']");
                }).length;
                var r = rectOf(table);
                push({ t: "grid", x: r.x, y: r.y, w: r.w, h: r.h, title: "", filterRow: false, pager: false, checkbox: false, columns: columns, actions: [], toolbar: [], rows: Math.max(1, Math.min(MAX_GRID_ROWS, rows)), groupPanel: false, el: table });
                claim(table);
            });
            Array.prototype.slice.call(doc.querySelectorAll("table")).forEach(function (table) {
                if (!visible(table) || isClaimed(table)) return;
                var headers = Array.prototype.slice.call(table.querySelectorAll("thead th, thead td"));
                if (headers.length < 2 || table.querySelector("table")) return;
                var wrapper = table.closest(".dataTables_wrapper, .table-responsive") || table;
                gridFromTable(wrapper, headers, false, !!(wrapper.querySelector(".pagination, .dataTables_paginate")), "", "tbody > tr");
            });
            Array.prototype.slice.call(doc.querySelectorAll(".input-group")).forEach(function (el) {
                if (!visible(el) || isClaimed(el)) return;
                var inputs = Array.prototype.slice.call(el.querySelectorAll("input, select, textarea, button, a")).filter(function (n) {
                    return n.type !== "hidden" && visible(n);
                });
                if (inputs.length !== 1 || inputs[0].tagName !== "INPUT" || /^(checkbox|radio|button|submit)$/.test(inputs[0].type) || textOf(el)) return;
                var marks = el.className + " " + Array.prototype.map.call(el.querySelectorAll("i, span"), function (n) { return n.className; }).join(" ");
                var kind = /calendar|datepicker|(^|\s)date(\s|$)/i.test(marks) ? "date" : inputs[0].type === "number" ? "number" : "text";
                var r = rectOf(el);
                push({ t: kind, x: r.x, y: r.y, w: r.w, h: r.h, caption: "", disabled: isDisabled(inputs[0]) || inputs[0].readOnly, el: el });
                claim(el);
            });
            Array.prototype.slice.call(doc.querySelectorAll(".select2-container, .bootstrap-select, .chosen-container, .cs-select-wrapper")).forEach(function (el) {
                if (!visible(el) || isClaimed(el)) return;
                var r = rectOf(el);
                var multiple = /--multiple|multiple/.test(el.className) || !!el.querySelector(".select2-selection--multiple");
                push({ t: multiple ? "multiselect" : "combo", x: r.x, y: r.y, w: r.w, h: r.h, caption: "", disabled: isDisabled(el), el: el });
                claim(el);
            });
            Array.prototype.slice.call(doc.querySelectorAll("input[type=checkbox], input[type=radio]")).forEach(function (el) {
                if (visible(el) || isClaimed(el)) return;
                var label = (el.id && doc.querySelector("label[for='" + el.id.replace(/'/g, "") + "']")) || el.closest("label");
                if (!label || !visible(label) || isClaimed(label)) return;
                var r = rectOf(label);
                push({ t: el.type, x: r.x, y: r.y, w: r.w, h: r.h, caption: textOf(label), disabled: isDisabled(el), el: label });
                claim(label);
            });
            Array.prototype.slice.call(doc.querySelectorAll(".label, .badge, [class*='label-'], [class*='badge-']")).forEach(function (el) {
                if (el.tagName === "LABEL" || !visible(el) || isClaimed(el)) return;
                var r = rectOf(el), cs = win.getComputedStyle(el);
                var text = textOf(el);
                var bg = hex(cs.backgroundColor);
                if (!text || text.length > 40 || !bg || bg === "#ffffff" || r.h > 40 || r.w > 260 || el.querySelector("input, select, button, table")) return;
                push({ t: "tag", x: r.x, y: r.y, w: r.w, h: r.h, text: text, bg: bg, fg: hex(cs.color), el: el });
                claim(el);
            });
            Array.prototype.slice.call(doc.querySelectorAll("a")).forEach(function (el) {
                if (!visible(el) || isClaimed(el) || el.closest("table, [role=tablist], .pagination")) return;
                var r = rectOf(el), cs = win.getComputedStyle(el);
                if (r.h < 18 || r.h > 64 || r.w < 24 || r.w > 420) return;
                var named = /(^|[\s_-])(btn|button)([\s_-]|$)/i.test(el.className || "");
                var boxed = isBoxed(cs);
                if (!named && !boxed) return;
                var text = textOf(el);
                if (!text || text.length > 60 || Array.prototype.some.call(el.querySelectorAll("input, select, table"), visible)) return;
                var link = buttonAtom(el, r, text, cs);
                link.flat = !boxed;
                link.icon = !!el.querySelector("i, svg, img, span[class*='icon']");
                push(link);
                claim(el);
            });
            Array.prototype.slice.call(doc.querySelectorAll("input, select, textarea, button, a.btn, div.btn, span.btn, label.btn, [role=button]")).forEach(function (el) {
                if (!visible(el) || isClaimed(el)) return;
                var tag = el.tagName, type = (el.getAttribute("type") || "").toLowerCase();
                var r = rectOf(el), cs = win.getComputedStyle(el);
                if (tag === "INPUT" && (type === "hidden" || type === "file" || type === "image")) return;
                var check = tag === "INPUT" && (type === "checkbox" || type === "radio");
                if (!check && (tag === "BUTTON" || tag === "A" || el.getAttribute("role") === "button" || /(^|\s)btn(\s|$)/.test(el.className || "") || (tag === "INPUT" && (type === "button" || type === "submit" || type === "reset")))) {
                    var text = tag === "INPUT" ? clean(el.value) : textOf(el);
                    if (!text && (structural || r.w < 20)) { if (structural) claim(el); return; }
                    if (tag !== "INPUT" && r.h > 64 && el.querySelectorAll("*").length >= 4) return;
                    var button = buttonAtom(el, r, text, cs);
                    button.flat = structural && tag === "BUTTON" && !isBoxed(cs);
                    push(button);
                } else if (tag === "INPUT" && (type === "checkbox" || type === "radio")) {
                    var label = (el.id && doc.querySelector("label[for='" + el.id.replace(/'/g, "") + "']")) || el.closest("label");
                    var lr = label && visible(label) ? rectOf(label) : null;
                    var left = Math.min(r.x, lr ? lr.x : r.x), right = Math.max(r.x + r.w, lr ? lr.x + lr.w : r.x + r.w);
                    var top = Math.min(r.y, lr ? lr.y : r.y), bottom = Math.max(r.y + r.h, lr ? lr.y + lr.h : r.y + r.h);
                    push({ t: type, x: left, y: top, w: right - left, h: bottom - top, caption: textOf(label), disabled: isDisabled(el), el: el });
                    if (label) claim(label);
                } else if (tag === "TEXTAREA") {
                    push({ t: "memo", x: r.x, y: r.y, w: r.w, h: r.h, caption: "", disabled: isDisabled(el) || el.readOnly, el: el });
                } else if (tag === "SELECT") {
                    push({ t: el.multiple ? "multiselect" : "combo", x: r.x, y: r.y, w: r.w, h: r.h, caption: "", disabled: isDisabled(el), el: el });
                } else {
                    var kind = type === "number" ? "number" : (type === "date" || /(^|[\s_-])(date|datepicker|calendar)([\s_-]|$)/i.test(el.className + " " + (el.parentElement ? el.parentElement.className : ""))) ? "date" : "text";
                    var shell = el.parentElement && /(^|\s)form-control(\s|$)/.test(el.parentElement.className || "") && visible(el.parentElement) ? el.parentElement : null;
                    if (shell) r = rectOf(shell);
                    push({ t: kind, x: r.x, y: r.y, w: r.w, h: r.h, caption: "", placeholder: clean(el.getAttribute("placeholder") || ""), disabled: isDisabled(el) || el.readOnly, el: shell || el });
                    if (shell) claim(shell);
                }
                claim(el);
            });
            var flat = atoms.filter(function (a) { return a.t === "button" && a.flat && a.el && a.el.parentElement; });
            var rows = [];
            flat.forEach(function (a) { if (rows.indexOf(a.el.parentElement) < 0) rows.push(a.el.parentElement); });
            rows.forEach(function (parent) {
                var items = flat.filter(function (a) { return a.el.parentElement === parent; }).sort(function (a, b) { return a.x - b.x; });
                if (items.length < 2 && !isPopupBar(parent)) return;
                var top = Math.min.apply(null, items.map(function (a) { return a.y; }));
                var bottom = Math.max.apply(null, items.map(function (a) { return a.y + a.h; }));
                if (bottom - top > 48) return;
                var right = Math.max.apply(null, items.map(function (a) { return a.x + a.w; }));
                atoms = atoms.filter(function (a) { return items.indexOf(a) < 0; });
                push({ t: "toolbar", x: items[0].x, y: top, w: right - items[0].x, h: bottom - top, buttons: items.map(function (a) { return { text: a.text }; }), el: parent });
                if (isPopupBar(parent)) joinHead(parent);
            });
        }

        function claimOutside(scope) {
            for (var el = scope; el && el !== doc.body && el.parentElement; el = el.parentElement) {
                Array.prototype.slice.call(el.parentElement.children).forEach(function (sibling) {
                    if (sibling !== el) claim(sibling);
                });
            }
        }

        function commonAncestor(el, other) {
            for (var p = el; p; p = p.parentElement) {
                if (p.contains(other)) return p;
            }
            return null;
        }

        function bottomIn(box, el) {
            return Math.round(el.getBoundingClientRect().bottom - box.getBoundingClientRect().top);
        }

        // Dải chứa tiêu đề của popup (cùng nút đóng) thuộc khung popup của Builder, không chụp lại.
        // head là chiều cao phần đầu riêng của popup trên trang: dải tiêu đề, cộng dải nút nằm kế ngay dưới nó (joinHead); popup không có
        // tiêu đề thì bằng 0. Tiêu đề không nằm trong một dải ở mép trên popup thì không biết phần đầu cao bao nhiêu và không ghi head.
        function popupBox(box) {
            var heading = dialogHeading(box);
            if (heading && !visible(heading)) heading = null;
            var bar = heading;
            while (bar && bar.parentElement !== box) bar = bar.parentElement;
            var band = bar;
            if (bar) {
                var top = bar.getBoundingClientRect().top - box.getBoundingClientRect().top;
                if (top > 12 || bar.getBoundingClientRect().height > 80) { bar = heading; band = null; }
            }
            var r = rectOf(box);
            planPopup = { t: "popup", x: r.x, y: r.y, w: r.w, h: r.h, title: heading ? textOf(heading) : clean(box.getAttribute("aria-label") || ""), el: box, modal: true, z: 0 };
            if (band || !heading) {
                planPopup.head = band ? bottomIn(box, band) : 0;
                planPopup.headEnd = band;
            }
            containers.push(planPopup);
            if (bar) claim(bar);
        }

        // Dải nút là phần tử nhìn thấy kế ngay sau dải tiêu đề của popup (hoặc là phần tử nhìn thấy đầu tiên khi popup không có tiêu đề)
        // thì thuộc phần đầu của popup. Chỉ một dải nút được tính.
        function joinHead(strip) {
            if (!planPopup || planPopup.head == null || planPopup.headBar) return;
            var before = strip.previousElementSibling;
            while (before && !visible(before)) before = before.previousElementSibling;
            if (before !== planPopup.headEnd) return;
            planPopup.head = bottomIn(planPopup.el, strip);
            planPopup.headBar = strip;
        }

        function collectRoleTabs() {
            Array.prototype.slice.call(doc.querySelectorAll("[role=tablist]")).forEach(function (strip) {
                if (isClaimed(strip) || !visible(strip)) return;
                var captions = [], active = -1, panel = null;
                Array.prototype.slice.call(strip.querySelectorAll("[role=tab]")).forEach(function (tab) {
                    var caption = visible(tab) ? textOf(tab) : "";
                    if (!caption) return;
                    if (active < 0 && isActiveTab(tab)) {
                        active = captions.length;
                        panel = doc.getElementById(tab.getAttribute("aria-controls") || "");
                    }
                    captions.push(caption);
                });
                if (!captions.length) return;
                var parent = strip.parentElement;
                var host = panel && visible(panel) ? commonAncestor(strip, panel) : null;
                if (!host || host === doc.body) host = parent && parent !== doc.body && rectOf(parent).h > rectOf(strip).h + 40 ? parent : strip;
                var r = rectOf(host);
                containers.push({ t: "tabs", x: r.x, y: r.y, w: r.w, h: r.h, tabs: captions, active: Math.max(0, active), el: host, skip: strip });
                claim(strip);
            });
        }

        // Một hàng của lưới dựng bằng thẻ thường (div, li, tr không có thead): từ 3 ô trở lên, ô sau nằm bên phải ô trước.
        function rowEdges(row) {
            var table = row.tagName === "TR" ? row.closest("table") : null;
            if ((table && table.tHead) || isClaimed(row) || !visible(row)) return null;
            var edges = [], last = -Infinity, shown = 0;
            for (var i = 0; i < row.children.length; i++) {
                var cell = row.children[i];
                if (!visible(cell)) { edges.push(null); continue; }
                var left = Math.round(cell.getBoundingClientRect().left);
                if (left <= last) return null;
                last = left;
                shown++;
                edges.push(left);
            }
            return shown >= 3 ? edges : null;
        }

        function sameEdges(edges, other) {
            return edges.length === other.length && edges.every(function (left, i) {
                return left === null ? other[i] === null : other[i] !== null && Math.abs(left - other[i]) <= 1;
            });
        }

        function rowPaint(row) {
            var own = hex(win.getComputedStyle(row).backgroundColor);
            if (own) return own;
            var cell = Array.prototype.slice.call(row.children).filter(visible)[0];
            return cell ? hex(win.getComputedStyle(cell).backgroundColor) : null;
        }

        function rowWeight(row) {
            var weight = 0;
            Array.prototype.slice.call(row.children).forEach(function (cell) {
                if (visible(cell) && /\S/.test(cell.textContent || "")) weight = Math.max(weight, parseInt(win.getComputedStyle(cell).fontWeight, 10) || 400);
            });
            return weight;
        }

        // Hàng tiêu đề: đa số ô có chữ, không có ô nhập, và trình bày khác hàng ngay dưới (nền khác, chữ đậm hơn) hoặc dùng th / role=columnheader.
        function isHeaderRow(row, next) {
            if (row.querySelector("input:not([type=checkbox]), select, textarea")) return false;
            var cells = Array.prototype.slice.call(row.children).filter(visible);
            var named = cells.filter(function (cell) { return /\S/.test(cell.textContent || ""); }).length;
            if (named < 2 || named < cells.length / 2) return false;
            if (cells.some(function (cell) { return cell.tagName === "TH" || cell.getAttribute("role") === "columnheader"; })) return true;
            return !!next && (rowPaint(row) !== rowPaint(next) || (rowWeight(row) >= 600 && rowWeight(next) < 600));
        }

        function isFilterRow(row) {
            return !!row && row.querySelectorAll("input[type=text], input[type=search], input:not([type]), select").length >= 2;
        }

        function soleWrapper(el) {
            var parent = el.parentElement;
            if (!parent || parent === doc.body) return null;
            return Array.prototype.slice.call(parent.children).filter(visible).length === 1 ? parent : null;
        }

        function pagerAfter(el) {
            var next = el.nextElementSibling;
            if (!next || isClaimed(next) || !visible(next)) return null;
            if (next.getBoundingClientRect().height > 80 || !/\d/.test(next.textContent || "")) return null;
            return next.querySelectorAll("button, a, [role=button]").length >= 2 ? next : null;
        }

        function collectRowGrids() {
            var groups = [];
            Array.prototype.slice.call(plan.scope.querySelectorAll("*")).forEach(function (row) {
                if (row.children.length < 3) return;
                var edges = rowEdges(row);
                if (!edges) return;
                var box = row.getBoundingClientRect();
                for (var i = groups.length - 1; i >= 0 && i >= groups.length - 8; i--) {
                    if (sameEdges(groups[i].edges, edges) && Math.abs(box.top - groups[i].bottom) <= 4) {
                        groups[i].rows.push(row);
                        groups[i].bottom = box.bottom;
                        return;
                    }
                }
                groups.push({ edges: edges, rows: [row], bottom: box.bottom });
            });
            groups.forEach(function (group) {
                var rows = group.rows.filter(function (row) { return !isClaimed(row); });
                if (rows.length < 2) return;
                var header = rows[0];
                var filter = isFilterRow(rows[1]) && !isFilterRow(rows[2]) ? rows[1] : null;
                var body = rows.slice(filter ? 2 : 1);
                if (!isHeaderRow(header, body[0] || filter)) return;
                var holder = rows.reduce(function (found, row) { return found && commonAncestor(found, row); }, header.parentElement);
                if (!holder || holder === doc.body || holder === plan.scope) return;
                var headerTop = header.getBoundingClientRect().top;
                var before = Array.prototype.slice.call(holder.children).some(function (child) {
                    if (rows.some(function (row) { return child === row || child.contains(row); }) || !visible(child)) return false;
                    return child.getBoundingClientRect().top < headerTop - 1;
                });
                if (before) return;
                var wrapper = soleWrapper(holder);
                var pager = pagerAfter(holder) || (wrapper ? pagerAfter(wrapper) : null);
                var grid = gridFromTable(holder, Array.prototype.slice.call(header.children), !!filter, !!pager, "", body);
                if (wrapper && wrapper.clientWidth < grid.w - 1) {
                    var frame = rectOf(wrapper);
                    var right = Math.min(grid.x + grid.w, frame.x + frame.w);
                    grid.x = Math.max(grid.x, frame.x);
                    grid.w = right - grid.x;
                }
                if (pager) {
                    var pr = rectOf(pager);
                    grid.h = Math.max(grid.h, pr.y + pr.h - grid.y);
                    claim(pager);
                }
            });
        }

        function isGray(color) {
            if (!color) return false;
            var rgb = channels(color);
            var high = Math.max.apply(null, rgb);
            return high - Math.min.apply(null, rgb) <= 8 && high >= 200 && high <= 246;
        }

        function hasEdgeIcon(el) {
            var last = el.lastElementChild;
            return !!last && /^(svg|i|img)$/i.test(last.tagName) && el.getBoundingClientRect().right - last.getBoundingClientRect().right <= 16;
        }

        // Ô nhập vẽ bằng thẻ thường: khung có viền đủ bốn cạnh, cao như một ô nhập, bên trong không có control hay khung nào khác.
        // Khung ôm sát chữ của nó là nhãn hay thẻ trạng thái, không phải ô nhập.
        function collectBoxFields() {
            Array.prototype.slice.call(plan.scope.querySelectorAll("span, div, label, p")).forEach(function (el) {
                if (!isBordered(el) || isClaimed(el) || !visible(el)) return;
                var r = rectOf(el);
                if (r.w < 40 || r.h < 18 || r.h > 120) return;
                if (el.closest("button, a, [role=button], [role=tab]") || el.querySelector("input, select, textarea, button, table, a")) return;
                if (Array.prototype.some.call(el.querySelectorAll("*"), isBordered)) return;
                var shown = clean(el.textContent);
                if (shown.length > 80) return;
                var caret = CARET_MARK.test(shown) || hasEdgeIcon(el);
                var value = shown.replace(CARET_MARK, "");
                var cs = win.getComputedStyle(el);
                var kind = DATE_VALUE.test(value) ? "date" : caret ? "combo" : r.h > 48 ? "memo" : "text";
                if (kind === "memo" && el.children.length) return;
                if (kind === "text" && value) {
                    if (cs.cursor === "pointer") {
                        push(buttonAtom(el, r, value, cs));
                        claim(el);
                        return;
                    }
                    var range = doc.createRange();
                    range.selectNodeContents(el);
                    if (r.w - range.getBoundingClientRect().width < 40) return;
                }
                var disabled = isDisabled(el) || el.getAttribute("aria-readonly") === "true" || isGray(hex(cs.backgroundColor));
                push({ t: kind, x: r.x, y: r.y, w: r.w, h: r.h, caption: "", disabled: disabled, el: el });
                claim(el);
            });
        }

        // Dải tiêu đề của một khung: con đầu tiên, nằm sát mép trên, rộng bằng khung, có nền riêng hoặc đường kẻ dưới.
        function headingBar(el) {
            var bar = el.firstElementChild;
            if (!bar || isClaimed(bar) || !visible(bar)) return null;
            var box = el.getBoundingClientRect(), own = bar.getBoundingClientRect();
            if (own.top - box.top > 6 || own.width < box.width - 12 || own.height > 64 || own.height > box.height - 8) return null;
            var cs = win.getComputedStyle(bar);
            var paint = hex(cs.backgroundColor);
            var ruled = parseFloat(cs.borderBottomWidth) >= 1 && cs.borderBottomStyle !== "none";
            return ruled || (paint && paint !== hex(win.getComputedStyle(el).backgroundColor)) ? bar : null;
        }

        // Dải nút phẳng nằm ngay trong hộp popup là thanh nút của popup, kể cả khi chỉ có một nút; nó không thuộc lưới nào bên dưới.
        function isPopupBar(el) {
            return structural && !!plan.popup && !!el && el.parentElement === plan.popup;
        }

        function collectStructure() {
            claimOutside(plan.scope);
            (plan.ignore || []).forEach(claim);
            Array.prototype.slice.call(doc.querySelectorAll("nav, [role=navigation], [role=banner], body > header, body > footer, body > aside")).forEach(function (el) {
                if (!el.contains(plan.scope) && !el.querySelector("[role=tablist]")) claim(el);
            });
            if (plan.popup) popupBox(plan.popup);
            collectRoleTabs();
            collectRowGrids();
            collectBoxFields();
        }

        function hasFrame(el) {
            var cs = win.getComputedStyle(el);
            var sides = 0;
            ["Top", "Right", "Bottom", "Left"].forEach(function (side) {
                var color = cs["border" + side + "Color"] || "";
                if (parseFloat(cs["border" + side + "Width"]) >= 1 && cs["border" + side + "Style"] !== "none" && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(color)) sides++;
            });
            return sides >= 3 || (cs.boxShadow && cs.boxShadow !== "none");
        }

        function isBordered(el) {
            var cs = win.getComputedStyle(el);
            return ["Top", "Right", "Bottom", "Left"].every(function (side) {
                return parseFloat(cs["border" + side + "Width"]) >= 1 && cs["border" + side + "Style"] !== "none";
            });
        }

        function isCard(el) {
            return isBordered(el) && parseFloat(win.getComputedStyle(el).borderTopLeftRadius) >= 2;
        }

        // Nút có nền màu hoặc có viền trên dưới; nút không có cả hai là nút phẳng (kiểu nút của thanh công cụ).
        function isBoxed(cs) {
            var bg = hex(cs.backgroundColor);
            return !!bg && bg !== "#ffffff" || (parseFloat(cs.borderTopWidth) >= 1 && parseFloat(cs.borderBottomWidth) >= 1 && cs.borderTopStyle !== "none");
        }

        // bar: dải tiêu đề của khung (headingBar), chữ đầu tiên trong dải là tiêu đề dù không in đậm.
        function boxHeading(el, bar) {
            var top = el.getBoundingClientRect().top;
            var walker = doc.createTreeWalker(el, 4, null);
            var node;
            while ((node = walker.nextNode())) {
                var parent = node.parentElement;
                if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(parent.tagName)) continue;
                if (!/\S/.test(node.nodeValue) || !visible(parent)) continue;
                var box = parent.getBoundingClientRect();
                var value = clean(node.nodeValue);
                var strong = /^H[1-6]$/.test(parent.tagName) || parseInt(win.getComputedStyle(parent).fontWeight, 10) >= 600 || /title|header|heading/i.test(parent.className || "") || (!!bar && bar.contains(parent));
                if (parent.tagName === "LABEL" || isClaimed(parent) || !strong || box.top - top > 60 || value.length < 2 || value.length > 80 || sampleFor(parent, value)) return null;
                return { text: scrub(value), node: node };
            }
            return null;
        }

        // Khung chỉ bọc một lưới (cùng tiêu đề và thanh nút của lưới đó) là khung của chính lưới: lưới Core tự có thanh tiêu đề và thanh nút,
        // nên không dựng thêm một khối chứa; tiêu đề và nút được gộp vào lưới ở foldGridHeaders.
        function framesOneGrid(el, bar, inside) {
            var body = inside.filter(function (a) { return !(bar && bar.contains(a.el)); });
            if (body.length !== 1 || body[0].t !== "grid") return false;
            return !containers.some(function (c) { return c.el !== el && el.contains(c.el); });
        }

        function collectFramedBoxes() {
            var found = [];
            Array.prototype.slice.call(doc.querySelectorAll("div, section, article, li, a, button")).forEach(function (el) {
                if (isClaimed(el) || !visible(el)) return;
                if (containers.some(function (c) { return c.el === el; })) return;
                var r = rectOf(el);
                if (r.w < 180 || r.h < 44 || !hasFrame(el)) return;
                if ((r.h < 70 || (ui !== "ess" && !structural)) && !isCard(el)) return;
                var bar = structural ? headingBar(el) : null;
                var inside = atoms.filter(function (a) { return a.el && el.contains(a.el); });
                var heading = boxHeading(el, bar);
                if (!heading && !inside.length && !/\S/.test(el.textContent || "")) return;
                if (structural && framesOneGrid(el, bar, inside) && (ui === "core" || !heading)) return;
                found.push({ el: el, r: r, heading: heading });
            });
            found.forEach(function (item) {
                var nested = found.some(function (other) { return other !== item && item.el.contains(other.el); }) ||
                    containers.some(function (c) { return c.t !== "splitter" && item.el.contains(c.el); });
                if (!item.heading && nested) return;
                if (!item.heading) {
                    var holder = null;
                    containers.forEach(function (c) {
                        if (c.t === "splitter") return;
                        if (c.el !== item.el && c.el.contains(item.el) && (!holder || holder.el.contains(c.el))) holder = c;
                    });
                    if (holder && item.r.w * item.r.h >= holder.w * holder.h * 0.75) return;
                }
                containers.push({
                    t: item.heading ? "section" : "group", x: item.r.x, y: item.r.y, w: item.r.w, h: item.r.h,
                    caption: item.heading ? item.heading.text : "", el: item.el, skipNodes: item.heading ? [item.heading.node] : []
                });
            });
        }

        function collectText() {
            var skipEls = containers.map(function (c) { return c.skip; }).filter(Boolean);
            var skipNodes = [];
            containers.forEach(function (c) { if (c.skipNodes) skipNodes = skipNodes.concat(c.skipNodes); });
            var walker = doc.createTreeWalker(doc.body, 4, null);
            var node;
            while ((node = walker.nextNode())) {
                var raw = node.nodeValue;
                if (!raw || !/\S/.test(raw)) continue;
                var parent = node.parentElement;
                if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(parent.tagName)) continue;
                if (isClaimed(parent) || !visible(parent)) continue;
                if (skipEls.some(function (s) { return s === parent || s.contains(parent); })) continue;
                if (skipNodes.indexOf(node) >= 0) continue;
                var text = scrub(raw);
                if (!text || text.length < 2 && !/[A-Za-z0-9*]/.test(text)) continue;
                var sample = sampleFor(parent, text);
                if (sample) text = sample;
                if (/(^|\s)required?(\s|$)/.test(parent.className || "") || /\*/.test(win.getComputedStyle(parent, "::after").content || "")) text += " (*)";
                var range = doc.createRange();
                range.selectNodeContents(node);
                var rr = range.getBoundingClientRect();
                if (rr.width < 2 || rr.height < 2) continue;
                var cs = win.getComputedStyle(parent);
                push({ t: "label", x: Math.round(rr.left + scrollX), y: Math.round(rr.top + scrollY), w: Math.round(rr.width), h: Math.round(rr.height), text: text, bold: parseInt(cs.fontWeight, 10) >= 600, el: parent });
            }
        }

        function dropFloating() {
            var floating = atoms.filter(function (a) {
                if (!a.el) return false;
                for (var p = a.el; p && p !== doc.body; p = p.parentElement) {
                    if (win.getComputedStyle(p).position === "fixed") return p.getBoundingClientRect().top > win.innerHeight / 2;
                }
                return false;
            });
            if (!floating.length) return;
            var staticBottom = 0, floatTop = Infinity;
            atoms.concat(containers).forEach(function (n) {
                if (floating.indexOf(n) < 0) staticBottom = Math.max(staticBottom, n.y + n.h);
                else floatTop = Math.min(floatTop, n.y);
            });
            var drop = staticBottom + 16 - floatTop;
            if (drop > 0) floating.forEach(function (a) { a.y += drop; });
        }

        function dropShadowed() {
            var buttons = atoms.filter(function (a) { return a.t === "button"; });
            atoms = atoms.filter(function (a) {
                if (a.t !== "text" || a.w >= 40) return true;
                return !buttons.some(function (b) {
                    var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
                    var h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
                    return w > 0 && h > 0 && w * h >= a.w * a.h * 0.5;
                });
            });
        }

        function mergeRequiredMarks() {
            var marks = atoms.filter(function (a) { return a.t === "label" && /^[(\[]?\*[)\]]?\s*:?$/.test(a.text); });
            marks.forEach(function (mark) {
                var owner = null, ownerGap = Infinity;
                atoms.forEach(function (lb) {
                    if (lb === mark || lb.t !== "label" || marks.indexOf(lb) >= 0) return;
                    var overlap = Math.min(lb.y + lb.h, mark.y + mark.h) - Math.max(lb.y, mark.y);
                    var gap = mark.x - (lb.x + lb.w);
                    var inside = lb.h > mark.h * 1.5 && mark.x >= lb.x && gap < 0;
                    var distance = inside ? 0 : gap;
                    if (overlap >= Math.min(lb.h, mark.h) * 0.5 && (inside || gap >= -2) && gap <= 14 && distance < ownerGap) { owner = lb; ownerGap = distance; }
                });
                var wrapped = false;
                if (!owner) {
                    atoms.forEach(function (lb) {
                        if (lb === mark || lb.t !== "label" || marks.indexOf(lb) >= 0) return;
                        var below = mark.y - (lb.y + lb.h);
                        if (below >= -4 && below <= 6 && mark.x >= lb.x - 4 && mark.x <= lb.x + lb.w && below < ownerGap) { owner = lb; ownerGap = below; wrapped = true; }
                    });
                }
                if (!owner) return;
                owner.text = owner.text + " (*)";
                if (wrapped) owner.h = mark.y + mark.h - owner.y;
                else owner.w = Math.max(owner.w, mark.x + mark.w - owner.x);
                mark.merged = true;
            });
            atoms = atoms.filter(function (a) { return !a.merged && !(a.t === "label" && a.text === "*"); });
        }

        function pairCaptions() {
            mergeRequiredMarks();
            var labels = atoms.filter(function (a) { return a.t === "label"; });
            var editors = atoms.filter(function (a) { return /^(text|number|date|combo|multiselect|memo)$/.test(a.t); });
            editors.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
            editors.forEach(function (ed) {
                var best = null, bestGap = Infinity;
                labels.forEach(function (lb) {
                    if (lb.used) return;
                    var overlap = Math.min(lb.y + lb.h, ed.y + (ed.t === "memo" ? ed.h : Math.min(ed.h, 30))) - Math.max(lb.y, ed.y);
                    var gap = ed.x - (lb.x + lb.w);
                    if (overlap >= Math.min(lb.h, 10) * 0.5 && gap >= -2 && gap <= 320 && gap < bestGap) {
                        var blocked = atoms.some(function (o) {
                            return o !== ed && o !== lb && o.t !== "label" && o.x >= lb.x + lb.w - 2 && o.x + o.w <= ed.x + 2 && Math.min(o.y + o.h, ed.y + ed.h) - Math.max(o.y, ed.y) > 4;
                        });
                        if (!blocked) { best = lb; bestGap = gap; }
                    }
                });
                if (best) {
                    var left = splitRequired(best.text);
                    ed.caption = left.caption; ed.required = left.required; ed.labelX = best.x;
                    best.used = true;
                    return;
                }
                labels.forEach(function (lb) {
                    if (lb.used) return;
                    var gapY = ed.y - (lb.y + lb.h);
                    if (gapY >= -2 && gapY <= 14 && Math.abs(lb.x - ed.x) <= 12 && gapY < bestGap) { best = lb; bestGap = gapY; }
                });
                if (best) {
                    var above = splitRequired(best.text);
                    ed.caption = above.caption; ed.required = above.required;
                    ed.captionAbove = true; ed.labelX = best.x; ed.labelY = best.y; ed.labelW = best.w; ed.labelH = best.h;
                    best.used = true;
                }
            });
            atoms = atoms.filter(function (a) { return !(a.t === "label" && a.used); });
        }

        function foldGridHeaders(list) {
            var removed = [];
            list.filter(function (n) { return n.t === "grid"; }).forEach(function (grid) {
                var above = list.filter(function (n) {
                    return n !== grid && removed.indexOf(n) < 0 && !n.children &&
                        n.y >= grid.y - 90 && n.y + n.h <= grid.y + 6 && n.x + n.w > grid.x - 8 && n.x < grid.x + grid.w + 8;
                });
                if (!above.length) return;
                function foldable(n) {
                    return (n.t === "toolbar" && !isPopupBar(n.el)) || n.t === "label" || (n.t === "combo" && /^(view data|applied for|local data language)$/i.test(n.caption || ""));
                }
                var blockers = above.filter(function (n) { return !foldable(n); });
                var limit = blockers.length ? Math.max.apply(null, blockers.map(function (n) { return n.y + n.h; })) : -Infinity;
                var candidates = above.filter(function (n) { return foldable(n) && n.y >= limit - 2; });
                var toolbar = candidates.filter(function (n) { return n.t === "toolbar"; }).sort(function (a, b) { return b.y - a.y; })[0];
                var used = [];
                if (toolbar && ui === "ess" && !(toolbar.buttons.length === 1 && /^add\b/i.test(toolbar.buttons[0].text))) toolbar = null;
                if (toolbar) { grid.toolbar = (grid.toolbar || []).concat(toolbar.buttons); used.push(toolbar); }
                candidates.forEach(function (n) {
                    var caption = (n.caption || "").toLowerCase();
                    if (n.t === "combo" && caption === "view data") { grid.viewData = true; used.push(n); }
                    else if (n.t === "combo" && caption === "local data language") { grid.language = true; used.push(n); }
                    else if (n.t === "label" && toolbar && !grid.title && n.x < toolbar.x && Math.abs((n.y + n.h / 2) - (toolbar.y + toolbar.h / 2)) <= 12) { grid.title = n.text; used.push(n); }
                });
                if (grid.viewData) {
                    candidates.forEach(function (n) { if (n.t === "combo" && /^applied for$/i.test(n.caption || "")) used.push(n); });
                }
                if (!grid.title && ui === "core") {
                    var heading = candidates.filter(function (n) {
                        var gap = grid.y - (n.y + n.h);
                        return n.t === "label" && used.indexOf(n) < 0 && n.h <= 24 && gap >= -2 && gap <= 14 && Math.abs(n.x - grid.x) <= 16;
                    }).sort(function (a, b) { return b.y - a.y; })[0];
                    if (heading) { grid.title = heading.text; used.push(heading); }
                }
                if (!used.length) return;
                var top = grid.y;
                used.forEach(function (n) { removed.push(n); top = Math.min(top, n.y); });
                grid.h += grid.y - top;
                grid.y = top;
            });
            return list.filter(function (n) { return removed.indexOf(n) < 0; });
        }

        function build() {
            var boxes = containers.slice();
            function depthOf(el) {
                var depth = 0;
                for (var p = el; p; p = p.parentElement) depth++;
                return depth;
            }
            boxes.forEach(function (c) { c.children = []; c.depth = depthOf(c.el) + (c.rank || 0); });
            function holds(box, el) {
                if (!box.cells) return box.el.contains(el);
                return box.cells.some(function (cell) { return cell.contains(el); });
            }
            function parentOf(item, isBox) {
                var best = null;
                if (!item.el) return null;
                for (var i = 0; i < boxes.length; i++) {
                    var c = boxes[i];
                    if (c === item || (isBox && c.el === item.el)) continue;
                    if (holds(c, item.el) && (!best || c.depth > best.depth)) best = c;
                }
                return best;
            }
            var roots = [];
            function nest(item, isBox) {
                var p = parentOf(item, isBox);
                if (p && p.cells) item.pane = p.cells[0].contains(item.el) ? 0 : 1;
                (p ? p.children : roots).push(item);
            }
            atoms.forEach(function (a) { nest(a, false); });
            boxes.forEach(function (c) { nest(c, true); });
            roots = foldGridHeaders(roots);
            boxes.forEach(function (c) { c.children = foldGridHeaders(c.children); });
            boxes.slice().sort(function (a, b) { return b.depth - a.depth; }).forEach(function (c) {
                if (c.t === "splitter") return;
                var left = c.x, top = c.y, right = c.x + c.w, bottom = c.y + c.h;
                c.children.forEach(function (k) {
                    left = Math.min(left, k.x); top = Math.min(top, k.y);
                    right = Math.max(right, k.x + k.w); bottom = Math.max(bottom, k.y + k.h);
                });
                if (bottom > c.y + c.h) bottom += 8;
                if (right > c.x + c.w) right += 8;
                if (c.head != null) c.head += c.y - top;
                c.x = left; c.y = top; c.w = right - left; c.h = bottom - top;
            });

            var modals = roots.filter(function (n) { return n.t === "popup" && n.modal; });
            if (modals.length) {
                roots = [modals.reduce(function (best, n) { return n.z >= best.z ? n : best; })];
            }
            var minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
            (function measure(list) {
                list.forEach(function (n) {
                    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
                    maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
                    if (n.children) measure(n.children);
                });
            })(roots);
            if (!isFinite(minX)) { minX = 0; minY = 0; }

            function out(n, tabIndex) {
                var o = { t: n.t, x: n.x - minX, y: n.y - minY, w: n.w, h: n.h };
                if (tabIndex != null) o.tab = tabIndex;
                if (n.pane != null) o.pane = n.pane;
                if (n.t === "splitter") { o.split = n.split; o.bar = n.bar; }
                if (n.t === "popup" && n.head != null) o.head = n.head;
                ["caption", "text", "title", "placeholder"].forEach(function (k) { if (n[k]) o[k] = n[k]; });
                ["required", "disabled", "captionAbove", "bold", "filterRow", "pager", "checkbox", "groupPanel", "viewData", "language", "vertical"].forEach(function (k) { if (n[k] === true) o[k] = true; });
                if (n.t === "grid" && n.rows) o.rows = n.rows;
                if (n.data) o.data = n.data;
                if (n.t === "tree") {
                    o.check = n.check; o.rowHeight = n.rowHeight; o.indent = n.indent; o.items = n.items;
                    if (n.header) o.header = true;
                    if (n.scroll) o.scroll = true;
                }
                if (n.labelX != null) o.labelX = n.labelX - minX;
                if (n.labelY != null) o.labelY = n.labelY - minY;
                if (n.labelW != null) o.labelW = n.labelW;
                if (n.labelH != null) o.labelH = n.labelH;
                ["bg", "fg", "border"].forEach(function (k) { if (n[k]) o[k] = n[k]; });
                if (n.columns) o.columns = n.columns;
                if (n.actions) o.actions = n.actions;
                if (n.toolbar) o.toolbar = n.toolbar;
                if (n.buttons) o.buttons = n.buttons;
                if (n.tabs) { o.tabs = n.tabs; o.active = n.active || 0; }
                if (n.children) {
                    var index = n.t === "tabs" ? (n.active || 0) : null;
                    o.children = n.children.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }).map(function (k) { return out(k, index); });
                }
                return o;
            }
            roots.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
            return { nodes: roots.map(function (k) { return out(k, null); }), width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY), left: minX - scrollX, top: minY - scrollY };
        }

        Array.prototype.slice.call(doc.querySelectorAll("[data-ba-capture-ignore]")).forEach(claim);
        if (structural) collectStructure();
        if (ui === "core") collectDevExpress();
        collectSplitters();
        collectPlain();
        collectFramedBoxes();
        collectText();
        dropFloating();
        dropShadowed();
        pairCaptions();
        var built = build();
        return { kind: "ba-screen", v: 1, ui: ui, title: clean(doc.title), width: built.width, height: built.height, nodes: built.nodes, origin: { x: built.left, y: built.top } };
    }

    function hasContent(doc) {
        if (!doc.body || !doc.body.children.length) return false;
        if (doc.querySelector("input:not([type=hidden]), select, textarea, button, table, iframe")) return true;
        return /\S/.test(doc.body.innerText || doc.body.textContent || "");
    }

    function largestFrame(doc) {
        var best = null, bestArea = 0, bestFrame = null;
        Array.prototype.slice.call(doc.querySelectorAll("iframe")).forEach(function (frame) {
            try {
                var inner = frame.contentDocument;
                var r = frame.getBoundingClientRect();
                if (inner && inner.body && hasContent(inner) && r.width * r.height > bestArea && r.width > 300 && r.height > 200) { best = inner; bestArea = r.width * r.height; bestFrame = frame; }
            } catch (e) { }
        });
        return best ? { doc: best, area: bestArea, el: bestFrame } : null;
    }

    function shown(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        var style = el.ownerDocument.defaultView.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function hasDevExpress(doc) {
        var list = doc.querySelectorAll("[class*='dxgvControl'], [class*='dxtlControl'], [class*='dxeTextBox'], [class*='dxeButtonEdit'], [class*='dxeMemo'], [class*='dxmLite'], [class*='dxtcLite'], [class*='dxbButton'], [class*='dxrpControl'], [class*='dxeBase']");
        for (var i = 0; i < list.length; i++) {
            if (shown(list[i])) return true;
        }
        return false;
    }

    function modalPopup(doc) {
        var view = doc.defaultView;
        var found = null, foundArea = 0, foundZ = -Infinity;
        Array.prototype.slice.call(doc.querySelectorAll("[class*='dxpcLite']")).forEach(function (el) {
            if (/dxpcDropDown/.test(el.className || "") || !shown(el)) return;
            var box = el.querySelector(".dxpc-mainDiv") || el;
            if (!shown(box)) return;
            var r = box.getBoundingClientRect();
            if (r.width < 120 || r.height < 60) return;
            var back = el.id ? doc.getElementById(el.id.replace(/_PW-?\d+$/, "") + "_DXPWMB-1") : null;
            var area = r.width * r.height;
            if (!shown(back) && area < view.innerWidth * view.innerHeight * 0.3) return;
            var z = parseInt(view.getComputedStyle(el).zIndex, 10) || 0;
            if (z >= foundZ) { found = box; foundArea = area; foundZ = z; }
        });
        return found ? { el: found, area: foundArea } : null;
    }

    function pickTarget(rootDoc) {
        var current = rootDoc, host = null;
        for (var depth = 0; depth < 4; depth++) {
            var view = current.defaultView;
            var popup = modalPopup(current);
            var frame = largestFrame(popup ? popup.el : current);
            if (!frame) break;
            var share = frame.area / (popup ? popup.area : view.innerWidth * view.innerHeight);
            var shell = !popup && !!frame.el.closest(".ui-tabs-panel");
            if (share < (popup || shell ? 0.4 : 0.7)) break;
            host = popup ? { popup: popup.el, frame: frame.el } : null;
            current = frame.doc;
        }
        return { doc: current, host: host };
    }

    function embeddedFrames(doc) {
        var list = [];
        Array.prototype.slice.call(doc.querySelectorAll("iframe")).forEach(function (frame) {
            try {
                var inner = frame.contentDocument, r = frame.getBoundingClientRect();
                if (!inner || !inner.body || !shown(frame) || r.width < 300 || r.height < 150 || !hasContent(inner)) return;
                if (frame.closest("[class*='dxpcLite']")) return;
                list.push({ doc: inner, rect: r });
            } catch (e) { }
        });
        return list;
    }

    function shiftNodes(nodes, dx, dy) {
        nodes.forEach(function (n) {
            n.x += dx; n.y += dy;
            if (n.labelX != null) n.labelX += dx;
            if (n.labelY != null) n.labelY += dy;
            if (n.children) shiftNodes(n.children, dx, dy);
        });
    }

    function extentOf(nodes, deep) {
        var e = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        (function measure(list) {
            list.forEach(function (n) {
                e.x0 = Math.min(e.x0, n.x, n.labelX != null ? n.labelX : n.x);
                e.y0 = Math.min(e.y0, n.y, n.labelY != null ? n.labelY : n.y);
                e.x1 = Math.max(e.x1, n.x + n.w);
                e.y1 = Math.max(e.y1, n.y + n.h);
                if (deep && n.children) measure(n.children);
            });
        })(nodes);
        return e;
    }

    function fitToNodes(screen) {
        var e = extentOf(screen.nodes, true);
        if (!isFinite(e.x0)) return;
        if (e.x0 || e.y0) {
            shiftNodes(screen.nodes, -e.x0, -e.y0);
            if (screen.origin) { screen.origin.x += e.x0; screen.origin.y += e.y0; }
        }
        screen.width = Math.max(1, e.x1 - e.x0);
        screen.height = Math.max(1, e.y1 - e.y0);
    }

    function containerAt(nodes, box) {
        var found = null;
        nodes.forEach(function (n) {
            if (found || !n.children || n.t === "grid") return;
            if (box.x >= n.x - 6 && box.y >= n.y - 6 && box.x + box.w <= n.x + n.w + 6 && box.y + box.h <= n.y + n.h + 6) found = containerAt(n.children, box) || n;
        });
        return found;
    }

    function paneAt(splitter, box) {
        var middle = splitter.vertical ? box.x + box.w / 2 - splitter.x : box.y + box.h / 2 - splitter.y;
        return middle < splitter.split + splitter.bar / 2 ? 0 : 1;
    }

    function uiOf(doc, options) {
        var win = doc.defaultView;
        var isEss = /\/ESS|IsESS=true/i.test(win.location.pathname + win.location.search);
        return options.ui || (win.ASPxClientControl && win.ASPxClientControl.GetControlCollection && !isEss && hasDevExpress(doc) ? "core" : "ess");
    }

    function captureWithFrames(doc, options, depth, withData) {
        var screen = captureDocument(doc, uiOf(doc, options), withData);
        if (depth >= 2 || modalPopup(doc)) return screen;
        embeddedFrames(doc).forEach(function (frame) {
            var sub = captureWithFrames(frame.doc, options, depth + 1, withData);
            if (!sub.nodes.length) return;
            var dx = Math.round(frame.rect.left + sub.origin.x - screen.origin.x), dy = Math.round(frame.rect.top + sub.origin.y - screen.origin.y);
            shiftNodes(sub.nodes, dx, dy);
            var box = { x: Math.round(frame.rect.left - screen.origin.x), y: Math.round(frame.rect.top - screen.origin.y), w: Math.round(frame.rect.width), h: Math.round(frame.rect.height) };
            var home = containerAt(screen.nodes, box);
            sub.nodes.forEach(function (n) {
                if (home && home.t === "tabs") n.tab = home.active || 0;
                if (home && home.t === "splitter") n.pane = paneAt(home, box);
                (home ? home.children : screen.nodes).push(n);
            });
        });
        fitToNodes(screen);
        return screen;
    }

    function pickDocument(rootDoc) {
        return pickTarget(rootDoc).doc;
    }

    var lastView = null;

    function viewAt(doc, left, top) {
        var view = doc.defaultView;
        return { doc: doc, x: left + (view.pageXOffset || 0), y: top + (view.pageYOffset || 0) };
    }

    function wrapInPopup(screen, host, origin) {
        var box = host.popup.getBoundingClientRect(), frame = host.frame.getBoundingClientRect();
        var header = host.popup.querySelector(".dxpc-headerText, .dxpc-header");
        var dx = Math.round(frame.left - box.left + origin.x), dy = Math.round(frame.top - box.top + origin.y);
        shiftNodes(screen.nodes, dx, dy);
        screen.nodes = [{ t: "popup", x: 0, y: 0, w: Math.round(box.width), h: Math.round(box.height), title: clean(header ? header.textContent : ""), children: screen.nodes }];
        screen.width = Math.round(box.width);
        screen.height = Math.round(box.height);
    }

    function hostTabTitle(doc) {
        var frame = null;
        try { frame = doc.defaultView.frameElement; } catch (e) { frame = null; }
        while (frame) {
            var panel = frame.closest(".ui-tabs-panel");
            if (panel && panel.id) {
                var anchor = frame.ownerDocument.querySelector(".ui-tabs-nav a[href='#" + panel.id.replace(/[^\w-]/g, "") + "']");
                if (anchor && clean(anchor.textContent)) return clean(anchor.textContent);
            }
            try { frame = frame.ownerDocument.defaultView.frameElement; } catch (e2) { frame = null; }
        }
        return "";
    }

    function firstNamed(nodes) {
        var queue = (nodes || []).slice();
        while (queue.length) {
            var node = queue.shift();
            if ((node.t === "grid" || node.t === "popup") && node.title) return node.title;
            if ((node.t === "section" || node.t === "group") && node.caption) return node.caption;
            if (node.children) queue = queue.concat(node.children);
        }
        return "";
    }

    global.__baCapture = function (options) {
        options = options || {};
        var target = options.document ? { doc: options.document, host: options.host || null } : pickTarget(document);
        var doc = target.doc;
        var screen = captureWithFrames(doc, options, 0, options.gridData === true && uiOf(doc, options) === "core");
        var origin = screen.origin;
        delete screen.origin;
        lastView = viewAt(doc, origin.x, origin.y);
        if (target.host && !(screen.nodes.length === 1 && screen.nodes[0].t === "popup")) {
            wrapInPopup(screen, target.host, origin);
            var shell = target.host.popup.getBoundingClientRect();
            lastView = viewAt(target.host.popup.ownerDocument, shell.left, shell.top);
        }
        if (options.title) screen.title = clean(options.title);
        else if (screen.nodes.length === 1 && screen.nodes[0].t === "popup" && screen.nodes[0].title) screen.title = screen.nodes[0].title;
        if (!screen.title) {
            var crumbSelector = "[class*='Breadcrumb'] li, [class*='breadcrumb'] li";
            var crumbs = document.querySelectorAll(crumbSelector);
            if (!crumbs.length) crumbs = doc.querySelectorAll(crumbSelector);
            if (crumbs.length) screen.title = clean(crumbs[crumbs.length - 1].textContent);
        }
        if (!screen.title) screen.title = hostTabTitle(doc);
        if (!screen.title) {
            var named = firstNamed(screen.nodes);
            screen.title = named || clean(document.title);
        }
        return screen;
    };

    function tabNodes(nodes, list) {
        (nodes || []).forEach(function (node) {
            if (node.t === "tabs" && Array.isArray(node.tabs)) list.push(node);
            if (node.children) tabNodes(node.children, list);
        });
        return list;
    }

    function tabOf(child, owner) {
        return child.tab == null ? (owner.active || 0) : child.tab;
    }

    global.__baMergeTabs = function (screens) {
        if (!Array.isArray(screens) || !screens.length) throw new Error("no capture to merge");
        var base = JSON.parse(JSON.stringify(screens[0]));
        screens.slice(1).forEach(function (other) {
            var targets = tabNodes(base.nodes, []);
            var used = [];
            tabNodes(other.nodes, []).forEach(function (source) {
                var key = source.tabs.join("\u0001");
                var target = targets.filter(function (t) { return used.indexOf(t) < 0 && t.tabs.join("\u0001") === key; })[0];
                if (!target) return;
                used.push(target);
                var have = {};
                (target.children || []).forEach(function (child) { have[tabOf(child, target)] = true; });
                var add = (source.children || []).filter(function (child) { return !have[tabOf(child, source)]; });
                if (!add.length) return;
                target.children = (target.children || []).concat(JSON.parse(JSON.stringify(add)).map(function (child) {
                    child.tab = tabOf(child, source);
                    return child;
                }));
                target.w = Math.max(target.w, source.w);
                target.h = Math.max(target.h, source.h);
            });
            base.width = Math.max(base.width, other.width);
            base.height = Math.max(base.height, other.height);
        });
        return base;
    };

    function partsOf(screen) {
        var parts = [];
        function add(part) {
            part.id = parts.length;
            parts.push(part);
            return part;
        }
        function byPlace(nodes) {
            return nodes.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; });
        }
        function walk(nodes, owner, top) {
            var loose = [];
            function visit(node) {
                if (node.t === "grid" || node.t === "tree") {
                    add({ kind: node.t, node: node, owner: owner });
                } else if (node.t === "tabs") {
                    node.tabs.forEach(function (caption, index) {
                        var members = (node.children || []).filter(function (child) { return tabOf(child, node) === index; });
                        if (members.length) walk(members, add({ kind: "tab", node: node, tab: index, owner: owner }), false);
                    });
                } else if (node.t === "section" || node.t === "group") {
                    walk(node.children || [], top ? add({ kind: "box", node: node, owner: owner }) : owner, false);
                } else if (node.t === "popup") {
                    walk(node.children || [], owner, top);
                } else if (node.t === "splitter") {
                    byPlace(node.children || []).forEach(visit);
                } else {
                    loose.push(node);
                }
            }
            byPlace(nodes).forEach(visit);
            if (top && loose.length) add({ kind: "rest", nodes: loose, owner: owner });
        }
        walk(screen.nodes || [], null, true);
        return parts;
    }

    function partNodes(part) {
        if (part.kind === "rest") return part.nodes;
        if (part.kind === "tab") return (part.node.children || []).filter(function (child) { return tabOf(child, part.node) === part.tab; });
        return [part.node];
    }

    function partTitle(part) {
        if (part.kind === "tab") return part.node.tabs[part.tab];
        if (part.kind === "rest") return "";
        return part.node.title || part.node.caption || "";
    }

    function boundsOf(nodes) {
        var e = extentOf(nodes, false);
        return { x: e.x0, y: e.y0, w: e.x1 - e.x0, h: e.y1 - e.y0 };
    }

    function tally(nodes, counts) {
        nodes.forEach(function (n) {
            if (n.t === "grid" || n.t === "tree") counts.grids++;
            else if (n.t === "button" || n.t === "toolbar" || n.t === "tag") counts.buttons++;
            else if (n.children) tally(n.children, counts);
            else if (n.t !== "label" && n.t !== "image") counts.fields++;
        });
        return counts;
    }

    global.__baParts = function (screen) {
        return partsOf(screen).map(function (part) {
            var nodes = partNodes(part);
            var info = {
                id: part.id, kind: part.kind, title: partTitle(part),
                box: boundsOf(part.kind === "tab" ? [part.node] : nodes),
                counts: tally(part.kind === "box" ? part.node.children || [] : nodes, { grids: 0, fields: 0, buttons: 0 })
            };
            if (part.owner) info.within = { kind: part.owner.kind, title: partTitle(part.owner) };
            if (part.kind === "grid") {
                info.columns = part.node.columns.length;
                info.names = part.node.columns.slice(0, 3).map(function (column) { return column.caption; }).filter(Boolean);
            }
            return info;
        });
    };

    function keepTabs(node, indexes) {
        var position = {};
        indexes.forEach(function (index, at) { position[index] = at; });
        node.children = (node.children || []).filter(function (child) { return position[tabOf(child, node)] != null; });
        node.children.forEach(function (child) { child.tab = position[tabOf(child, node)]; });
        node.active = position[node.active || 0] || 0;
        node.tabs = indexes.map(function (index) { return node.tabs[index]; });
        return node;
    }

    function pickParts(screen, ids) {
        var parts = partsOf(screen), chosen = {}, nodes = [], tabsDone = [];
        ids.forEach(function (id) { if (parts[id]) chosen[id] = true; });
        function covered(part) {
            for (var owner = part.owner; owner; owner = owner.owner) if (chosen[owner.id]) return true;
            return false;
        }
        parts.forEach(function (part) {
            if (!chosen[part.id] || covered(part)) return;
            if (part.kind !== "tab") { nodes = nodes.concat(partNodes(part)); return; }
            if (tabsDone.indexOf(part.node) >= 0) return;
            tabsDone.push(part.node);
            nodes.push(keepTabs(part.node, parts.filter(function (other) { return other.kind === "tab" && other.node === part.node && chosen[other.id]; }).map(function (other) { return other.tab; })));
        });
        nodes.forEach(function (node) { delete node.tab; delete node.pane; });
        return nodes;
    }

    function inPlaceOf(holder, child) {
        delete child.pane;
        if (holder.pane != null) child.pane = holder.pane;
        if (holder.tab != null) child.tab = holder.tab;
        return child;
    }

    // Bỏ Splitter thì các node trong hai vùng của nó lên thay chỗ nó, giữ nguyên vị trí trên màn hình.
    function prune(nodes, options) {
        var kept = [];
        nodes.forEach(function (node) {
            if (node.t === "grid" && !options.gridData) delete node.data;
            if (node.children) node.children = prune(node.children, options);
            if (node.t === "splitter" && options.splitters === false) {
                node.children.forEach(function (child) { kept.push(inPlaceOf(node, child)); });
                return;
            }
            kept.push(node);
        });
        return kept;
    }

    global.__baSelect = function (screen, options) {
        options = options || {};
        var picked = JSON.parse(JSON.stringify(screen));
        if (Array.isArray(options.parts)) picked.nodes = pickParts(picked, options.parts);
        picked.nodes = prune(picked.nodes, options);
        fitToNodes(picked);
        return picked;
    };

    global.__baHighlight = function (box) {
        try {
            var doc = lastView && lastView.doc;
            if (!doc || !doc.body) return;
            var mark = doc.getElementById(MARK_ID);
            if (!box) {
                if (mark) mark.parentNode.removeChild(mark);
                return;
            }
            if (!mark) {
                mark = doc.createElement("div");
                mark.id = MARK_ID;
                mark.setAttribute("data-ba-capture-ignore", "1");
                doc.body.appendChild(mark);
            }
            var view = doc.defaultView;
            mark.style.cssText = "position:fixed;z-index:2147483646;box-sizing:border-box;pointer-events:none;border:2px solid #0f75bd;border-radius:3px;background:rgba(15,117,189,0.12);" +
                "left:" + (lastView.x + box.x - view.pageXOffset) + "px;top:" + (lastView.y + box.y - view.pageYOffset) + "px;width:" + Math.max(4, box.w) + "px;height:" + Math.max(4, box.h) + "px";
        } catch (e) { }
    };

    function delay(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function settle(read, tries, pause) {
        var lastSize = -1;
        function step(left) {
            var current = read();
            var size = JSON.stringify(current).length;
            if (size === lastSize || left <= 0) return current;
            lastSize = size;
            return delay(pause || 600).then(function () { return step(left - 1); });
        }
        return Promise.resolve().then(function () { return step(tries); });
    }

    function tabStrip(doc) {
        function shown(el) {
            if (!el || el.offsetParent === null) return false;
            var style = el.ownerDocument.defaultView.getComputedStyle(el);
            return style.display !== "none" && style.visibility !== "hidden";
        }
        function stripsIn(root, depth) {
            var list = Array.prototype.slice.call(root.querySelectorAll("ul[class*='dxtc-strip'], ul.nav-tabs"));
            if (depth >= 2) return list;
            Array.prototype.slice.call(root.querySelectorAll("iframe")).forEach(function (frame) {
                try { if (frame.offsetParent !== null && frame.contentDocument) list = list.concat(stripsIn(frame.contentDocument, depth + 1)); } catch (e) { }
            });
            return list;
        }
        var popup = modalPopup(doc);
        var strips = stripsIn(popup ? popup.el : doc, 0).filter(shown);
        if (!strips.length) return null;
        var strip = strips[0];
        var items = [];
        Array.prototype.slice.call(strip.querySelectorAll("li")).forEach(function (li) {
            if (!shown(li)) return;
            var isDx = /dxtc-tab|dxtc-activeTab/.test(li.className);
            if (!isDx && !/nav-tabs/.test(strip.className)) return;
            var caption = clean(li.textContent);
            if (!caption || items.some(function (item) { return item.caption === caption; })) return;
            items.push({
                caption: caption,
                el: isDx ? li : (li.querySelector("a, button") || li),
                active: /dxtc-activeTab|\bactive\b/.test(li.className) || !!li.querySelector("a.active"),
                disabled: /Disabled|\bdisabled\b/.test(li.className)
            });
        });
        return items.length ? items : null;
    }

    global.__baTabCount = function (options) {
        options = options || {};
        var items = tabStrip(options.document || pickDocument(document)) || [];
        return items.filter(function (item) { return !item.disabled; }).length;
    };

    global.__baCaptureAllTabs = function (options) {
        options = options || {};
        var target = options.document ? { doc: options.document, host: null } : pickTarget(document);
        var doc = target.doc;
        function capture() {
            return global.__baCapture({ document: doc, host: target.host, ui: options.ui, title: options.title, gridData: options.gridData });
        }
        function activeCaption() {
            var items = tabStrip(doc) || [];
            for (var i = 0; i < items.length; i++) if (items[i].active) return items[i].caption;
            return null;
        }
        var first = tabStrip(doc);
        if (!first || first.length < 2) return settle(capture, 4).then(function (screen) { return [screen]; });

        var start = activeCaption();
        var captions = first.filter(function (item) { return !item.disabled; }).map(function (item) { return item.caption; });
        var screens = [];
        function activate(caption) {
            var waited = 0;
            var clicked = 0;
            function check() {
                if (activeCaption() === caption || waited >= 15000) return delay(500);
                if (waited >= clicked) {
                    var items = tabStrip(doc) || [];
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].caption === caption) { items[i].el.click(); break; }
                    }
                    clicked = waited + 4000;
                }
                waited += 250;
                return delay(250).then(check);
            }
            return check();
        }
        function next(position) {
            if (position >= captions.length) {
                return (start ? activate(start) : Promise.resolve()).then(function () { return screens; });
            }
            return activate(captions[position]).then(function () { return settle(capture, 8); }).then(function (screen) {
                screens.push(screen);
                return next(position + 1);
            });
        }
        return next(0);
    };

    // ----- Đọc một trang HTML bất kỳ (file mockup): trang chính và từng hộp thoại, kể cả hộp thoại đang ẩn -----

    // Lớp phủ kín trang của một hộp thoại đang ẩn. Lớp phủ đang hiện mà không khai báo role thì không phân biệt được với khung của cả trang.
    function hiddenCover(el) {
        var view = el.ownerDocument.defaultView, cs = view.getComputedStyle(el);
        if (cs.position !== "fixed") return false;
        if (cs.display === "none") {
            var wide = (cs.left === "0px" && cs.right === "0px") || /^100(%|vw)$/.test(cs.width);
            var tall = (cs.top === "0px" && cs.bottom === "0px") || /^100(%|vh)$/.test(cs.height);
            return wide && tall;
        }
        if (cs.visibility !== "hidden" && parseFloat(cs.opacity) !== 0) return false;
        var r = el.getBoundingClientRect();
        return r.width >= view.innerWidth - 2 && r.height >= view.innerHeight - 2;
    }

    function findDialogs(doc) {
        var boxes = [];
        Array.prototype.slice.call(doc.querySelectorAll("[role=dialog], [role=alertdialog], dialog")).forEach(function (box) {
            if (!boxes.some(function (other) { return other.contains(box); })) boxes.push(box);
        });
        Array.prototype.slice.call(doc.body.querySelectorAll("*")).forEach(function (el) {
            if (el.children.length !== 1 || !hiddenCover(el)) return;
            if (boxes.some(function (box) { return box.contains(el) || el.contains(box); })) return;
            boxes.push(el.children[0]);
        });
        return boxes;
    }

    // Phần tử ngoài cùng chỉ bọc riêng hộp thoại (lớp phủ của nó); trang chính bỏ qua cả phần tử này.
    function coverOf(box) {
        var cover = box;
        while (cover.parentElement && cover.parentElement !== box.ownerDocument.body && cover.parentElement.children.length === 1) cover = cover.parentElement;
        return cover;
    }

    // Hiện một hộp thoại đang ẩn bằng cách gỡ đúng thứ đang ẩn nó trên từng phần tử từ ngoài vào; trả về hàm đưa mọi thứ về như cũ.
    function reveal(box) {
        var view = box.ownerDocument.defaultView, body = box.ownerDocument.body, undo = [], chain = [];
        function attribute(el, name, value) {
            var had = el.getAttribute(name);
            if (value === null) el.removeAttribute(name); else el.setAttribute(name, value);
            undo.push(function () { if (had === null) el.removeAttribute(name); else el.setAttribute(name, had); });
        }
        function style(el, name, value) {
            var had = el.style.getPropertyValue(name), priority = el.style.getPropertyPriority(name);
            el.style.setProperty(name, value);
            undo.push(function () { if (had) el.style.setProperty(name, had, priority); else el.style.removeProperty(name); });
        }
        for (var p = box; p && p !== body; p = p.parentElement) chain.unshift(p);
        chain.forEach(function (el) {
            if (el.hasAttribute("hidden")) attribute(el, "hidden", null);
            if (el.tagName === "DIALOG" && !el.hasAttribute("open")) attribute(el, "open", "");
            var cs = view.getComputedStyle(el);
            if (cs.display === "none") {
                var centred = !/^(normal|flex-start|start|left|)$/.test(cs.justifyContent) || !/^(normal|stretch|flex-start|start|)$/.test(cs.alignItems);
                style(el, "display", centred ? "flex" : "block");
            }
            if (cs.visibility === "hidden") style(el, "visibility", "visible");
            if (parseFloat(cs.opacity) === 0) style(el, "opacity", "1");
        });
        return function () {
            undo.reverse().forEach(function (step) { step(); });
        };
    }

    function mainScope(doc) {
        var best = doc.body, bestArea = 0;
        Array.prototype.slice.call(doc.querySelectorAll("main, [role=main]")).forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (shown(el) && r.width * r.height > bestArea) { best = el; bestArea = r.width * r.height; }
        });
        return best;
    }

    // Chờ các hiệu ứng có điểm kết thúc (transition, animation) chạy xong, để tọa độ đọc được là tọa độ cuối cùng.
    function calm(doc) {
        var running = (doc.getAnimations ? doc.getAnimations() : []).filter(function (animation) {
            var timing = animation.effect && animation.effect.getComputedTiming ? animation.effect.getComputedTiming() : null;
            return !!timing && isFinite(timing.endTime);
        });
        var finished = Promise.all(running.map(function (animation) { return animation.finished.catch(function () { }); }));
        return Promise.race([finished, delay(1500)]);
    }

    // Các tab bấm được của dải tab đầu tiên trong scope. Tab là liên kết sang trang khác thì không bấm (bấm sẽ rời khỏi trang đang đọc).
    function switchableTabs(scope) {
        var strip = Array.prototype.slice.call(scope.querySelectorAll("[role=tablist]")).filter(shown)[0];
        if (!strip) return [];
        var tabs = Array.prototype.slice.call(strip.querySelectorAll("[role=tab]")).filter(function (tab) {
            return shown(tab) && !tab.disabled && tab.getAttribute("aria-disabled") !== "true";
        });
        var leaves = tabs.some(function (tab) {
            var href = tab.getAttribute("href");
            return !!href && href.charAt(0) !== "#";
        });
        return leaves ? [] : tabs;
    }

    // Chụp scope một lần cho mỗi tab của nó rồi gộp lại, để tab nào trong thiết kế cũng có nội dung.
    function captureEveryTab(doc, scope, capture) {
        function still() {
            return calm(doc).then(function () { return settle(capture, 3, 150); });
        }
        var tabs = switchableTabs(scope);
        if (tabs.length < 2) return still();
        var start = tabs.map(isActiveTab).indexOf(true);
        var screens = [];
        function open(index) {
            var tab = switchableTabs(scope)[index];
            if (tab) tab.click();
            return still();
        }
        function next(index) {
            if (index < tabs.length) {
                return open(index).then(function (screen) {
                    screens.push(screen);
                    return next(index + 1);
                });
            }
            return (start >= 0 ? open(start) : Promise.resolve()).then(function () { return global.__baMergeTabs(screens); });
        }
        return next(0);
    }

    function externalCount(doc) {
        return Array.prototype.slice.call(doc.querySelectorAll("link[rel~=stylesheet][href], script[src], img[src]")).filter(function (el) {
            var url = el.getAttribute("href") || el.getAttribute("src") || "";
            return !!url && !/^(data|blob):/i.test(url);
        }).length;
    }

    // Xếp các màn hình lên cùng một mặt phẳng: màn hình đầu ở trên cùng, các màn hình sau xếp thành hàng bên dưới, hết chỗ thì xuống hàng.
    function arrange(screens, rowWidth) {
        var first = screens[0];
        var all = { kind: first.kind, v: first.v, ui: first.ui, title: first.title, width: first.width, height: first.height, nodes: [] };
        var limit = Math.max(first.width, rowWidth), x = 0, y = 0, rowHeight = 0;
        screens.forEach(function (screen, index) {
            var nodes = JSON.parse(JSON.stringify(screen.nodes));
            if (index > 1 && x + screen.width > limit) {
                x = 0;
                y += rowHeight + SCREEN_GAP;
                rowHeight = 0;
            }
            shiftNodes(nodes, x, y);
            all.nodes = all.nodes.concat(nodes);
            if (index === 0) {
                y = screen.height + SCREEN_GAP;
                return;
            }
            x += screen.width + SCREEN_GAP;
            rowHeight = Math.max(rowHeight, screen.height);
        });
        fitToNodes(all);
        return all;
    }

    // Trả về { screens: [{ kind: "page" | "popup", title, screen }], all: mọi màn hình xếp chung một mặt phẳng,
    // skipped: [tiêu đề hộp thoại không hiện ra được], external: số tài nguyên ngoài mà trang tham chiếu }.
    global.__baCaptureScreens = function (options) {
        options = options || {};
        var doc = options.document || document;
        var ui = options.ui === "ess" ? "ess" : "core";
        var boxes = findDialogs(doc);
        var scope = mainScope(doc);
        var screens = [], skipped = [];
        function reader(plan) {
            return function () {
                var screen = captureDocument(doc, ui, false, plan);
                delete screen.origin;
                return screen;
            };
        }
        function readPopup(box) {
            var hide = reveal(box);
            return captureEveryTab(doc, box, reader({ scope: box, popup: box })).then(function (screen) {
                hide();
                var popup = screen.nodes[0];
                if (popup && popup.t === "popup" && popup.children && popup.children.length) {
                    if (popup.title) screen.title = popup.title;
                    screens.push({ kind: "popup", title: popup.title || "", screen: screen });
                } else {
                    var heading = dialogHeading(box);
                    skipped.push(clean(heading ? heading.textContent : box.getAttribute("aria-label") || ""));
                }
            });
        }
        return captureEveryTab(doc, scope, reader({ scope: scope, ignore: boxes.map(coverOf) })).then(function (screen) {
            if (screen.nodes.length) screens.push({ kind: "page", title: screen.title, screen: screen });
            return boxes.reduce(function (chain, box) {
                return chain.then(function () { return readPopup(box); });
            }, Promise.resolve());
        }).then(function () {
            var all = screens.length > 1 ? arrange(screens.map(function (item) { return item.screen; }), doc.defaultView.innerWidth) : null;
            return { screens: screens, all: all, skipped: skipped, external: externalCount(doc) };
        });
    };
})(typeof window !== "undefined" ? window : this);
