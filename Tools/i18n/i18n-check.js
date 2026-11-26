'use strict';
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const webRoot = path.join(repoRoot, 'BADesign');
const settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-sections.json'), 'utf8'));
const engine = require(path.join(webRoot, 'Scripts', 'ba-i18n.js'));

const VI = /[\u00C0-\u00C3\u00C8-\u00CA\u00CC\u00CD\u00D2-\u00D5\u00D9\u00DA\u00DD\u00E0-\u00E3\u00E8-\u00EA\u00EC\u00ED\u00F2-\u00F5\u00F9\u00FA\u00FD\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/;
const HOLE = '\u0001';
const HTML_ITEM = '\u0002';
const OPERATORS = ['===', '!==', '>>>', '<<=', '>>=', '**=', '&&=', '||=', '??=', '...', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '::'];
const REGEX_AFTER_WORD = /^(return|typeof|case|in|of|delete|void|throw|new|else|do)$/;
const STATEMENT_WORD = /^(return|throw|case|else|yield|await|typeof|delete|void|do|in|of|new)$/;
const ignoreCall = new RegExp(settings.ignoreCalls.join('|'));
const ignoreText = settings.ignoreTexts.map(function (source) { return new RegExp(source); });
const plainWords = new RegExp('(^|[^A-Za-z])(' + settings.plainWords.join('|') + ')([^A-Za-z]|$)');
let invalidBlocks = 0;
const TEXT_ATTRIBUTES ='title|placeholder|value|alt|Text|ToolTip|aria-label|data-original-title|label|ErrorMessage|HeaderText|EmptyDataText';
const ENGLISH_ATTRIBUTES = 'title|placeholder|alt|Text|ToolTip|aria-label|data-original-title|ErrorMessage|HeaderText|EmptyDataText';
const keepEnglish = (settings.keepEnglish || []).map(function (source) { return new RegExp(source); });
const englishWords = new RegExp('^(' + (settings.englishWords || ['$^']).join('|') + ')$');
const SQL_START = /^(SELECT|UPDATE|INSERT|DELETE|EXEC|DECLARE|ALTER|CREATE|DROP|BEGIN|IF|SET|WHERE|FROM|AND|OR|ORDER|GROUP|JOIN|LEFT|INNER|USE|BACKUP|RESTORE|DBCC|WITH|WHEN|CASE|ELSE|UNION|PRINT|RAISERROR|WAITFOR|GO|KILL|TRUNCATE|MERGE|OUTPUT|VALUES|INTO|ON|AS)\b/;

function isSource(text) {
    return VI.test(text) || plainWords.test(text);
}

function isPhrase(text, lang) {
    const t = clean(text);
    const bare = t.replace(/\{\d+\}/g, '');
    if (t.length < 2 || t.length > 120) return false;
    if (/[=;{}<>#_$@\\|\[\]`~^*]/.test(bare)) return false;
    if (/^[a-z]/.test(t) || /[a-z][A-Z]/.test(t) || /\w\.\w/.test(t)) return false;
    if (/\/\w+\//.test(t) || /^\//.test(t)) return false;
    if (lang === 'cs' && SQL_START.test(t)) return false;
    if (t.indexOf(' ') < 0) return englishWords.test(t.replace(/[.!?:…]+$/, ''));
    return /^[A-Z][A-Za-z']*( [A-Za-z0-9&()\-–+',:%\/!?.…{}]+)+$/.test(t);
}

function interpolation(src, from, open, lang) {
    let i = from;
    let text = '';
    const n = src.length;
    while (i < n) {
        const c = src[i];
        if (lang === 'cs-verbatim') {
            if (c === '"') {
                if (src[i + 1] === '"') { text += '"'; i += 2; continue; }
                return { text: text, end: i + 1 };
            }
        } else if (c === '\\' && i + 1 < n) {
            const e = src[i + 1];
            text += e === 'n' ? '\n' : e === 't' ? ' ' : e === 'r' ? '' : e;
            i += 2;
            continue;
        } else if (c === open) {
            return { text: text, end: i + 1 };
        } else if (c === '\n' && open !== '`') {
            return { text: text, end: i };
        }
        text += c;
        i++;
    }
    return { text: text, end: n };
}

function holes(text, opener) {
    let out = '';
    let i = 0;
    while (i < text.length) {
        if (opener === '{' && text[i] === '{' && text[i + 1] === '{') { out += '{'; i += 2; continue; }
        if (opener === '{' && text[i] === '}' && text[i + 1] === '}') { out += '}'; i += 2; continue; }
        const starts = opener === '{' ? text[i] === '{' : (text[i] === '$' && text[i + 1] === '{');
        if (!starts) { out += text[i]; i++; continue; }
        let depth = 0;
        let j = opener === '{' ? i : i + 1;
        for (; j < text.length; j++) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') { depth--; if (depth === 0) break; }
        }
        out += HOLE;
        i = j + 1;
    }
    return out;
}

function tokenize(src, lang) {
    const tokens = [];
    const n = src.length;
    let i = 0;
    function last() { return tokens.length ? tokens[tokens.length - 1] : null; }
    while (i < n) {
        const c = src[i];
        const d = src[i + 1];
        if (/\s/.test(c)) { i++; continue; }
        if (c === '/' && d === '/') { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
        if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
        if (lang === 'cs') {
            const m = /^(\$@|@\$|\$|@)"/.exec(src.substr(i, 3));
            if (m) {
                const verbatim = m[1].indexOf('@') >= 0;
                const r = interpolation(src, i + m[0].length, '"', verbatim ? 'cs-verbatim' : 'cs');
                tokens.push({ t: 's', v: m[1].indexOf('$') >= 0 ? holes(r.text, '{') : r.text });
                i = r.end;
                continue;
            }
            if (c === '\'') {
                const ch = /^'(\\.|[^\\'])'/.exec(src.substr(i, 8));
                tokens.push({ t: 'w', v: 'char' });
                i += ch ? ch[0].length : 1;
                continue;
            }
        }
        if (c === '"' || (lang === 'js' && (c === '\'' || c === '`'))) {
            const r = interpolation(src, i + 1, c, lang);
            tokens.push({ t: 's', v: c === '`' ? holes(r.text, '$') : r.text });
            i = r.end;
            continue;
        }
        if (lang === 'js' && c === '/') {
            const p = last();
            const regexAllowed = !p || (p.t === 'p' && p.v !== ')' && p.v !== ']') || (p.t === 'w' && REGEX_AFTER_WORD.test(p.v));
            if (regexAllowed) {
                let j = i + 1;
                let inClass = false;
                while (j < n && src[j] !== '\n') {
                    if (src[j] === '\\') { j += 2; continue; }
                    if (src[j] === '[') inClass = true;
                    else if (src[j] === ']') inClass = false;
                    else if (src[j] === '/' && !inClass) break;
                    j++;
                }
                tokens.push({ t: 'w', v: 'regex' });
                i = j + 1;
                continue;
            }
        }
        if (/[A-Za-z0-9_$@#\u00C0-\u1EFF]/.test(c)) {
            let j = i + 1;
            while (j < n && /[A-Za-z0-9_$\u00C0-\u1EFF]/.test(src[j])) j++;
            tokens.push({ t: 'w', v: src.slice(i, j) });
            i = j;
            continue;
        }
        let op = null;
        for (let k = 0; k < OPERATORS.length; k++) {
            if (src.substr(i, OPERATORS[k].length) === OPERATORS[k]) { op = OPERATORS[k]; break; }
        }
        tokens.push({ t: 'p', v: op || c });
        i += op ? op.length : 1;
    }
    return tokens;
}

function chains(tokens) {
    const out = [];
    const stack = [];
    let ctx = { parts: [], operand: null, ignored: false, name: '' };
    function flush() {
        if (ctx.operand) ctx.parts.push(ctx.operand);
        const parts = ctx.parts;
        ctx.parts = [];
        ctx.operand = null;
        if (ctx.ignored) return;
        let text = '';
        let literal = false;
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].lit !== null) { text += parts[i].lit; literal = true; }
            else if (text[text.length - 1] !== HOLE) text += HOLE;
        }
        if (literal) out.push(text);
    }
    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        if (tk.t === 's') {
            if (!ctx.operand) ctx.operand = { lit: tk.v };
            else if (ctx.operand.lit !== null && !ctx.operand.called) ctx.operand.lit += tk.v;
            continue;
        }
        if (tk.t === 'w') {
            if (STATEMENT_WORD.test(tk.v)) { flush(); ctx.name = ''; continue; }
            if (!ctx.operand) ctx.operand = { lit: null };
            ctx.name = ctx.operand.lit === null ? ctx.name + tk.v : tk.v;
            if (ctx.operand.lit !== null) ctx.operand.called = true;
            continue;
        }
        if (tk.v === '.' || tk.v === '?.') {
            if (!ctx.operand) ctx.operand = { lit: null };
            if (ctx.operand.lit !== null) ctx.operand.called = true;
            ctx.name += '.';
            continue;
        }
        if (tk.v === '+') {
            ctx.parts.push(ctx.operand || { lit: null });
            ctx.operand = null;
            ctx.name = '';
            continue;
        }
        if (tk.v === '(' || tk.v === '[' || tk.v === '{') {
            const ignored = ctx.ignored || (tk.v === '(' && ctx.name !== '' && ignoreCall.test(ctx.name));
            if (!ctx.operand) ctx.operand = { lit: null };
            else if (ctx.operand.lit !== null) ctx.operand.called = true;
            stack.push(ctx);
            ctx = { parts: [], operand: null, ignored: ignored, name: '' };
            continue;
        }
        if (tk.v === ')' || tk.v === ']' || tk.v === '}') {
            flush();
            ctx = stack.pop() || { parts: [], operand: null, ignored: false, name: '' };
            continue;
        }
        flush();
        ctx.name = '';
    }
    while (true) {
        flush();
        if (!stack.length) break;
        ctx = stack.pop();
    }
    return out;
}

