var controlTabPage = (function () {

    function newConfig() {
        return {
            id: "tab_" + Date.now(),
            type: "tabpage",
            left: 250,
            top: 180,
            width: 900,
            height: 220,
            tabs: [
                { caption: "General" },
                { caption: "Shift" },
                { caption: "Overtime" }
            ],
            activeTabIndex: 0,
            zIndex: 0
        };
    }

    function getDom(cfg) {
        return $('.canvas-control.canvas-tabpage[data-id="' + cfg.id + '"]');
    }

    function applyActiveTab(cfg) {
        var $dom = getDom(cfg);
        var $lis = $dom.find(".tabpage-tab");

        if (!cfg.tabs || !cfg.tabs.length) return;

        if (cfg.activeTabIndex == null ||
            cfg.activeTabIndex < 0 ||
            cfg.activeTabIndex >= cfg.tabs.length) {
            cfg.activeTabIndex = 0;
        }

        $lis.removeClass("active");
        $lis.eq(cfg.activeTabIndex).addClass("active");

        // Ẩn/hiện field trong tab
        if (window.controlField && typeof controlField.applyTabVisibilityFor === "function") {
            controlField.applyTabVisibilityFor(cfg);
        }
    }

    function renderTabsHeader($dom, cfg) {
        var $ul = $dom.find(".tabpage-tabs").empty();

        (cfg.tabs || []).forEach(function (t, idx) {
            var $li = $('<li class="tabpage-tab"></li>')
                .text(t.caption || ("Tab " + (idx + 1)))
                .attr("data-tab-index", idx);

            $li.on("click", function (e) {
                e.stopPropagation();
                cfg.activeTabIndex = idx;
                applyActiveTab(cfg);

                // Sync dropdown trong properties nếu đang chọn tab này
                if (builder.selectedControlId === cfg.id && builder.selectedControlType === "tabpage") {
                    $("#tpActiveTab").val(String(idx));
                }
                builder.refreshJson();
            });

            $ul.append($li);
        });

        applyActiveTab(cfg);
    }

    function render(cfg) {
        var $canvas = $("#canvas");

        var $tab = $(`
<div class="canvas-control canvas-tabpage" data-id="${cfg.id}">
  <ul class="tabpage-tabs"></ul>
  <div class="tabpage-body"></div>
  <div class="page-field-resizer"></div>
</div>`);

        $tab.css({
            position: "absolute",
            left: cfg.left,
            top: cfg.top,
            width: cfg.width,
            height: cfg.height
        });
        if (cfg.zIndex != null) $tab.css("z-index", cfg.zIndex);

        $("#canvas-zoom-inner").append($tab);

        renderTabsHeader($tab, cfg);

        // Drag tab page + di chuyển luôn con/cháu field
        var tabInteract = interact($tab[0]);

        tabInteract.draggable({
            ignoreFrom: ".tabpage-tabs, .page-field-resizer",
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: document.getElementById("canvas"),
                    endOnly: true
                })
            ],
            listeners: {
                move: function (ev) {
                    var dx = ev.dx;
                    var dy = ev.dy;

                    var curL = parseFloat($tab.css("left")) || cfg.left || 0;
                    var curT = parseFloat($tab.css("top")) || cfg.top || 0;
                    var nl = curL + dx;
                    var nt = curT + dy;

                    // Không cho kéo ra ngoài top/left của canvas (ruler boundary: 20px)
                    var rulerLeft = 20;
                    var rulerTop = 20;
                    if (nl < rulerLeft) nl = rulerLeft;
                    if (nt < rulerTop) nt = rulerTop;

                    $tab.css({ left: nl, top: nt });
                    cfg.left = nl;
                    cfg.top = nt;

                    // Move toàn bộ field con/cháu của tab
                    if (window.controlField && typeof controlField.moveDescendants === "function") {
                        controlField.moveDescendants(cfg.id, dx, dy, false);
                    }

                    builder.refreshJson();
                }
            }
        });

        // Resize tab page (phải + đáy)
        tabInteract.resizable({
            edges: { right: true, bottom: true },
            allowFrom: ".page-field-resizer, .canvas-tabpage",
            modifiers: [
                interact.modifiers.restrictEdges({
                    outer: document.getElementById("canvas")
                }),
                interact.modifiers.restrictSize({
                    min: { width: 300, height: 150 }
                })
            ],
            listeners: {
                move: function (ev) {
                    var newW = ev.rect.width;
                    var newH = ev.rect.height;

                    cfg.width = newW;
                    cfg.height = newH;

                    $tab.css({ width: newW, height: newH });
                    builder.refreshJson();
                }
            }
        });

        // Chọn tab page
        $tab.on("mousedown", function (e) {
            // nếu click tab header thì đã xử lý ở trên rồi
            if ($(e.target).closest(".tabpage-tab").length) return;

            e.stopPropagation();
            $(".canvas-control").removeClass("canvas-control-selected");
            $(this).addClass("canvas-control-selected");

            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "tabpage";
            showProperties(cfg);
        });
    }

    // ====== PROPERTIES PANEL ======
    function showProperties(cfg) {
        builder.selectedControlId = cfg.id;
        builder.selectedControlType = "tabpage";

        $(".canvas-control").removeClass("canvas-control-selected");
        getDom(cfg).addClass("canvas-control-selected");

        var htmlTabs = [];
        (cfg.tabs || []).forEach(function (t, idx) {
            htmlTabs.push('<div class="ess-action-card" style="margin-bottom:8px; padding:8px;" data-tab-index="' + idx + '">');
            htmlTabs.push('<div style="display:flex; align-items:center; gap:8px;">');
            htmlTabs.push('<span class="ess-action-number">' + (idx + 1) + '</span>');
            htmlTabs.push('<div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">');
            htmlTabs.push('<span style="font-size:11px; color:#0078d4; font-weight:600; white-space:nowrap; flex-shrink:0;">📑 Tab:</span>');
            htmlTabs.push('<input type="text" class="ess-action-caption tpCaption" data-idx="' + idx + '" value="' + (t.caption || "") + '" placeholder="Tab caption" style="flex:1;"/>');
            htmlTabs.push('</div>');
            htmlTabs.push('<button type="button" class="ess-action-delete btnTpRemove" data-idx="' + idx + '" title="Delete">🗑</button>');
            htmlTabs.push('</div>');
            htmlTabs.push('</div>');
        });

        var activeOptions = (cfg.tabs || []).map(function (t, idx) {
            var text = (idx + 1) + " - " + (t.caption || ("Tab " + (idx + 1)));
            var sel = (cfg.activeTabIndex === idx) ? "selected" : "";
            return `<option value="${idx}" ${sel}>${text}</option>`;
        }).join("");

        var html = [];
        html.push('<div class="ess-prop-tab-content ess-prop-tab-active" style="padding:12px;">');
        html.push('<h3 style="margin:0 0 12px 0; font-size:14px; font-weight:600; color:#0078d4;">Tab Page</h3>');
        
        // Basic Info Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">ℹ️ Basic Info</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div style="display:grid; grid-template-columns: auto 1fr; gap:8px 12px; font-size:11px;">');
        html.push('<span style="color:#666;">ID:</span><span style="color:#333; font-weight:500;">' + cfg.id + '</span>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Size Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">📏 Size</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-width">');
        html.push('<label><span style="color:#0078d4;">📐</span><strong>Width:</strong></label>');
        html.push('<input id="tpWidth" type="number" class="ess-col-input" value="' + cfg.width + '" />');
        html.push('</div>');
        html.push('<div class="ess-col-field ess-col-field-width">');
        html.push('<label><span style="color:#0078d4;">📐</span><strong>Height:</strong></label>');
        html.push('<input id="tpHeight" type="number" class="ess-col-input" value="' + cfg.height + '" />');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Tabs Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">📑 Tabs (' + (cfg.tabs ? cfg.tabs.length : 0) + ')</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div id="tpTabsPanel">');
        html.push(htmlTabs.join(''));
        html.push('</div>');
        html.push('<button type="button" id="btnTpAddTab" class="ess-btn-primary" style="width:100%; margin-top:8px;">＋ Add tab</button>');
        html.push('</div>');
        html.push('</div>');
        
        // Active Tab Card
        html.push('<div class="ess-col-card" style="margin-bottom:12px;">');
        html.push('<div class="ess-col-card-header">');
        html.push('<span style="font-size:12px; color:#0078d4; font-weight:600;">🎯 Active Tab</span>');
        html.push('</div>');
        html.push('<div class="ess-col-card-body">');
        html.push('<div class="ess-col-row">');
        html.push('<div class="ess-col-field ess-col-field-full">');
        html.push('<label><span style="color:#0078d4;">🎯</span><strong>Select active tab:</strong></label>');
        html.push('<select id="tpActiveTab" class="ess-col-input">' + activeOptions + '</select>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Save Button
        html.push('<div class="ess-col-card">');
        html.push('<button type="button" class="ess-btn-primary" style="width:100%;" onclick="builder.saveControlToServer(\'' + cfg.id + '\')">💾 Lưu control này vào DB</button>');
        html.push('</div>');
        
        html.push('</div>'); // Close ess-prop-tab-content

        $("#propPanel").html(html.join(''));

        // Width / height
        $("#tpWidth").off("change.tp").on("change.tp", function () {
            var v = parseInt($(this).val() || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.width = v;
                getDom(cfg).css("width", v);
                builder.refreshJson();
            }
        });
        $("#tpHeight").off("change.tp").on("change.tp", function () {
            var v = parseInt($(this).val() || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.height = v;
                getDom(cfg).css("height", v);
                builder.refreshJson();
            }
        });

        // Caption change
        $(".tpCaption").off("input.tp change.tp").on("input.tp change.tp", function () {
            var idx = parseInt($(this).closest('.ess-action-card').data('tab-index'), 10);
            var t = cfg.tabs[idx];
            if (!t) return;
            t.caption = $(this).val();
            renderTabsHeader(getDom(cfg), cfg);

            // Cập nhật lại dropdown Active tab
            showProperties(cfg);
            builder.refreshJson();
        });

        // Remove tab
        $(".btnTpRemove").off("click.tp").on("click.tp", function () {
            var idx = parseInt($(this).closest('.ess-action-card').data('tab-index'), 10);
            if (!confirm("Remove tab " + (idx + 1) + " ?")) return;
            cfg.tabs.splice(idx, 1);
            if (cfg.activeTabIndex >= cfg.tabs.length) cfg.activeTabIndex = cfg.tabs.length - 1;
            renderTabsHeader(getDom(cfg), cfg);
            showProperties(cfg);
            builder.refreshJson();
        });

        // Add tab
        $("#btnTpAddTab").off("click.tp").on("click.tp", function () {
            cfg.tabs = cfg.tabs || [];
            cfg.tabs.push({ caption: "Tab " + (cfg.tabs.length + 1) });
            renderTabsHeader(getDom(cfg), cfg);
            showProperties(cfg);
            builder.refreshJson();
        });

        // Active tab dropdown
        $("#tpActiveTab").off("change.tp").on("change.tp", function () {
            var idx = parseInt($(this).val() || "0", 10);
            if (isNaN(idx)) idx = 0;
            cfg.activeTabIndex = idx;
            applyActiveTab(cfg);
            builder.refreshJson();
        });
    }

    // ====== PUBLIC API ======
    return {
        addNew: function () {
            var cfg = newConfig();
            render(cfg);
            builder.registerControl(cfg);
            builder.refreshJson();
            showProperties(cfg);
        },
        renderExisting: function (cfg) {
            // phòng trường hợp mở lại từ JSON
            cfg.type = cfg.type || "tabpage";
            cfg.tabs = cfg.tabs || [{ caption: "General" }];
            cfg.activeTabIndex = cfg.activeTabIndex || 0;
            render(cfg);
        }
    };
})();
