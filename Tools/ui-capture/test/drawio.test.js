'use strict';
const assert = require('assert');
const path = require('path');
const zlib = require('zlib');
const scripts = path.resolve(__dirname, '..', '..', '..', 'BADesign', 'Scripts', 'builder');
const drawio = require(path.join(scripts, 'builder-drawio.js'));
const capture = require(path.join(scripts, 'builder-capture.js'));

const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PIXEL_URL = 'data:image/png;base64,' + PIXEL;
const TEXT = 'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;';
const RECT = 'rounded=0;whiteSpace=wrap;html=1;';
const IMAGE = 'shape=image;verticalLabelPosition=bottom;verticalAlign=top;aspect=fixed;imageAspect=0;image=data:image/png,' + PIXEL + ';';

const tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

function esc(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function vertex(id, style, value, x, y, w, h, parent) {
    return '<mxCell id="' + id + '" value="' + esc(value || '') + '" style="' + esc(style) + '" vertex="1" parent="' + (parent || '1') + '">' +
        '<mxGeometry x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" as="geometry"/></mxCell>';
}
function edge(id) {
    return '<mxCell id="' + id + '" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>';
}
function model(cells) {
    return '<mxGraphModel dx="800" dy="600"><root><mxCell id="0"/><mxCell id="1" parent="0"/>' + cells.join('') + '</root></mxGraphModel>';
}
function compress(xml) {
    return zlib.deflateRawSync(Buffer.from(encodeURIComponent(xml), 'latin1')).toString('base64');
}
function mxfile(pages, compressed) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net"><!-- sample -->' + pages.map(function (page) {
        return '<diagram id="' + page.name + '" name="' + esc(page.name) + '">' + (compressed ? compress(model(page.cells)) : model(page.cells)) + '</diagram>';
    }).join('') + '</mxfile>';
}
const inflate = (bytes) => new Uint8Array(zlib.inflateRawSync(Buffer.from(bytes)));

async function screenOf(cells, options) {
    const pages = await drawio.read(mxfile([{ name: 'Form', cells: cells }]), inflate);
    return drawio.toScreen(pages[0], Object.assign({ ui: 'core', gridHeight: capture.gridHeight }, options || {}));
}
function find(nodes, predicate) {
    for (const node of nodes) {
        if (predicate(node)) return node;
        const inner = node.children ? find(node.children, predicate) : null;
        if (inner) return inner;
    }
    return null;
}
async function rejects(promise, pattern) {
    let error = null;
    try { await promise; } catch (err) { error = err; }
    assert.ok(error, 'expected a rejection');
    if (pattern) assert.ok(pattern.test(error.message), 'unexpected message: ' + error.message);
}

test('read lists the pages of an uncompressed file', async function () {
    const pages = await drawio.read(mxfile([{ name: 'Core & ESS', cells: [] }, { name: '', cells: [] }]), inflate);
    assert.deepStrictEqual(pages.map((p) => p.name), ['Core & ESS', 'Trang 2']);
    assert.strictEqual(pages[0].model.name, 'mxGraphModel');
});

test('read inflates compressed pages to the same cells', async function () {
    const cells = [vertex('a', TEXT, 'Tên nhân viên', 10, 20, 120, 20)];
    const plain = await drawio.read(mxfile([{ name: 'P', cells: cells }], false), inflate);
    const packed = await drawio.read(mxfile([{ name: 'P', cells: cells }], true), inflate);
    assert.deepStrictEqual(drawio.toScreen(packed[0], {}).screen, drawio.toScreen(plain[0], {}).screen);
});

test('read accepts a bare model, clipboard text and an SVG with an embedded diagram', async function () {
    const xml = model([vertex('a', TEXT, 'Code', 0, 0, 60, 20)]);
    assert.strictEqual((await drawio.read(xml, inflate)).length, 1);
    assert.strictEqual((await drawio.read(encodeURIComponent(xml), inflate)).length, 1);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" content="' + esc(mxfile([{ name: 'S', cells: [] }])) + '"><rect/></svg>';
    assert.strictEqual((await drawio.read(svg, inflate))[0].name, 'S');
});