function decode(text) {
    return text.replace(/&nbsp;/g, ' ').replace(/&times;/g, '\u00D7').replace(/&hellip;/g, '\u2026').replace(/&rarr;/g, '\u2192').replace(/&larr;/g, '\u2190')
        .replace(/&#(\d+);/g, function (m, code) { return String.fromCharCode(parseInt(code, 10)); })
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&');
}

function renumber(text) {
    let index = 0;
    return text
        .replace(/_(START|END|TOTAL|MAX|MENU|PAGE|PAGES)_/g, HOLE)
        .replace(/\{\d+(?:[:,][^}]*)?\}/g, HOLE)
        .replace(new RegExp(HOLE + '+', 'g'), HOLE)
        .replace(new RegExp(HOLE, 'g'), function () { return '{' + (index++) + '}'; });
}

function clean(text) {
    return renumber(decode(text).replace(/\s+/g, ' ').replace(/^ | $/g, ''));
}

function attributeTexts(source, out, english) {
    const re = new RegExp('\\b(' + (english ? ENGLISH_ATTRIBUTES : TEXT_ATTRIBUTES) + ')\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'g');
    let m;
    while ((m = re.exec(source))) out.push(m[3] != null ? m[3] : m[4]);
    if (!english) return;
    const button = /<input\b[^>]*\btype\s*=\s*["'](?:button|submit|reset)["'][^>]*>/gi;
    while ((m = button.exec(source))) {
        const value = /\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[0]);
        if (value) out.push(value[1] != null ? value[1] : value[2]);
    }
}

function isMarkup(template) {
    return /<\/?[a-zA-Z][^>]*>|^[^<]*>|<[a-zA-Z!\/][^>]*$/.test(template);
}

function fragmentTexts(template, out, english) {
    attributeTexts(template, out, english);
    let body = template.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '<x>');
    const firstClose = body.indexOf('>');
    const firstOpen = body.indexOf('<');
    if (firstClose >= 0 && (firstOpen < 0 || firstClose < firstOpen)) body = body.slice(firstClose + 1);
    const lastOpen = body.lastIndexOf('<');
    if (lastOpen >= 0 && lastOpen > body.lastIndexOf('>')) body = body.slice(0, lastOpen);
    body.split(/<[^>]*>/).forEach(function (piece) { out.push(piece); });
}

