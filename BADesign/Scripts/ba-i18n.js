(function (root) {
    'use strict';

    var config = {
        cookieName: 'baLang',
        sourceLang: 'vi',
        languages: [
            {
                code: 'vi', label: 'VI', name: 'Tiếng Việt', files: [],
                flag: '<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path fill="#DA251D" d="M0 0h30v20H0z"/><path fill="#FFFF00" d="M15 4l1.347 4.146h4.359l-3.526 2.562 1.347 4.146L15 12.292l-3.527 2.562 1.347-4.146-3.526-2.562h4.359z"/></svg>'
            },
            {
                code: 'en', label: 'EN', name: 'English', files: ['i18n/ba-i18n.en.js'],
                flag: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path fill="#012169" d="M0 0h60v30H0z"/><path stroke="#FFFFFF" stroke-width="6" d="M0 0l60 30M60 0L0 30"/><path stroke="#C8102E" stroke-width="2" d="M0 0l60 30M60 0L0 30"/><path stroke="#FFFFFF" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#C8102E" stroke-width="6" d="M30 0v30M0 15h60"/></svg>'
            }
        ],
        attributes: ['title', 'placeholder', 'aria-label', 'alt', 'data-original-title'],
        skipTags: ['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'],
        skipSelector: '[translate="no"],.notranslate,[contenteditable=""],[contenteditable="true"]',
        maxPatternLength: 600,
        maxCacheSize: 20000,
        maxDepth: 3
    };

    var doc = root.document || null;
    var WORD = 'A-Za-z0-9\\u00C0-\\u024F\\u0300-\\u036F\\u1E00-\\u1EFF';
    var EDGE_LEFT = new RegExp('^[^' + WORD + '{]+');
    var EDGE_RIGHT = new RegExp('[^' + WORD + '}]+$');
    var HAS_LETTER = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
    var VIETNAMESE = /[\u00C0-\u00C3\u00C8-\u00CA\u00CC\u00CD\u00D2-\u00D5\u00D9\u00DA\u00DD\u00E0-\u00E3\u00E8-\u00EA\u00EC\u00ED\u00F2-\u00F5\u00F9\u00FA\u00FD\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/;
    var SENTENCE_END = /[.!?;] /;
    var HTML_KEY = /<[a-zA-Z][^>]*>/;
    var HTML_MARK = 'data-i18n-html';
    var SKIP_TAG = {};
    var MISS = 0;
    var BUTTON_TYPES = { button: true, submit: true, reset: true };

    var exact = new Map();
    var html = new Map();
    var byFirstTwo = new Map();
    var byFirst = new Map();
    var byLast = new Map();
    var patternOf = new Map();
    var contextTest = null;
    var loose = [];
    var cache = new Map();
    var contextual = new Map();
    var SCOPED_KEY = /^@([A-Za-z0-9_-]+):([^]*)$/;
    var CONTEXT_MARK = 'data-i18n-ctx';
    var missing = new Map();
    var conflicts = [];
    var counters = { texts: 0, translated: 0, batches: 0, ms: 0 };
    var sorted = true;
    var debug = false;
    var current = null;
    var active = false;
    var observer = null;

    function findLanguage(code) {
        for (var i = 0; i < config.languages.length; i++) {
            if (config.languages[i].code === code) return config.languages[i];
        }
        return null;
    }

    function flatten(text) {
        return text.replace(/\s+/g, ' ');
    }

    function htmlKey(markup) {
        return flatten(markup).replace(/<br ?\/?>/gi, '<br>').replace(/^ | $/g, '');
    }

    function splitEdges(flat) {
        var left = EDGE_LEFT.exec(flat);
        var prefix = left ? left[0] : '';
        var rest = flat.slice(prefix.length);
        var right = EDGE_RIGHT.exec(rest);
        var suffix = right ? right[0] : '';
        return { prefix: prefix, core: suffix ? rest.slice(0, rest.length - suffix.length) : rest, suffix: suffix };
    }

    function sameEdge(a, b) {
        return a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
    }

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function pushTo(map, key, item) {
        var list = map.get(key);
        if (!list) { list = []; map.set(key, list); }
        list.push(item);
    }

    function addEntry(section, key, value) {
        if (typeof value !== 'string' || !value) return;
        var scoped = SCOPED_KEY.exec(String(key));
        var flatKey = flatten(scoped ? scoped[2] : String(key));
        if (HTML_KEY.test(flatKey)) {
            html.set(htmlKey(flatKey), value);
            return;
        }
        var k = splitEdges(flatKey);
        if (!k.core) return;
        var v = splitEdges(flatten(value));
        var head = sameEdge(k.prefix, v.prefix) ? '' : v.prefix.replace(/^ /, '');
        var tail = sameEdge(k.suffix, v.suffix) ? '' : v.suffix.replace(/ $/, '');
        var out = head + v.core + tail;
        if (!/\{\d+#?\}/.test(k.core)) {
            if (scoped) {
                exact.set(scoped[1] + ':' + k.core, out);
                contextual.set(k.core, true);
                contextTest = null;
                return;
            }
            var old = exact.get(k.core);
            if (old !== undefined && old !== out) conflicts.push({ section: section, key: k.core, first: old, second: out });
            exact.set(k.core, out);
            return;
        }
        var parts = k.core.split(/\{(\d+#?)\}/);
        var source = '^';
        var weight = 0;
        var anchor = '';
        var order = [];
        for (var i = 0; i < parts.length; i++) {
            if (i % 2) {
                order.push(parseInt(parts[i], 10));
                source += parts[i].charAt(parts[i].length - 1) === '#' ? '([0-9][0-9.,]*)' : '([\\s\\S]*?)';
            } else {
                source += escapeRegex(parts[i]);
                weight += parts[i].length;
                if (parts[i].length > anchor.length) anchor = parts[i];
            }
        }
        var known = patternOf.get(k.core);
        if (known) {
            known.template = out;
            return;
        }
        var pattern = { source: source + '$', re: null, order: order, template: out, weight: weight, anchor: anchor };
        patternOf.set(k.core, pattern);
        var tokens = k.core.split(' ');
        var first = tokens[0];
        var last = tokens[tokens.length - 1];
        if (first.indexOf('{') >= 0) {
            if (last.indexOf('}') < 0) pushTo(byLast, last, pattern);
            else loose.push(pattern);
        } else if (tokens.length > 1 && tokens[1].indexOf('{') < 0) {
            pushTo(byFirstTwo, first + ' ' + tokens[1], pattern);
        } else {
            pushTo(byFirst, first, pattern);
        }
        sorted = false;
    }

    function add(section, entries) {
        if (typeof section !== 'string') { entries = section; section = ''; }
        if (!entries) return;
        for (var key in entries) {
            if (Object.prototype.hasOwnProperty.call(entries, key)) addEntry(section, key, entries[key]);
        }
        cache.clear();
    }

    function byWeight(a, b) {
        return b.weight - a.weight;
    }

    function ensureSorted() {
        if (sorted) return;
        byFirstTwo.forEach(function (list) { list.sort(byWeight); });
        byFirst.forEach(function (list) { list.sort(byWeight); });
        byLast.forEach(function (list) { list.sort(byWeight); });
        loose.sort(byWeight);
        sorted = true;
    }

    function isOne(value) {
        return parseFloat(String(value).replace(/[.,\s]/g, '')) === 1;
    }

    function applyTemplate(template, args) {
        return template
            .replace(/\[(\d+):([^|\]]*)\|([^\]]*)\]/g, function (m, index, one, many) {
                return isOne(args[parseInt(index, 10)]) ? one : many;
            })
            .replace(/\{(\d+)\}/g, function (m, index) {
                var value = args[parseInt(index, 10)];
                return value === undefined ? m : value;
            });
    }

    function tryPatterns(list, core, depth) {
        if (!list) return null;
        for (var i = 0; i < list.length; i++) {
            if (core.indexOf(list[i].anchor) < 0) continue;
            if (!list[i].re) list[i].re = new RegExp(list[i].source);
            var match = list[i].re.exec(core);
            if (!match) continue;
            var args = [];
            for (var j = 0; j < list[i].order.length; j++) {
                var raw = match[j + 1];
                var translated = depth < config.maxDepth ? segment(raw, depth + 1) : null;
                args[list[i].order[j]] = translated === null ? raw : translated;
            }
            return applyTemplate(list[i].template, args);
        }
        return null;
    }

    function lookup(core, depth) {
        var hit = exact.get(core);
        if (hit !== undefined) return hit;
        if (core.length > config.maxPatternLength) return null;
        var firstSpace = core.indexOf(' ');
        var out = null;
        if (firstSpace >= 0) {
            var secondSpace = core.indexOf(' ', firstSpace + 1);
            out = tryPatterns(byFirstTwo.get(secondSpace < 0 ? core : core.slice(0, secondSpace)), core, depth);
            if (out !== null) return out;
        }
        out = tryPatterns(byFirst.get(firstSpace < 0 ? core : core.slice(0, firstSpace)), core, depth);
        if (out !== null) return out;
        var lastSpace = core.lastIndexOf(' ');
        out = tryPatterns(byLast.get(lastSpace < 0 ? core : core.slice(lastSpace + 1)), core, depth);
        if (out !== null) return out;
        return tryPatterns(loose, core, depth);
    }

    function segment(flat, depth) {
        var parts = splitEdges(flat);
        if (!parts.core) return null;
        var out = lookup(parts.core, depth);
        return out === null ? null : parts.prefix + out + parts.suffix;
    }

    function byLines(raw) {
        var lines = raw.split('\n');
        var found = false;
        for (var i = 0; i < lines.length; i++) {
            var out = HAS_LETTER.test(lines[i]) ? segment(flatten(lines[i]), 0) : null;
            if (out === null) out = HAS_LETTER.test(lines[i]) ? bySentences(flatten(lines[i])) : null;
            if (out !== null) { lines[i] = out; found = true; }
        }
        return found ? lines.join('\n') : null;
    }

    function bySentences(flat) {
        if (!SENTENCE_END.test(flat)) return null;
        var parts = flat.split(/([.!?;]+ )/);
        if (parts.length < 3) return null;
        var found = false;
        for (var i = 0; i < parts.length; i += 2) {
            if (!HAS_LETTER.test(parts[i])) continue;
            var out = segment(parts[i], 0);
            if (out !== null) { parts[i] = out; found = true; }
        }
        return found ? parts.join('') : null;
    }

    function translateOrNull(raw) {
        if (!raw || !HAS_LETTER.test(raw)) return null;
        var known = cache.get(raw);
        if (known !== undefined) return known === MISS ? null : known;
        ensureSorted();
        var flat = flatten(raw);
        var out = segment(flat, 0);
        if (out === null && raw.indexOf('\n') >= 0) out = byLines(raw);
        if (out === null) out = bySentences(flat);
        if (cache.size >= config.maxCacheSize) cache.clear();
        cache.set(raw, out === null ? MISS : out);
        return out;
    }

    function mayHaveContext(raw) {
        if (!contextual.size) return false;
        if (!contextTest) {
            var cores = [];
            contextual.forEach(function (value, core) { cores.push(escapeRegex(core)); });
            contextTest = new RegExp(cores.join('|'));
        }
        return contextTest.test(raw);
    }

    function translateIn(context, raw) {
        var parts = splitEdges(flatten(raw));
        if (!contextual.has(parts.core)) return null;
        var hit = exact.get(context + ':' + parts.core);
        return hit === undefined ? null : parts.prefix + hit + parts.suffix;
    }

    function translate(text) {
        if (!active || typeof text !== 'string') return text;
        var out = translateOrNull(text);
        return out === null ? text : out;
    }

    function format(text, args) {
        return text.replace(/\{(\d+)\}/g, function (m, index) {
            var value = args[parseInt(index, 10)];
            return value === undefined ? m : String(value);
        });
    }

    function t(text) {
        var args = Array.prototype.slice.call(arguments, 1);
        return translate(args.length ? format(text, args) : text);
    }

    function noteMissing(raw) {
        if (!debug || !VIETNAMESE.test(raw)) return;
        var flat = flatten(raw).replace(/^ | $/g, '');
        missing.set(flat, (missing.get(flat) || 0) + 1);
    }

    function setActive(code) {
        current = findLanguage(code) || findLanguage(config.sourceLang);
        active = current.code !== config.sourceLang;
        api.lang = current.code;
        cache.clear();
    }

    var api = {
        config: config,
        lang: config.sourceLang,
        add: add,
        translate: translate,
        t: t,
        setActive: setActive,
        normalize: function (text) { return splitEdges(flatten(String(text))).core; },
        html: function (markup) {
            var hit = html.get(htmlKey(String(markup)));
            return hit === undefined ? null : hit;
        },
        conflicts: function () { return conflicts.slice(); },
        size: function () {
            var patterns = loose.length;
            byFirstTwo.forEach(function (list) { patterns += list.length; });
            byFirst.forEach(function (list) { patterns += list.length; });
            byLast.forEach(function (list) { patterns += list.length; });
            return { exact: exact.size, patterns: patterns, html: html.size };
        }
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.BaI18n = api;
    if (!doc) return;

    function readCookie(name) {
        var match = doc.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    function now() {
        return root.performance && root.performance.now ? root.performance.now() : Date.now();
    }

    config.skipTags.forEach(function (tag) { SKIP_TAG[tag] = true; });
    var skipHostSelector = config.skipTags.map(function (tag) { return tag.toLowerCase() + ':not([translate="yes"])'; }).join(',') + ',' + config.skipSelector;
    var hostSelector = skipHostSelector + ',[' + HTML_MARK + ']';

    function tagSkipped(el) {
        return SKIP_TAG[el.tagName] === true && el.getAttribute('translate') !== 'yes';
    }

    function zoneSkipped(el) {
        return el.attributes.length > 0 && el.matches(config.skipSelector);
    }

    function attributeBlocked(el) {
        if (el.closest(config.skipSelector)) return true;
        var parent = el.parentElement;
        return parent !== null && parent.closest(skipHostSelector) !== null;
    }

    function translateHtmlElement(el) {
        if (el.getAttribute(HTML_MARK) === 'done') return;
        var key = htmlKey(el.innerHTML);
        var hit = html.get(key);
        if (hit === undefined) { noteMissing(key); return; }
        el.innerHTML = hit;
        el.setAttribute(HTML_MARK, 'done');
        counters.translated++;
    }

    function blockedBy(el) {
        var host = el.closest(hostSelector);
        if (!host) return false;
        if (host.hasAttribute(HTML_MARK) && !host.closest(skipHostSelector)) translateHtmlElement(host);
        return true;
    }

    function translateTextNode(node, trusted) {
        var parent = node.parentNode;
        if (!parent || parent.nodeType !== 1) return;
        if (!trusted && blockedBy(parent)) return;
        var raw = node.nodeValue;
        counters.texts++;
        var out = null;
        if (mayHaveContext(raw)) {
            var scope = parent.closest('[' + CONTEXT_MARK + ']');
            if (scope) out = translateIn(scope.getAttribute(CONTEXT_MARK), raw);
        }
        if (out === null) out = translateOrNull(raw);
        if (out === null) { noteMissing(raw); return; }
        if (out !== raw) { node.nodeValue = out; counters.translated++; }
    }

    function translateAttribute(el, name) {
        var raw = el.getAttribute(name);
        if (!raw) return;
        var out = translateOrNull(raw);
        if (out === null) { noteMissing(raw); return; }
        if (out !== raw) { el.setAttribute(name, out); counters.translated++; }
    }

    function translateElement(el) {
        if (!el.attributes.length) return;
        var names = config.attributes;
        for (var i = 0; i < names.length; i++) {
            if (el.hasAttribute(names[i])) translateAttribute(el, names[i]);
        }
        if (el.tagName === 'INPUT' && BUTTON_TYPES[el.type] && el.value) {
            var out = translateOrNull(el.value);
            if (out !== null && out !== el.value) { el.value = out; counters.translated++; }
        }
    }

    function afterSubtree(walker) {
        while (true) {
            var sibling = walker.nextSibling();
            if (sibling) return sibling;
            if (!walker.parentNode()) return null;
        }
    }

    var filter = {
        acceptNode: function (node) {
            return node.nodeType === 1 && zoneSkipped(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
    };

    function translateTree(node) {
        if (node.nodeType === 3) { translateTextNode(node, false); return; }
        if (node.nodeType !== 1 || zoneSkipped(node)) return;
        var parent = node.parentElement;
        if (parent && blockedBy(parent)) return;
        translateElement(node);
        if (tagSkipped(node)) return;
        if (node.attributes.length && node.hasAttribute(HTML_MARK)) { translateHtmlElement(node); return; }
        var walker = doc.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, filter);
        var item = walker.nextNode();
        while (item) {
            if (item.nodeType === 3) {
                translateTextNode(item, true);
            } else {
                translateElement(item);
                if (tagSkipped(item)) {
                    item = afterSubtree(walker);
                    continue;
                }
                if (item.attributes.length && item.hasAttribute(HTML_MARK)) {
                    translateHtmlElement(item);
                    item = afterSubtree(walker);
                    continue;
                }
            }
            item = walker.nextNode();
        }
    }

    function onMutations(records) {
        var started = now();
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            if (record.type === 'childList') {
                for (var j = 0; j < record.addedNodes.length; j++) translateTree(record.addedNodes[j]);
            } else if (record.type === 'characterData') {
                translateTextNode(record.target, false);
            } else if (record.target.nodeType === 1 && !attributeBlocked(record.target)) {
                translateAttribute(record.target, record.attributeName);
            }
        }
        observer.takeRecords();
        counters.batches++;
        counters.ms += now() - started;
    }

    function applyAll(node) {
        if (!active) return;
        var started = now();
        translateTree(node || doc.documentElement);
        if (observer) observer.takeRecords();
        counters.ms += now() - started;
    }

    function setLang(code) {
        var language = findLanguage(code);
        if (!language || language.code === current.code) return;
        var cookie = config.cookieName + '=' + encodeURIComponent(language.code) + '; path=/; max-age=31536000; SameSite=Lax';
        if (root.location.protocol === 'https:') cookie += '; Secure';
        doc.cookie = cookie;
        if (root.location.hash) root.location.reload();
        else root.location.href = root.location.href;
    }

    function renderSwitch(host) {
        if (host.getAttribute('data-ba-lang-switch') === 'ready') return;
        host.setAttribute('data-ba-lang-switch', 'ready');
        host.setAttribute('translate', 'no');
        for (var i = 0; i < config.languages.length; i++) {
            var language = config.languages[i];
            var button = doc.createElement('button');
            button.type = 'button';
            button.className = 'ba-lang-btn' + (language.code === current.code ? ' is-active' : '');
            button.setAttribute('data-lang', language.code);
            button.title = language.name;
            if (language.flag) {
                var flag = doc.createElement('span');
                flag.className = 'ba-lang-flag';
                flag.innerHTML = language.flag;
                button.appendChild(flag);
            }
            var label = doc.createElement('span');
            label.textContent = language.label;
            button.appendChild(label);
            host.appendChild(button);
        }
    }

    function renderSwitches() {
        var hosts = doc.querySelectorAll('[data-ba-lang-switch]');
        for (var i = 0; i < hosts.length; i++) renderSwitch(hosts[i]);
    }

    function onSwitchClick(e) {
        var button = e.target && e.target.closest ? e.target.closest('.ba-lang-btn[data-lang]') : null;
        if (!button) return;
        e.preventDefault();
        setLang(button.getAttribute('data-lang'));
    }

    function loadFiles(files) {
        var script = doc.currentScript;
        var src = script && script.src ? script.src : '';
        var cut = src.indexOf('?');
        var query = cut < 0 ? '' : src.slice(cut);
        var path = cut < 0 ? src : src.slice(0, cut);
        var base = path.slice(0, path.lastIndexOf('/') + 1);
        for (var i = 0; i < files.length; i++) {
            var url = base + files[i] + query;
            if (script && doc.readyState === 'loading') {
                doc.write('<script src="' + url.replace(/"/g, '%22') + '"><\/script>');
            } else {
                var tag = doc.createElement('script');
                tag.src = url;
                tag.onload = function () { applyAll(); };
                doc.head.appendChild(tag);
            }
        }
    }

    function wrapDialogs() {
        ['alert', 'confirm', 'prompt'].forEach(function (name) {
            var native = root[name];
            if (typeof native !== 'function') return;
            root[name] = function (message) {
                var args = Array.prototype.slice.call(arguments);
                if (typeof message === 'string') args[0] = translate(message);
                return native.apply(root, args);
            };
        });
    }

    function onReady(handler) {
        if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', handler);
        else handler();
    }

    api.setLang = setLang;
    api.apply = applyAll;
    api.debug = function (on) {
        debug = on !== false;
        try { root.sessionStorage.setItem('baLangDebug', debug ? '1' : '0'); } catch (err) {}
        if (debug) { cache.clear(); applyAll(); }
    };
    api.missing = function () {
        var list = [];
        missing.forEach(function (count, text) { list.push(text); });
        return list;
    };
    api.stats = function () {
        return { texts: counters.texts, translated: counters.translated, batches: counters.batches, ms: Math.round(counters.ms * 10) / 10, cache: cache.size };
    };

    setActive(readCookie(config.cookieName));
    try { debug = root.sessionStorage.getItem('baLangDebug') === '1'; } catch (err) {}
    if (doc.documentElement) doc.documentElement.lang = current.code;
    doc.addEventListener('click', onSwitchClick, true);
    onReady(renderSwitches);

    if (active) {
        loadFiles(current.files || []);
        wrapDialogs();
        observer = new MutationObserver(onMutations);
        observer.observe(doc, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: config.attributes });
        onReady(function () { applyAll(); });
    }
})(typeof window !== 'undefined' ? window : globalThis);