test('read refuses files that are not draw.io diagrams', async function () {
    await rejects(drawio.read('', inflate), /trống/);
    await rejects(drawio.read('hello world', inflate), /không phải file draw\.io/);
    await rejects(drawio.read('<html><body/></html>', inflate), /không phải file draw\.io/);
    await rejects(drawio.read('<mxfile></mxfile>', inflate), /không có trang/);
    await rejects(drawio.read('<!DOCTYPE mxfile [<!ENTITY a "b">]><mxfile/>', inflate), /DOCTYPE/);
    await rejects(drawio.read('<mxfile><diagram name="x"><mxGraphModel></diagram></mxfile>', inflate), /thẻ đóng/);
    await rejects(drawio.read('x'.repeat(drawio.LIMITS.file + 1), inflate), /quá lớn/);
});

test('read reports compressed pages it cannot inflate', async function () {
    const file = mxfile([{ name: 'P', cells: [] }], true);
    await rejects(drawio.read(file, null), /không giải nén được/i);
    await rejects(drawio.read(file.replace(/>[A-Za-z0-9+/=]{20,}</, '>AAAAinvalidAAAA<'), inflate), /Không giải nén được trang/);
});

test('parseXml decodes entities and ignores comments, CDATA markers and dangerous attribute names', function () {
    const tree = drawio.parseXml('<a x="1 &lt; 2 &amp; &#65;&#x42;" y=\'q"q\' __proto__="p"><!-- c --><b/><![CDATA[<raw>]]>t&gt;</a>');
    const a = tree.children[0];
    assert.strictEqual(a.attrs.x, '1 < 2 & AB');
    assert.strictEqual(a.attrs.y, 'q"q');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(a.attrs, '__proto__'), false);
    assert.strictEqual(({}).p, undefined);
    assert.strictEqual(a.children.length, 1);
    assert.strictEqual(a.text, '<raw>t>');
});

test('textFromPng reads the diagram stored in a draw.io PNG', function () {
    const base = Buffer.from(PIXEL, 'base64');
    const xml = mxfile([{ name: 'Png', cells: [] }]);
    const body = Buffer.concat([Buffer.from('mxfile\0', 'latin1'), Buffer.from(encodeURIComponent(xml), 'latin1')]);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(body.length);
    const png = Buffer.concat([base.subarray(0, 33), size, Buffer.from('tEXt', 'latin1'), body, Buffer.alloc(4), base.subarray(base.length - 12)]);
    assert.strictEqual(drawio.textFromPng(new Uint8Array(png)), xml);
    assert.throws(function () { drawio.textFromPng(new Uint8Array(base)); }, /không kèm sơ đồ/);
    assert.throws(function () { drawio.textFromPng(new Uint8Array([1, 2, 3])); }, /không phải file draw\.io/);
});

test('a label left of a box becomes the caption of a text field', async function () {
    const result = await screenOf([
        vertex('l', TEXT, 'Employee Code (*)', 100, 50, 120, 20),
        vertex('f', RECT, '', 240, 48, 200, 24)
    ]);
    assert.strictEqual(result.screen.nodes.length, 1);
    const field = result.screen.nodes[0];
    assert.strictEqual(field.t, 'text');
    assert.strictEqual(field.caption, 'Employee Code');
    assert.strictEqual(field.required, true);
    assert.ok(field.labelX < field.x);
    assert.strictEqual(Math.min(field.labelX, field.x), 0);
});

test('a label above a box becomes a caption above the field', async function () {
    const result = await screenOf([
        vertex('l', TEXT, 'Ghi chú', 100, 20, 80, 20),
        vertex('f', RECT, '', 100, 44, 300, 24),
        vertex('far', TEXT, 'Khác', 600, 300, 50, 20)
    ]);
    const field = find(result.screen.nodes, (n) => n.t === 'text');
    assert.strictEqual(field.caption, 'Ghi chú');
    assert.strictEqual(field.captionAbove, true);
    assert.ok(find(result.screen.nodes, (n) => n.t === 'label' && n.text === 'Khác'));
});

