(function () {
    // Trình duyệt chạy kịch bản dùng chung clipboard với người đang ngồi máy: lệnh ghi clipboard của trang được giữ ở window.__clipboard, không ghi thật.
    window.__clipboard = { text: null, items: null, writes: 0 };
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
            writeText: function (text) { window.__clipboard.text = String(text); window.__clipboard.writes++; return Promise.resolve(); },
            write: function (items) { window.__clipboard.items = items; window.__clipboard.writes++; return Promise.resolve(); },
            readText: function () { return Promise.resolve(window.__clipboard.text || ''); },
            read: function () { return Promise.resolve(window.__clipboard.items || []); }
        }
    });

    // Địa chỉ của harness, để kịch bản lấy file mẫu của harness cả khi trang đang mở là site thật.
    var harness = new URL(document.currentScript.src).origin;
    window.__harnessUrl = function (path) { return harness + path; };

    function label(c) {
        if (!c) return null;
        var name = c.type === 'field' ? c.ftype + (c.caption ? ':' + c.caption : '') : c.type;
        return name + '#' + String(c.id).slice(-4);
    }
    function elOf(c) {
        var $el = $('#canvas [data-id="' + c.id + '"]');
        if (c.type === 'popup') $el = $el.filter('.popup-design');
        return $el.first();
    }
    function hostKind(el) {
        var p = el.parentElement;
        if (!p) return 'none';
        if (p.id === 'canvas-zoom-inner') return 'canvas';
        var $host = $(p).closest('[data-id]');
        return p.className.split(' ')[0] + '@' + ($host.length ? label(builder.getControlConfig($host.attr('data-id'))) : '?');
    }
    function expectedHost(c) {
        if (!c.parentId) return 'canvas';
        var p = builder.getControlConfig(c.parentId);
        return p ? label(p) : 'missing-parent';
    }
    function visibleAt(el) {
        var r = el.getBoundingClientRect();
        var pts = [[r.left + 6, r.top + 4], [r.left + r.width / 2, r.top + 4], [r.right - 6, r.top + 4]];
        return pts.some(function (p) {
            var top = document.elementFromPoint(Math.round(p[0]), Math.round(p[1]));
            return !!top && (el === top || el.contains(top));
        });
    }
    window.__state = function () {
        var base = document.getElementById('canvas-zoom-inner').getBoundingClientRect();
        var scale = builder.viewScale || 1;
        return builder.controls.map(function (c) {
            var $el = elOf(c);
            if (!$el.length) return label(c) + ' NO-DOM parent=' + expectedHost(c);
            var r = $el[0].getBoundingClientRect();
            return label(c) + ' cfg=' + Math.round(c.left) + ',' + Math.round(c.top) + ' ' + Math.round(c.width || 0) + 'x' + Math.round(c.height || 0) +
                ' abs=' + Math.round((r.left - base.left) / scale) + ',' + Math.round((r.top - base.top) / scale) +
                ' parent=' + expectedHost(c) + ($el.is(':visible') ? '' : ' HIDDEN') + (visibleAt($el[0]) ? '' : ' COVERED');
        });
    };
    window.__check = function () {
        var problems = [];
        builder.controls.forEach(function (c) {
            var $el = elOf(c);
            if (!$el.length) { problems.push(label(c) + ': no DOM'); return; }
            var want = expectedHost(c), got = hostKind($el[0]);
            if (want === 'canvas' ? got !== 'canvas' : got.indexOf('@' + want) < 0) problems.push(label(c) + ': parent ' + want + ' but DOM in ' + got);
            var pane = $el[0].parentElement.getAttribute('data-pane');
            if (pane !== (c.paneIndex == null ? null : String(c.paneIndex))) problems.push(label(c) + ': paneIndex ' + c.paneIndex + ' but DOM pane ' + pane);
            var cssL = parseFloat($el.css('left')), cssT = parseFloat($el.css('top'));
            if (Math.abs(cssL - (c.left || 0)) > 1 || Math.abs(cssT - (c.top || 0)) > 1) problems.push(label(c) + ': css ' + cssL + ',' + cssT + ' vs cfg ' + c.left + ',' + c.top);
            if (!$el.is(':visible')) problems.push(label(c) + ': hidden');
            else if (!visibleAt($el[0])) problems.push(label(c) + ': covered');
        });
        return problems;
    };
    window.__abs = function () {
        var base = document.getElementById('canvas-zoom-inner').getBoundingClientRect();
        var scale = builder.viewScale || 1;
        return builder.controls.map(function (c) {
            var $el = elOf(c);
            if (!$el.length) return label(c) + '=none';
            var r = $el[0].getBoundingClientRect();
            return label(c) + '=' + [Math.round((r.left - base.left) / scale), Math.round((r.top - base.top) / scale), Math.round(r.width / scale), Math.round(r.height / scale), (c.parentId ? label(builder.getControlConfig(c.parentId)) : '-') + (c.paneIndex == null ? '' : '/pane' + c.paneIndex)].join(',');
        }).sort().join(' ; ');
    };
    window.__find = function (type, ftype, caption) {
        var list = builder.controls.filter(function (c) { return c.type === type && (!ftype || c.ftype === ftype) && (caption == null || c.caption === caption); });
        return list.length ? list[list.length - 1].id : null;
    };
    window.__grab = function (id) {
        var c = builder.getControlConfig(id), $el = elOf(c), el;
        if (c.type === 'popup') el = $el.find('.popup-header')[0];
        else if (c.type === 'field' && c.ftype === 'groupbox') el = $el.children('.page-field-groupbox-title')[0];
        else if (c.type === 'field' && c.ftype === 'section') el = $el.children('.page-field-section-header')[0];
        else if (c.type === 'field' && c.ftype === 'splitter') return window.__center(id, '> .page-field-editor > .core-splitter > .core-splitter-move');
        else if (c.type === 'grid') el = $el.find('.grid-title-bar:visible, .grid-header-panel-row:visible, .grid-data-header:visible')[0];
        else if (c.type === 'ess-grid') el = $el.find('.ess-grid-header')[0];
        else if (c.type === 'collapsible-section') el = $el.find('.ess-collapsible-header')[0];
        else if (c.type === 'tabpage') {
            var strip = $el.children('.tabpage-tabs')[0].getBoundingClientRect();
            return { x: Math.round(strip.right - 14), y: Math.round(strip.top + strip.height / 2) };
        }
        else if (c.type === 'toolbar') {
            var tr = $el[0].getBoundingClientRect();
            for (var x = tr.left + 1; x < tr.right; x += 1) {
                for (var y = tr.top + 1; y < tr.bottom; y += 2) {
                    var t = document.elementFromPoint(x, y);
                    if (t && $el[0].contains(t) && !$(t).closest('.canvas-toolbar-btn').length) return { x: Math.round(x), y: Math.round(y) };
                }
            }
            el = $el[0];
        }
        else el = $el[0];
        var r = el.getBoundingClientRect();
        return { x: Math.round(r.left + Math.min(14, r.width / 2)), y: Math.round(r.top + r.height / 2) };
    };
    window.__rect = function (id) {
        var r = elOf(builder.getControlConfig(id))[0].getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) };
    };
    window.__inside = function (id, dx, dy) {
        var c = builder.getControlConfig(id), $el = elOf(c);
        var $content = c.type === 'popup' ? $el.find('.popup-body').first()
            : c.type === 'collapsible-section' ? $el.find('.ess-collapsible-content').first()
            : c.type === 'tabpage' ? $el.children('.tabpage-body').first()
            : $el.children('.page-field-groupbox-content, .page-field-section-content').first();
        var r = $content[0].getBoundingClientRect();
        return { x: Math.round(r.left + dx), y: Math.round(r.top + dy) };
    };
    window.__pane = function (id, pane, dx, dy) {
        var r = controlSplitter.paneElement(elOf(builder.getControlConfig(id)), pane)[0].getBoundingClientRect();
        return { x: Math.round(r.left + (dx == null ? r.width / 2 : dx)), y: Math.round(r.top + (dy == null ? r.height / 2 : dy)) };
    };
    window.__bar = function (id) {
        return window.__center(id, '> .page-field-editor > .core-splitter > .core-splitter-bar');
    };
    window.__panes = function (id) {
        return controlSplitter.boxes(builder.getControlConfig(id)).map(function (b) { return b.width + 'x' + b.height; }).join('|');
    };
    // Khoảng từ mép dưới của control tới mép dưới của vùng chứa nó (số âm: control bị vùng cắt).
    window.__paneGap = function (id) {
        var el = elOf(builder.getControlConfig(id))[0], scale = builder.viewScale || 1;
        return Math.round((el.parentElement.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom) / scale);
    };
    // Lưới Core: chiều cao trong cấu hình / trên trang, có chiều cao riêng (fixed) hay cao theo số dòng (free), số dòng, chiều cao vùng dòng,
    // vùng dòng có cuộn không, và khoảng trống còn lại dưới phần cuối cùng của lưới (slack: phải bằng nhau ở hai chế độ).
    window.__gridBox = function (id) {
        var c = builder.getControlConfig(id), el = elOf(c)[0], scale = builder.viewScale || 1;
        var rows = el.querySelector('.dx-datagrid-rowsview'), scroll = rows.querySelector('.dx-scrollable-container');
        var last = ($(el).find('.dx-datagrid-pager:visible')[0] || rows).getBoundingClientRect();
        var box = el.getBoundingClientRect(), style = window.getComputedStyle(el);
        var floor = box.bottom - (parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom)) * scale;
        return (c.height === undefined ? 'auto' : c.height) + '/' + Math.round(box.height / scale) +
            (el.classList.contains('grid-fixed-height') ? ' fixed' : ' free') +
            ' rows ' + el.querySelectorAll('.dx-data-row').length + ' view ' + Math.round(rows.getBoundingClientRect().height / scale) +
            (scroll.scrollHeight > scroll.clientHeight + 1 ? ' scroll' : ' whole') +
            ' slack ' + Math.round((floor - last.bottom) / scale);
    };
    window.__center = function (id, selector, n) {
        var $el = elOf(builder.getControlConfig(id));
        var el = selector ? $el.find(selector)[n || 0] : $el[0];
        var r = el.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    };
    window.__text = function (id, selector, n) {
        var el = elOf(builder.getControlConfig(id)).find(selector)[n || 0];
        return el ? $.trim(el.textContent) : 'missing';
    };
    window.__brokenImages = function (paths) {
        return Promise.all(paths.map(function (path) {
            return new Promise(function (done) {
                var img = new Image();
                img.onload = function () { done(img.naturalWidth ? null : path); };
                img.onerror = function () { done(path); };
                img.src = path;
            });
        })).then(function (failed) { return failed.filter(Boolean); });
    };
    window.__canvas = function (x, y) {
        var r = document.getElementById('canvas-zoom-inner').getBoundingClientRect();
        var s = builder.viewScale || 1;
        return { x: Math.round(r.left + x * s), y: Math.round(r.top + y * s) };
    };
    window.__label = function (id) { return label(builder.getControlConfig(id)); };
    window.__nth = function (type, ftype, n) {
        var list = builder.controls.filter(function (c) { return c.type === type && (!ftype || c.ftype === ftype); });
        return list[n] ? list[n].id : null;
    };
    window.__ptype = function (id) {
        var c = builder.getControlConfig(id);
        if (!c) return 'missing';
        if (!c.parentId) return 'canvas';
        var p = builder.getControlConfig(c.parentId);
        return p ? (p.type === 'field' ? p.ftype : p.type) : 'missing-parent';
    };
    window.__desc = function (id) {
        var set = {}, out = [], grew = true;
        set[id] = true;
        while (grew) {
            grew = false;
            builder.controls.forEach(function (c) {
                if (set[c.id]) return;
                if ((c.parentId && set[c.parentId]) || (c.tabPageId && set[c.tabPageId])) { set[c.id] = true; out.push(c.id); grew = true; }
            });
        }
        return out;
    };
    window.__absMap = function () {
        var base = document.getElementById('canvas-zoom-inner').getBoundingClientRect();
        var scale = builder.viewScale || 1, map = {};
        builder.controls.forEach(function (c) {
            var $el = elOf(c);
            if (!$el.length) return;
            var r = $el[0].getBoundingClientRect();
            map[c.id] = [Math.round((r.left - base.left) / scale), Math.round((r.top - base.top) / scale), $el.is(':visible') ? 1 : 0];
        });
        return map;
    };
    window.__cfg = function (id) {
        var c = builder.getControlConfig(id);
        return c ? [Math.round(c.left), Math.round(c.top), Math.round(c.width || 0), Math.round(c.height || 0)].join(',') : 'missing';
    };
    function pause(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
    function setValue(el, value) {
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!value;
        else el.value = value;
        ['input', 'change', 'blur', 'focusout'].forEach(function (name) { el.dispatchEvent(new Event(name, { bubbles: name !== 'blur' })); });
    }
    function changes(before, after) {
        var keys = {};
        Object.keys(before).concat(Object.keys(after)).forEach(function (k) { keys[k] = true; });
        return Object.keys(keys).sort().filter(function (k) { return JSON.stringify(before[k]) !== JSON.stringify(after[k]); })
            .map(function (k) { return k + '=' + JSON.stringify(after[k]); }).join(' ; ').replace(/"id":"[^"]*"/g, '"id":"#"').replace(/_\d{10,}(_[0-9a-z]+)?/g, '_#') || 'no change';
    }
    window.__propApply = function (spec) {
        var cfg = builder.getControlConfig(spec.id);
        if (!cfg) return Promise.resolve('NO CONTROL');
        if (!spec.keep) { builder.selectOnly(spec.id); builder.showPropertiesFor(cfg); }
        if (spec.tab) $('#propPanel [data-tab="' + spec.tab + '"]').first().trigger('click');
        return pause(80).then(function () {
            var before = JSON.parse(JSON.stringify(builder.getControlConfig(spec.id)));
            var el = $(spec.sel)[spec.n || 0];
            if (!el) return 'NO ELEMENT ' + spec.sel;
            if (spec.click) el.click();
            else setValue(el, spec.option !== undefined && el.options ? el.options[spec.option].value : spec.value);
            return pause(spec.wait || 200).then(function () { return changes(before, builder.getControlConfig(spec.id) || {}); });
        });
    };
    function iconCell(spec) {
        var el = $(spec.cell)[spec.n || 0];
        if (!el) return 'gone';
        return $(el).find('img').length ? 'img' : ($(el).find('[class*="glyphicon"]').length ? 'glyph' : 'empty');
    }
    window.__iconPick = function (spec) {
        var cfg = builder.getControlConfig(spec.id);
        if (!cfg) return Promise.resolve('NO CONTROL');
        builder.selectOnly(spec.id);
        builder.showPropertiesFor(cfg);
        if (spec.tab) $('#propPanel [data-tab="' + spec.tab + '"]').first().trigger('click');
        return pause(80).then(function () {
            var before = JSON.parse(JSON.stringify(builder.getControlConfig(spec.id)));
            var el = $(spec.sel)[spec.n || 0];
            if (!el) return 'NO ELEMENT ' + spec.sel;
            el.click();
            return pause(150).then(function () {
                if (!$('#iconPickerModal').is(':visible')) return 'NO MODAL';
                if (spec.cancel) $('#iconPickerCancel').trigger('mousedown').trigger('click');
                else {
                    var radio = $("input[name='iconPickerType'][value='" + spec.type + "']")[0];
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                    var tile = $('#iconPickerIconList .icon-picker-item')[spec.pick || 0];
                    if (!tile) return 'NO ICON';
                    tile.click();
                    $('#iconPickerOk').trigger('mousedown').trigger('click');
                }
                return pause(350).then(function () {
                    return changes(before, builder.getControlConfig(spec.id) || {}) +
                        ' | modal=' + ($('#iconPickerModal').is(':visible') ? 'open' : 'closed') +
                        ' | tab=' + ($('#propPanel .pp-tab.is-active').attr('data-tab') || '-') +
                        ' | cell=' + iconCell(spec);
                });
            });
        });
    };
    window.__tool = function (type, ui) {
        var sel = '.tool-item[data-control="' + type + '"]' + (ui ? '[data-ui="' + ui + '"]' : '');
        var el = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (e) { return e.offsetParent !== null; })[0];
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        var r = el.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    };
})();
