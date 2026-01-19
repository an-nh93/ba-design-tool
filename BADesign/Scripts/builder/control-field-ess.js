// ../Scripts/builder/control-field-ess.js
// Phiên bản ESS – field HTML styled giống trang ESS Leave

(function (global, $) {
    "use strict";

    // Tạo CSS ESS inject vào <head> (chỉ tạo 1 lần)
    function ensureEssCss() {
        if (document.getElementById("ess-field-style")) return;

        var css = `
/* ===== ESS field look & feel ===== */
.ess-field-editor {
    display: inline-block;
    vertical-align: middle;
}
.ess-input-base {
    box-sizing: border-box;
    height: 26px;
    min-width: 90px;
    padding: 2px 6px;
    border: 1px solid #cecece;
    border-radius: 2px;
    font-size: 12px;
    font-family: Segoe UI, Tahoma, Arial, sans-serif;
    background-color: #ffffff;
    color: #333;
}
.ess-input-base:focus {
    outline: none;
    border-color: #0d74ba;
    box-shadow: 0 0 3px rgba(13,116,186,.5);
}

/* combo */
.ess-combo {
    appearance: none;
    -moz-appearance: none;
    -webkit-appearance: none;
    background-repeat: no-repeat;
    background-position: right 6px center;
    padding-right: 18px;
}
/* đơn giản: dùng border + nền giống ESS, icon mũi tên có thể gắn bằng bg-image sau */

/* date */
.ess-date {
    /* type=date đã có icon sẵn, chỉ chỉnh border */
}

/* number */
.ess-number {
    text-align: right;
}

/* memo */
.ess-memo {
    min-height: 60px;
    resize: vertical;
}

/* button */
.ess-button {
    min-width: 80px;
    height: 26px;
    padding: 3px 14px;
    border-radius: 2px;
    border: 1px solid #c2c2c2;
    background: linear-gradient(#fefefe, #e9e9e9);
    font-size: 12px;
    color: #333;
    cursor: pointer;
}
.ess-button:hover {
    background: linear-gradient(#ffffff, #dddddd);
}
.ess-button:active {
    background: #d0d0d0;
}

/* checkbox / radio */
.ess-check-wrapper,
.ess-radio-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.ess-check-wrapper input,
.ess-radio-wrapper input {
    margin: 0;
}

/* Caption & layout */
.page-field .page-field-caption,
.popup-field .popup-field-caption {
    /* label ESS – giữ của builder.css, chỉ đảm bảo inline-block */
    display: inline-block;
    vertical-align: middle;
}
.page-field .ess-field-editor,
.popup-field .ess-field-editor {
    min-width: 120px;
}

/* groupbox / section giữ style cũ nhưng thêm chút padding trong */
.page-field-groupbox,
.popup-groupbox {
    padding: 8px;
}
.page-field-section,
.popup-section {
    padding: 6px 8px;
}

/* resizer ESS giữ nguyên */
.page-field-resizer,
.popup-field-resizer {
    width: 10px;
    height: 10px;
    position: absolute;
    right: 2px;
    bottom: 2px;
    cursor: se-resize;
}
        `;

        var style = document.createElement("style");
        style.id = "ess-field-style";
        style.type = "text/css";
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // Tạo ID field
    function newFieldId(ftype) {
        return "fld_" + (ftype || "field") + "_" + Date.now();
    }

    // Tạo config mặc định cho từng loại
    function createDefaultConfig(ftype) {
        var id = newFieldId(ftype);
        var base = {
            id: id,
            type: "field",
            ftype: ftype,
            caption: ftype.charAt(0).toUpperCase() + ftype.slice(1),
            left: 40,
            top: 40,
            width: 220,
            height: (ftype === "memo") ? 70 : 26,
            required: false,
            disabled: false,
            labelWidth: 120 // px
        };

        switch (ftype) {
            case "text":
            case "memo":
            case "number":
            case "date":
            case "combo":
                base.placeholder = "";
                break;
            case "button":
                base.caption = "Submit";
                break;
            case "checkbox":
            case "radio":
                base.caption = "Option";
                break;
            case "groupbox":
                base.caption = "Group box";
                base.width = 300;
                base.height = 150;
                break;
            case "section":
                base.caption = "Section";
                base.width = 400;
                base.height = 120;
                break;
            case "language":
                base.caption = "Language";
                base.width = 160;
                break;
        }
        return base;
    }

    var controlField = {

        // ====== INIT ======
        init: function () {
            ensureEssCss();
            this.initDragResize();
            this.initClickSelect();
        },

        // Drag & resize tất cả .page-field / .popup-field
        initDragResize: function () {
            var self = this;

            interact('.page-field, .popup-field').draggable({
                listeners: {
                    start: function (event) {
                        var id = $(event.target).attr("data-id");
                        if (!id) return;
                        builder.beginDragSelection(id);
                    },
                    move: function (event) {
                        builder.dragSelectionMove(event.dx, event.dy);
                    },
                    end: function () {
                        builder.endDragSelection();
                    }
                }
            });

            interact('.page-field, .popup-field').resizable({
                edges: { left: false, top: false, right: true, bottom: true },
                listeners: {
                    move: function (event) {
                        var target = event.target;
                        var id = $(target).attr("data-id");
                        if (!id) return;
                        var cfg = builder.getControlConfig(id);
                        if (!cfg) return;

                        var w = Math.max(60, event.rect.width);
                        var h = Math.max(22, event.rect.height);

                        cfg.width = w;
                        cfg.height = h;

                        $(target).css({
                            width: w + "px",
                            height: h + "px"
                        });

                        builder.updateSelectionSizeHint();
                    },
                    end: function () {
                        builder.refreshJson();
                    }
                }
            });
        },

        initClickSelect: function () {
            var self = this;

            // Chọn field trên canvas
            $(document).on("mousedown", ".page-field, .popup-field", function (e) {
                if (e.button !== 0) return; // chỉ click trái
                e.stopPropagation();

                var $field = $(this);
                var id = $field.attr("data-id");
                if (!id) return;

                // Ctrl + click → toggle select cho multi-select
                if (e.ctrlKey || e.metaKey) {
                    $field.toggleClass("page-field-selected popup-field-selected canvas-control-selected");
                } else {
                    $(".page-field, .popup-field").removeClass("page-field-selected popup-field-selected canvas-control-selected");
                    $field.addClass("page-field-selected canvas-control-selected");
                }

                builder.selectedControlId = id;
                builder.selectedControlType = "field";
                builder.highlightOutlineSelection();
                builder.updateSelectionSizeHint();

                self.showProperties(id);
            });
        },

        // ===== API: builder gọi =====

        // Thêm field mới từ toolbox
        addNew: function (ftype) {
            var cfg = createDefaultConfig(ftype);
            this.renderExisting(cfg);
            builder.registerControl(cfg);
        },

        // Render 1 config đã có (load từ JSON / template)
        renderExisting: function (cfg) {
            ensureEssCss();

            // Xác định container: popup body / tabpage body / canvas
            var $container = $("#canvas");
            if (cfg.parentId) {
                var $parent = $('[data-id="' + cfg.parentId + '"], #' + cfg.parentId);
                if ($parent.hasClass("popup-design")) {
                    $container = $parent.find(".popup-body").first();
                } else if ($parent.hasClass("canvas-tabpage")) {
                    $container = $parent.find(".tabpage-body").first();
                }
            }

            var isPopup = $container.closest(".popup-body").length > 0;
            var fieldClass = isPopup ? "popup-field" : "page-field";
            var captionClass = isPopup ? "popup-field-caption" : "page-field-caption";
            var editorClass = isPopup ? "popup-field-editor" : "page-field-editor";
            var resizerClass = isPopup ? "popup-field-resizer" : "page-field-resizer";

            var $field = $('<div></div>')
                .addClass(fieldClass)
                .attr("data-id", cfg.id)
                .css({
                    position: "absolute",
                    left: (cfg.left || 0),
                    top: (cfg.top || 0),
                    width: (cfg.width || 220),
                    height: (cfg.height || ((cfg.ftype === "memo") ? 70 : 26))
                });

            if (cfg.ftype === "groupbox" || cfg.ftype === "section") {
                $field.addClass(fieldClass + "-groupbox");
            }

            // Caption
            var $cap = $('<span></span>')
                .addClass(captionClass)
                .text(cfg.caption || "");

            if (cfg.required) {
                $cap.addClass("page-field-caption-required");
            }

            // Editor wrapper
            var $editorWrap = $('<span></span>')
                .addClass(editorClass + " ess-field-editor");

            // Tạo editor HTML theo ftype
            var $editor = this.createEditorElement(cfg.ftype, cfg);
            if ($editor) {
                $editorWrap.append($editor);
            }

            // Với groupbox/section thì caption là title
            if (cfg.ftype === "groupbox") {
                $field.addClass("page-field-groupbox popup-groupbox");
                var $title = $('<div></div>')
                    .addClass(fieldClass + "-groupbox-title")
                    .text(cfg.caption || "Group box");
                $field.append($title);
            } else if (cfg.ftype === "section") {
                $field.addClass(fieldClass + "-section");
                var $sh = $('<div></div>')
                    .addClass(fieldClass + "-section-header")
                    .text(cfg.caption || "Section");
                $field.append($sh);
            } else {
                // field thường: caption + editor
                $field.append($cap).append($editorWrap);
            }

            // Resizer
            var $resizer = $('<div></div>').addClass(resizerClass);
            $field.append($resizer);

            $container.append($field);

            // Áp dụng layout labelWidth
            this.reapplyLayout(cfg.id);

            // Disabled?
            if (cfg.disabled) {
                if (cfg.ftype === "button") {
                    $field.find("button").prop("disabled", true);
                } else {
                    $field.find("input,select,textarea").prop("disabled", true);
                }
            }
        },

        // Tạo input theo loại ESS
        createEditorElement: function (ftype, cfg) {
            var placeholder = cfg.placeholder || "";

            switch (ftype) {
                case "text":
                    return $('<input type="text"/>')
                        .addClass("ess-input-base ess-text")
                        .attr("placeholder", placeholder);
                case "memo":
                    return $('<textarea></textarea>')
                        .addClass("ess-input-base ess-memo")
                        .attr("placeholder", placeholder);
                case "number":
                    return $('<input type="number"/>')
                        .addClass("ess-input-base ess-number")
                        .attr("placeholder", placeholder);
                case "date":
                    return $('<input type="date"/>')
                        .addClass("ess-input-base ess-date");
                case "combo":
                    var $sel = $('<select></select>')
                        .addClass("ess-input-base ess-combo");
                    // Nếu có items (array), add option
                    if (Array.isArray(cfg.items) && cfg.items.length) {
                        cfg.items.forEach(function (it) {
                            var text = (typeof it === "string") ? it : (it.text || it.value || "");
                            var val = (typeof it === "string") ? it : (it.value || text);
                            $sel.append($('<option></option>').val(val).text(text));
                        });
                    } else {
                        $sel.append('<option>Item 1</option>')
                            .append('<option>Item 2</option>');
                    }
                    return $sel;
                case "button":
                    return $('<button type="button"></button>')
                        .addClass("ess-button")
                        .text(cfg.caption || "Button");
                case "checkbox":
                    return $('<label class="ess-check-wrapper"><input type="checkbox" /><span>' +
                        (cfg.caption || "Option") +
                        '</span></label>');
                case "radio":
                    return $('<label class="ess-radio-wrapper"><input type="radio" /><span>' +
                        (cfg.caption || "Option") +
                        '</span></label>');
                case "language":
                    // dùng style ngôn ngữ cũ nếu anh có flag trong CSS
                    return $('<select></select>')
                        .addClass("ess-input-base page-lang-select-en")
                        .append('<option value="en">English</option>')
                        .append('<option value="vi">Tiếng Việt</option>');
                case "groupbox":
                case "section":
                    // Editor không cần
                    return null;
            }
            // fallback text
            return $('<input type="text"/>')
                .addClass("ess-input-base ess-text")
                .attr("placeholder", placeholder);
        },

        // Đồng bộ con khi di chuyển groupbox/section
        moveDescendants: function (parentId, dx, dy, refreshJson) {
            var controls = builder.controls || [];
            controls.forEach(function (c) {
                if (c.parentId === parentId) {
                    c.left = (c.left || 0) + dx;
                    c.top = (c.top || 0) + dy;
                    $('[data-id="' + c.id + '"]').css({
                        left: c.left,
                        top: c.top
                    });
                }
            });
            if (refreshJson !== false) {
                builder.refreshJson();
            }
        },

        // Lấy list id đang chọn (DOM)
        getSelectedIds: function () {
            var ids = [];
            $("#canvas .page-field-selected, #canvas .popup-field-selected").each(function () {
                var id = $(this).attr("data-id");
                if (id) ids.push(id);
            });
            return ids;
        },

        clearSelection: function () {
            $("#canvas .page-field-selected, #canvas .popup-field-selected")
                .removeClass("page-field-selected popup-field-selected canvas-control-selected");
        },

        // Re-layout caption/editor theo labelWidth (cho ESS)
        reapplyLayout: function (fieldId) {
            var cfg = (typeof fieldId === "string")
                ? builder.getControlConfig(fieldId)
                : null;

            var ids = [];
            if (cfg) {
                ids = [cfg.id];
            } else {
                // nếu không truyền id, apply cho tất cả
                (builder.controls || []).forEach(function (c) {
                    if (c.type === "field") ids.push(c.id);
                });
            }

            ids.forEach(function (id) {
                var c = builder.getControlConfig(id);
                if (!c) return;
                var $f = $('[data-id="' + id + '"]');
                if (!$f.length) return;

                // Không áp cho groupbox / section / checkbox / radio
                if (c.ftype === "groupbox" || c.ftype === "section" ||
                    c.ftype === "checkbox" || c.ftype === "radio" ||
                    c.ftype === "button") {
                    return;
                }

                var labelWidth = c.labelWidth || 120;
                var $cap = $f.find(".page-field-caption, .popup-field-caption").first();
                var $ed = $f.find(".ess-field-editor").first();

                $cap.css({
                    width: labelWidth + "px",
                    display: "inline-block"
                });

                $ed.css({
                    display: "inline-block"
                });
            });
        },

        // Xoá field + con
        deleteWithChildren: function (id) {
            var map = {};
            (builder.controls || []).forEach(function (c) {
                map[c.id] = c;
            });

            var toDelete = [];

            function collect(childId) {
                if (!map[childId]) return;
                toDelete.push(childId);
                (builder.controls || []).forEach(function (c) {
                    if (c.parentId === childId) collect(c.id);
                });
            }

            collect(id);

            builder.controls = (builder.controls || []).filter(function (c) {
                return toDelete.indexOf(c.id) === -1;
            });

            toDelete.forEach(function (cid) {
                $('[data-id="' + cid + '"]').remove();
            });
        },

        // ===== Properties panel (simple) =====
        showProperties: function (fieldId) {
            var cfg = builder.getControlConfig(fieldId);
            if (!cfg) {
                $("#propPanel").html('<h3>Thuộc tính</h3><p>Không tìm thấy field.</p>');
                return;
            }

            var html = '';
            html += '<h3>Field properties</h3>';
            html += '<div style="font-size:11px;color:#666;margin-bottom:6px;">ID: ' + cfg.id + ' | Type: ' + cfg.ftype + '</div>';

            html += '<div class="ub-prop-row">';
            html += 'Caption:<br/><input type="text" id="pf_caption" style="width:100%;" value="' + (cfg.caption || "") + '"/>';
            html += '</div>';

            if (!(cfg.ftype === "groupbox" || cfg.ftype === "section")) {
                html += '<div class="ub-prop-row" style="margin-top:6px;">';
                html += '<label><input type="checkbox" id="pf_required"' + (cfg.required ? ' checked' : '') + '> Required</label><br/>';
                html += '<label><input type="checkbox" id="pf_disabled"' + (cfg.disabled ? ' checked' : '') + '> Disabled</label>';
                html += '</div>';
            }

            if (!(cfg.ftype === "groupbox" || cfg.ftype === "section" ||
                cfg.ftype === "checkbox" || cfg.ftype === "radio" || cfg.ftype === "button")) {
                html += '<div class="ub-prop-row" style="margin-top:6px;">';
                html += 'Label width (px): <input type="number" id="pf_labelWidth" style="width:80px;" value="' + (cfg.labelWidth || 120) + '"/>';
                html += '</div>';
            }

            if (cfg.ftype === "combo") {
                var itemsText = "";
                if (Array.isArray(cfg.items) && cfg.items.length) {
                    itemsText = cfg.items.map(function (x) {
                        return typeof x === "string" ? x : (x.text || x.value || "");
                    }).join(", ");
                }
                html += '<div class="ub-prop-row" style="margin-top:6px;">';
                html += 'Items (comma separated):<br/>';
                html += '<textarea id="pf_items" style="width:100%;height:50px;">' + itemsText + '</textarea>';
                html += '</div>';
            }

            $("#propPanel").html(html);

            var self = this;

            $("#pf_caption").off("input").on("input", function () {
                var v = $(this).val();
                cfg.caption = v;
                var $f = $('[data-id="' + cfg.id + '"]');
                if (cfg.ftype === "button") {
                    $f.find("button.ess-button").text(v);
                } else if (cfg.ftype === "groupbox") {
                    $f.find(".page-field-groupbox-title, .popup-field-groupbox-title").text(v);
                } else if (cfg.ftype === "section") {
                    $f.find(".page-field-section-header, .popup-field-section-header").text(v);
                } else if (cfg.ftype === "checkbox" || cfg.ftype === "radio") {
                    $f.find(".ess-check-wrapper span, .ess-radio-wrapper span").text(v);
                } else {
                    $f.find(".page-field-caption, .popup-field-caption").text(v);
                }
                builder.refreshJson();
            });

            $("#pf_required").off("change").on("change", function () {
                var req = $(this).is(":checked");
                cfg.required = req;
                var $cap = $('[data-id="' + cfg.id + '"]').find(".page-field-caption, .popup-field-caption");
                if (req) $cap.addClass("page-field-caption-required");
                else $cap.removeClass("page-field-caption-required");
                builder.refreshJson();
            });

            $("#pf_disabled").off("change").on("change", function () {
                var dis = $(this).is(":checked");
                cfg.disabled = dis;
                var $f = $('[data-id="' + cfg.id + '"]');
                if (cfg.ftype === "button") {
                    $f.find("button").prop("disabled", dis);
                } else {
                    $f.find("input,select,textarea").prop("disabled", dis);
                }
                builder.refreshJson();
            });

            $("#pf_labelWidth").off("change").on("change", function () {
                var v = parseInt($(this).val() || "0", 10);
                if (isNaN(v) || v <= 0) v = 120;
                cfg.labelWidth = v;
                self.reapplyLayout(cfg.id);
                builder.refreshJson();
            });

            $("#pf_items").off("change").on("change", function () {
                if (cfg.ftype !== "combo") return;
                var txt = $(this).val() || "";
                var parts = txt.split(",").map(function (x) { return $.trim(x); }).filter(Boolean);
                cfg.items = parts;
                var $sel = $('[data-id="' + cfg.id + '"]').find("select");
                $sel.empty();
                parts.forEach(function (p) { $sel.append($('<option></option>').val(p).text(p)); });
                builder.refreshJson();
            });
        }
    };

    // export
    global.controlField = controlField;

    // Khởi tạo sau khi DOM ready
    $(function () {
        controlField.init();
    });

})(window, jQuery);
