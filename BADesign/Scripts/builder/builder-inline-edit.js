(function (window, $) {
    "use strict";

    var inlineEdit = {};
    var active = null;

    function ownerOf(el) {
        var $root = $(el).closest(".canvas-control[data-id], .popup-design[data-id]");
        if (!$root.length || !$root.closest("#canvas-zoom-inner").length) return null;
        var cfg = builder.getControlConfig($root.attr("data-id"));
        return cfg ? { cfg: cfg, $root: $root } : null;
    }

    function ownHit($root, el, selector) {
        var $hit = $(el).closest(selector);
        if (!$hit.length) return null;
        return $hit.closest(".canvas-control[data-id], .popup-design[data-id]")[0] === $root[0] ? $hit : null;
    }

    function setLastText(el, text) {
        for (var i = el.childNodes.length - 1; i >= 0; i--) {
            if (el.childNodes[i].nodeType === 3) { el.childNodes[i].nodeValue = text; return; }
        }
        el.appendChild(document.createTextNode(text));
    }

    function fieldTarget(cfg, $root, el) {
        var $hit;
        if (cfg.ftype === "groupbox" || cfg.ftype === "section") {
            $hit = ownHit($root, el, cfg.ftype === "groupbox" ? ".page-field-groupbox-title" : ".page-field-section-header");
            if (!$hit) return null;
            return {
                box: $hit[0],
                text: cfg.caption != null ? cfg.caption : "",
                apply: function (target, text) { target.caption = text; $hit.text(text); }
            };
        }
        $hit = ownHit($root, el, ".page-field-caption");
        if ($hit) {
            return {
                box: $hit[0],
                text: cfg.caption != null ? cfg.caption : "",
                apply: function (target, text) {
                    target.caption = text;
                    $hit.text(text);
                    if (window.controlField && controlField.reapplyLayout) controlField.reapplyLayout(target.id);
                }
            };
        }
        if (cfg.ftype === "button") {
            $hit = ownHit($root, el, ".page-field-button-editor");
            if (!$hit) return null;
            return {
                box: $hit[0],
                text: cfg.defaultValue || cfg.caption || "",
                apply: function (target, text) {
                    target.defaultValue = text;
                    setLastText($hit[0], text || target.caption || "Button");
                }
            };
        }
        if (cfg.ftype === "tag") {
            $hit = ownHit($root, el, ".ess-tag");
            if (!$hit) return null;
            return {
                box: $hit[0],
                text: cfg.defaultValue || "",
                apply: function (target, text) { target.defaultValue = text; $hit.find(".ess-tag-text").text(text); }
            };
        }
        if (cfg.ftype === "label") {
            $hit = ownHit($root, el, ".page-field-editor");
            if (!$hit) return null;
            return {
                box: $hit[0],
                text: cfg.defaultValue || "",
                apply: function (target, text) { target.defaultValue = text; $hit.children("span").first().text(text); }
            };
        }
        if (cfg.ftype === "checkbox" || cfg.ftype === "radio") {
            if ($(el).is("input")) return null;
            $hit = ownHit($root, el, ".page-field-editor label");
            if (!$hit) return null;
            return {
                box: $hit[0],
                text: cfg.defaultValue || "",
                apply: function (target, text) { target.defaultValue = text; $hit.children("span").first().text(text); }
            };
        }
        return null;
    }

    function popupTarget(cfg, $root, el) {
        if ($(el).closest(".popup-header-close").length) return null;
        var $head = ownHit($root, el, ".popup-header");
        if ($head) {
            return {
                box: $head.find(".popup-header-text")[0] || $head[0],
                wide: $head[0],
                text: cfg.headerText != null ? cfg.headerText : "",
                apply: function (target, text) { target.headerText = text; $head.find(".popup-header-text").text(text); }
            };
        }
        var $bar = ownHit($root, el, ".popup-titlebar");
        if ($bar) {
            return {
                box: $bar.find(".popup-title-text")[0] || $bar[0],
                wide: $bar[0],
                text: cfg.titleText != null ? cfg.titleText : "",
                apply: function (target, text) { target.titleText = text; $bar.find(".popup-title-text").text(text); }
            };
        }
        return null;
    }

    function tabTarget(cfg, $root, el) {
        var $tab = ownHit($root, el, ".tabpage-tab");
        if (!$tab) return null;
        var index = parseInt($tab.attr("data-tab-index"), 10);
        if (isNaN(index) || !cfg.tabs || !cfg.tabs[index]) return null;
        return {
            box: $tab[0],
            text: cfg.tabs[index].caption || "",
            apply: function (target, text) {
                if (!target.tabs || !target.tabs[index]) return;
                target.tabs[index].caption = text;
                $tab.text(text || ("Tab " + (index + 1)));
            }
        };
    }

    function gridColumnIndex(cfg, $cell) {
        var $cells = $cell.parent().children("td").not(".dx-command-select, .dx-command-expand, .dx-command-edit, .dx-command-adaptive, .grid-icon-col");
        var index = $cells.index($cell);
        var shown = $.trim($cell.text());
        var columns = cfg.columns || [];
        if (index >= 0 && columns[index] && $.trim(columns[index].caption || "") === shown) return index;
        var found = -1, count = 0;
        columns.forEach(function (col, i) {
            if ($.trim(col.caption || "") === shown) { found = i; count++; }
        });
        return count === 1 ? found : -1;
    }

    function gridTarget(cfg, $root, el) {
        var $hit = ownHit($root, el, ".grid-title-text");
        if ($hit) {
            return {
                box: $hit[0],
                text: cfg.titleText || "",
                apply: function (target, text) { target.titleText = text; controlGrid.renderHeaderAndTitle(target); }
            };
        }
        $hit = ownHit($root, el, ".grid-data-caption");
        if ($hit) {
            return {
                box: $hit[0],
                text: cfg.dataHeaderCaption || "",
                apply: function (target, text) { target.dataHeaderCaption = text; controlGrid.renderHeaderAndTitle(target); }
            };
        }
        $hit = ownHit($root, el, ".grid-toolbar-btn");
        if ($hit) {
            var itemIndex = $hit.parent().children(".grid-toolbar-btn").index($hit);
            if (itemIndex < 0 || !cfg.toolbarItems || !cfg.toolbarItems[itemIndex]) return null;
            return {
                box: $hit[0],
                text: cfg.toolbarItems[itemIndex].text || "",
                apply: function (target, text) {
                    if (!target.toolbarItems || !target.toolbarItems[itemIndex]) return;
                    target.toolbarItems[itemIndex].text = text;
                    controlGrid.renderHeaderAndTitle(target);
                }
            };
        }
        $hit = ownHit($root, el, ".dx-header-row > td");
        if ($hit) {
            var colIndex = gridColumnIndex(cfg, $hit);
            if (colIndex < 0) return null;
            return {
                box: $hit[0],
                text: cfg.columns[colIndex].caption || "",
                apply: function (target, text) {
                    if (!target.columns || !target.columns[colIndex]) return;
                    target.columns[colIndex].caption = text;
                    controlGrid.refreshGrid(target);
                }
            };
        }
        return null;
    }

    function essGridTarget(cfg, $root, el) {
        var $hit = ownHit($root, el, ".ess-grid-title");
        if ($hit) {
            return {
                box: $hit[0],
                text: cfg.title || "",
                apply: function (target, text) { target.title = text; controlGridEss.render(target); }
            };
        }
        $hit = ownHit($root, el, "th[data-col-id]");
        if ($hit) {
            var colId = $hit.attr("data-col-id");
            var column = (cfg.columns || []).filter(function (col) { return String(col.id) === String(colId); })[0];
            if (!column) return null;
            return {
                box: $hit[0],
                text: column.caption || "",
                apply: function (target, text) {
                    var col = (target.columns || []).filter(function (c) { return String(c.id) === String(colId); })[0];
                    if (!col) return;
                    col.caption = text;
                    controlGridEss.render(target);
                }
            };
        }
        return null;
    }

    function toolbarTarget(cfg, $root, el) {
        var $btn = ownHit($root, el, ".canvas-toolbar-btn");
        if (!$btn) return null;
        var index = $btn.parent().children(".canvas-toolbar-btn").index($btn);
        if (index < 0 || !cfg.items || !cfg.items[index]) return null;
        return {
            box: $btn[0],
            text: cfg.items[index].text || "",
            apply: function (target, text) {
                if (!target.items || !target.items[index]) return;
                target.items[index].text = text;
                $btn.children("span").last().text(text);
            }
        };
    }

    function sectionTarget(cfg, $root, el) {
        var $title = ownHit($root, el, ".ess-collapsible-title");
        if (!$title) return null;
        return {
            box: $title[0],
            text: cfg.caption || "",
            apply: function (target, text) {
                target.caption = text || "General Information";
                $title.text(target.caption);
            }
        };
    }

    inlineEdit.resolve = function (el) {
        var owner = ownerOf(el);
        if (!owner) return null;
        var cfg = owner.cfg, $root = owner.$root, target = null;
        if (cfg.type === "field") target = fieldTarget(cfg, $root, el);
        else if (cfg.type === "popup") target = popupTarget(cfg, $root, el);
        else if (cfg.type === "tabpage") target = tabTarget(cfg, $root, el);
        else if (cfg.type === "grid" && window.controlGrid) target = gridTarget(cfg, $root, el);
        else if (cfg.type === "ess-grid" && window.controlGridEss) target = essGridTarget(cfg, $root, el);
        else if (cfg.type === "toolbar") target = toolbarTarget(cfg, $root, el);
        else if (cfg.type === "collapsible-section") target = sectionTarget(cfg, $root, el);
        if (!target) return null;
        target.id = cfg.id;
        return target;
    };

    function refreshPanel(cfg) {
        if (builder.selectedControlId !== cfg.id || builder.getAllSelectedControlIds().length > 1) return;
        var tab = builderProps.activeTab();
        if (cfg.type === "grid" && window.controlGrid) controlGrid.showProperties(cfg.id, tab);
        else if (cfg.type === "ess-grid" && window.controlGridEss) controlGridEss.showProperties(cfg, tab);
        else builder.showPropertiesFor(cfg);
    }

    function place(input, target) {
        var scale = builder.cssScale();
        var r = target.box.getBoundingClientRect();
        var wide = target.wide ? target.wide.getBoundingClientRect() : r;
        var style = window.getComputedStyle(target.box);
        var fontSize = Math.max(11, Math.min(22, (parseFloat(style.fontSize) || 12) * scale));
        var height = Math.max(24, Math.round(r.height) + 4);
        var width = Math.max(140, Math.round(Math.min(wide.right, window.innerWidth - 8) - r.left) + 8);
        width = Math.min(width, Math.max(140, window.innerWidth - 16));
        var left = Math.max(4, Math.min(Math.round(r.left) - 4, window.innerWidth - width - 4));
        var top = Math.max(4, Math.min(Math.round(r.top) - 2, window.innerHeight - height - 4));
        $(input).css({
            left: left + "px",
            top: top + "px",
            width: width + "px",
            height: height + "px",
            fontSize: fontSize + "px",
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle
        });
    }

    inlineEdit.isOpen = function () { return !!active; };

    inlineEdit.close = function (save) {
        if (!active) return;
        var session = active;
        active = null;
        document.removeEventListener("mousedown", session.outside, true);
        $(window).off(".ubInlineEdit");
        $(".canvas-shell").off(".ubInlineEdit");
        var text = session.input.value;
        $(session.input).remove();
        if (!save || text === session.original) return;

        var cfg = builder.getControlConfig(session.target.id);
        if (!cfg) return;
        var coalesce = builder._coalesceHistory;
        builder._coalesceHistory = false;
        try {
            session.target.apply(cfg, text);
            builder.refreshJson();
        } finally {
            builder._coalesceHistory = coalesce;
        }
        refreshPanel(cfg);
    };

    inlineEdit.open = function (target) {
        inlineEdit.close(true);
        if (!target || !target.box || !document.body.contains(target.box)) return false;

        var input = document.createElement("input");
        input.type = "text";
        input.className = "ub-inline-edit";
        input.maxLength = 500;
        input.value = target.text;
        input.setAttribute("autocomplete", "off");
        input.setAttribute("spellcheck", "false");
        document.body.appendChild(input);
        place(input, target);
        active = {
            input: input,
            target: target,
            original: target.text,
            outside: function (e) { if (e.target !== input) inlineEdit.close(true); }
        };
        document.addEventListener("mousedown", active.outside, true);

        $(input)
            .on("mousedown click dblclick", function (e) { e.stopPropagation(); })
            .on("keydown", function (e) {
                e.stopPropagation();
                if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); inlineEdit.close(true); }
                else if (e.key === "Escape") { e.preventDefault(); inlineEdit.close(false); }
            })
            .on("blur", function () { inlineEdit.close(true); });
        $(window).on("resize.ubInlineEdit", function () { inlineEdit.close(true); });
        $(".canvas-shell").on("scroll.ubInlineEdit wheel.ubInlineEdit", function () { inlineEdit.close(true); });

        input.focus();
        input.select();
        return true;
    };

    document.addEventListener("dblclick", function (e) {
        if (!window.builder || builder.readOnly || e.button !== 0) return;
        if (!$(e.target).closest("#canvas-zoom-inner").length) return;
        var target = inlineEdit.resolve(e.target);
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        inlineEdit.open(target);
    }, true);

    window.builderInlineEdit = inlineEdit;
})(window, jQuery);