test('boxes map to buttons, dates, combos, check boxes and radio buttons', async function () {
    const result = await screenOf([
        vertex('b', RECT + 'fillColor=#0078D4;fontColor=#fff;strokeColor=#005A9E;', 'Save', 0, 0, 80, 28),
        vertex('d', RECT + 'align=left;', 'dd/mm/yyyy', 0, 40, 140, 24),
        vertex('c', RECT, '', 0, 80, 140, 24),
        vertex('caret', 'triangle;direction=south;whiteSpace=wrap;html=1;', '', 122, 88, 10, 8),
        vertex('k', RECT, '', 0, 120, 14, 14),
        vertex('kl', TEXT, 'Is Active', 20, 117, 80, 20),
        vertex('r', 'ellipse;whiteSpace=wrap;html=1;', '', 0, 150, 14, 14),
        vertex('big', 'ellipse;whiteSpace=wrap;html=1;', 'Start', 300, 0, 120, 80)
    ]);
    const kinds = result.screen.nodes.map((n) => n.t);
    assert.deepStrictEqual(kinds, ['button', 'date', 'combo', 'checkbox', 'radio']);
    const button = result.screen.nodes[0];
    assert.deepStrictEqual([button.text, button.bg, button.fg, button.border], ['Save', '#0078d4', '#ffffff', '#005a9e']);
    assert.strictEqual(result.screen.nodes[1].placeholder, 'dd/mm/yyyy');
    assert.strictEqual(result.screen.nodes[3].caption, 'Is Active');
    assert.strictEqual(result.stats.skipped.shape, 1);
});

test('a large box, a swimlane and a transparent group keep their children at absolute positions', async function () {
    const result = await screenOf([
        vertex('panel', RECT, '', 0, 0, 400, 200),
        vertex('inside', RECT, '', 20, 30, 150, 24),
        vertex('lane', 'swimlane;whiteSpace=wrap;html=1;startSize=23;', 'Filter Conditions', 500, 0, 300, 160),
        vertex('laneChild', RECT, '', 10, 40, 100, 24, 'lane'),
        vertex('grp', 'group', '', 0, 300, 200, 100),
        vertex('grpChild', TEXT, 'Trong nhóm', 15, 25, 100, 20, 'grp')
    ]);
    const group = find(result.screen.nodes, (n) => n.t === 'group');
    assert.deepStrictEqual([group.x, group.y, group.children.length], [0, 0, 1]);
    assert.deepStrictEqual([group.children[0].x, group.children[0].y], [20, 30]);
    const section = find(result.screen.nodes, (n) => n.t === 'section');
    assert.strictEqual(section.caption, 'Filter Conditions');
    assert.deepStrictEqual([section.children[0].x, section.children[0].y], [510, 40]);
    const label = find(result.screen.nodes, (n) => n.t === 'label');
    assert.strictEqual(label.x, 19);
    assert.ok(label.y >= 325 && label.y <= 330);
});

test('shapes of the Mockup library map to their controls', async function () {
    const result = await screenOf([
        vertex('w', 'strokeWidth=1;shadow=0;dashed=0;align=center;html=1;shape=mxgraph.mockup.containers.window;mainText=,;', 'Chọn nhân viên', 0, 0, 500, 300),
        vertex('cb', 'strokeWidth=1;html=1;shape=mxgraph.mockup.forms.comboBox;mainText=;', 'Option 1', 20, 60, 150, 30),
        vertex('bt', 'strokeWidth=1;html=1;shape=mxgraph.mockup.buttons.button;mainText=;buttonStyle=round;', 'OK', 20, 110, 100, 30),
        vertex('sp', 'html=1;shape=mxgraph.mockup.forms.spinner;', '', 200, 60, 100, 30),
        vertex('tb', 'html=1;shape=mxgraph.mockup.text.textBox;mainText=;', 'Line 1', 320, 60, 150, 30),
        vertex('note', 'shape=mxgraph.mockup.text.stickyNote2;html=1;', 'Nhớ kiểm tra', 600, 0, 200, 200)
    ]);
    const popup = result.screen.nodes[0];
    assert.strictEqual(popup.t, 'popup');
    assert.strictEqual(popup.title, 'Chọn nhân viên');
    assert.deepStrictEqual(popup.children.map((n) => n.t), ['combo', 'number', 'text', 'button']);
    assert.strictEqual(result.stats.skipped.note, 1);
});

test('a table becomes a grid with its columns and rows of data', async function () {
    const cells = [vertex('t', 'shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;', '', 100, 100, 300, 75)];
    [['Code', 'Name'], ['E01', 'An'], ['E02', 'Bình']].forEach(function (row, r) {
        cells.push(vertex('r' + r, 'shape=tableRow;horizontal=0;startSize=0;', '', 0, r * 25, 300, 25, 't'));
        row.forEach(function (value, c) { cells.push(vertex('c' + r + c, 'shape=partialRectangle;html=1;', value, c * 100, 0, c ? 200 : 100, 25, 'r' + r)); });
    });
    const result = await screenOf(cells);
    const grid = result.screen.nodes[0];
    assert.strictEqual(grid.t, 'grid');
    assert.deepStrictEqual(grid.columns, [{ caption: 'Code', w: 100 }, { caption: 'Name', w: 200 }]);
    assert.deepStrictEqual(grid.data, [['E01', 'An'], ['E02', 'Bình']]);
    assert.strictEqual(grid.rows, 2);
    assert.strictEqual(result.screen.nodes.length, 1);
    const control = capture.convert(result.screen, { idSeed: 'T' }).controls[0];
    assert.deepStrictEqual(control.sampleData, [{ Code: 'E01', Name: 'An' }, { Code: 'E02', Name: 'Bình' }]);
});

