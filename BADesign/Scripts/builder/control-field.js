var controlField = (function () {
    var multiSelectedIds = [];

    // ==== IMAGE helpers ====
    var IMAGE_MODES = ["fit", "fill", "stretch", "center"];

    function getImageMode(cfg) {
        var m = cfg.imageMode || "fit";
        if (IMAGE_MODES.indexOf(m) < 0) m = "fit";
        return m;
    }

    // Đổ DOM ảnh cho 1 field image dựa trên cfg.imageData + cfg.imageMode
    function applyImageDomForField(cfg) {
        var $dom = $('.canvas-control.page-field[data-id="' + cfg.id + '"]');
        if (!$dom.length) return;

        var $inner = $dom.find(".ess-image-inner");
        if (!$inner.length) return;

        var mode = getImageMode(cfg);

        $inner
            .removeClass("ess-image-mode-fit ess-image-mode-fill ess-image-mode-stretch ess-image-mode-center")
            .addClass("ess-image-mode-" + mode)
            .empty();

        if (cfg.imageData) {
            var $img = $('<img class="ess-image-img" />').attr("src", cfg.imageData);
            $inner.append($img);
        } else {
            $inner.append('<span class="ess-image-placeholder">Drop / paste image</span>');
        }
    }

    function loadImageFileToField(file, cfg) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (re) {
            cfg.imageData = re.target.result;
            applyImageDomForField(cfg);
            builder.refreshJson();
        };
        reader.readAsDataURL(file);
    }

    // Khởi tạo click + drag/drop cho 1 field image
    function initEssImageDrop($field, cfg) {
        var $drop = $field.find(".ess-image-drop");
        if (!$drop.length) return;

        $drop.off(".essImage");

        // Click -> chọn file
        $drop.on("click.essImage", function (e) {
            e.preventDefault();
            e.stopPropagation();

            var $input = $drop.find("input.ess-image-file");
            if (!$input.length) {
                $input = $('<input type="file" accept="image/*" class="ess-image-file" style="display:none;" />')
                    .appendTo($drop);
            }

            $input.off("change.essImage").on("change.essImage", function () {
                var f = this.files && this.files[0];
                if (f) loadImageFileToField(f, cfg);
                this.value = "";
            }).trigger("click");
        });

        // Drag & drop
        $drop.on("dragover.essImage", function (e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = "copy";
            $drop.addClass("ess-image-drop-hover");
        });

        $drop.on("dragleave.essImage", function (e) {
            e.preventDefault();
            $drop.removeClass("ess-image-drop-hover");
        });

        $drop.on("drop.essImage", function (e) {
            e.preventDefault();
            $drop.removeClass("ess-image-drop-hover");

            var dt = e.originalEvent.dataTransfer;
            if (!dt || !dt.files || !dt.files.length) return;
            loadImageFileToField(dt.files[0], cfg);
        });
    }

    // Tạo mới 1 image field (ESS) từ dataUrl khi paste ảnh trên page trống
    function createImageFieldWithData(dataUrl) {
        var cfg = newConfig("image", "ess");
        cfg.imageData = dataUrl;

        render(cfg);
        builder.registerControl(cfg);

        builder.selectedControlId = cfg.id;
        builder.selectedControlType = "field";
        builder.highlightOutlineSelection();
        showProperties(cfg);
        builder.updateSelectionSizeHint();
    }

    function initGlobalImagePaste() {
        $(document).on("paste.essImage", function (e) {
            // Nếu builder đang ưu tiên dán control thì NHƯỜNG cho builder
            if (window.builder &&
                typeof builder.shouldPreferAppPaste === "function" &&
                builder.shouldPreferAppPaste()) {
                return;
            }

            var ev = e.originalEvent || e;
            var cd = ev.clipboardData;
            if (!cd || !cd.items || !cd.items.length) return;

            var item = null;
            for (var i = 0; i < cd.items.length; i++) {
                if (cd.items[i].type && cd.items[i].type.indexOf("image") === 0) {
                    item = cd.items[i];
                    break;
                }
            }
            if (!item) return;

            var file = item.getAsFile();
            if (!file) return;

            e.preventDefault();

            var reader = new FileReader();
            reader.onload = function (re) {
                var dataUrl = re.target.result;

                // ...
                // Sau khi xử lý xong ảnh, thử xóa clipboard hệ thống
                if (window.builder && typeof builder.clearSystemClipboard === "function") {
                    builder.clearSystemClipboard();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Khởi động handler paste ảnh (chỉ cần 1 lần)
    initGlobalImagePaste();


    // === IMAGE helper: đọc file -> dataURL, cập nhật DOM + config ===
    function handleEssImageFiles(files, $drop) {
        if (!files || !files.length) return;
        var file = files[0];
        if (!file || !file.type || file.type.indexOf("image/") !== 0) return;

        var fieldId = $drop.closest(".page-field").attr("data-id");
        if (!fieldId || !window.builder) return;

        var cfg = builder.getControlConfig(fieldId);
        if (!cfg) return;

        var reader = new FileReader();
        reader.onload = function (ev) {
            var dataUrl = ev.target.result;

            // Lưu vào config
            cfg.imageData = dataUrl;

            // Xoá style nền cũ nếu còn
            $drop
                .removeClass("ess-image-has-image")
                .css({
                    "background-image": "",
                    "background-size": "",
                    "background-position": ""
                });

            // Dựng lại DOM bên trong đúng chuẩn mới (img / placeholder)
            applyImageDomForField(cfg);

            builder.refreshJson();
        };
        reader.readAsDataURL(file);
    }



    // === ESS IMAGE: drag & drop ===
    $(document).on("dragenter dragover", ".ess-image-drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.originalEvent.dataTransfer.dropEffect = "copy";
        $(this).addClass("ess-image-drop-over");
    });

    $(document).on("dragleave dragend", ".ess-image-drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("ess-image-drop-over");
    });

    $(document).on("drop", ".ess-image-drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("ess-image-drop-over");
        var dt = e.originalEvent.dataTransfer;
        if (!dt || !dt.files) return;
        handleEssImageFiles(dt.files, $(this));
    });

    // Click chọn file
    $(document).on("click", ".ess-image-drop", function (e) {
        // để mousedown vẫn chọn field, click này chỉ trigger input file
        var $input = $(this).find("input[type='file']");
        if ($input.length) {
            $input.trigger("click");
        }
    });

    // Change file input
    $(document).on("change", ".ess-image-drop input[type='file']", function (e) {
        var files = this.files;
        var $drop = $(this).closest(".ess-image-drop");
        handleEssImageFiles(files, $drop);
        // reset để chọn lại cùng 1 file vẫn trigger change
        this.value = "";
    });

    // ---- PASTE ẢNH TỪ CLIPBOARD VÀO CANVAS / ESS IMAGE ----
    // ---- PASTE ẢNH TỪ CLIPBOARD VÀO CANVAS / ESS IMAGE ----
    $(document).on("paste", function (e) {
        var ev = e.originalEvent || e;

        // Nếu đang gõ trong input/textarea/select -> để user paste text bình thường
        var tag = (e.target && e.target.tagName || "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        // *** MỚI: nếu builder đang ưu tiên dán control thì bỏ qua handler ảnh này ***
        if (window.builder &&
            typeof builder.shouldPreferAppPaste === "function" &&
            builder.shouldPreferAppPaste()) {
            // Cho builder.js xử lý (paste control)
            return;
        }

        var cd = ev.clipboardData || window.clipboardData;
        if (!cd) return;

        var files = [];

        // Chrome/Edge/Firefox: clipboardData.items
        if (cd.items && cd.items.length) {
            for (var i = 0; i < cd.items.length; i++) {
                var it = cd.items[i];
                if (it.kind === "file" && it.type && it.type.indexOf("image/") === 0) {
                    files.push(it.getAsFile());
                }
            }
        }

        // Fallback: clipboardData.files
        if (!files.length && cd.files && cd.files.length) {
            for (var j = 0; j < cd.files.length; j++) {
                var f = cd.files[j];
                if (f.type && f.type.indexOf("image/") === 0) {
                    files.push(f);
                }
            }
        }

        // Không có file ảnh -> để dành cho paste text / paste control
        if (!files.length) return;

        // Từ đây trở đi: chắc chắn có ảnh => không cho paste control nữa
        e.preventDefault();
        e.stopImmediatePropagation();

        if (!window.builder) return;

        // 1. Ưu tiên: nếu đang chọn sẵn 1 field image thì dán vào đó
        var cfg = null;
        if (builder.selectedControlId) {
            cfg = builder.getControlConfig(builder.selectedControlId) || null;
        }

        // 2. Nếu chưa chọn hoặc không phải image -> tự tạo 1 ESS Image mới
        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image") {
            if (window.controlField && typeof controlField.addNew === "function") {
                controlField.addNew("image", "ess");
                if (builder.selectedControlId) {
                    cfg = builder.getControlConfig(builder.selectedControlId) || null;
                }
            }
        }

        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image") {
            return;
        }

        var $field = $('.canvas-control.page-field[data-id="' + cfg.id + '"]');
        var $drop = $field.find(".ess-image-drop").first();
        if (!$drop.length) return;

        handleEssImageFiles(files, $drop);

        // *** MỚI: sau khi paste ảnh xong, thử xóa clipboard hệ thống ***
        if (window.builder && typeof builder.clearSystemClipboard === "function") {
            builder.clearSystemClipboard();
        }
    });


    $(document).on("click", ".ess-number .ess-spin-up, .ess-number .ess-spin-down", function (e) {
        e.preventDefault();
        e.stopPropagation(); // tránh kéo field khi bấm nút

        var $btn = $(this);
        var isUp = $btn.hasClass("ess-spin-up");
        var $wrap = $btn.closest(".ess-number");
        var $input = $wrap.find("input[type='number']").first();
        if (!$input.length) return;

        var step = parseFloat($input.attr("step")) || 1;
        var minAttr = $input.attr("min");
        var maxAttr = $input.attr("max");

        var val = parseFloat($input.val());
        if (isNaN(val)) val = 0;
        val = isUp ? val + step : val - step;

        if (minAttr !== undefined && minAttr !== "") {
            var min = parseFloat(minAttr);
            if (!isNaN(min)) val = Math.max(val, min);
        }
        if (maxAttr !== undefined && maxAttr !== "") {
            var max = parseFloat(maxAttr);
            if (!isNaN(max)) val = Math.min(val, max);
        }

        $input.val(val);
        $input.trigger("change");
    });

    // ---- Tạo config mới cho 1 field ----
    function newConfig(ftype, uiMode) {
        var idx = builder.controls.length || 0;
        var id = "fld_" + ftype + "_" + Date.now();


        var defaultCaptionPosition = "left";
        if (ftype === "checkbox" || ftype === "radio") {
            defaultCaptionPosition = "right";
            // ↑ sửa thành đúng value của option "Right of control"
            //   vd <option value="right">Right of control</option>
        }



        var defWidth = 260;
        var defHeight = 26;
        if (ftype === "memo") defHeight = 80;
        if (ftype === "groupbox" || ftype === "section") {
            defWidth = 600;
            defHeight = 120;
        }

        if (ftype === "button") {
            defWidth = 50;   // nút vuông nhỏ kiểu "..."
            defHeight = 24;  // chiều cao chuẩn của nút
        }
        if (uiMode === "core") {
            // các control core cũ
            //if (ftype === "memo") {
            //    defHeight = 80;
            //} else if (ftype === "groupbox" || ftype === "section") {
            //    defWidth = 600;
            //    defHeight = 120;
            //} else if (ftype === "button") {
            //    defWidth = 60;
            //    defHeight = 24;
            //}
        }
        else if (uiMode === "ess") {
            // === ESS controls ===
            if (ftype === "text") {
                defWidth = 380;
                defHeight = 40;
            } else if (ftype === "combo") {
                defWidth = 380;
                defHeight = 40;
            } else if (ftype === "date") {      // ESS Date
                defWidth = 380;   // rộng hơn 1 chút cho giống ESS
                defHeight = 40;   // cao giống ô date ngoài trang ESS
            } else if (ftype === "memo") {
                defWidth = 435;
                defHeight = 70;
            } else if (ftype === "button") {
                defWidth = 90;
                defHeight = 48;
            } else if (ftype === "numberic-test") {
                defWidth = 380;
                defHeight = 45;
            } else if (ftype === "tag") {
                defWidth = 110;
                defHeight = 30;
            } else if (ftype === "progress") {
                defWidth = 220;
                defHeight = 26;
            } else if (ftype === "image") {
                defWidth = 140;
                defHeight = 90;
            }
        }

        var caption =
            ftype === "label" ? "Label"
                : ftype === "groupbox" ? "Group"
                    : ftype === "section" ? "Section"
                        : ftype === "language" ? "Local Data Language"
                            : ftype === "numberic-test" ? "Numeric"
                                : ftype.charAt(0).toUpperCase() + ftype.slice(1);

        var cfg = {
            id: id,
            type: "field",
            ftype: ftype,
            uiMode: uiMode || "core",      // core / ess
            caption: caption,
            required: false,
            disabled: false,
            defaultValue: "",
            items: (ftype === "combo" ? ["Item 1", "Item 2"] : []),
            left: 20,
            top: 20 + idx * 35,
            width: defWidth,
            height: defHeight,
            labelWidth: 120,
            captionBold: false,
            captionItalic: false,
            captionPosition: defaultCaptionPosition,
            parentId: null,
            tabPageId: null,
            tabIndex: null,
            zIndex: (ftype === "groupbox" || ftype === "section") ? 0 : 1
        };

        // ĐIỀU CHỈNH RIÊNG CHO BUTTON
        if (ftype === "button") {
            cfg.caption = "";
            cfg.defaultValue = "...";
            cfg.labelWidth = 0;

            // ESS button: cấu hình màu
            if (uiMode === "ess") {
                cfg.btnBackColor = cfg.btnBackColor || "#ffffff";
                cfg.btnTextColor = cfg.btnTextColor || "#0A75BA";
                cfg.btnBorderColor = cfg.btnBorderColor || "#0A75BA"; // mặc định viền xanh
            }
        }

        // TAG – giống button nhưng style pill
        if (ftype === "tag") {
            cfg.caption = "";
            cfg.defaultValue = "In Progress";
            cfg.labelWidth = 0;

            if (uiMode === "ess") {
                cfg.tagBackColor = cfg.tagBackColor || "#0D9EFF";
                cfg.tagTextColor = cfg.tagTextColor || "#ffffff";
            }
        }

        // PROGRESSBAR
        if (ftype === "progress") {
            cfg.caption = "";
            cfg.defaultValue = "";
            cfg.labelWidth = 0;
            if (typeof cfg.progressValue !== "number") {
                cfg.progressValue = 0;
            }
        }

        // IMAGE
        if (ftype === "image") {
            cfg.caption = "";
            cfg.defaultValue = "";
            cfg.labelWidth = 0;
            cfg.imageData = cfg.imageData || null; // base64 hoặc url
        }

        return cfg;
    }


    // Lấy danh sách id mọi field là con/cháu/chắt của rootId
    function getDescendantFieldIds(rootId, includeRoot) {
        var result = [];
        var fields = (builder.controls || []).filter(function (c) {
            return c && c.type === "field";
        });

        var map = {};
        fields.forEach(function (f) {
            map[f.id] = f.parentId || null;
        });

        function isDescendant(id) {
            var cur = map[id];
            while (cur) {
                if (cur === rootId) return true;
                cur = map[cur];
            }
            return false;
        }

        fields.forEach(function (f) {
            if (includeRoot && f.id === rootId) {
                result.push(f.id);
            } else if (isDescendant(f.id)) {
                result.push(f.id);
            }
        });

        return result;
    }

    // CẬP NHẬT z-index cho toàn bộ field con của 1 container
    // baseZ: z-index muốn áp cho CON (thường = z-index container + 1)
    function updateDescendantsZIndex(rootId, baseZ) {
        if (!window.builder || !builder.controls) return;

        var ids = getDescendantFieldIds(rootId, false); // không lấy root
        if (!ids || !ids.length) return;

        ids.forEach(function (cid) {
            var childCfg = builder.getControlConfig(cid);
            if (!childCfg) return;

            childCfg.zIndex = baseZ;
            $('.canvas-control.page-field[data-id="' + cid + '"]').css("z-index", baseZ);
        });
    }



    // Di chuyển tất cả field con/cháu của rootId
    function moveDescendants(rootId, dx, dy, includeRoot) {
        var ids = getDescendantFieldIds(rootId, includeRoot);

        ids.forEach(function (id) {
            var c = builder.controls.find(function (x) { return x.id === id; });
            if (!c) return;

            var $dom = $('.canvas-control.page-field[data-id="' + id + '"]');
            var curL = parseFloat($dom.css("left")) || c.left || 0;
            var curT = parseFloat($dom.css("top")) || c.top || 0;
            var nl = curL + dx;
            var nt = curT + dy;

            $dom.css({ left: nl, top: nt });
            c.left = nl;
            c.top = nt;
        });
    }

    // Hiển thị/ẩn field theo Tab đang active
    function applyTabVisibilityFor(tabCfg) {
        var tabId = tabCfg.id;
        var activeIndex = tabCfg.activeTabIndex || 0;

        (builder.controls || []).forEach(function (c) {
            if (!c || c.type !== "field") return;
            if (c.tabPageId !== tabId) return;

            var $dom = $('.canvas-control.page-field[data-id="' + c.id + '"]');
            var idx = (typeof c.tabIndex === "number") ? c.tabIndex : 0;
            if (idx === activeIndex) $dom.show();
            else $dom.hide();
        });
    }

    function findParentContainerFor(fieldCfg) {
        var left = fieldCfg.left;
        var top = fieldCfg.top;
        var right = fieldCfg.left + fieldCfg.width;
        var bottom = fieldCfg.top + fieldCfg.height;

        var best = null;

        (builder.controls || []).forEach(function (c) {
            if (!c) return;
            if (c.id === fieldCfg.id) return;

            var isFieldContainer = (c.type === "field" &&
                (c.ftype === "groupbox" || c.ftype === "section"));
            var isTabPage = (c.type === "tabpage");
            var isPopup = (c.type === "popup");

            if (!isFieldContainer && !isTabPage && !isPopup) return;

            var cRight = c.left + c.width;
            var cBottom = c.top + c.height;

            if (left >= c.left && top >= c.top && right <= cRight && bottom <= cBottom) {
                if (!best || (c.left >= best.left && c.top >= best.top &&
                    c.width <= best.width && c.height <= best.height)) {
                    best = c;
                }
            }
        });

        return best ? best.id : null;
    }

    function updateFieldParent(fieldCfg) {
        var pid = findParentContainerFor(fieldCfg);
        fieldCfg.parentId = pid || null;

        // reset info tab
        fieldCfg.tabPageId = null;
        fieldCfg.tabIndex = null;

        var $dom = $('.canvas-control.page-field[data-id="' + fieldCfg.id + '"]');

        // Không nằm trong container nào → dùng z-index mặc định
        if (!pid) {
            var defZ = (fieldCfg.ftype === "groupbox" || fieldCfg.ftype === "section") ? 0 : 1;
            fieldCfg.zIndex = defZ;
            $dom.css("z-index", defZ);
            return;
        }

        var parentCfg = (builder.controls || []).find(function (c) { return c.id === pid; });
        if (!parentCfg) return;

        if (parentCfg.type === "tabpage") {
            fieldCfg.tabPageId = parentCfg.id;
            fieldCfg.tabIndex = parentCfg.activeTabIndex || 0;
        } else if (parentCfg.type === "field") {
            fieldCfg.tabPageId = parentCfg.tabPageId || null;
            if (typeof parentCfg.tabIndex === "number") {
                fieldCfg.tabIndex = parentCfg.tabIndex;
            }

            // ✅ FIX Z-INDEX: con phải nằm trên parent container
            var pz = parseInt(parentCfg.zIndex || "0", 10);
            if (isNaN(pz)) pz = 0;

            var childZ = pz + 1;
            fieldCfg.zIndex = childZ;
            $dom.css("z-index", childZ);

            // nếu bản thân fieldCfg cũng là container -> nâng luôn con của nó
            if (fieldCfg.ftype === "groupbox" || fieldCfg.ftype === "section") {
                updateDescendantsZIndex(fieldCfg.id, childZ + 1);
            }
        } else if (parentCfg.type === "popup") {
            // Field là con của popup
            var $popup = $('.popup-design[data-id="' + parentCfg.id + '"]');
            if ($popup.length && $dom.length) {
                // Đưa DOM field nằm ngay sau popup để đảm bảo vẽ phía trên
                $dom.insertAfter($popup);

                var popupZ = parseInt($popup.css("z-index") || "0", 10);
                if (isNaN(popupZ)) popupZ = 0;

                // z-index của chính field (section/group/textbox, ...)
                var newZ = popupZ + 1;
                fieldCfg.zIndex = newZ;
                $dom.css("z-index", newZ);

                // ✅ FIX: nếu chính nó là container (groupbox/section)
                // thì tăng luôn z-index cho toàn bộ field con bên trong,
                // để con không bị nằm dưới section/popup.
                if (fieldCfg.ftype === "groupbox" || fieldCfg.ftype === "section") {
                    // Cho tất cả con = newZ + 1 (cao hơn container)
                    updateDescendantsZIndex(fieldCfg.id, newZ + 1);
                }
            }
        }
    }

    function collectDescendants(rootId) {
        var result = [];

        function dfs(parentId) {
            (builder.controls || []).forEach(function (c) {
                if (!c || c.type !== "field") return;
                if (c.parentId === parentId) {
                    result.push(c.id);
                    dfs(c.id);
                }
            });
        }

        dfs(rootId);
        return result;
    }

    function deleteFieldWithChildren(fieldId) {
        if (!fieldId) return;

        var idsToRemove = [fieldId].concat(collectDescendants(fieldId));

        idsToRemove.forEach(function (id) {
            $('.canvas-control.page-field[data-id="' + id + '"]').remove();
        });

        builder.controls = (builder.controls || []).filter(function (c) {
            return !(c && c.type === "field" && idsToRemove.indexOf(c.id) >= 0);
        });

        multiSelectedIds = [];
        if (builder.selectedControlId && idsToRemove.indexOf(builder.selectedControlId) >= 0) {
            builder.selectedControlId = null;
        }
        $(".page-field").removeClass("page-field-selected");

        builder.refreshJson();
    }


    // Layout cho field thường (không group/section/language)
    function applyLayout($field, cfg) {
        if (cfg.ftype === "groupbox" || cfg.ftype === "section" || cfg.ftype === "language")
            return;

        var uiMode = cfg.uiMode || "core";
        var isEss = uiMode === "ess";

        var $cap = $field.find(".page-field-caption");
        var $editor = $field.find(".page-field-editor");

        var isButton = (cfg.ftype === "button");
        var isTag = (cfg.ftype === "tag");
        var isProgress = (cfg.ftype === "progress");
        var isImage = (cfg.ftype === "image");
        var isButtonLike = isButton || isTag || isProgress || isImage;

        var isCheck = (cfg.ftype === "checkbox" || cfg.ftype === "radio");
        var pos = cfg.captionPosition || "left";
        var hasCaption = !!(cfg.caption && cfg.caption.trim() !== "");

        // BUTTON-LIKE: không caption, editor chiếm full
        if (isButtonLike) {
            $cap.hide();

            var totalW = cfg.width || $field.outerWidth() || 50;
            var totalH = cfg.height || $field.outerHeight() || 24;

            $field.css({
                width: totalW,
                height: totalH
            });

            $editor.css({
                width: "100%",
                height: "100%",
                display: isEss ? "flex" : "block",
                "align-items": isEss ? "center" : ""
            });

            if (isButton) {
                $editor.find("button").css({
                    width: "100%",
                    height: "100%"
                });
            } else if (isTag) {
                $editor.find(".ess-tag").css({
                    maxWidth: "100%"
                });
            } else if (isProgress) {
                $editor.find(".ess-progress").css({
                    width: "100%"
                });
            } else if (isImage) {
                $editor.find(".ess-image-drop").css({
                    width: "100%",
                    height: "100%"
                });
            }

            return;
        }

        // Không có caption -> editor full width
        if (!hasCaption) {
            $cap.hide();
            if (isEss) {
                $editor.css({
                    flex: "1 1 auto",
                    width: "100%",
                    display: "flex"
                });
            } else {
                var totalW2 = cfg.width || $field.outerWidth() || 260;
                $editor.css({
                    width: totalW2 + "px",
                    display: "inline-block"
                });
            }
            return;
        } else {
            $cap.show();
        }

        // CHECKBOX / RADIO – giữ logic cũ
        if (isCheck) {
            if (pos === "right") {
                if ($editor.index() > $cap.index()) {
                    $editor.insertBefore($cap);
                }

                $editor.css({
                    width: "auto",
                    display: "inline-block"
                });

                $cap.css({
                    width: "auto",
                    display: "inline-block",
                    "margin-left": "4px"
                });

                return;
            } else {
                if ($cap.index() > $editor.index()) {
                    $cap.insertBefore($editor);
                }
            }
        }

        // Layout 2 cột: Caption + Editor
        var labelWidth = cfg.labelWidth || 120;
        var totalWidth = cfg.width || $field.outerWidth() || 260;
        var editorWidth = Math.max(40, totalWidth - labelWidth - 10);

        if (isEss) {
            // ESS: dùng flex, caption cố định, editor co giãn
            $field.css("width", totalWidth + "px");

            $cap.css({
                width: labelWidth + "px",
                flex: "0 0 " + labelWidth + "px",
                display: "block"   // wrap đẹp hơn
            });

            $editor.css({
                flex: "1 1 auto",
                width: "auto",
                display: "flex"
            });
        } else {
            // CORE: inline-block như cũ
            $cap.css({
                width: labelWidth + "px",
                display: "inline-block"
            });
            $editor.css({
                width: editorWidth + "px",
                display: "inline-block"
            });
        }
    }

    // ESS: set height cho input/select/textarea/button bên trong theo height field
    function applyEssInnerHeight($field, cfg) {
        if (cfg.uiMode !== "ess") return;
        if (cfg.ftype === "groupbox" || cfg.ftype === "section" || cfg.ftype === "language") return;

        var h = cfg.height || $field.outerHeight() || 0;
        if (!h) return;

        // Vùng bên trong trừ padding top/bottom 4px
        var innerH = Math.max(18, h - 8);

        // Canh giữa caption theo chiều dọc cho ESS
        var $cap = $field.find(".page-field-caption");
        if ($cap.length) {
            // Nếu caption dài -> cho wrap => KHÔNG ép line-height = innerH
            $cap.css({
                height: "auto",
                "line-height": "1.2",
                "padding-top": "2px",
                "padding-bottom": "2px"
            });
        }

        // ==== ESS DATE: input-group + icon calendar ====
        if (cfg.ftype === "date") {
            var $grp = $field.find(".ess-date.input-group");
            if ($grp.length) {
                $grp.css("height", innerH + "px");

                var $input = $grp.find("input.form-control");
                var $addon = $grp.find(".ess-date-addon");

                $input.css({
                    height: innerH + "px",
                    "line-height": innerH + "px"
                });

                $addon.css({
                    height: (innerH - 2) + "px",
                    "line-height": innerH + "px"
                });

                return; // đã xử lý xong date thì thoát
            }
        }

        // ==== Các ESS control khác ====
        var $inner = null;
        var hInner = innerH;

        if (cfg.ftype === "memo") {
            $inner = $field.find(".page-field-editor textarea");
        } else if (cfg.ftype === "button") {
            // ESS button – chừa thêm chút cho border/padding
            $inner = $field.find(".page-field-editor button");
            hInner = Math.max(22, h - 12);
        } else if (cfg.ftype === "tag") {
            $inner = $field.find(".ess-tag");
        } else if (cfg.ftype === "progress") {
            $inner = $field.find(".ess-progress");
        } else if (cfg.ftype === "image") {
            $inner = $field.find(".ess-image-drop");
        } else {
            $inner = $field.find(".page-field-editor").find("input,select,textarea");
        }

        if (!$inner || !$inner.length) return;

        $inner.css("height", hInner + "px");
    }



    function render(cfg) {
        var $canvas = $("#canvas");

        if ((cfg.ftype === "checkbox" || cfg.ftype === "radio") && !cfg.captionPosition) {
            cfg.captionPosition = "left";
        }
        if (!cfg.uiMode) cfg.uiMode = "core"; // field cũ load lên -> core

        var uiMode = cfg.uiMode || "core";
        var extraClass = uiMode === "ess" ? " ess-field" : " core-field";

        var $field;
        var isContainer = (cfg.ftype === "groupbox" || cfg.ftype === "section");

        if (cfg.ftype === "groupbox") {
            $field = $(`
<div class="canvas-control page-field page-field-groupbox${extraClass}" data-id="${cfg.id}">
  <div class="page-field-groupbox-title">${cfg.caption != null ? cfg.caption : "Group"}</div>
  <div class="page-field-resizer"></div>
</div>`);
        } else if (cfg.ftype === "section") {
            $field = $(`
<div class="canvas-control page-field page-field-section${extraClass}" data-id="${cfg.id}">
  <div class="page-field-section-header">${cfg.caption != null ? cfg.caption : "Section"}</div>
  <div class="page-field-resizer"></div>
</div>`);
        } else {
            $field = $(`
<div class="canvas-control page-field${extraClass}" data-id="${cfg.id}">
  <label class="page-field-caption"></label>
  <div class="page-field-editor"></div>
  <div class="page-field-resizer"></div>
</div>`);

            var $cap = $field.find(".page-field-caption");

            if (cfg.ftype === "button") {
                $cap.text("").hide();
            } else {
                var capText = (cfg.caption != null ? cfg.caption : cfg.ftype);
                $cap.text(capText);
                $cap.css("font-weight", cfg.captionBold ? "700" : "normal");
                $cap.css("font-style", cfg.captionItalic ? "italic" : "normal");
            }

            if (cfg.required) {
                $cap.addClass("page-field-caption-required");
            }

            var $editor;
            switch (cfg.ftype) {
                case "text":
                    $editor = $('<input type="text" />');
                    break;

                case "date":
                    if (cfg.uiMode === "ess") {
                        $editor = $(`
<div class="ess-date input-group">
    <input type="text" class="form-control ess-date-input" />
    <span class="input-group-text ess-date-addon">
        <i class="bi bi-calendar3"></i>
    </span>
</div>`);
                    } else {
                        $editor = $('<input type="date" class="core-date-input" />');
                    }
                    break;

                case "number":
                    $editor = $(`
<div class="core-number">
    <input type="number" class="core-number-input" />
    <button type="button" class="core-spin-up">▲</button>
    <button type="button" class="core-spin-down">▼</button>
</div>`);
                    break;
                case "numberic-test":
                    $editor = $(`
<div class="ess-number">
    <input type="number" class="ess-number-input" />
    <button type="button" class="ess-spin-up">▲</button>
    <button type="button" class="ess-spin-down">▼</button>
</div>`);
                    break;
                case "combo":
                    $editor = $('<select></select>');
                    (cfg.items || []).forEach(function (it) {
                        $("<option>").text(it).val(it).appendTo($editor);
                    });
                    break;
                case "memo":
                    $editor = $('<textarea rows="3"></textarea>');
                    break;
                case "label":
                    $editor = $('<span></span>');
                    break;
                case "checkbox":
                    $editor = $('<label><input type="checkbox" /> <span>' +
                        (cfg.defaultValue || "") + '</span></label>');
                    break;
                case "radio":
                    $editor = $('<label><input type="radio" /> <span>' +
                        (cfg.defaultValue || "") + '</span></label>');
                    break;
                case "language":
                    $editor = $('<select class="page-lang-select-en"><option>English</option></select>');
                    break;
                case "button":
                    var btnCls = "page-field-button-editor" + (cfg.uiMode === "ess" ? " ess-button" : "");
                    $editor = $('<button type="button" class="' + btnCls + '"></button>');
                    $editor.text(cfg.defaultValue || cfg.caption || "Button");
                    if (cfg.disabled) $editor.prop("disabled", true);

                    // Áp màu cho ESS button
                    if (cfg.uiMode === "ess") {
                        cfg.btnBackColor = cfg.btnBackColor || "#ed120b";
                        cfg.btnTextColor = cfg.btnTextColor || "#ffffff";
                        cfg.btnBorderColor = cfg.btnBorderColor || "#0A75BA";

                        $editor.css({
                            "background-color": cfg.btnBackColor,
                            "color": cfg.btnTextColor,
                            "border-color": cfg.btnBorderColor
                        });
                    }
                    break;

                case "tag":
                    var tagText = cfg.defaultValue || "In Progress";
                    var tagBg = cfg.tagBackColor || "#0D9EFF";
                    var tagColor = cfg.tagTextColor || "#ffffff";
                    $editor = $(`
<div class="ess-tag">
  <span class="ess-tag-icon"><i class="bi bi-tag-fill"></i></span>
  <span class="ess-tag-text"></span>
</div>`);
                    $editor.find(".ess-tag-text").text(tagText);
                    $editor.css({
                        "background-color": tagBg,
                        "color": tagColor
                    });
                    break;

                case "progress":
                    var val = (typeof cfg.progressValue === "number") ? cfg.progressValue : 0;
                    val = Math.max(0, Math.min(100, val));
                    cfg.progressValue = val;
                    $editor = $(`
<div class="ess-progress">
  <div class="ess-progress-track">
    <div class="ess-progress-fill" style="width:${val}%;"></div>
  </div>
  <div class="ess-progress-text">${val}%</div>
</div>`);
                    break;

                case "image":
                    var mode = getImageMode(cfg);
                    var innerHtml = cfg.imageData
                        ? '<img class="ess-image-img" src="' + cfg.imageData + '" />'
                        : '<span class="ess-image-placeholder">Drop / paste image</span>';

                    $editor = $(`
<div class="ess-image-drop">
  <div class="ess-image-inner ess-image-mode-${mode}">
    ${innerHtml}
  </div>
</div>`);
                    break;



                default:
                    $editor = $('<input type="text" />');
                    break;
            }

            // Gán defaultValue cho vài loại đặc biệt
            if (cfg.ftype === "label" && cfg.defaultValue) {
                $editor.text(cfg.defaultValue);
            } else if ((cfg.ftype === "checkbox" || cfg.ftype === "radio") && cfg.defaultValue) {
                $editor.find("span").text(cfg.defaultValue);
            } else if (cfg.ftype === "number" || cfg.ftype === "numberic-test" && cfg.defaultValue) {
                $editor.find("input[type='number']").val(cfg.defaultValue);
            } else if (cfg.ftype === "button" && cfg.defaultValue) {
                $editor.text(cfg.defaultValue);
            } else if (cfg.ftype === "date" && cfg.defaultValue) {
                if (cfg.uiMode === "ess") {
                    $editor.find("input[type='text']").val(cfg.defaultValue);
                } else {
                    $editor.val(cfg.defaultValue);
                }
            } else if (!["combo", "checkbox", "radio", "language", "label", "button", "tag", "image", "progress"].includes(cfg.ftype) && cfg.defaultValue) {
                $editor.val(cfg.defaultValue);
            }

            // nếu load lại image từ JSON
            if (cfg.ftype === "image" && cfg.imageData) {
                var $img = $editor.find("img.ess-image");
                $img.attr("src", cfg.imageData).show();
                $editor.find(".ess-image-placeholder").hide();
            }

            $field.find(".page-field-editor").append($editor);
        }

        $canvas.append($field);

        if (cfg.ftype === "image") {
            initEssImageDrop($field, cfg);
        }

        $field.css({
            left: cfg.left,
            top: cfg.top,
            width: cfg.width,
            height: cfg.height
        });

        // ESS: đồng bộ chiều cao input/memo/button với height field
        applyEssInnerHeight($field, cfg);

        if (cfg.disabled) {
            if (cfg.ftype === "button") {
                $field.find(".page-field-editor button").prop("disabled", true);
            } else if (cfg.ftype !== "label") {
                $field.find(".page-field-editor")
                    .find("input,select,textarea,button")
                    .prop("disabled", true);
            }
            $field.addClass("page-field-disabled");
        }

        if (!isContainer && cfg.ftype !== "language") {
            applyLayout($field, cfg);
        }

        if (cfg.zIndex != null) {
            $field.css("z-index", cfg.zIndex);
        }

        // DRAG + RESIZE
        // DRAG
        var fieldInteractable = interact($field[0]);

        fieldInteractable.draggable({
            ignoreFrom: "input, select, textarea",
            // ❌ BỎ modifiers.restrictRect đi – để canvas có thể tự nở ra
            // modifiers: [
            //     interact.modifiers.restrictRect({
            //         restriction: document.getElementById("canvas"),
            //         endOnly: true
            //     })
            // ],
            listeners: {
                start: function () {
                    $field.addClass("page-field-dragging");
                    builder.beginDragSelection(cfg.id);
                },
                move: function (ev) {
                    var dx = ev.dx;
                    var dy = ev.dy;

                    // --- NEW: không cho kéo ra ngoài top/left của canvas ---
                    var $sel = $("#canvas .page-field.page-field-selected");
                    if ($sel.length) {
                        var minLeft = Infinity;
                        var minTop = Infinity;

                        $sel.each(function () {
                            var l = parseFloat($(this).css("left")) || 0;
                            var t = parseFloat($(this).css("top")) || 0;
                            if (l < minLeft) minLeft = l;
                            if (t < minTop) minTop = t;
                        });

                        if (minLeft + dx < 0) dx = -minLeft; // không cho < 0
                        if (minTop + dy < 0) dy = -minTop;
                    }
                    // --------------------------------------------------------

                    // Di chuyển selection (builder sẽ lo phần auto-extend canvas)
                    builder.dragSelectionMove(dx, dy);
                    builder.updateSelectionSizeHint();
                },
                end: function () {
                    $field.removeClass("page-field-dragging");
                    updateFieldParent(cfg);
                    builder.endDragSelection();
                }
            }
        });


        fieldInteractable.resizable({
            edges: { left: false, top: false, right: true, bottom: true },
            listeners: {
                move: function (ev) {
                    var target = ev.target;
                    var id = $(target).attr("data-id");
                    var cfg = builder.getControlConfig(id);
                    if (!cfg) return;

                    var newW = (cfg.width || target.offsetWidth) + ev.deltaRect.width;
                    var newH = (cfg.height || target.offsetHeight) + ev.deltaRect.height;

                    if (newW < 40) newW = 40;
                    if (newH < 20) newH = 20;

                    if (builder.snapEnabled) {
                        newW = Math.round(newW / builder.snapStep) * builder.snapStep;
                        newH = Math.round(newH / builder.snapStep) * builder.snapStep;
                    } else {
                        newW = Math.round(newW);
                        newH = Math.round(newH);
                    }

                    cfg.width = newW;
                    cfg.height = newH;

                    $(target).css({
                        width: newW + "px",
                        height: newH + "px"
                    });

                    if (cfg.ftype && cfg.ftype !== "groupbox" && cfg.ftype !== "section" && cfg.ftype !== "language") {
                        applyLayout($(target), cfg);
                    }

                    // ESS: cập nhật height bên trong
                    applyEssInnerHeight($(target), cfg);

                    builder.updateSelectionSizeHint();
                },
                end: function () {
                    builder.refreshJson();
                }
            }
        });

        // chọn field
        $field.on("mousedown", function (e) {
            e.stopPropagation();

            if (window.controlPopup && typeof controlPopup.clearSelection === "function") {
                controlPopup.clearSelection();
            }

            if (e.ctrlKey || e.metaKey) {
                var idx = multiSelectedIds.indexOf(cfg.id);
                if (idx >= 0) {
                    multiSelectedIds.splice(idx, 1);
                    $(this).removeClass("page-field-selected");
                } else {
                    multiSelectedIds.push(cfg.id);
                    $(this).addClass("page-field-selected");
                }
            } else {
                var alreadySelected = $(this).hasClass("page-field-selected");
                var multiDomCount = $("#canvas .page-field.page-field-selected").length;

                if (alreadySelected && multiDomCount > 1) {
                    multiSelectedIds = [];
                    $("#canvas .page-field.page-field-selected").each(function () {
                        var id = $(this).attr("data-id");
                        if (id) multiSelectedIds.push(id);
                    });
                } else {
                    multiSelectedIds = [cfg.id];
                    $(".canvas-control").removeClass("canvas-control-selected");
                    $(".page-field").removeClass("page-field-selected");
                    $(this).addClass("page-field-selected");
                }
            }

            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "field";
            builder.highlightOutlineSelection();
            showProperties(cfg);
            builder.updateSelectionSizeHint();
        });
    }
    function showProperties(cfg) {
        if (typeof cfg.width === "number") cfg.width = Math.round(cfg.width);
        if (typeof cfg.height === "number") cfg.height = Math.round(cfg.height);

        var isContainer = (cfg.ftype === "groupbox" || cfg.ftype === "section");
        var isCombo = cfg.ftype === "combo";
        var isCheckRadio = (cfg.ftype === "checkbox" || cfg.ftype === "radio");
        var isButton = (cfg.ftype === "button");
        var isTag = (cfg.ftype === "tag");
        var isProgress = (cfg.ftype === "progress");
        var isImage = (cfg.ftype === "image");
        var isEssButton = isButton && (cfg.uiMode === "ess");
        var isEssTag = isTag && (cfg.uiMode === "ess");


        var imageModeHtml = "";
        if (isImage) {
            var imode = cfg.imageMode || "fit";
            imageModeHtml = `
<div class="prop-section">
  <label>Image mode:<br/>
    <select id="pfImageMode" class="prop-input">
      <option value="fit" ${imode === "fit" ? "selected" : ""}>Fit (contain)</option>
      <option value="fill" ${imode === "fill" ? "selected" : ""}>Fill (cover)</option>
      <option value="stretch" ${imode === "stretch" ? "selected" : ""}>Stretch (distort)</option>
      <option value="center" ${imode === "center" ? "selected" : ""}>Center (original)</option>
    </select>
  </label>
</div>`;
        }

        if (isCheckRadio && !cfg.captionPosition) {
            cfg.captionPosition = "left";
        }

        var capPosHtml = "";
        if (isCheckRadio) {
            var capPos = cfg.captionPosition || "left";
            capPosHtml = `
<div class="prop-section">
  <label>Caption position:<br/>
    <select id="pfCapPos" class="prop-input">
      <option value="left"  ${capPos === "left" ? "selected" : ""}>Left of control</option>
      <option value="right" ${capPos === "right" ? "selected" : ""}>Right of control</option>
    </select>
  </label>
</div>`;
        }

        var defaultLabel;
        if (isButton) defaultLabel = "Button text:";
        else if (isTag) defaultLabel = "Tag text:";
        else defaultLabel = "Default value:";

        var hideDefaultSection = isContainer || isImage;

        var buttonColorHtml = "";
        var tagColorHtml = "";

        function normalizeColor(val, fallback) {
            if (!val) return fallback;
            val = $.trim(val);

            // "fff" -> "#FFFFFF"
            if (/^[0-9a-f]{3}$/i.test(val)) {
                var r = val[0], g = val[1], b = val[2];
                return ("#" + r + r + g + g + b + b).toUpperCase();
            }

            // "ffffff" -> "#FFFFFF"
            if (/^[0-9a-f]{6}$/i.test(val)) {
                return ("#" + val).toUpperCase();
            }

            // "#fff" -> "#FFFFFF"
            if (/^#[0-9a-f]{3}$/i.test(val)) {
                var r2 = val[1], g2 = val[2], b2 = val[3];
                return ("#" + r2 + r2 + g2 + g2 + b2 + b2).toUpperCase();
            }

            // "#ffffff" -> "#FFFFFF"
            if (/^#[0-9a-f]{6}$/i.test(val)) {
                return val.toUpperCase();
            }

            return fallback;
        }

        if (isEssButton) {
            var back = normalizeColor(cfg.btnBackColor, "#ed120b");
            var text = normalizeColor(cfg.btnTextColor, "#ffffff");
            var border = normalizeColor(cfg.btnBorderColor, "#0A75BA");

            cfg.btnBackColor = back;
            cfg.btnTextColor = text;
            cfg.btnBorderColor = border;

            buttonColorHtml =
                '<div class="prop-section">' +
                '<label>Button background color:</label>' +
                '<div class="prop-color-row">' +
                '<input id="pfBtnBackColorPicker" type="color" class="prop-color-picker" value="' + back + '">' +
                '<input id="pfBtnBackColor" type="text" class="prop-input-small" value="' + back + '">' +
                '</div>' +
                '</div>' +
                '<div class="prop-section">' +
                '<label>Button text color:</label>' +
                '<div class="prop-color-row">' +
                '<input id="pfBtnTextColorPicker" type="color" class="prop-color-picker" value="' + text + '">' +
                '<input id="pfBtnTextColor" type="text" class="prop-input-small" value="' + text + '">' +
                '</div>' +
                '</div>' +
                '<div class="prop-section">' +
                '<label>Button border color:</label>' +
                '<div class="prop-color-row">' +
                '<input id="pfBtnBorderColorPicker" type="color" class="prop-color-picker" value="' + border + '">' +
                '<input id="pfBtnBorderColor" type="text" class="prop-input-small" value="' + border + '">' +
                '</div>' +
                '</div>';
        }

        if (isEssTag) {
            var tBack = normalizeColor(cfg.tagBackColor, "#0D9EFF");
            var tText = normalizeColor(cfg.tagTextColor, "#ffffff");

            cfg.tagBackColor = tBack;
            cfg.tagTextColor = tText;

            tagColorHtml =
                '<div class="prop-section">' +
                '<label>Tag background color:</label>' +
                '<div class="prop-color-row">' +
                '<input id="pfTagBackColorPicker" type="color" class="prop-color-picker" value="' + tBack + '">' +
                '<input id="pfTagBackColor" type="text" class="prop-input-small" value="' + tBack + '">' +
                '</div>' +
                '</div>' +
                '<div class="prop-section">' +
                '<label>Tag text color:</label>' +
                '<div class="prop-color-row">' +
                '<input id="pfTagTextColorPicker" type="color" class="prop-color-picker" value="' + tText + '">' +
                '<input id="pfTagTextColor" type="text" class="prop-input-small" value="' + tText + '">' +
                '</div>' +
                '</div>';
        }

        var progressHtml = "";
        if (isProgress) {
            var val = (typeof cfg.progressValue === "number") ? cfg.progressValue : 0;
            val = Math.max(0, Math.min(100, val));
            cfg.progressValue = val;
            progressHtml =
                '<div class="prop-section">' +
                '<label>Progress (%):<br/>' +
                '<input id="pfProgressValue" type="number" min="0" max="100" class="prop-input-small" value="' + val + '" />' +
                '</label>' +
                '</div>';
        }

        var html = `
<h3>Field properties</h3>
<div class="prop-section">
  <div><b>ID:</b> ${cfg.id}</div>
  <div><b>Type:</b> ${cfg.ftype}</div>
  <div><b>UI mode:</b> ${cfg.uiMode || "core"}</div>
</div>
<div class="prop-section" ${(isButton || isTag || isImage || isProgress) ? 'style="display:none"' : ""}>
  <label>Caption:<br/>
    <input id="pfCaption" type="text" class="prop-input" value="${cfg.caption != null ? cfg.caption : ""}" />
  </label>
</div>
<div class="prop-section" ${(isButton || isTag || isImage || isProgress) ? 'style="display:none"' : ""}>
  <label><input type="checkbox" id="pfBold" ${cfg.captionBold ? "checked" : ""}/> Bold</label>
  <label style="margin-left:10px;"><input type="checkbox" id="pfItalic" ${cfg.captionItalic ? "checked" : ""}/> Italic</label>
</div>
<div class="prop-section" ${(isButton || isTag || isImage || isProgress || isContainer) ? 'style="display:none"' : ""}>
  <label>
    <input type="checkbox" id="pfRequired" ${cfg.required ? "checked" : ""} />
    Required
  </label>
</div>
<div class="prop-section">
  <label>
    <input type="checkbox" id="pfDisabled" ${cfg.disabled ? "checked" : ""} />
    Disabled
  </label>
</div>
${capPosHtml}
<div class="prop-section" ${hideDefaultSection ? 'style="display:none"' : ""}>
  <label>${defaultLabel}<br/>
    <input id="pfDefault" type="text" class="prop-input" value="${(cfg.defaultValue !== undefined && cfg.defaultValue !== null) ? cfg.defaultValue : ""}" />
  </label>
</div>
${imageModeHtml}
${progressHtml}
<div class="prop-section" id="pfItemsBlock" style="${isCombo ? "" : "display:none"}">
  <label>Items (one per line):<br/>
    <textarea id="pfItems" class="prop-textarea">${(cfg.items || []).join("\n")}</textarea>
  </label>
</div>
<div class="prop-section" ${(isContainer || cfg.ftype === "language" || isButton || isTag || isImage || isProgress) ? 'style="display:none"' : ""}>
  <label>Caption width:<br/>
    <input id="pfLabelWidth" type="number" class="prop-input-small" value="${cfg.labelWidth || 120}" />
  </label>
</div>
${buttonColorHtml}
${tagColorHtml}
<div class="prop-section">
  <label>Width:<br/>
    <input id="pfWidth" type="number" class="prop-input-small" value="${cfg.width}" />
  </label>
  <label>Height:<br/>
    <input id="pfHeight" type="number" class="prop-input-small" value="${cfg.height}" />
  </label>
</div>
<div class="prop-section">
  <label>Z-index:<br/>
    <input id="pfZIndex" type="number" class="prop-input-small" value="${cfg.zIndex != null ? cfg.zIndex : ""}" />
  </label>
</div>
<div class="prop-section">
  <button type="button" onclick="builder.saveControlToServer('${cfg.id}')">💾 Lưu control này vào DB</button>
</div>
`;

        $("#propPanel").html(html);

        var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');

        // ====== ESS BUTTON COLOR BINDING ======
        if (isEssButton) {
            var $btn = $dom.find(".page-field-editor button");

            function applyEssBtnColors() {
                var bg = cfg.btnBackColor || "#ed120b";
                var tc = cfg.btnTextColor || "#ffffff";
                var bc = cfg.btnBorderColor || "#0A75BA";

                $btn.css({
                    "background-color": bg,
                    "color": tc,
                    "border-color": bc
                });
            }

            function bindColorPair(txtSel, pickSel, cfgKey) {
                var $txt = $(txtSel);
                var $pick = $(pickSel);

                function normalize(val) {
                    if (!val) return "";
                    val = $.trim(val);

                    // "fff" / "ffffff"
                    if (/^[0-9a-f]{3}$/i.test(val)) {
                        var r = val[0], g = val[1], b = val[2];
                        return ("#" + r + r + g + g + b + b).toUpperCase();
                    }
                    if (/^[0-9a-f]{6}$/i.test(val)) {
                        return ("#" + val).toUpperCase();
                    }

                    // "#fff" / "#ffffff"
                    if (/^#[0-9a-f]{3}$/i.test(val)) {
                        var r2 = val[1], g2 = val[2], b2 = val[3];
                        return ("#" + r2 + r2 + g2 + g2 + b2 + b2).toUpperCase();
                    }
                    if (/^#[0-9a-f]{6}$/i.test(val)) {
                        return val.toUpperCase();
                    }

                    return val; // format lạ thì để nguyên
                }

                if ($txt.length) {
                    $txt.on("change blur", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($pick.length && /^#[0-9a-f]{6}$/i.test(v)) {
                            $pick.val(v);
                        }
                        applyEssBtnColors();
                        builder.refreshJson();
                    });
                }

                if ($pick.length) {
                    $pick.on("input change", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($txt.length) $txt.val(v);
                        applyEssBtnColors();
                        builder.refreshJson();
                    });
                }
            }

            bindColorPair("#pfBtnBackColor", "#pfBtnBackColorPicker", "btnBackColor");
            bindColorPair("#pfBtnTextColor", "#pfBtnTextColorPicker", "btnTextColor");
            bindColorPair("#pfBtnBorderColor", "#pfBtnBorderColorPicker", "btnBorderColor");

            // áp màu lần đầu
            applyEssBtnColors();
        }

        // ====== ESS TAG COLOR BINDING ======
        if (isEssTag) {
            var $tag = $dom.find(".ess-tag");

            function applyEssTagColors() {
                var bg = cfg.tagBackColor || "#0D9EFF";
                var tc = cfg.tagTextColor || "#ffffff";
                $tag.css({
                    "background-color": bg,
                    "color": tc
                });
            }

            function bindTagColorPair(txtSel, pickSel, cfgKey) {
                var $txt = $(txtSel);
                var $pick = $(pickSel);

                function normalize(val) {
                    if (!val) return "";
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

                if ($txt.length) {
                    $txt.on("change blur", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($pick.length && /^#[0-9a-f]{6}$/i.test(v)) {
                            $pick.val(v);
                        }
                        applyEssTagColors();
                        builder.refreshJson();
                    });
                }

                if ($pick.length) {
                    $pick.on("input change", function () {
                        var v = normalize($(this).val());
                        if (!v) return;
                        cfg[cfgKey] = v;
                        if ($txt.length) $txt.val(v);
                        applyEssTagColors();
                        builder.refreshJson();
                    });
                }
            }

            bindTagColorPair("#pfTagBackColor", "#pfTagBackColorPicker", "tagBackColor");
            bindTagColorPair("#pfTagTextColor", "#pfTagTextColorPicker", "tagTextColor");

            applyEssTagColors();
        }

        // ====== BIND COMMON PROPERTIES ======
        $("#pfCaption").on("input", function () {
            cfg.caption = this.value;

            if (cfg.ftype === "groupbox") {
                $dom.find(".page-field-groupbox-title").text(cfg.caption || "");
            } else if (cfg.ftype === "button") {
                $dom.find(".page-field-editor button").text(cfg.caption || "");
            } else if (cfg.ftype === "section") {
                $dom.find(".page-field-section-header").text(cfg.caption || "");
            } else {
                var $cap = $dom.find(".page-field-caption");
                $cap.text(cfg.caption || "");
                applyLayout($dom, cfg);
            }
            builder.refreshJson();
        });

        $("#pfBold").on("change", function () {
            cfg.captionBold = this.checked;
            $dom.find(".page-field-caption")
                .css("font-weight", cfg.captionBold ? "700" : "normal");
            builder.refreshJson();
        });

        $("#pfItalic").on("change", function () {
            cfg.captionItalic = this.checked;
            $dom.find(".page-field-caption")
                .css("font-style", cfg.captionItalic ? "italic" : "normal");
            builder.refreshJson();
        });

        $("#pfDisabled").on("change", function () {
            cfg.disabled = this.checked;

            if (cfg.ftype === "button") {
                $dom.find(".page-field-editor button").prop("disabled", cfg.disabled);
            } else if (cfg.ftype !== "label") {
                $dom.find(".page-field-editor")
                    .find("input,select,textarea,button")
                    .prop("disabled", cfg.disabled);
            }

            if (cfg.disabled) $dom.addClass("page-field-disabled");
            else $dom.removeClass("page-field-disabled");

            builder.refreshJson();
        });

        $("#pfRequired").on("change", function () {
            cfg.required = this.checked;
            var $cap = $dom.find(".page-field-caption");
            if (cfg.required) {
                $cap.addClass("page-field-caption-required");
            } else {
                $cap.removeClass("page-field-caption-required");
            }
            builder.refreshJson();
        });

        if (isCheckRadio) {
            $("#pfCapPos").on("change", function () {
                cfg.captionPosition = this.value;
                applyLayout($dom, cfg);
                builder.refreshJson();
            });
        }

        $("#pfDefault").on("input", function () {
            cfg.defaultValue = this.value;
            if (cfg.ftype === "label") {
                $dom.find(".page-field-editor span, .page-field-editor").first().text(cfg.defaultValue);
            } else if (cfg.ftype === "checkbox" || cfg.ftype === "radio") {
                $dom.find(".page-field-editor span").text(cfg.defaultValue);
            } else if (cfg.ftype === "button") {
                $dom.find(".page-field-editor button").text(cfg.defaultValue);
            } else if (cfg.ftype === "tag") {
                $dom.find(".ess-tag-text").text(cfg.defaultValue);
            } else if (!isContainer && cfg.ftype !== "combo" && cfg.ftype !== "language" && !isImage && !isProgress) {
                $dom.find(".page-field-editor").find("input,textarea").val(cfg.defaultValue);
            }
            builder.refreshJson();
        });

        if (isProgress) {
            $("#pfProgressValue").on("input change", function () {
                var v = parseInt(this.value || "0", 10);
                if (isNaN(v)) v = 0;
                if (v < 0) v = 0;
                if (v > 100) v = 100;
                this.value = v;
                cfg.progressValue = v;

                $dom.find(".ess-progress-fill").css("width", v + "%");
                $dom.find(".ess-progress-text").text(v + "%");

                builder.refreshJson();
            });
        }

        $("#pfItems").on("input", function () {
            if (!isCombo) return;
            var lines = this.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
            cfg.items = lines;
            var $sel = $dom.find("select");
            $sel.empty();
            lines.forEach(function (it) {
                $("<option>").text(it).val(it).appendTo($sel);
            });
            builder.refreshJson();
        });

        if (isImage) {
            $("#pfImageMode").on("change", function () {
                cfg.imageMode = this.value || "fit";
                applyImageDomForField(cfg);
                builder.refreshJson();
            });
        }

        $("#pfLabelWidth").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.labelWidth = v;
                applyLayout($dom, cfg);
                builder.refreshJson();
            }
        });

        $("#pfWidth").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.width = v;
                $dom.css("width", v);
                if (!isContainer && cfg.ftype !== "language") applyLayout($dom, cfg);
                builder.refreshJson();
            }
        });

        $("#pfHeight").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.height = v;
                $dom.css("height", v);

                if (cfg.ftype && cfg.ftype !== "groupbox" && cfg.ftype !== "section" && cfg.ftype !== "language") {
                    applyLayout($dom, cfg);
                }
                applyEssInnerHeight($dom, cfg);

                builder.refreshJson();
            }
        });

        $("#pfZIndex").on("change", function () {
            var v = this.value.trim();
            if (v === "") {
                cfg.zIndex = null;
                $dom.css("z-index", "");

                // Nếu là container, có thể reset con về 1 (tuỳ ý)
                if (cfg.ftype === "groupbox" || cfg.ftype === "section") {
                    updateDescendantsZIndex(cfg.id, 1);
                }
            } else {
                var n = parseInt(v, 10);
                if (!isNaN(n)) {
                    cfg.zIndex = n;
                    $dom.css("z-index", n);

                    // ✅ Container: cập nhật luôn cho các field con
                    if (cfg.ftype === "groupbox" || cfg.ftype === "section") {
                        updateDescendantsZIndex(cfg.id, n + 1);
                    }
                }
            }
            builder.refreshJson();
        });

    }

    return {
        addNew: function (ftype, uiMode) {
            if (!ftype) ftype = "text";
            uiMode = uiMode || "core";

            var cfg = newConfig(ftype, uiMode);
            render(cfg);
            builder.registerControl(cfg);

            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "field";
            builder.highlightOutlineSelection();
            showProperties(cfg);
            builder.updateSelectionSizeHint();
        },

        renderExisting: function (cfg) {
            render(cfg);
        },

        deleteWithChildren: deleteFieldWithChildren,
        moveDescendants: moveDescendants,
        applyTabVisibilityFor: applyTabVisibilityFor,

        // ==== multi-select helpers ====
        getSelectedIds: function () {
            return multiSelectedIds.slice();
        },
        clearSelection: function () {
            multiSelectedIds = [];
            $(".page-field").removeClass("page-field-selected");
        },
        reapplyLayout: function (fieldId) {
            var cfg = builder.getControlConfig(fieldId);
            if (!cfg) return;
            if (cfg.ftype === "groupbox" || cfg.ftype === "section" || cfg.ftype === "language") return;

            var $dom = $('.canvas-control.page-field[data-id="' + fieldId + '"]');
            if (!$dom.length) return;

            applyLayout($dom, cfg);
        }
    };
})();