function codeTexts(source, lang, out, english) {
    chains(tokenize(source, lang)).forEach(function (template) {
        if (english) {
            if (isMarkup(template)) fragmentTexts(template, out, true);
            else template.split('\n').forEach(function (line) { if (isPhrase(line, lang)) out.push(line); });
            return;
        }
        if (!isSource(template)) return;
        if (isMarkup(template)) fragmentTexts(template, out);
        else template.split('\n').forEach(function (line) { out.push(line); });
    });
}

function pageTexts(source, out, english) {
    let markup = source.replace(/<%--[\s\S]*?--%>/g, ' ');
    markup = markup.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, function (m, body) {
        codeTexts(body.replace(/<%[=:#][\s\S]*?%>/g, '0').replace(/<%[\s\S]*?%>/g, ' '), 'js', out, english);
        return '<x>';
    });
    markup = markup.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<x>').replace(/<!--[\s\S]*?-->/g, '<x>');
    markup = markup.replace(/<%@[\s\S]*?%>/g, '<x>');
    markup = markup.replace(/<%[=:#]([\s\S]*?)%>/g, function (m, code) {
        codeTexts(code, 'cs', out, english);
        return HOLE;
    });
    markup = markup.replace(/<%[\s\S]*?%>/g, '<x>');
    markup = markup.replace(/<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n-html\b[^>]*>([\s\S]*?)<\/\1>/g, function (m, tag, inner) {
        out.push(HTML_ITEM + inner);
        return '<x>';
    });
    attributeTexts(markup, out, english);
    markup.split(/<[^>]*>/).forEach(function (piece) { out.push(piece); });
}

function dataTexts(value, out) {
    if (typeof value === 'string') { out.push(value); return; }
    if (value && typeof value === 'object') Object.keys(value).forEach(function (key) { dataTexts(value[key], out); });
}

function englishTexts(file) {
    const source = fs.readFileSync(file, 'utf8');
    const ext = path.extname(file).toLowerCase();
    const raw = [];
    if (ext === '.aspx' || ext === '.ascx' || ext === '.master') pageTexts(source, raw, true);
    else if (ext === '.js') codeTexts(source, 'js', raw, true);
    else if (ext === '.cs') codeTexts(source, 'cs', raw, true);
    const found = new Set();
    raw.forEach(function (text) {
        if (text[0] === HTML_ITEM) return;
        const candidate = clean(text);
        if (isSource(candidate)) return;
        const key = engine.normalize(candidate);
        if (!key || isSource(key) || !/[A-Za-z]{2}/.test(key.replace(/\{\d+\}/g, ''))) return;
        for (let i = 0; i < keepEnglish.length; i++) if (keepEnglish[i].test(key)) return;
        found.add(key);
    });
    return found;
}

function fileTexts(file) {
    const source = fs.readFileSync(file, 'utf8');
    const ext = path.extname(file).toLowerCase();
    const raw = [];
    if (ext === '.aspx' || ext === '.ascx' || ext === '.master') pageTexts(source, raw);
    else if (ext === '.js') codeTexts(source, 'js', raw);
    else if (ext === '.cs') codeTexts(source, 'cs', raw);
    else if (ext === '.json') dataTexts(JSON.parse(source), raw);
    const found = new Set();
    raw.forEach(function (text) {
        if (text[0] === HTML_ITEM) {
            if (isSource(text)) found.add(HTML_ITEM + text.slice(1).replace(/\s+/g, ' ').replace(/^ | $/g, ''));
            return;
        }
        const candidate = clean(text);
        if (!isSource(candidate)) return;
        const key = engine.normalize(candidate);
        if (!key || !isSource(key)) return;
        for (let i = 0; i < ignoreText.length; i++) if (ignoreText[i].test(key)) return;
        found.add(key);
    });
    return found;
}

function collect(english) {
    const where = new Map();
    Object.keys(settings.sections).forEach(function (section) {
        settings.sections[section].forEach(function (rel) {
            const file = path.join(webRoot, rel);
            if (!fs.existsSync(file)) { console.error('Không tìm thấy file: ' + rel); return; }
            (english ? englishTexts(file) : fileTexts(file)).forEach(function (key) {
                if (!where.has(key)) where.set(key, { sections: new Set(), files: new Set() });
                where.get(key).sections.add(section);
                where.get(key).files.add(rel);
            });
        });
    });
    const bySection = {};
    where.forEach(function (info, key) {
        const section = info.sections.size > 1 ? settings.sharedSection : info.sections.values().next().value;
        if (!bySection[section]) bySection[section] = [];
        bySection[section].push({ key: key, files: Array.from(info.files) });
    });
    Object.keys(bySection).forEach(function (section) {
        bySection[section].sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
    });
    return bySection;
}

function sample(key) {
    return key.replace(/\{(\d+)\}/g, function (m, index) { return String(7 + parseInt(index, 10)); });
}

function isCovered(key) {
    if (key[0] === HTML_ITEM) return engine.html(key.slice(1)) !== null;
    const text = sample(key);
    const out = engine.translate(text);
    return out !== text && !isSource(out);
}

function jsonBlocks(text) {
    const blocks = [];
    let at = 0;
    while (true) {
        const start = text.indexOf('BaI18n.add(', at);
        if (start < 0) break;
        const open = text.indexOf('{', start);
        if (open < 0) break;
        let depth = 0;
        let inString = false;
        let end = -1;
        for (let i = open; i < text.length; i++) {
            const c = text[i];
            if (inString) {
                if (c === '\\') i++;
                else if (c === '"') inString = false;
            } else if (c === '"') inString = true;
            else if (c === '{') depth++;
            else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end < 0) { blocks.push(text.slice(open)); break; }
        blocks.push(text.slice(open, end + 1));
        at = end + 1;
    }
    return blocks;
}

function blockKeys(block) {
    const keys = [];
    let depth = 0;
    let i = 0;
    while (i < block.length) {
        const c = block[i];
        if (c === '"') {
            let j = i + 1;
            while (j < block.length && block[j] !== '"') j += block[j] === '\\' ? 2 : 1;
            if (depth === 1 && /^\s*:/.test(block.slice(j + 1, j + 8))) keys.push(JSON.parse(block.slice(i, j + 1)));
            i = j + 1;
            continue;
        }
        if (c === '{') depth++;
        else if (c === '}') depth--;
        i++;
    }
    return keys;
}

function checkJson(file, rel) {
    let bad = 0;
    jsonBlocks(fs.readFileSync(file, 'utf8')).forEach(function (block, index) {
        try {
            JSON.parse(block);
        } catch (err) {
            bad++;
            console.log('Khối ' + (index + 1) + ' của ' + rel + ' không phải JSON hợp lệ (phía server sẽ không đọc được): ' + err.message);
            return;
        }
        const seen = new Set();
        blockKeys(block).forEach(function (key) {
            if (seen.has(key)) {
                bad++;
                console.log('Khóa lặp trong khối ' + (index + 1) + ' của ' + rel + ': ' + JSON.stringify(key));
            }
            seen.add(key);
        });
    });
    return bad;
}

function loadDictionaries(lang) {
    const language = engine.config.languages.filter(function (item) { return item.code === lang; })[0];
    if (!language) throw new Error('Ngôn ngữ chưa khai báo trong ba-i18n.js: ' + lang);
    (language.files || []).forEach(function (rel) {
        const file = path.join(webRoot, 'Scripts', rel);
        if (!fs.existsSync(file)) { console.error('Chưa có file từ điển: ' + rel); return; }
        invalidBlocks += checkJson(file, rel);
        require(file);
    });
    engine.setActive(lang);
}

function main() {
    const args = process.argv.slice(2);
    const option = function (name) { const at = args.indexOf(name); return at < 0 ? null : (args[at + 1] || ''); };
    const lang = option('--lang') || 'en';
    const only = option('--section');
    const dump = option('--dump');
    const english = args.indexOf('--english') >= 0;
    loadDictionaries(lang);
    const bySection = collect(english);
    const names = Object.keys(bySection).filter(function (name) { return !only || name === only; }).sort();
    let total = 0;
    let missing = 0;
    if (english) {
        names.forEach(function (name) {
            total += bySection[name].length;
            console.log(name + ': ' + bySection[name].length + ' chuỗi tiếng Anh');
            if (dump) {
                fs.mkdirSync(dump, { recursive: true });
                fs.writeFileSync(path.join(dump, name + '.english.json'), JSON.stringify(bySection[name], null, 1), 'utf8');
            } else if (args.indexOf('--list') >= 0) {
                bySection[name].forEach(function (item) { console.log('  ' + JSON.stringify(item.key) + '  [' + item.files[0] + ']'); });
            }
        });
        console.log('Tổng: ' + total + ' chuỗi tiếng Anh còn hiện ở chế độ tiếng Việt.');
        process.exitCode = total ? 1 : 0;
        return;
    }
    names.forEach(function (name) {
        const open = bySection[name].filter(function (item) { return !isCovered(item.key); });
        total += bySection[name].length;
        missing += open.length;
        console.log(name + ': ' + bySection[name].length + ' chuỗi, thiếu ' + open.length);
        if (dump) {
            fs.mkdirSync(dump, { recursive: true });
            fs.writeFileSync(path.join(dump, name + '.missing.json'), JSON.stringify(open, null, 1), 'utf8');
        } else if (args.indexOf('--list') >= 0) {
            open.forEach(function (item) { console.log('  ' + JSON.stringify(item.key) + '  [' + item.files[0] + ']'); });
        }
    });
    const size = engine.size();
    console.log('Tổng: ' + total + ' chuỗi, thiếu ' + missing + '. Từ điển ' + lang + ': ' + size.exact + ' mục, ' + size.patterns + ' mẫu câu, ' + size.html + ' đoạn HTML.');
    engine.conflicts().forEach(function (c) {
        console.log('Trùng khóa khác bản dịch [' + c.section + ']: ' + JSON.stringify(c.key) + ' -> ' + JSON.stringify(c.first) + ' / ' + JSON.stringify(c.second));
    });
    process.exitCode = missing || invalidBlocks ? 1 : 0;
}

module.exports = { fileTexts: fileTexts, collect: collect };
if (require.main === module) main();