test('connectors, hidden layers and unknown shapes are counted, not converted', async function () {
    const xml = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" parent="0" visible="0"/>' +
        vertex('a', RECT, 'Bước 1', 0, 0, 120, 40) + vertex('h', RECT, 'Ẩn', 0, 100, 120, 40, '2') +
        vertex('rh', 'rhombus;whiteSpace=wrap;html=1;', 'Đạt?', 200, 0, 80, 80) +
        [1, 2, 3, 4, 5].map((n) => edge('e' + n)).join('') + '</root></mxGraphModel>';
    const pages = await drawio.read(xml, inflate);
    const result = drawio.toScreen(pages[0], {});
    assert.strictEqual(result.screen.nodes.length, 1);
    assert.deepStrictEqual(result.stats.skipped, { edge: 5, image: 0, note: 0, shape: 1 });
    assert.strictEqual(result.stats.flow, true);
});

test('markup inside a label never reaches a control', async function () {
    const result = await screenOf([
        vertex('a', TEXT, '<b>Họ tên</b><br><img src=x onerror="alert(1)"><script>alert(2)</script>', 0, 0, 200, 40),
        vertex('b', TEXT.replace('html=1;', ''), '<img src=x onerror=alert(3)>', 0, 100, 200, 20)
    ]);
    const controls = capture.convert(result.screen, { idSeed: 'T' }).controls;
    assert.strictEqual(controls.length, 2);
    controls.forEach(function (control) { assert.strictEqual(/[<>]/.test(JSON.stringify(control)), false); });
    assert.ok(/Họ tên/.test(controls[0].defaultValue));
});

test('a pasted screenshot stays an image and the shapes drawn on it are merged or converted', async function () {
    const result = await screenOf([
        vertex('shot', IMAGE, '', 100, 100, 800, 400),
        vertex('mask', RECT + 'fillColor=#FFFFFF;strokeColor=none;', '', 150, 150, 300, 60),
        vertex('strip', RECT + 'fillColor=#e7e7e5;strokeColor=#C1C1C1;align=left;', 'Thông tin chung', 150, 220, 500, 24),
        vertex('icon', IMAGE, '', 160, 160, 16, 16),
        vertex('frame', RECT + 'fillColor=none;strokeColor=#FF0000;strokeWidth=2;', '', 500, 150, 200, 100),
        vertex('label', TEXT, 'Mã nhân viên', 160, 300, 100, 20),
        vertex('input', RECT + 'fillColor=#FFFFFF;strokeColor=#C1C1C1;', '', 270, 298, 180, 24),
        vertex('ok', RECT + 'fillColor=#0078D4;strokeColor=none;fontColor=#FFFFFF;', 'OK', 700, 440, 80, 28)
    ]);
    const nodes = result.screen.nodes;
    assert.deepStrictEqual(nodes.map((n) => n.t), ['image', 'label', 'text', 'button']);
    const image = nodes[0];
    assert.strictEqual(image.src, PIXEL_URL);
    assert.deepStrictEqual([image.x, image.y, image.w, image.h], [0, 0, 800, 400]);
    assert.deepStrictEqual(image.layers.map((l) => l.kind), ['rect', 'rect', 'image', 'rect']);
    assert.deepStrictEqual(image.layers[0], { x: 50, y: 50, w: 300, h: 60, kind: 'rect', fill: '#ffffff', stroke: null, strokeWidth: 1, rounded: false });
    assert.deepStrictEqual([image.layers[3].fill, image.layers[3].stroke, image.layers[3].strokeWidth], [null, '#ff0000', 2]);
    assert.strictEqual(nodes[1].text, 'Thông tin chung');
    assert.strictEqual(nodes[2].caption, 'Mã nhân viên');
    assert.strictEqual(result.stats.baked, 4);
});

test('images that are not embedded bitmaps are counted as skipped', async function () {
    const result = await screenOf([
        vertex('ok', TEXT, 'Tiêu đề', 0, 0, 100, 20),
        vertex('url', 'shape=image;image=https://example.com/logo.png;', '', 0, 40, 50, 50),
        vertex('svg', 'shape=image;image=data:image/svg+xml,PHN2Zy8+;', '', 0, 100, 50, 50)
    ]);
    assert.strictEqual(result.stats.skipped.image, 2);
    assert.strictEqual(result.screen.nodes.length, 1);
});

test('a table on a screenshot keeps the rows that fit and absorbs the shapes drawn on it', async function () {
    const cells = [vertex('shot', IMAGE, '', 0, 0, 900, 500), vertex('t', 'shape=table;startSize=0;container=1;', '', 50, 50, 400, 130)];
    [['', 'Tên'], ['', 'A'], ['', 'B'], ['', 'C'], ['', 'D']].forEach(function (row, r) {
        cells.push(vertex('r' + r, 'shape=tableRow;', '', 0, r * 26, 400, 26, 't'));
        row.forEach(function (value, c) { cells.push(vertex('c' + r + c, 'shape=partialRectangle;html=1;', value, c * 40, 0, c ? 360 : 40, 26, 'r' + r)); });
    });
    cells.push(vertex('tick', RECT, '', 62, 82, 14, 14));
    const result = await screenOf(cells);
    const grid = find(result.screen.nodes, (n) => n.t === 'grid');
    assert.strictEqual(grid.rows, 2);
    assert.deepStrictEqual(grid.data, [['', 'A'], ['', 'B']]);
    assert.strictEqual(grid.columns[0].type, 'checkbox');
    assert.strictEqual(result.stats.trimmedTables, 1);
    assert.strictEqual(find(result.screen.nodes, (n) => n.t === 'checkbox'), null);
    assert.ok(capture.gridHeight('core', { rows: grid.rows, title: '', toolbar: [], language: false }) <= 130);
});

test('a coloured block outside any screenshot is painted only when a painter is given', async function () {
    const cells = [vertex('bar', RECT + 'fillColor=#0F75BD;strokeColor=none;', '', 0, 0, 600, 30), vertex('t', TEXT, 'Tiêu đề', 10, 40, 100, 20)];
    assert.deepStrictEqual((await screenOf(cells)).screen.nodes.map((n) => n.t), ['label']);
    const painted = await screenOf(cells, { paint: function (layer) { return layer.fill === '#0f75bd' ? PIXEL_URL : null; } });
    assert.deepStrictEqual(painted.screen.nodes.map((n) => n.t), ['image', 'label']);
});

test('converted screens pass the screen data checks and produce image controls', async function () {
    const result = await screenOf([vertex('shot', IMAGE, '', 40, 40, 300, 200), vertex('l', TEXT, 'Tên', 60, 60, 60, 20)], { ui: 'ess' });
    assert.strictEqual(capture.normalize(result.screen).ok, true);
    const controls = capture.convert(result.screen, { idSeed: 'T' }).controls;
    const image = controls[0];
    assert.deepStrictEqual([image.ftype, image.uiMode, image.imageMode, image.zIndex, image.imageData], ['image', 'ess', 'stretch', 0, PIXEL_URL]);
    assert.deepStrictEqual([image.width, image.height], [300, 200]);
    assert.strictEqual(controls[1].ftype, 'label');
});

test('a page without convertible shapes is refused with the page name', async function () {
    const pages = await drawio.read(mxfile([{ name: 'Trống', cells: [edge('e')] }]), inflate);
    assert.throws(function () { drawio.toScreen(pages[0], {}); }, /Trang 'Trống' không có hình nào/);
});

test('a page with more shapes than the limit is cut and flagged', async function () {
    const cells = [];
    for (let i = 0; i < drawio.LIMITS.cells + 5; i++) cells.push(vertex('v' + i, TEXT, 'A' + i, (i % 50) * 30, Math.floor(i / 50) * 30, 28, 20));
    const result = await screenOf(cells);
    assert.strictEqual(result.stats.truncated, true);
    assert.ok(result.stats.shapes <= drawio.LIMITS.cells);
});

(async function () {
    let passed = 0;
    const failures = [];
    for (const item of tests) {
        try { await item.fn(); passed++; }
        catch (err) { failures.push(item.name + ': ' + err.message); }
    }
    console.log('builder-drawio: ' + passed + ' passed, ' + failures.length + ' failed');
    failures.forEach(function (f) { console.log('  FAIL ' + f); });
    process.exitCode = failures.length ? 1 : 0;
})();
