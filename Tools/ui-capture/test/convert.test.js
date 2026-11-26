'use strict';
const assert = require('assert');
const path = require('path');
const builderScripts = path.resolve(__dirname, '..', '..', '..', 'BADesign', 'Scripts', 'builder');
const capture = require(path.join(builderScripts, 'builder-capture.js'));
const page = require(path.join(builderScripts, 'builder-capture-page.js'));

let passed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; }
    catch (err) { failures.push(name + ': ' + err.message); }
}

function screen(ui, nodes, extra) {
    return Object.assign({ kind: 'ba-screen', v: 1, ui: ui, title: 'Sample', width: 1000, height: 600, nodes: nodes }, extra || {});
}
function convert(ui, nodes) {
    return capture.convert(screen(ui, nodes), { idSeed: 'T' }).controls;
}

test('normalize rejects data that is not a screen', function () {
    assert.strictEqual(capture.normalize(null).ok, false);
    assert.strictEqual(capture.normalize('not json').ok, false);
    assert.strictEqual(capture.normalize({ kind: 'other', v: 1, ui: 'core', nodes: [] }).ok, false);
    assert.strictEqual(capture.normalize(screen('core', [{ t: 'text', x: 0, y: 0, w: 10, h: 10 }], { v: 2 })).ok, false);
    assert.strictEqual(capture.normalize(screen('mobile', [{ t: 'text', x: 0, y: 0, w: 10, h: 10 }])).ok, false);
    assert.strictEqual(capture.normalize(screen('core', [])).ok, false);
    assert.strictEqual(capture.normalize('x'.repeat(capture.LIMITS.json + 1)).ok, false);
});

test('normalize accepts a JSON string', function () {
    const result = capture.normalize(JSON.stringify(screen('ess', [{ t: 'label', x: 1, y: 2, w: 30, h: 10, text: 'Hello' }])));
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.screen.nodes[0].text, 'Hello');
});

test('normalize removes markup characters, control characters and long text', function () {
    const result = capture.normalize(screen('core', [
        { t: 'label', x: 0, y: 0, w: 10, h: 10, text: '<img src=x onerror=alert(1)>Name\u0007' + 'a'.repeat(500) }
    ], { title: '<b>Title</b>' }));
    const text = result.screen.nodes[0].text;
    assert.ok(text.indexOf('<') < 0 && text.indexOf('>') < 0);
    assert.ok(!/[\u0000-\u001F]/.test(text));
    assert.ok(text.length <= capture.LIMITS.text);
    assert.strictEqual(result.screen.title, '\uFF1Cb\uFF1ETitle\uFF1C/b\uFF1E');
});

test('comparison signs in captions keep their meaning without markup characters', function () {
    const grid = capture.normalize(screen('core', [{
        t: 'grid', x: 0, y: 0, w: 400, h: 100,
        columns: [{ caption: '>= Day of Start Date', w: 120 }, { caption: '< Day of Start Date', w: 120 }, { caption: 'A <= B', w: 80 }, { caption: 'A <> B', w: 80 }]
    }])).screen.nodes[0];
    assert.deepStrictEqual(grid.columns.map(function (c) { return c.caption; }),
        ['\u2265 Day of Start Date', '\uFF1C Day of Start Date', 'A \u2264 B', 'A \u2260 B']);
    assert.ok(!/[<>]/.test(JSON.stringify(grid)));
});

test('normalize drops unknown node types and unknown properties', function () {
    const result = capture.normalize(screen('core', [
        { t: 'script', x: 0, y: 0, w: 10, h: 10 },
        { t: 'text', x: 5, y: 6, w: 100, h: 20, caption: 'Code', onclick: 'x', html: '<b>' }
    ]));
    assert.strictEqual(result.screen.nodes.length, 1);
    assert.deepStrictEqual(Object.keys(result.screen.nodes[0]).sort(), ['caption', 'disabled', 'h', 'required', 't', 'w', 'x', 'y']);
});

test('normalize clamps numbers and falls back for invalid ones', function () {
    const node = capture.normalize(screen('core', [{ t: 'text', x: 'abc', y: 1e9, w: -5, h: NaN }])).screen.nodes[0];
    assert.strictEqual(node.x, 0);
    assert.strictEqual(node.y, capture.LIMITS.size);
    assert.strictEqual(node.w, 1);
    assert.strictEqual(node.h, 1);
});

test('normalize limits depth and node count', function () {
    let deep = { t: 'label', x: 0, y: 0, w: 1, h: 1, text: 'leaf' };
    for (let i = 0; i < 20; i++) deep = { t: 'group', x: 0, y: 0, w: 10, h: 10, children: [deep] };
    const deepResult = capture.normalize(screen('core', [deep]));
    assert.strictEqual(deepResult.truncated, true);
    assert.ok(deepResult.count <= capture.LIMITS.depth);

    const many = [];
    for (let i = 0; i < capture.LIMITS.nodes + 50; i++) many.push({ t: 'label', x: 0, y: i, w: 5, h: 5, text: 'n' });
    const manyResult = capture.normalize(screen('core', many));
    assert.strictEqual(manyResult.screen.nodes.length, capture.LIMITS.nodes);
    assert.strictEqual(manyResult.truncated, true);
});

test('core field with a caption on the left becomes one field', function () {
    const controls = convert('core', [{ t: 'text', x: 200, y: 100, w: 150, h: 22, caption: 'Policy Code', labelX: 80, required: true }]);
    assert.strictEqual(controls.length, 1);
    const c = controls[0];
    assert.strictEqual(c.type, 'field');
    assert.strictEqual(c.ftype, 'text');
    assert.strictEqual(c.uiMode, 'core');
    assert.strictEqual(c.caption, 'Policy Code');
    assert.strictEqual(c.required, true);
    assert.strictEqual(c.labelWidth, 200 - 80 - 8);
    assert.strictEqual(c.left, 80 + 20);
    assert.strictEqual(c.width, 150 + c.labelWidth + 10);
    assert.strictEqual(c.top, 100 - 3 + 20);
    assert.strictEqual(c.height, 22);
});

test('core field without a caption keeps the editor at the captured position', function () {
    const c = convert('core', [{ t: 'combo', x: 200, y: 100, w: 150, h: 22 }])[0];
    assert.strictEqual(c.ftype, 'combo');
    assert.strictEqual(c.labelWidth, 0);
    assert.strictEqual(c.left, 200 - 8 + 20);
    assert.strictEqual(c.width, 160);
    assert.deepStrictEqual(c.items, ['Item 1', 'Item 2']);
});

test('core memo keeps its height', function () {
    const c = convert('core', [{ t: 'memo', x: 100, y: 100, w: 300, h: 80, caption: 'Remark', labelX: 20 }])[0];
    assert.strictEqual(c.ftype, 'memo');
    assert.strictEqual(c.height, 80);
});

test('caption above the editor becomes a separate label', function () {
    const controls = convert('ess', [{ t: 'text', x: 100, y: 140, w: 300, h: 34, caption: 'Reason', captionAbove: true, labelY: 118, labelX: 100, labelW: 60, labelH: 16, required: true }]);
    assert.strictEqual(controls.length, 2);
    assert.strictEqual(controls[0].ftype, 'label');
    assert.strictEqual(controls[0].defaultValue, 'Reason *');
    assert.strictEqual(controls[0].top, 118 - 5 + 20);
    assert.strictEqual(controls[0].left, 100 - 7 + 20);
    assert.strictEqual(controls[0].width, 60 + 14 + 6);
    assert.strictEqual(controls[0].height, 16 + 10);
    assert.strictEqual(controls[1].ftype, 'text');
    assert.strictEqual(controls[1].caption, '');
    assert.strictEqual(controls[1].labelWidth, 0);
});

test('ess field uses ess metrics and the ess numeric type', function () {
    const c = convert('ess', [{ t: 'number', x: 213, y: 105, w: 260, h: 30, caption: 'Hours', labelX: 100 }])[0];
    assert.strictEqual(c.uiMode, 'ess');
    assert.strictEqual(c.ftype, 'numberic-test');
    assert.strictEqual(c.labelWidth, 213 - 100 - 13);
    assert.strictEqual(c.width, 260 + c.labelWidth + 20);
    assert.strictEqual(c.top, 105 - 5 + 20);
    assert.strictEqual(c.height, 40);
});

test('checkbox and radio put the caption on the right', function () {
    const controls = convert('core', [
        { t: 'checkbox', x: 50, y: 60, w: 120, h: 18, caption: 'Is Active' },
        { t: 'radio', x: 50, y: 90, w: 120, h: 18, caption: 'Male', disabled: true }
    ]);
    assert.strictEqual(controls[0].ftype, 'checkbox');
    assert.strictEqual(controls[0].captionPosition, 'right');
    assert.strictEqual(controls[0].caption, 'Is Active');
    assert.strictEqual(controls[0].height, 22);
    assert.strictEqual(controls[1].ftype, 'radio');
    assert.strictEqual(controls[1].disabled, true);
});

test('button keeps its text and only valid colours', function () {
    const c = convert('ess', [{ t: 'button', x: 10, y: 10, w: 90, h: 38, text: 'Submit', bg: '#0078D4', fg: 'red', border: 'javascript:1' }])[0];
    assert.strictEqual(c.ftype, 'button');
    assert.strictEqual(c.defaultValue, 'Submit');
    assert.strictEqual(c.caption, '');
    assert.strictEqual(c.btnBackColor, '#0078d4');
    assert.strictEqual(c.btnTextColor, undefined);
    assert.strictEqual(c.btnBorderColor, undefined);
});

test('group box children are relative to the group content', function () {
    const controls = convert('core', [{
        t: 'group', x: 100, y: 200, w: 500, h: 150, caption: 'General', children: [
            { t: 'text', x: 220, y: 230, w: 150, h: 22, caption: 'Code', labelX: 120 }
        ]
    }]);
    assert.strictEqual(controls.length, 2);
    assert.strictEqual(controls[0].ftype, 'groupbox');
    assert.strictEqual(controls[0].caption, 'General');
    assert.strictEqual(controls[0].left, 120);
    assert.strictEqual(controls[0].zIndex, 0);
    assert.strictEqual(controls[1].parentId, controls[0].id);
    assert.strictEqual(controls[1].left, 120 - 100 - 5);
    assert.strictEqual(controls[1].top, 230 - 3 - 200 - 11);
});

test('core section and ess section use their own containers and insets', function () {
    const core = convert('core', [{ t: 'section', x: 0, y: 0, w: 400, h: 200, caption: 'Detail', children: [{ t: 'label', x: 20, y: 60, w: 50, h: 18, text: 'A' }] }]);
    assert.strictEqual(core[0].ftype, 'section');
    assert.strictEqual(core[1].left, 20 - 5);
    assert.strictEqual(core[1].top, 60 - 36);

    const ess = convert('ess', [{ t: 'section', x: 0, y: 0, w: 400, h: 200, caption: 'Detail', children: [{ t: 'label', x: 20, y: 60, w: 50, h: 18, text: 'A' }] }]);
    assert.strictEqual(ess[0].type, 'collapsible-section');
    assert.strictEqual(ess[0].caption, 'Detail');
    assert.strictEqual(ess[1].parentId, ess[0].id);
    assert.strictEqual(ess[1].left, 20 - 7 - 11);
    assert.strictEqual(ess[1].top, 60 - 5 - 52);
    assert.strictEqual(ess[1].width, 50 + 14 + 6);
});

test('popup children are relative to the popup body', function () {
    const controls = convert('core', [{ t: 'popup', x: 300, y: 100, w: 600, h: 400, title: 'Add New', children: [{ t: 'button', x: 320, y: 420, w: 60, h: 24, text: 'Save' }] }]);
    assert.strictEqual(controls[0].type, 'popup');
    assert.strictEqual(controls[0].headerText, 'Add New');
    assert.strictEqual(controls[1].parentId, controls[0].id);
    assert.strictEqual(controls[1].left, 320 - 300 - 2);
    assert.strictEqual(controls[1].top, 420 - 100 - 59);
});

test('popup content that starts above the popup body moves down as one block and the popup grows by that much', function () {
    const controls = convert('core', [{ t: 'popup', x: 100, y: 100, w: 400, h: 90, title: 'Confirm', children: [
        { t: 'button', x: 114, y: 114, w: 60, h: 27, text: 'Yes' },
        { t: 'button', x: 114, y: 150, w: 60, h: 27, text: 'No' },
        { t: 'group', x: 200, y: 120, w: 180, h: 60, caption: 'G', children: [{ t: 'button', x: 210, y: 140, w: 60, h: 27, text: 'In' }] }
    ] }]);
    const lack = 100 + 59 - 114;
    const yes = controls.filter(function (c) { return c.defaultValue === 'Yes'; })[0];
    const no = controls.filter(function (c) { return c.defaultValue === 'No'; })[0];
    const group = controls.filter(function (c) { return c.ftype === 'groupbox'; })[0];
    const inner = controls.filter(function (c) { return c.defaultValue === 'In'; })[0];
    assert.strictEqual(controls[0].height, 90 + lack);
    assert.strictEqual(yes.top, 0);
    assert.strictEqual(no.top - yes.top, 150 - 114);
    assert.strictEqual(group.top - yes.top, 120 - 114);
    assert.strictEqual(inner.top, 140 - 120 - 11);
});

test('a popup with room above its content keeps its size, and the toolbar docked to it does not count as content', function () {
    const controls = convert('core', [{ t: 'popup', x: 100, y: 100, w: 400, h: 300, title: 'Edit', children: [
        { t: 'toolbar', x: 106, y: 132, w: 160, h: 26, buttons: [{ text: 'Save' }, { text: 'Cancel' }] },
        { t: 'button', x: 114, y: 170, w: 60, h: 27, text: 'Go' }
    ] }]);
    assert.strictEqual(controls[0].height, 300);
    assert.strictEqual(controls[1].top, 32);
    assert.strictEqual(controls.filter(function (c) { return c.defaultValue === 'Go'; })[0].top, 170 - 100 - 59);
});

test('toolbar directly inside a popup is docked to the popup, a toolbar inside a group belongs to the group', function () {
    const controls = convert('core', [{
        t: 'popup', x: 300, y: 100, w: 600, h: 400, title: 'Add New', children: [
            { t: 'toolbar', x: 306, y: 132, w: 160, h: 26, buttons: [{ text: 'Save' }, { text: 'Cancel' }] },
            { t: 'group', x: 320, y: 180, w: 400, h: 100, caption: 'G', children: [{ t: 'toolbar', x: 330, y: 200, w: 60, h: 26, buttons: [{ text: 'Add' }] }] }
        ]
    }]);
    assert.strictEqual(controls[1].type, 'toolbar');
    assert.strictEqual(controls[1].dock, 'popup');
    assert.strictEqual(controls[1].parentId, controls[0].id);
    assert.strictEqual(controls[1].showBackground, false);
    assert.strictEqual(controls[1].left, 6);
    assert.strictEqual(controls[1].top, 32);
    assert.strictEqual(controls[2].ftype, 'groupbox');
    assert.strictEqual(controls[3].type, 'toolbar');
    assert.strictEqual(controls[3].dock, null);
    assert.strictEqual(controls[3].parentId, controls[2].id);
    assert.strictEqual(controls[3].showBackground, true);
    assert.strictEqual(controls[3].left, 330 - 320 - 5);
    assert.strictEqual(controls[3].top, 200 - 180 - 11);
});

function headedPopup(head, children) {
    return convert('core', [{ t: 'popup', x: 100, y: 100, w: 620, h: 436, head: head, title: 'Update', children: children }]);
}
function byText(controls, text) {
    return controls.filter(function (c) { return c.defaultValue === text; })[0];
}

test('a popup whose own head is taller than the popup of the Builder puts the head toolbar on the strip and keeps the gap below the head', function () {
    const controls = headedPopup(80, [
        { t: 'toolbar', x: 112, y: 150, w: 136, h: 23, buttons: [{ text: 'OK' }, { text: 'Cancel' }] },
        { t: 'button', x: 124, y: 200, w: 60, h: 27, text: 'Go' }
    ]);
    const toolbar = controls.filter(function (c) { return c.type === 'toolbar'; })[0];
    assert.strictEqual(toolbar.dock, 'popup');
    assert.strictEqual(toolbar.left, 12);
    assert.strictEqual(toolbar.top, 32);
    assert.strictEqual(byText(controls, 'Go').top, 200 - 100 - 80);
    assert.strictEqual(controls[0].height, 436 - (80 - 59));
});

test('a popup whose own head is shorter moves its content down by the difference and grows by that much', function () {
    const controls = headedPopup(44, [{ t: 'button', x: 124, y: 160, w: 60, h: 27, text: 'Go' }]);
    assert.strictEqual(byText(controls, 'Go').top, 160 - 100 - 44);
    assert.strictEqual(controls[0].height, 436 + (59 - 44));
});

test('a popup without a head of its own keeps the distance from its top edge to the content', function () {
    const controls = headedPopup(0, [{ t: 'button', x: 124, y: 114, w: 60, h: 27, text: 'Go' }]);
    assert.strictEqual(byText(controls, 'Go').top, 14);
    assert.strictEqual(controls[0].height, 436 + 59);
});

test('a toolbar below the head of such a popup moves with the content', function () {
    const controls = headedPopup(44, [
        { t: 'button', x: 124, y: 160, w: 60, h: 27, text: 'Go' },
        { t: 'toolbar', x: 112, y: 480, w: 136, h: 23, buttons: [{ text: 'Save' }, { text: 'Close' }] }
    ]);
    const toolbar = controls.filter(function (c) { return c.type === 'toolbar'; })[0];
    assert.strictEqual(toolbar.dock, 'popup');
    assert.strictEqual(toolbar.top, 480 - 100 + (59 - 44));
});

test('a head that reaches below the first content of the popup is cut back to that content, and a head outside the popup is brought inside', function () {
    const low = headedPopup(200, [{ t: 'button', x: 124, y: 150, w: 60, h: 27, text: 'Go' }]);
    assert.strictEqual(byText(low, 'Go').top, 0);
    assert.strictEqual(low[0].height, 436 + (59 - 50));
    const node = capture.normalize(screen('core', [{ t: 'popup', x: 0, y: 0, w: 300, h: 200, head: 9999, children: [{ t: 'label', x: 5, y: 150, w: 30, h: 10, text: 'a' }] }])).screen.nodes[0];
    assert.strictEqual(node.head, 200);
    const none = capture.normalize(screen('core', [{ t: 'popup', x: 0, y: 0, w: 300, h: 200, children: [{ t: 'label', x: 5, y: 150, w: 30, h: 10, text: 'a' }] }])).screen.nodes[0];
    assert.strictEqual(none.head, undefined);
});

test('core grid inside a group box in a popup belongs to the group box', function () {
    const controls = convert('core', [{
        t: 'popup', x: 300, y: 100, w: 800, h: 500, title: 'Select', children: [
            { t: 'group', x: 320, y: 180, w: 700, h: 300, caption: 'G', children: [
                { t: 'grid', x: 330, y: 200, w: 600, h: 240, rows: 3, columns: [{ caption: 'Code', w: 100 }], actions: [], toolbar: [] }
            ] }
        ]
    }]);
    const group = controls.filter(function (c) { return c.ftype === 'groupbox'; })[0];
    const grid = controls.filter(function (c) { return c.type === 'grid'; })[0];
    assert.strictEqual(group.parentId, controls[0].id);
    assert.strictEqual(grid.parentId, group.id);
    assert.strictEqual(grid.left, 330 - 320 - 5);
    assert.strictEqual(grid.top, 200 - 180 - 11);
});

test('core grid inside a section of a tab belongs to the section and to that tab', function () {
    const controls = convert('core', [{
        t: 'tabs', x: 0, y: 100, w: 800, h: 400, tabs: ['General', 'Shift'], active: 0, children: [
            { t: 'section', tab: 1, x: 10, y: 140, w: 780, h: 300, caption: 'Shift', children: [
                { t: 'grid', x: 30, y: 190, w: 700, h: 200, rows: 4, columns: [{ caption: 'Code', w: 100 }, { caption: 'Shift Name', w: 200 }], actions: [], toolbar: [] }
            ] }
        ]
    }]);
    const tabpage = controls.filter(function (c) { return c.type === 'tabpage'; })[0];
    const grid = controls.filter(function (c) { return c.type === 'grid'; })[0];
    const section = controls.filter(function (c) { return c.ftype === 'section'; })[0];
    assert.strictEqual(grid.parentId, section.id);
    assert.strictEqual(grid.tabPageId, tabpage.id);
    assert.strictEqual(grid.tabIndex, 1);
    assert.strictEqual(grid.left, 30 - 10 - 5);
    assert.strictEqual(grid.top, 190 - 140 - 36);
    assert.strictEqual(grid.sampleData.length, 4);
    assert.strictEqual(grid.sampleData[0].Code, 'Code 1');
    assert.strictEqual(grid.allowGrouping, false);
});

test('an ess section inside a tab belongs to that tab, like every other control of the tab', function () {
    const controls = convert('ess', [{
        t: 'tabs', x: 0, y: 100, w: 800, h: 400, tabs: ['General', 'Shift'], active: 0, children: [
            { t: 'section', tab: 1, x: 10, y: 140, w: 780, h: 200, caption: 'Shift', children: [{ t: 'label', x: 30, y: 200, w: 50, h: 18, text: 'A' }] }
        ]
    }]);
    const tabpage = controls.filter(function (c) { return c.type === 'tabpage'; })[0];
    const section = controls.filter(function (c) { return c.type === 'collapsible-section'; })[0];
    assert.deepStrictEqual([section.tabPageId, section.tabIndex], [tabpage.id, 1]);
});

test('grid header options come from the capture', function () {
    const controls = convert('core', [{
        t: 'grid', x: 0, y: 0, w: 900, h: 220, rows: 3, viewData: true, language: true, groupPanel: true, title: 'Time-sheet Policy',
        columns: [{ caption: 'Code', w: 80 }], actions: ['view'], toolbar: [{ text: 'Add' }, { text: 'Delete' }]
    }]);
    const grid = controls[0];
    assert.strictEqual(grid.showDataHeader, true);
    assert.strictEqual(grid.showLocalDataLanguage, true);
    assert.strictEqual(grid.allowGrouping, true);
    assert.strictEqual(grid.showTitle, true);
    assert.strictEqual(grid.titleText, 'Time-sheet Policy');
    assert.strictEqual(grid.toolbarItems.length, 2);
});

test('a grid that renders taller than captured pushes what is below it', function () {
    const controls = convert('core', [
        { t: 'grid', x: 0, y: 0, w: 600, h: 100, rows: 5, columns: [{ caption: 'Code', w: 80 }], actions: [], toolbar: [] },
        { t: 'label', x: 0, y: 120, w: 60, h: 18, text: 'Below' },
        { t: 'label', x: 700, y: 20, w: 60, h: 18, text: 'Beside' }
    ]);
    const below = controls.filter(function (c) { return c.defaultValue === 'Below'; })[0];
    const beside = controls.filter(function (c) { return c.defaultValue === 'Beside'; })[0];
    assert.strictEqual(below.top, 20 + 120 + (22 + 35 + 5 * 35 - 100));
    assert.strictEqual(beside.top, 40);
});

test('growth inside one tab does not move controls of another tab', function () {
    const controls = convert('core', [{
        t: 'tabs', x: 0, y: 0, w: 800, h: 300, tabs: ['A', 'B'], active: 0, children: [
            { t: 'grid', tab: 0, x: 10, y: 40, w: 600, h: 80, rows: 4, columns: [{ caption: 'Code', w: 80 }], actions: [], toolbar: [] },
            { t: 'label', tab: 0, x: 10, y: 130, w: 60, h: 18, text: 'UnderA' },
            { t: 'label', tab: 1, x: 10, y: 130, w: 60, h: 18, text: 'InB' }
        ]
    }]);
    const underA = controls.filter(function (c) { return c.defaultValue === 'UnderA'; })[0];
    const inB = controls.filter(function (c) { return c.defaultValue === 'InB'; })[0];
    const tabpage = controls.filter(function (c) { return c.type === 'tabpage'; })[0];
    const growth = 22 + 35 + 4 * 35 - 80;
    assert.strictEqual(underA.top, 20 + 130 + growth);
    assert.strictEqual(inB.top, 20 + 130);
    assert.strictEqual(tabpage.height, 300 + growth);
});

test('child coordinates never go negative', function () {
    const controls = convert('core', [{ t: 'group', x: 100, y: 100, w: 300, h: 100, caption: 'G', children: [{ t: 'label', x: 100, y: 100, w: 40, h: 18, text: 'Edge' }] }]);
    assert.strictEqual(controls[1].left, 0);
    assert.strictEqual(controls[1].top, 0);
});

test('tab page children stay in the parent coordinate space and carry the tab link', function () {
    const controls = convert('core', [{
        t: 'tabs', x: 50, y: 80, w: 700, h: 300, tabs: ['General', 'Shift', 'Overtime'], active: 1, children: [
            { t: 'text', x: 200, y: 140, w: 150, h: 22, caption: 'Name', labelX: 80 },
            { t: 'checkbox', x: 80, y: 180, w: 100, h: 18, caption: 'Night', tab: 2 }
        ]
    }]);
    const tabpage = controls[0];
    assert.strictEqual(tabpage.type, 'tabpage');
    assert.deepStrictEqual(tabpage.tabs, [{ caption: 'General' }, { caption: 'Shift' }, { caption: 'Overtime' }]);
    assert.strictEqual(tabpage.activeTabIndex, 1);
    assert.strictEqual(controls[1].parentId, null);
    assert.strictEqual(controls[1].tabPageId, tabpage.id);
    assert.strictEqual(controls[1].tabIndex, 1);
    assert.strictEqual(controls[1].left, 80 + 20);
    assert.strictEqual(controls[2].tabIndex, 2);
});

test('fields inside a group inside a tab keep both links', function () {
    const controls = convert('core', [{
        t: 'tabs', x: 0, y: 0, w: 700, h: 300, tabs: ['A'], active: 0, children: [
            { t: 'group', x: 10, y: 40, w: 300, h: 100, caption: 'G', children: [{ t: 'text', x: 120, y: 70, w: 100, h: 22, caption: 'X', labelX: 30 }] }
        ]
    }]);
    assert.strictEqual(controls[1].ftype, 'groupbox');
    assert.strictEqual(controls[1].tabPageId, controls[0].id);
    assert.strictEqual(controls[2].parentId, controls[1].id);
    assert.strictEqual(controls[2].tabPageId, controls[0].id);
});

test('a grid column without a caption gets no sample text of its own, the other columns keep theirs', function () {
    const columns = [{ caption: '', w: 50 }, { caption: 'Employee ID', w: 120 }];
    const core = convert('core', [{ t: 'grid', x: 10, y: 50, w: 600, h: 200, rows: 2, columns: columns, actions: [], toolbar: [] }])[0];
    assert.deepStrictEqual(core.sampleData, [{ Col1: '', EmployeeID: 'EmployeeID 1' }, { Col1: '', EmployeeID: 'EmployeeID 2' }]);
    assert.strictEqual(core.columns[0].caption, '');
    const ess = convert('ess', [{ t: 'grid', x: 10, y: 50, w: 600, h: 200, rows: 2, columns: columns, actions: [], toolbar: [] }])[0];
    assert.strictEqual(ess.columns[0].caption, '');
    assert.strictEqual(ess.columns[0].key, 'Col1');
});

test('core grid keeps columns, row actions, toolbar and pager', function () {
    const c = convert('core', [{
        t: 'grid', x: 10, y: 50, w: 900, h: 300, title: 'Policies', filterRow: true, pager: true, checkbox: true,
        columns: [{ caption: 'Policy Code', w: 120 }, { caption: 'Policy Code', w: 100 }, { caption: '###', w: 80 }],
        actions: ['edit', 'delete', 'hack'], toolbar: [{ text: 'Add' }, { text: 'Export to Excel' }, { text: 'Recalculate' }, { text: '' }]
    }])[0];
    assert.strictEqual(c.type, 'grid');
    assert.strictEqual(c.width, 900);
    assert.strictEqual(c.filterRow, true);
    assert.strictEqual(c.showPager, true);
    assert.strictEqual(c.showCheckbox, true);
    assert.strictEqual(c.showTitle, true);
    assert.strictEqual(c.titleText, 'Policies');
    assert.deepStrictEqual(c.columns.map(function (x) { return x.name; }), ['PolicyCode', 'PolicyCode2', 'Col3']);
    assert.strictEqual(c.showViewColumn, false);
    assert.strictEqual(c.showEditColumn, true);
    assert.strictEqual(c.showDeleteColumn, true);
    assert.deepStrictEqual(c.rowActionColumns.map(function (a) { return a.key + ':' + a.visible; }), ['view:false', 'edit:true', 'delete:true']);
    assert.strictEqual(c.toolbarItems.length, 3);
    assert.ok(/menu-add\.png$/.test(c.toolbarItems[0].icon));
    assert.ok(/menu-export\.png$/.test(c.toolbarItems[1].icon));
    assert.strictEqual(c.toolbarItems[2].icon, undefined);
});

test('ess grid uses the ess grid control', function () {
    const c = convert('ess', [{ t: 'grid', x: 0, y: 0, w: 800, h: 240, columns: [{ caption: 'From Date', w: 140 }], actions: ['view'], toolbar: [{ text: 'Add' }] }])[0];
    assert.strictEqual(c.type, 'ess-grid');
    assert.strictEqual(c.uiMode, 'ess');
    assert.strictEqual(c.height, 73 + 3 * 32);
    assert.strictEqual(c.columns[0].key, 'FromDate');
    assert.strictEqual(c.columns[0].caption, 'From Date');
    assert.strictEqual(c.showActionColumn, true);
    assert.strictEqual(c.allowAddRow, true);
    assert.strictEqual(c.rowActions[0].key, 'view');
});

test('an ess grid taller than captured grows its section and pushes the next section', function () {
    const controls = convert('ess', [
        { t: 'section', x: 0, y: 0, w: 900, h: 122, caption: 'First', children: [
            { t: 'grid', x: 11, y: 41, w: 870, h: 70, rows: 1, title: 'History', columns: [{ caption: 'Status', w: 100 }, { caption: 'Remark', w: 200 }] }
        ] },
        { t: 'section', x: 0, y: 130, w: 900, h: 52, caption: 'Second', children: [] }
    ]);
    const growth = 73 + 19 + 32 - 70;
    assert.strictEqual(controls[0].type, 'collapsible-section');
    assert.strictEqual(controls[0].height, 122 + growth);
    assert.strictEqual(controls[1].type, 'ess-grid');
    assert.strictEqual(controls[1].parentId, controls[0].id);
    assert.strictEqual(controls[1].height, 73 + 19 + 32);
    assert.strictEqual(controls[2].caption, 'Second');
    assert.strictEqual(controls[2].top, 130 + growth + 20);
});

test('a control on the header of an ess section moves below the header with the rest of the content, and the section grows by that much', function () {
    const controls = convert('ess', [
        { t: 'section', x: 0, y: 0, w: 900, h: 200, caption: 'Orders', children: [
            { t: 'toolbar', x: 700, y: 6, w: 180, h: 28, buttons: [{ text: 'Add' }, { text: 'Delete' }] },
            { t: 'label', x: 20, y: 60, w: 50, h: 18, text: 'A' }
        ] },
        { t: 'section', x: 0, y: 210, w: 900, h: 52, caption: 'Second', children: [] }
    ]);
    const lack = 52 - 6;
    const toolbar = controls.filter(function (c) { return c.type === 'toolbar'; })[0];
    const label = controls.filter(function (c) { return c.ftype === 'label'; })[0];
    assert.strictEqual(controls[0].height, 200 + lack);
    assert.strictEqual(toolbar.top, 0);
    assert.strictEqual(label.top, 60 + lack - 5 - 52);
    assert.strictEqual(controls.filter(function (c) { return c.caption === 'Second'; })[0].top, 210 + lack + 20);
});

test('ess button keeps the captured face size and an empty button gets a placeholder', function () {
    const ess = convert('ess', [{ t: 'button', x: 100, y: 200, w: 95, h: 40, text: 'Submit' }])[0];
    assert.strictEqual(ess.width, 95 + 14);
    assert.strictEqual(ess.height, 40 + 12);
    assert.strictEqual(ess.left, 100 - 7 + 20);
    assert.strictEqual(ess.top, 200 - 6 + 20);

    const core = convert('core', [{ t: 'button', x: 100, y: 200, w: 16, h: 16, text: '' }])[0];
    assert.strictEqual(core.defaultValue, '…');
    assert.strictEqual(core.width, 18);
    assert.strictEqual(core.height, 18);
});

test('controls on a core section header stay on the header and move past the caption', function () {
    const controls = convert('core', [{ t: 'section', x: 0, y: 0, w: 1100, h: 300, caption: 'Report Title Here', children: [
        { t: 'toolbar', x: 60, y: 1, w: 100, h: 25, buttons: [{ text: 'Open Report' }] },
        { t: 'combo', x: 900, y: 4, w: 170, h: 19, caption: 'Company', labelX: 840 },
        { t: 'text', x: 200, y: 60, w: 170, h: 19, caption: 'Code', labelX: 20 }
    ] }]);
    const captionEnd = 14 + Math.ceil('Report Title Here'.length * 7.2);
    const toolbar = controls.filter(function (c) { return c.type === 'toolbar'; })[0];
    const company = controls.filter(function (c) { return c.caption === 'Company'; })[0];
    const code = controls.filter(function (c) { return c.caption === 'Code'; })[0];
    assert.strictEqual(toolbar.parentId, controls[0].id);
    assert.strictEqual(toolbar.left, captionEnd - 5);
    assert.strictEqual(toolbar.top, 1 - 36);
    assert.strictEqual(company.top, 4 - 3 - 36);
    assert.strictEqual(code.top, 60 - 3 - 36);
});

test('toolbar buttons get icons by their text', function () {
    const c = convert('core', [{ t: 'toolbar', x: 0, y: 0, w: 300, h: 30, buttons: [{ text: 'Save' }, { text: 'Delete' }, { text: 'Cancel' }, { text: 'Approve' }, { text: 'Something' }] }])[0];
    assert.strictEqual(c.type, 'toolbar');
    assert.deepStrictEqual(c.items.map(function (i) { return i.icon ? i.icon.split('/').pop() : ''; }), ['menu-save.png', 'menu-delete.png', 'menu-cancel.png', 'menu-approve.png', '']);
});

test('ids are unique and parents come before children', function () {
    const controls = convert('core', [
        { t: 'popup', x: 0, y: 0, w: 800, h: 600, title: 'P', children: [
            { t: 'group', x: 10, y: 70, w: 400, h: 200, caption: 'G', children: [
                { t: 'text', x: 150, y: 100, w: 100, h: 22, caption: 'A', labelX: 30 },
                { t: 'text', x: 150, y: 130, w: 100, h: 22, caption: 'B', captionAbove: true, labelY: 112 }
            ] },
            { t: 'grid', x: 10, y: 300, w: 700, h: 200, columns: [{ caption: 'C', w: 100 }], actions: [], toolbar: [] }
        ] },
        { t: 'toolbar', x: 0, y: 620, w: 100, h: 30, buttons: [{ text: 'Add' }] }
    ]);
    const seen = {};
    controls.forEach(function (c) {
        assert.ok(!seen[c.id], 'duplicate id ' + c.id);
        if (c.parentId) assert.ok(seen[c.parentId], 'parent not before child for ' + c.id);
        seen[c.id] = true;
    });
    assert.strictEqual(controls.length, 7);
});

test('root controls never overlap the rulers', function () {
    const controls = convert('core', [{ t: 'label', x: -50, y: -10, w: 40, h: 18, text: 'Out' }, { t: 'text', x: 0, y: 0, w: 100, h: 22 }]);
    controls.forEach(function (c) {
        assert.ok(c.left >= 20, 'left ' + c.left);
        assert.ok(c.top >= 20, 'top ' + c.top);
    });
});

test('controls at the edge of a screen keep their distances: the screen moves as a whole', function () {
    const buttons = convert('ess', [{ t: 'button', x: 0, y: 0, w: 60, h: 24, text: 'Submit' }, { t: 'button', x: 64, y: 0, w: 60, h: 24, text: 'Cancel' }]);
    assert.strictEqual(buttons[1].left - buttons[0].left, 64);
    assert.deepStrictEqual([buttons[0].left, buttons[0].top], [20, 20]);

    const row = convert('core', [{ t: 'label', x: 0, y: 3, w: 40, h: 18, text: 'Note' }, { t: 'text', x: 100, y: 0, w: 100, h: 22 }]);
    assert.strictEqual(row[0].top - (row[1].top + capture.METRICS.core.editorTop), 3);
    assert.strictEqual(row[1].top, 20);

    const form = convert('core', [
        { t: 'text', x: 100, y: 0, w: 100, h: 22, caption: 'Code', labelX: 0 },
        { t: 'text', x: 100, y: 30, w: 100, h: 22, caption: 'Salary Calculation Percentage', labelX: 0 }
    ]);
    assert.deepStrictEqual(form.map(function (c) { return c.labelWidth; }), [92, 152]);
    assert.strictEqual(form[0].left + form[0].labelWidth, form[1].left + form[1].labelWidth);
    assert.deepStrictEqual(form.map(function (c) { return c.left; }), [80, 20]);
});

test('a screen that keeps the margin is not moved, and a tab member at the edge moves with its tab page', function () {
    const inside = convert('ess', [{ t: 'button', x: 7, y: 6, w: 60, h: 24, text: 'Submit' }, { t: 'label', x: 200, y: 40, w: 40, h: 16, text: 'Note' }]);
    assert.deepStrictEqual(inside.map(function (c) { return [c.left, c.top]; }), [[20, 20], [200 - 7 + 20, 40 - 5 + 20]]);

    const tabbed = convert('ess', [{
        t: 'tabs', x: 0, y: 0, w: 400, h: 200, tabs: ['One'], active: 0,
        children: [{ t: 'button', x: 0, y: 40, w: 60, h: 24, text: 'Add' }]
    }]);
    assert.deepStrictEqual(tabbed.map(function (c) { return c.type === 'tabpage' ? 'tabpage' : c.ftype; }), ['tabpage', 'button']);
    assert.strictEqual(tabbed[1].left - tabbed[0].left, -7);
    assert.strictEqual(tabbed[1].top - tabbed[0].top, 40 - 6);
    assert.deepStrictEqual([tabbed[1].left, tabbed[0].top], [20, 20]);
});

test('convert throws a clear error for invalid input', function () {
    assert.throws(function () { capture.convert({ kind: 'x' }); }, /UI Builder/);
});

test('summarize counts controls by kind', function () {
    const summary = capture.summarize(screen('core', [
        { t: 'text', x: 0, y: 0, w: 10, h: 10 },
        { t: 'checkbox', x: 0, y: 0, w: 10, h: 10, caption: 'c' },
        { t: 'grid', x: 0, y: 0, w: 10, h: 10, columns: [] },
        { t: 'toolbar', x: 0, y: 0, w: 10, h: 10, buttons: [{ text: 'Add' }] },
        { t: 'group', x: 0, y: 0, w: 10, h: 10, caption: 'g', children: [{ t: 'button', x: 0, y: 0, w: 10, h: 10, text: 'b' }] }
    ]));
    assert.deepStrictEqual(summary.counts, { total: 6, fields: 2, grids: 1, buttons: 2, containers: 1 });
    assert.strictEqual(summary.ui, 'core');
    assert.strictEqual(capture.summarize({ kind: 'nope' }), null);
});

test('outline lists simple shapes and the content size', function () {
    const drawing = capture.outline(screen('core', [
        { t: 'popup', x: 0, y: 0, w: 500, h: 300, title: 'P', children: [
            { t: 'text', x: 150, y: 80, w: 200, h: 22, caption: 'Code', labelX: 20 },
            { t: 'checkbox', x: 150, y: 120, w: 100, h: 18, caption: 'Active' },
            { t: 'grid', x: 10, y: 160, w: 480, h: 20, columns: [] }
        ] },
        { t: 'toolbar', x: 0, y: 320, w: 200, h: 30, buttons: [{ text: 'Add' }, { text: 'Delete' }] },
        { t: 'button', x: 520, y: 10, w: 80, h: 24, text: 'Go' }
    ]));
    const kinds = drawing.shapes.map(function (s) { return s[0]; }).join('');
    assert.strictEqual(kinds, 'plfflgbbb');
    assert.strictEqual(drawing.width, 600);
    assert.strictEqual(drawing.height, 348);
    drawing.shapes.forEach(function (s) {
        assert.strictEqual(s.length, 5);
        for (let i = 1; i < 5; i++) assert.ok(Number.isInteger(s[i]), 'integer expected');
    });
    assert.ok(/^[\[\]",a-z0-9-]*$/.test(JSON.stringify(drawing.shapes)));
});

test('outline stops at the shape limit and rejects invalid input', function () {
    const many = [];
    for (let i = 0; i < 50; i++) many.push({ t: 'button', x: i, y: i, w: 10, h: 10, text: 'b' });
    assert.strictEqual(capture.outline(screen('core', many), 20).shapes.length, 20);
    assert.strictEqual(capture.outline({ kind: 'nope' }), null);
});

test('a long caption widens the label area but not beyond the limit', function () {
    const c = convert('core', [{ t: 'number', x: 400, y: 100, w: 100, h: 21, caption: 'Salary Calculation Percentage', labelX: 300, required: true }])[0];
    assert.strictEqual(c.caption, 'Salary Calculation Percentage');
    assert.strictEqual(c.labelWidth, 400 - 300 - 8 + 60);
    assert.strictEqual(c.left, 400 - 8 - c.labelWidth + 20);
    assert.strictEqual(c.width, 100 + c.labelWidth + 10);

    const short = convert('core', [{ t: 'text', x: 400, y: 100, w: 100, h: 19, caption: 'Code', labelX: 300 }])[0];
    assert.strictEqual(short.labelWidth, 400 - 300 - 8);
});

test('a bold label keeps the bold flag', function () {
    const controls = convert('core', [
        { t: 'label', x: 10, y: 10, w: 80, h: 14, text: 'Heading', bold: true },
        { t: 'label', x: 10, y: 40, w: 80, h: 14, text: 'Plain' }
    ]);
    assert.strictEqual(controls[0].captionBold, true);
    assert.strictEqual(controls[1].captionBold, false);
});

test('captures of several tabs merge into one screen', function () {
    function tabScreen(active, child) {
        return screen('core', [
            { t: 'grid', x: 0, y: 0, w: 800, h: 100, columns: [{ caption: 'Code', w: 100 }] },
            { t: 'tabs', x: 0, y: 110, w: 800, h: 100 + active * 50, tabs: ['General', 'Shift', 'Overtime'], active: active, children: [child] }
        ], { height: 210 + active * 50 });
    }
    const merged = page.__baMergeTabs([
        tabScreen(0, { t: 'text', x: 20, y: 150, w: 100, h: 20, caption: 'A', tab: 0 }),
        tabScreen(1, { t: 'text', x: 20, y: 150, w: 100, h: 20, caption: 'B', tab: 1 }),
        tabScreen(2, { t: 'text', x: 20, y: 150, w: 100, h: 20, caption: 'C', tab: 2 }),
        tabScreen(1, { t: 'text', x: 20, y: 150, w: 100, h: 20, caption: 'Again', tab: 1 })
    ]);
    const tabs = merged.nodes[1];
    assert.strictEqual(merged.nodes.length, 2);
    assert.deepStrictEqual(tabs.children.map(function (c) { return c.caption + c.tab; }), ['A0', 'B1', 'C2']);
    assert.strictEqual(tabs.active, 0);
    assert.strictEqual(tabs.h, 200);
    assert.strictEqual(merged.height, 310);

    const controls = capture.convert(merged, { idSeed: 'M' }).controls;
    const tabpage = controls.filter(function (c) { return c.type === 'tabpage'; })[0];
    const fields = controls.filter(function (c) { return c.type === 'field' && c.ftype === 'text'; });
    assert.deepStrictEqual(fields.map(function (c) { return c.tabIndex; }), [0, 1, 2]);
    fields.forEach(function (c) { assert.strictEqual(c.tabPageId, tabpage.id); });
    assert.throws(function () { page.__baMergeTabs([]); });
});

test('a tag becomes an ESS tag control with its text and colours', function () {
    const controls = convert('ess', [{ t: 'tag', x: 100, y: 50, w: 70, h: 20, text: 'Pending', bg: '#FCCE54', fg: '#ffffff', onclick: 'x' }]);
    const tag = controls.filter(function (c) { return c.ftype === 'tag'; })[0];
    assert.ok(tag);
    assert.strictEqual(tag.uiMode, 'ess');
    assert.strictEqual(tag.defaultValue, 'Pending');
    assert.strictEqual(tag.tagBackColor, '#fcce54');
    assert.strictEqual(tag.tagTextColor, '#ffffff');
    assert.strictEqual(tag.onclick, undefined);
    const plain = convert('core', [{ t: 'tag', x: 0, y: 0, w: 60, h: 20, text: 'New', bg: 'red', fg: 'url(x)' }]).filter(function (c) { return c.ftype === 'tag'; })[0];
    assert.strictEqual(plain.tagBackColor, '#0d9eff');
    assert.strictEqual(plain.tagTextColor, '#ffffff');
});

test('a placeholder is the sample value only for an editor without a caption', function () {
    const controls = convert('ess', [
        { t: 'text', x: 20, y: 20, w: 200, h: 30, placeholder: 'Search for <b>name</b>' },
        { t: 'text', x: 20, y: 80, w: 200, h: 30, caption: 'Code', placeholder: 'Type a code', labelX: 0 }
    ]);
    const texts = controls.filter(function (c) { return c.ftype === 'text'; });
    assert.strictEqual(texts.length, 2);
    assert.strictEqual(texts[0].defaultValue, 'Search for \uFF1Cb\uFF1Ename\uFF1C/b\uFF1E');
    assert.strictEqual(texts[1].caption, 'Code');
    assert.strictEqual(texts[1].defaultValue, '');
});

test('core grid columns keep the tag and checkbox kinds', function () {
    const controls = convert('core', [{
        t: 'grid', x: 0, y: 0, w: 600, h: 200, rows: 3,
        columns: [
            { caption: 'Status', w: 120, type: 'tag', text: 'Approved', bg: '#55cb6f', fg: '#ffffff', tags: [{ text: 'Approved', bg: '#55cb6f', fg: '#ffffff' }, { text: 'Rejected', bg: '#ED5F55' }, { text: '', bg: '#000000' }, { text: 'Bad', bg: 'red' }] },
            { caption: 'Paid', w: 60, type: 'checkbox' },
            { caption: 'Name', w: 150, type: 'script' }
        ]
    }]);
    const grid = controls.filter(function (c) { return c.type === 'grid'; })[0];
    assert.strictEqual(grid.columns[0].type, 'tag');
    assert.deepStrictEqual(grid.columns[0].tags, [
        { text: 'Approved', backColor: '#55cb6f', textColor: '#ffffff' },
        { text: 'Rejected', backColor: '#ed5f55', textColor: '#ffffff' }
    ]);
    assert.strictEqual(grid.columns[1].type, 'checkbox');
    assert.strictEqual(grid.columns[2].type, undefined);
    assert.deepStrictEqual(grid.sampleData.map(function (r) { return r.Status; }), ['Approved', 'Rejected', 'Approved']);
    assert.deepStrictEqual(grid.sampleData.map(function (r) { return r.Paid; }), [true, false, true]);
    assert.strictEqual(grid.sampleData[0].Name, 'Name 1');
});

test('a tag column without valid tags stays a text column', function () {
    const grid = convert('core', [{
        t: 'grid', x: 0, y: 0, w: 300, h: 100,
        columns: [{ caption: 'Status', w: 120, type: 'tag', text: 'Open', bg: 'javascript:1' }]
    }]).filter(function (c) { return c.type === 'grid'; })[0];
    assert.strictEqual(grid.columns[0].type, undefined);
    assert.strictEqual(grid.columns[0].tags, undefined);
});

test('an ESS grid shows a tag column with its first tag', function () {
    const grid = convert('ess', [{
        t: 'grid', x: 0, y: 0, w: 500, h: 200,
        columns: [{ caption: 'Status', w: 120, type: 'tag', text: 'Pending', bg: '#fcce54' }, { caption: 'Paid', w: 60, type: 'checkbox' }]
    }]).filter(function (c) { return c.type === 'ess-grid'; })[0];
    assert.strictEqual(grid.columns[0].type, 'tag');
    assert.strictEqual(grid.columns[0].tagText, 'Pending');
    assert.strictEqual(grid.columns[0].tagBackColor, '#fcce54');
    assert.strictEqual(grid.columns[0].tagTextColor, '#ffffff');
    assert.strictEqual(grid.columns[1].type, 'text');
});

test('a tree becomes a tree field with its nodes, check style and columns', function () {
    const controls = convert('core', [{
        t: 'popup', x: 0, y: 0, w: 400, h: 450, title: 'Organization Structure', children: [{
            t: 'tree', x: 9, y: 91, w: 382, h: 350, check: 'box', rowHeight: 28, indent: 23, scroll: true,
            columns: [{ caption: '', w: 70, type: 'checkbox', disabled: true }],
            items: [
                { text: 'Company', level: 0, focused: true, cells: [true] },
                { text: 'Accounting', level: 1, checked: true },
                { text: 'Payroll', level: 2, open: false }
            ]
        }]
    }]);
    const tree = controls.filter(function (c) { return c.type === 'field' && c.ftype === 'tree'; })[0];
    assert.ok(tree, 'tree control');
    assert.strictEqual(tree.parentId, controls[0].id);
    assert.strictEqual(tree.width, 382);
    assert.strictEqual(tree.height, 350);
    assert.strictEqual(tree.treeCheck, 'box');
    assert.strictEqual(tree.treeRowHeight, 28);
    assert.strictEqual(tree.treeIndent, 23);
    assert.strictEqual(tree.treeScroll, true);
    assert.deepStrictEqual(tree.treeColumns, [{ caption: '', width: 70, type: 'checkbox', disabled: true }]);
    assert.deepStrictEqual(tree.treeNodes, [
        { text: 'Company', level: 0, focused: true, cells: [true] },
        { text: 'Accounting', level: 1, checked: true },
        { text: 'Payroll', level: 2, open: false }
    ]);
});

test('a tree keeps only safe values and a limited number of nodes', function () {
    const items = [];
    for (let i = 0; i < capture.LIMITS.treeItems + 50; i++) items.push({ text: '<b>Unit ' + i + '</b>', level: i ? 99 : -3, checked: 'yes', open: 0 });
    const result = capture.normalize(screen('core', [{ t: 'tree', x: 0, y: 0, w: 300, h: 200, check: 'weird', rowHeight: 500, indent: 1, items: items }]));
    const tree = result.screen.nodes[0];
    assert.strictEqual(tree.check, 'box');
    assert.strictEqual(tree.rowHeight, 60);
    assert.strictEqual(tree.indent, 12);
    assert.strictEqual(tree.items.length, capture.LIMITS.treeItems);
    assert.strictEqual(tree.items[0].level, 0);
    assert.strictEqual(tree.items[1].level, 20);
    assert.strictEqual(tree.items[1].checked, undefined);
    assert.strictEqual(tree.items[1].open, undefined);
    assert.ok(tree.items[1].text.indexOf('<') < 0);
});

test('a view-mode tree keeps green and grey ticks', function () {
    const tree = convert('core', [{
        t: 'tree', x: 0, y: 0, w: 300, h: 100, check: 'mark', rowHeight: 25, indent: 40,
        items: [{ text: 'Company', level: 0, checked: true }, { text: 'Sales', level: 1, checked: false }, { text: 'Legal', level: 1 }]
    }]).filter(function (c) { return c.ftype === 'tree'; })[0];
    assert.strictEqual(tree.treeCheck, 'mark');
    assert.strictEqual(tree.treeNodes[0].checked, true);
    assert.strictEqual(tree.treeNodes[1].checked, false);
    assert.strictEqual(tree.treeNodes[2].checked, undefined);
});

test('a menu button uses the icon named by the page before guessing from its text', function () {
    const toolbar = convert('core', [{
        t: 'toolbar', x: 0, y: 0, w: 300, h: 25,
        buttons: [{ text: 'Set Permissions', icon: 'add' }, { text: 'Select', icon: 'select' }, { text: 'Save', icon: 'not-a-known-icon' }, { text: 'Refresh' }]
    }]).filter(function (c) { return c.type === 'toolbar'; })[0];
    assert.strictEqual(toolbar.items[0].icon, '/Content/images/icon-menu/menu-add.png');
    assert.strictEqual(toolbar.items[1].icon, '/Content/images/icon-menu/menu-ok.png');
    assert.strictEqual(toolbar.items[2].icon, '/Content/images/icon-menu/menu-save.png');
    assert.strictEqual(toolbar.items[3].icon, undefined);
});

test('a tree is drawn in the outline and counted in the summary', function () {
    const data = screen('core', [{ t: 'tree', x: 10, y: 20, w: 300, h: 200, check: 'none', items: [{ text: 'A', level: 0 }] }]);
    const shapes = capture.outline(data).shapes;
    assert.deepStrictEqual(shapes, [['g', 10, 20, 300, 200]]);
    assert.strictEqual(capture.summarize(data).counts.total, 1);
});

function byText(controls, text) {
    return controls.filter(function (c) { return c.defaultValue === text; })[0];
}
function firstPane(block) {
    return capture.SPLIT.first(capture.SPLIT.room(block.splitOrientation === 'vertical' ? block.width : block.height), block.splitRatio);
}
function splitterOf(controls) {
    return controls.filter(function (c) { return c.ftype === 'splitter'; })[0];
}

test('a splitter becomes a Splitter block and its two panes hold the controls', function () {
    const controls = convert('core', [
        { t: 'splitter', x: 0, y: 0, w: 800, h: 400, vertical: true, split: 265, bar: 6, children: [
            { t: 'tree', pane: 0, x: 0, y: 0, w: 265, h: 400, check: 'none', items: [{ text: 'A', level: 0 }] },
            { t: 'label', pane: 1, x: 280, y: 10, w: 60, h: 18, text: 'Right' }
        ] }
    ]);
    const thickness = capture.METRICS.core.splitter;
    const block = splitterOf(controls);
    assert.strictEqual(block.type, 'field');
    assert.strictEqual(block.uiMode, 'core');
    assert.strictEqual(block.splitOrientation, 'vertical');
    assert.strictEqual('splitGrip' in block, false);
    assert.strictEqual(block.caption, '');
    assert.strictEqual(block.labelWidth, 0);
    assert.strictEqual(block.zIndex, 0);
    assert.strictEqual(block.parentId, null);
    assert.strictEqual(block.paneIndex, undefined);
    assert.deepStrictEqual([block.left, block.top, block.width, block.height], [20, 20, 800, 400]);
    assert.strictEqual(firstPane(block), 265);
    const tree = controls.filter(function (c) { return c.ftype === 'tree'; })[0];
    assert.deepStrictEqual([tree.parentId, tree.paneIndex, tree.left, tree.top], [block.id, 0, 0, 0]);
    const right = byText(controls, 'Right');
    assert.deepStrictEqual([right.parentId, right.paneIndex, right.left, right.top], [block.id, 1, 280 - 265 - thickness, 10]);
});

test('a splitter whose bar is hidden on the page gets the bar thickness and the lower pane keeps its content', function () {
    const result = capture.convert(screen('core', [
        { t: 'splitter', x: 0, y: 0, w: 800, h: 310, split: 110, bar: 0, grip: false, children: [
            { t: 'grid', pane: 0, x: 0, y: 0, w: 800, h: 100, rows: 5, columns: [{ caption: 'Code', w: 80 }], actions: [], toolbar: [] },
            { t: 'tabs', pane: 1, x: 0, y: 110, w: 800, h: 200, tabs: ['Detail'], active: 0, children: [{ t: 'label', x: 10, y: 150, w: 60, h: 18, text: 'Inside' }] }
        ] },
        { t: 'label', x: 0, y: 320, w: 60, h: 18, text: 'Below' }
    ], { height: 338 }), { idSeed: 'T' });
    const gridGrowth = 22 + 35 + 5 * 35 - 100;
    const thickness = capture.METRICS.core.splitter;
    const block = splitterOf(result.controls);
    const grid = result.controls.filter(function (c) { return c.type === 'grid'; })[0];
    const tabpage = result.controls.filter(function (c) { return c.type === 'tabpage'; })[0];
    const inside = byText(result.controls, 'Inside');
    const below = byText(result.controls, 'Below');
    assert.strictEqual(block.splitOrientation, 'horizontal');
    assert.strictEqual('splitGrip' in block, false);
    assert.deepStrictEqual([block.left, block.top, block.width, block.height], [20, 20, 800, 310 + gridGrowth + thickness]);
    assert.strictEqual(firstPane(block), 110 + gridGrowth);
    assert.deepStrictEqual([grid.parentId, grid.paneIndex, grid.left, grid.top], [block.id, 0, 0, 0]);
    assert.deepStrictEqual([tabpage.parentId, tabpage.paneIndex, tabpage.left, tabpage.top, tabpage.height], [block.id, 1, 0, 0, 200]);
    assert.deepStrictEqual([inside.parentId, inside.paneIndex, inside.tabPageId, inside.tabIndex, inside.left, inside.top], [block.id, 1, tabpage.id, 0, 10, 40]);
    assert.deepStrictEqual([below.parentId, below.paneIndex, below.top], [null, undefined, 20 + 320 + gridGrowth + thickness]);
    assert.strictEqual(result.screen.height, 338 + gridGrowth + thickness);
    assert.strictEqual(result.screen.width, 1000);
});

test('a vertical splitter hidden on the page moves the right pane by the bar thickness', function () {
    const result = capture.convert(screen('core', [
        { t: 'splitter', x: 0, y: 0, w: 325, h: 400, vertical: true, split: 265, bar: 0, children: [
            { t: 'tree', pane: 0, x: 0, y: 0, w: 265, h: 400, check: 'none', items: [{ text: 'A', level: 0 }] },
            { t: 'label', pane: 1, x: 265, y: 10, w: 60, h: 18, text: 'Right' }
        ] },
        { t: 'label', x: 100, y: 420, w: 60, h: 18, text: 'Under' }
    ], { width: 325, height: 438 }), { idSeed: 'T' });
    const thickness = capture.METRICS.core.splitter;
    const block = splitterOf(result.controls);
    const right = byText(result.controls, 'Right');
    assert.strictEqual(block.splitOrientation, 'vertical');
    assert.deepStrictEqual([block.left, block.top, block.width, block.height], [20, 20, 325 + thickness, 400]);
    assert.strictEqual(firstPane(block), 265);
    assert.deepStrictEqual([right.parentId, right.paneIndex, right.left, right.top], [block.id, 1, 0, 10]);
    assert.strictEqual(byText(result.controls, 'Under').left, 120);
    assert.strictEqual(byText(result.controls, 'Under').top, 440);
    assert.strictEqual(result.screen.width, 325 + thickness);
    assert.strictEqual(result.screen.height, 438);
});

test('a splitter inside a group grows the group and moves what follows the group', function () {
    const controls = convert('core', [
        { t: 'group', x: 0, y: 0, w: 400, h: 200, caption: 'G', children: [
            { t: 'splitter', x: 5, y: 11, w: 390, h: 180, split: 89, bar: 0, children: [
                { t: 'label', pane: 0, x: 10, y: 20, w: 60, h: 18, text: 'Top' },
                { t: 'label', pane: 1, x: 10, y: 100, w: 60, h: 18, text: 'Bottom' }
            ] }
        ] },
        { t: 'label', x: 0, y: 210, w: 60, h: 18, text: 'After' }
    ]);
    const thickness = capture.METRICS.core.splitter;
    const group = controls.filter(function (c) { return c.ftype === 'groupbox'; })[0];
    const block = splitterOf(controls);
    const top = byText(controls, 'Top'), bottom = byText(controls, 'Bottom');
    assert.strictEqual(group.height, 200 + thickness);
    assert.strictEqual(block.parentId, group.id);
    assert.deepStrictEqual([block.left, block.top, block.width, block.height], [0, 0, 390, 180 + thickness]);
    assert.strictEqual(firstPane(block), 89);
    assert.deepStrictEqual([top.parentId, top.paneIndex, top.left, top.top], [block.id, 0, 5, 9]);
    assert.deepStrictEqual([bottom.parentId, bottom.paneIndex, bottom.left, bottom.top], [block.id, 1, 5, 0]);
    assert.strictEqual(byText(controls, 'After').top, 20 + 210 + thickness);
});

test('a splitter inside a pane of another splitter keeps both levels', function () {
    const controls = convert('core', [
        { t: 'splitter', x: 0, y: 0, w: 900, h: 500, vertical: true, split: 250, bar: 5, children: [
            { t: 'tree', pane: 0, x: 0, y: 0, w: 250, h: 500, check: 'none', items: [{ text: 'A', level: 0 }] },
            { t: 'splitter', pane: 1, x: 255, y: 0, w: 645, h: 500, split: 100, bar: 0, children: [
                { t: 'label', pane: 0, x: 265, y: 10, w: 60, h: 18, text: 'Filter' },
                { t: 'grid', pane: 1, x: 255, y: 100, w: 645, h: 400, rows: 2, columns: [{ caption: 'Code', w: 80 }], actions: [], toolbar: [] }
            ] }
        ] }
    ]);
    const thickness = capture.METRICS.core.splitter;
    const blocks = controls.filter(function (c) { return c.ftype === 'splitter'; });
    const outer = blocks[0], inner = blocks[1];
    const filter = byText(controls, 'Filter');
    const grid = controls.filter(function (c) { return c.type === 'grid'; })[0];
    assert.deepStrictEqual([outer.splitOrientation, outer.left, outer.top, outer.width, outer.height], ['vertical', 20, 20, 900 + thickness - 5, 500 + thickness]);
    assert.strictEqual(firstPane(outer), 250);
    assert.deepStrictEqual([inner.splitOrientation, inner.parentId, inner.paneIndex, inner.left, inner.top, inner.width, inner.height],
        ['horizontal', outer.id, 1, 0, 0, 645, 500 + thickness]);
    assert.strictEqual(firstPane(inner), 100);
    assert.deepStrictEqual([filter.parentId, filter.paneIndex, filter.left, filter.top], [inner.id, 0, 10, 10]);
    assert.deepStrictEqual([grid.parentId, grid.paneIndex, grid.left, grid.top], [inner.id, 1, 0, 0]);
});

test('a pane grows to hold a control that sticks out of it on the page', function () {
    const result = capture.convert(screen('core', [
        { t: 'splitter', x: 0, y: 0, w: 800, h: 300, split: 100, bar: 0, children: [
            { t: 'label', pane: 0, x: 10, y: 10, w: 60, h: 18, text: 'Top' },
            { t: 'tabs', pane: 1, x: 0, y: 100, w: 800, h: 203, tabs: ['Detail'], active: 0, children: [] }
        ] },
        { t: 'label', x: 0, y: 310, w: 60, h: 18, text: 'Below' }
    ], { height: 328 }), { idSeed: 'T' });
    const thickness = capture.METRICS.core.splitter;
    const block = splitterOf(result.controls);
    const tabpage = result.controls.filter(function (c) { return c.type === 'tabpage'; })[0];
    assert.deepStrictEqual([block.width, block.height], [800, 300 + thickness + 3]);
    assert.strictEqual(firstPane(block), 100);
    assert.deepStrictEqual([tabpage.paneIndex, tabpage.top, tabpage.height], [1, 0, 203]);
    assert.strictEqual(block.height - thickness - firstPane(block), tabpage.height);
    assert.strictEqual(byText(result.controls, 'Below').top, 20 + 310 + thickness + 3);
    assert.strictEqual(result.screen.height, 328 + thickness + 3);
});

test('a control that sticks out of the first pane makes that pane longer and moves the second pane', function () {
    const controls = convert('core', [
        { t: 'splitter', x: 0, y: 0, w: 800, h: 300, split: 100, bar: 0, children: [
            { t: 'label', pane: 0, x: 10, y: 90, w: 60, h: 18, text: 'Top' },
            { t: 'label', pane: 1, x: 10, y: 120, w: 60, h: 18, text: 'Bottom' }
        ] }
    ]);
    const thickness = capture.METRICS.core.splitter;
    const block = splitterOf(controls);
    const top = byText(controls, 'Top'), bottom = byText(controls, 'Bottom');
    assert.strictEqual(firstPane(block), 108);
    assert.strictEqual(block.height, 300 + 8 + thickness);
    assert.deepStrictEqual([top.paneIndex, top.top], [0, 90]);
    assert.deepStrictEqual([bottom.paneIndex, bottom.top], [1, 20]);
});

test('a control taller than a vertical splitter makes the whole block taller', function () {
    const controls = convert('core', [
        { t: 'splitter', x: 0, y: 0, w: 400, h: 200, vertical: true, split: 150, bar: 6, children: [
            { t: 'label', pane: 0, x: 10, y: 190, w: 60, h: 18, text: 'Left' },
            { t: 'label', pane: 1, x: 170, y: 10, w: 60, h: 18, text: 'Right' }
        ] }
    ]);
    const block = splitterOf(controls);
    assert.deepStrictEqual([block.width, block.height], [400, 208]);
    assert.strictEqual(firstPane(block), 150);
    assert.deepStrictEqual([byText(controls, 'Left').top, byText(controls, 'Right').left], [190, 170 - 150 - capture.METRICS.core.splitter]);
});

test('a screen without a splitter keeps every position', function () {
    const nodes = [
        { t: 'text', x: 150, y: 10, w: 200, h: 20, caption: 'Code', labelX: 20 },
        { t: 'group', x: 400, y: 0, w: 300, h: 100, caption: 'G', children: [{ t: 'checkbox', x: 410, y: 30, w: 80, h: 18, caption: 'Active' }] },
        { t: 'button', x: 720, y: 10, w: 80, h: 24, text: 'Go' }
    ];
    const result = capture.convert(screen('core', nodes, { width: 800, height: 100 }), { idSeed: 'T' });
    assert.strictEqual(result.screen.width, 800);
    assert.strictEqual(result.screen.height, 100);
    assert.strictEqual(byText(result.controls, 'Go').left, 740);
    assert.strictEqual(result.controls.filter(function (c) { return c.ftype === 'groupbox'; })[0].left, 420);
    assert.strictEqual(result.controls.filter(function (c) { return c.ftype === 'checkbox'; })[0].left, 410 - 400 - 5);
    result.controls.forEach(function (c) { assert.strictEqual(c.paneIndex, undefined); });
});

test('a splitter keeps only its own values and wrong values fall back', function () {
    const nodes = capture.normalize(screen('core', [
        { t: 'splitter', x: 0, y: 50, w: 300, h: 200, vertical: 'yes', grip: 0, split: 'abc', bar: -3, caption: '<b>', onclick: 'x', children: 'none' },
        { t: 'splitter', x: 50, y: 0, w: 100, h: 80, vertical: true, grip: false, split: 5000, bar: 40, children: [
            { t: 'label', pane: 7, x: 60, y: 10, w: 20, h: 10, text: 'A' },
            { t: 'label', pane: '1', x: 60, y: 30, w: 20, h: 10, text: 'B' },
            { t: 'label', pane: 1, x: 60, y: 50, w: 20, h: 10, text: 'C' },
            null,
            { t: 'bogus' }
        ] },
        { t: 'splitter', x: 'a', y: null, w: 'b', h: {} },
        { t: 'label', pane: 1, x: 0, y: 300, w: 20, h: 10, text: 'Outside' }
    ])).screen.nodes;
    assert.deepStrictEqual(nodes[0], { t: 'splitter', x: 0, y: 50, w: 300, h: 200, vertical: false, bar: 0, split: 100, children: [] });
    assert.deepStrictEqual(nodes[1], { t: 'splitter', x: 50, y: 0, w: 100, h: 80, vertical: true, bar: 6, split: 94, children: [
        { t: 'label', x: 60, y: 10, w: 20, h: 10, text: 'A', pane: 0 },
        { t: 'label', x: 60, y: 30, w: 20, h: 10, text: 'B', pane: 0 },
        { t: 'label', x: 60, y: 50, w: 20, h: 10, text: 'C', pane: 1 }
    ] });
    assert.deepStrictEqual(nodes[2], { t: 'splitter', x: 0, y: 0, w: 1, h: 1, vertical: false, bar: 0, split: 1, children: [] });
    assert.strictEqual(nodes[3].pane, undefined);

    const controls = convert('core', nodes);
    const blocks = controls.filter(function (c) { return c.ftype === 'splitter'; });
    assert.strictEqual(blocks.length, 3);
    blocks.forEach(function (c) {
        assert.ok(Number.isInteger(c.left) && Number.isInteger(c.top) && c.width >= 1 && c.height >= 1);
        assert.ok(typeof c.splitRatio === 'number' && isFinite(c.splitRatio) && c.splitRatio >= 0 && c.splitRatio <= 100);
    });
    assert.deepStrictEqual(controls.filter(function (c) { return c.parentId === blocks[1].id; }).map(function (c) { return c.defaultValue + c.paneIndex; }), ['A0', 'B0', 'C1']);
    assert.strictEqual(byText(controls, 'Outside').paneIndex, undefined);
});

test('a splitter draws its bar in the outline and counts as a container in the summary', function () {
    const data = screen('core', [
        { t: 'splitter', x: 0, y: 0, w: 400, h: 300, split: 100, bar: 0, children: [
            { t: 'label', pane: 0, x: 10, y: 10, w: 50, h: 18, text: 'Top' },
            { t: 'splitter', pane: 1, x: 0, y: 100, w: 400, h: 200, vertical: true, split: 200, bar: 6, children: [
                { t: 'button', pane: 1, x: 220, y: 120, w: 60, h: 22, text: 'Go' }
            ] }
        ] }
    ]);
    assert.deepStrictEqual(capture.outline(data).shapes, [['i', 0, 100, 400, 6], ['l', 10, 15, 50, 8], ['i', 200, 100, 6, 200], ['b', 220, 120, 60, 22]]);
    assert.deepStrictEqual(capture.summarize(data).counts, { total: 4, fields: 0, grids: 0, buttons: 1, containers: 2 });
});

test('rows captured from a core grid become its sample rows', function () {
    const grid = convert('core', [{
        t: 'grid', x: 0, y: 0, w: 600, h: 200, rows: 3,
        columns: [{ caption: 'Code', w: 100 }, { caption: 'Active', w: 60, type: 'checkbox' }, { caption: 'Note', w: 200 }],
        data: [['WH01', 'x', 'Main <b>store</b>'], ['WH02', '', ''], ['WH03']]
    }]).filter(function (c) { return c.type === 'grid'; })[0];
    assert.deepStrictEqual(grid.sampleData, [
        { Code: 'WH01', Active: true, Note: 'Main ＜b＞store＜/b＞' },
        { Code: 'WH02', Active: false, Note: '' },
        { Code: 'WH03', Active: false, Note: '' }
    ]);
});

test('captured rows set the row count and are limited in rows, cells and text', function () {
    const rows = [];
    for (let i = 0; i < 25; i++) rows.push(['R' + i, 'y'.repeat(200), 'extra', 'more']);
    const node = capture.normalize(screen('core', [{
        t: 'grid', x: 0, y: 0, w: 300, h: 100, rows: 2, columns: [{ caption: 'Code', w: 80 }, { caption: 'Name', w: 120 }], data: rows
    }])).screen.nodes[0];
    assert.strictEqual(node.data.length, capture.LIMITS.gridRows);
    assert.strictEqual(node.rows, capture.LIMITS.gridRows);
    node.data.forEach(function (row) {
        assert.strictEqual(row.length, 2);
        assert.strictEqual(row[1].length, capture.LIMITS.cell);
    });

    const controls = convert('core', [
        { t: 'grid', x: 0, y: 0, w: 600, h: 100, rows: 1, columns: [{ caption: 'Code', w: 80 }], actions: [], toolbar: [], data: [['A'], ['B'], ['C'], ['D']] },
        { t: 'label', x: 0, y: 120, w: 60, h: 18, text: 'Below' }
    ]);
    assert.strictEqual(controls[0].sampleData.length, 4);
    assert.strictEqual(byText(controls, 'Below').top, 20 + 120 + (22 + 35 + 4 * 35 - 100));
});

test('captured rows of the wrong shape never break the conversion', function () {
    ['text', 5, {}, [], [null], [5, 'x'], [[null, 7, { a: 1 }, ['n']]], [{ length: 2 }], [['x'.repeat(5000)]]].forEach(function (data) {
        const grid = convert('core', [{
            t: 'grid', x: 0, y: 0, w: 300, h: 100, rows: 2, columns: [{ caption: 'Code', w: 80 }, { caption: 'Paid', w: 60, type: 'checkbox' }], data: data
        }])[0];
        assert.ok(grid.sampleData.length >= 1, 'rows for ' + JSON.stringify(data).slice(0, 30));
        grid.sampleData.forEach(function (row) {
            assert.strictEqual(typeof row.Code, 'string');
            assert.ok(row.Code.length <= capture.LIMITS.cell);
            assert.strictEqual(typeof row.Paid, 'boolean');
        });
    });
});

test('an ESS grid does not take captured rows', function () {
    const nodes = [{ t: 'grid', x: 0, y: 0, w: 500, h: 200, rows: 2, columns: [{ caption: 'Code', w: 120 }], data: [['A'], ['B'], ['C']] }];
    assert.strictEqual(capture.normalize(screen('ess', nodes)).screen.nodes[0].data, undefined);
    const grid = convert('ess', nodes).filter(function (c) { return c.type === 'ess-grid'; })[0];
    assert.strictEqual(grid.sampleRowCount, 2);
    assert.strictEqual(grid.sampleData, undefined);
});

function masterDetail() {
    return screen('core', [
        { t: 'toolbar', x: 0, y: 0, w: 300, h: 25, buttons: [{ text: 'Add' }, { text: 'Delete' }] },
        { t: 'text', x: 500, y: 2, w: 150, h: 20, caption: 'Search', labelX: 440 },
        { t: 'splitter', x: 0, y: 30, w: 1000, h: 500, split: 200, bar: 0, children: [
            { t: 'grid', pane: 0, x: 0, y: 30, w: 1000, h: 200, title: 'Warehouse', rows: 2,
                columns: [{ caption: 'Code', w: 100 }, { caption: 'Name', w: 200 }, { caption: 'Active', w: 60, type: 'checkbox' }, { caption: 'Note', w: 200 }],
                data: [['WH01', 'Main', 'x', ''], ['WH02', 'Spare', '', '']] },
            { t: 'tabs', pane: 1, x: 0, y: 230, w: 1000, h: 300, tabs: ['General', 'Stock', 'Empty', 'History'], active: 0, children: [
                { t: 'section', tab: 0, x: 10, y: 270, w: 980, h: 100, caption: 'Address', children: [{ t: 'text', x: 150, y: 310, w: 200, h: 20, caption: 'Street', labelX: 30 }] },
                { t: 'grid', tab: 1, x: 10, y: 270, w: 980, h: 150, rows: 1, columns: [{ caption: 'Item', w: 100 }, { caption: 'Qty', w: 80 }], data: [['Bolt', '4']] },
                { t: 'button', tab: 1, x: 10, y: 430, w: 80, h: 22, text: 'Recount' },
                { t: 'tree', tab: 3, x: 10, y: 270, w: 300, h: 200, check: 'none', items: [{ text: 'Root', level: 0 }] }
            ] }
        ] },
        { t: 'group', x: 0, y: 540, w: 400, h: 60, caption: 'Remark', children: [{ t: 'memo', x: 10, y: 560, w: 380, h: 30 }] }
    ], { height: 600 });
}
function gridsOf(nodes, found) {
    nodes.forEach(function (n) {
        if (n.t === 'grid') found.push(n);
        if (n.children) gridsOf(n.children, found);
    });
    return found;
}

test('the parts of a screen are its grids, trees, tabs with content, top boxes and the loose controls', function () {
    const parts = page.__baParts(masterDetail());
    assert.deepStrictEqual(parts.map(function (p) { return p.id; }), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.deepStrictEqual(parts.map(function (p) { return p.kind; }), ['grid', 'tab', 'tab', 'grid', 'tab', 'tree', 'box', 'rest']);
    assert.deepStrictEqual(parts.map(function (p) { return p.title; }), ['Warehouse', 'General', 'Stock', '', 'History', '', 'Remark', '']);
    assert.deepStrictEqual(parts.map(function (p) { return p.within ? p.within.kind + ':' + p.within.title : ''; }),
        ['', '', '', 'tab:Stock', '', 'tab:History', '', '']);
    assert.deepStrictEqual(parts[0].box, { x: 0, y: 30, w: 1000, h: 200 });
    assert.strictEqual(parts[0].columns, 4);
    assert.deepStrictEqual(parts[0].names, ['Code', 'Name', 'Active']);
    assert.deepStrictEqual(parts[1].box, { x: 0, y: 230, w: 1000, h: 300 });
    assert.deepStrictEqual(parts[1].counts, { grids: 0, fields: 1, buttons: 0 });
    assert.deepStrictEqual(parts[2].counts, { grids: 1, fields: 0, buttons: 1 });
    assert.deepStrictEqual(parts[3].box, { x: 10, y: 270, w: 980, h: 150 });
    assert.deepStrictEqual(parts[4].counts, { grids: 1, fields: 0, buttons: 0 });
    assert.deepStrictEqual(parts[6].counts, { grids: 0, fields: 1, buttons: 0 });
    assert.deepStrictEqual(parts[7].box, { x: 0, y: 0, w: 650, h: 25 });
    assert.deepStrictEqual(parts[7].counts, { grids: 0, fields: 1, buttons: 1 });
    assert.deepStrictEqual(page.__baParts({}), []);
});

test('the whole screen can be copied without grid rows or without splitters', function () {
    const source = masterDetail();
    const before = JSON.stringify(source);

    const plain = page.__baSelect(source);
    assert.deepStrictEqual(plain.nodes.map(function (n) { return n.t; }), ['toolbar', 'text', 'splitter', 'group']);
    assert.deepStrictEqual(gridsOf(plain.nodes, []).map(function (g) { return g.data; }), [undefined, undefined]);
    assert.deepStrictEqual(plain.nodes[2].children.map(function (n) { return n.t + n.pane; }), ['grid0', 'tabs1']);
    assert.deepStrictEqual([plain.width, plain.height], [1000, 600]);

    const withRows = page.__baSelect(source, { parts: null, gridData: true, splitters: false });
    assert.deepStrictEqual(withRows.nodes.map(function (n) { return n.t + ':' + n.x + ',' + n.y + ':' + n.pane; }),
        ['toolbar:0,0:undefined', 'text:500,2:undefined', 'grid:0,30:undefined', 'tabs:0,230:undefined', 'group:0,540:undefined']);
    assert.deepStrictEqual(gridsOf(withRows.nodes, []).map(function (g) { return g.data.length; }), [2, 1]);
    assert.deepStrictEqual([withRows.width, withRows.height], [1000, 600]);

    assert.strictEqual(page.__baSelect(source, { parts: 'all' }).nodes.length, 4);
    assert.strictEqual(JSON.stringify(source), before);
});

test('dropping the splitters keeps what their panes hold, also inside a tab or another splitter', function () {
    const source = screen('core', [
        { t: 'tabs', x: 0, y: 0, w: 900, h: 500, tabs: ['A', 'B'], active: 0, children: [
            { t: 'splitter', tab: 1, x: 10, y: 40, w: 880, h: 400, vertical: true, split: 300, bar: 6, children: [
                { t: 'label', pane: 0, x: 20, y: 50, w: 60, h: 18, text: 'Left' },
                { t: 'splitter', pane: 1, x: 316, y: 40, w: 574, h: 400, split: 100, bar: 0, children: [
                    { t: 'label', pane: 1, x: 330, y: 150, w: 60, h: 18, text: 'Deep' }
                ] }
            ] }
        ] }
    ]);
    const kept = page.__baSelect(source).nodes[0].children[0];
    assert.deepStrictEqual([kept.t, kept.tab, kept.children[0].pane, kept.children[1].t, kept.children[1].pane, kept.children[1].children[0].pane], ['splitter', 1, 0, 'splitter', 1, 1]);

    const flat = page.__baSelect(source, { splitters: false });
    assert.deepStrictEqual(flat.nodes[0].children.map(function (n) { return [n.t, n.text, n.tab, n.pane, n.x, n.y].join(':'); }),
        ['label:Left:1::20:50', 'label:Deep:1::330:150']);

    const controls = capture.convert(flat, { idSeed: 'P' }).controls;
    assert.strictEqual(controls.filter(function (c) { return c.ftype === 'splitter'; }).length, 0);
    assert.deepStrictEqual(controls.filter(function (c) { return c.ftype === 'label'; }).map(function (c) { return c.tabIndex + ':' + c.paneIndex; }), ['1:undefined', '1:undefined']);
});

test('one grid can be copied alone, moved to the corner of the screen', function () {
    const source = masterDetail();
    const master = page.__baSelect(source, { parts: [0], gridData: true });
    assert.strictEqual(master.nodes.length, 1);
    assert.deepStrictEqual([master.nodes[0].t, master.nodes[0].x, master.nodes[0].y, master.nodes[0].pane], ['grid', 0, 0, undefined]);
    assert.deepStrictEqual([master.width, master.height], [1000, 200]);
    assert.strictEqual(master.nodes[0].data.length, 2);
    assert.strictEqual(page.__baSelect(source, { parts: [0, 0, '0'] }).nodes.length, 1);

    const detail = page.__baSelect(source, { parts: [3], gridData: true });
    assert.strictEqual(detail.nodes.length, 1);
    assert.strictEqual(detail.nodes[0].tab, undefined);
    assert.deepStrictEqual([detail.nodes[0].x, detail.nodes[0].y, detail.width, detail.height], [0, 0, 980, 150]);
    assert.deepStrictEqual(detail.nodes[0].data, [['Bolt', '4']]);

    const controls = capture.convert(master, { idSeed: 'P' }).controls;
    assert.strictEqual(controls.length, 1);
    assert.deepStrictEqual(controls[0].sampleData.map(function (r) { return r.Active; }), [true, false]);
});

test('one tab can be copied alone and keeps the tab control with only that tab', function () {
    const stock = page.__baSelect(masterDetail(), { parts: [2] });
    assert.strictEqual(stock.nodes.length, 1);
    const tabs = stock.nodes[0];
    assert.deepStrictEqual([tabs.t, tabs.x, tabs.y, tabs.w, tabs.h], ['tabs', 0, 0, 1000, 300]);
    assert.deepStrictEqual(tabs.tabs, ['Stock']);
    assert.strictEqual(tabs.active, 0);
    assert.deepStrictEqual(tabs.children.map(function (c) { return c.t + c.tab; }), ['grid0', 'button0']);
    assert.strictEqual(tabs.children[0].y, 40);
    assert.strictEqual(tabs.children[0].data, undefined);
    assert.deepStrictEqual([stock.width, stock.height], [1000, 300]);

    const controls = capture.convert(stock, { idSeed: 'P' }).controls;
    const tabpage = controls.filter(function (c) { return c.type === 'tabpage'; })[0];
    assert.deepStrictEqual(tabpage.tabs, [{ caption: 'Stock' }]);
    controls.filter(function (c) { return c !== tabpage; }).forEach(function (c) {
        assert.strictEqual(c.tabPageId, tabpage.id);
        assert.strictEqual(c.tabIndex, 0);
    });
});

test('several tabs keep their order and a part inside a chosen part is not copied twice', function () {
    const picked = page.__baSelect(masterDetail(), { parts: [4, 2, 3] });
    assert.strictEqual(picked.nodes.length, 1);
    const tabs = picked.nodes[0];
    assert.deepStrictEqual(tabs.tabs, ['Stock', 'History']);
    assert.deepStrictEqual(tabs.children.map(function (c) { return c.t + c.tab; }), ['grid0', 'button0', 'tree1']);

    const active = masterDetail();
    active.nodes[2].children[1].active = 3;
    assert.strictEqual(page.__baSelect(active, { parts: [2, 4] }).nodes[0].active, 1);
});

test('a tab inside a tab can be copied alone', function () {
    const nested = screen('core', [{ t: 'tabs', x: 0, y: 0, w: 800, h: 400, tabs: ['Outer A', 'Outer B'], active: 0, children: [
        { t: 'tabs', tab: 0, x: 10, y: 40, w: 780, h: 300, tabs: ['Inner 1', 'Inner 2'], active: 1, children: [
            { t: 'grid', x: 20, y: 80, w: 700, h: 100, rows: 1, columns: [{ caption: 'Code', w: 80 }] }
        ] }
    ] }]);
    const parts = page.__baParts(nested);
    assert.deepStrictEqual(parts.map(function (p) { return p.kind + ':' + p.title + (p.within ? '<' + p.within.title : ''); }),
        ['tab:Outer A', 'tab:Inner 2<Outer A', 'grid:<Inner 2']);

    const inner = page.__baSelect(nested, { parts: [1] });
    assert.deepStrictEqual(inner.nodes.map(function (n) { return n.t; }), ['tabs']);
    assert.strictEqual(inner.nodes[0].tab, undefined);
    assert.deepStrictEqual(inner.nodes[0].tabs, ['Inner 2']);
    assert.strictEqual(inner.nodes[0].active, 0);
    assert.deepStrictEqual([inner.nodes[0].x, inner.nodes[0].y, inner.nodes[0].children[0].x, inner.nodes[0].children[0].y, inner.nodes[0].children[0].tab], [0, 0, 10, 40, 0]);
    assert.deepStrictEqual([inner.width, inner.height], [780, 300]);

    const all = page.__baSelect(nested, { parts: [0, 1, 2] });
    assert.strictEqual(all.nodes.length, 1);
    assert.deepStrictEqual(all.nodes[0].tabs, ['Outer A']);
    assert.deepStrictEqual(all.nodes[0].children[0].tabs, ['Inner 1', 'Inner 2']);
});

test('the loose controls keep their captions inside the copied area', function () {
    const source = screen('core', [
        { t: 'splitter', x: 0, y: 0, w: 900, h: 200, split: 110, bar: 0, children: [
            { t: 'grid', pane: 0, x: 0, y: 0, w: 900, h: 100, rows: 1, columns: [{ caption: 'Code', w: 80 }] },
            { t: 'text', pane: 1, x: 200, y: 130, w: 150, h: 20, caption: 'Name', labelX: 60 },
            { t: 'date', pane: 1, x: 200, y: 180, w: 150, h: 20, caption: 'From', captionAbove: true, labelX: 200, labelY: 160, labelW: 40, labelH: 14 }
        ] }
    ]);
    assert.deepStrictEqual(page.__baParts(source).map(function (p) { return p.kind; }), ['grid', 'rest']);
    assert.deepStrictEqual(page.__baParts(source)[1].box, { x: 60, y: 130, w: 290, h: 70 });

    const rest = page.__baSelect(source, { parts: [1] });
    assert.deepStrictEqual(rest.nodes.map(function (n) { return n.t + n.pane; }), ['textundefined', 'dateundefined']);
    assert.deepStrictEqual([rest.nodes[0].x, rest.nodes[0].y, rest.nodes[0].labelX], [140, 0, 0]);
    assert.deepStrictEqual([rest.nodes[1].x, rest.nodes[1].y, rest.nodes[1].labelX, rest.nodes[1].labelY], [140, 50, 140, 30]);
    assert.deepStrictEqual([rest.width, rest.height], [290, 70]);

    const controls = capture.convert(rest, { idSeed: 'P' }).controls;
    const name = controls.filter(function (c) { return c.caption === 'Name'; })[0];
    assert.deepStrictEqual([name.left, name.top], [20, 20]);
    assert.strictEqual(name.labelWidth, 140 - 0 - 8);
    assert.strictEqual(byText(controls, 'From').top, name.top + capture.METRICS.core.editorTop + 30);
});

test('a popup lists its boxes, grids and loose controls, and a top box can be copied alone', function () {
    const popup = screen('core', [{ t: 'popup', x: 0, y: 0, w: 600, h: 400, title: 'Input Warehouse', children: [
        { t: 'toolbar', x: 2, y: 30, w: 200, h: 25, buttons: [{ text: 'Save' }] },
        { t: 'text', x: 150, y: 70, w: 200, h: 20, caption: 'Code', labelX: 20 },
        { t: 'group', x: 10, y: 100, w: 580, h: 80, caption: 'Detail', children: [{ t: 'checkbox', x: 20, y: 130, w: 80, h: 18, caption: 'Active' }] },
        { t: 'grid', x: 10, y: 200, w: 580, h: 150, rows: 1, columns: [{ caption: 'Item', w: 100 }] }
    ] }], { width: 600, height: 400 });
    const parts = page.__baParts(popup);
    assert.deepStrictEqual(parts.map(function (p) { return p.kind + ':' + p.title; }), ['box:Detail', 'grid:', 'rest:']);
    assert.strictEqual(parts.filter(function (p) { return p.within; }).length, 0);

    const rest = page.__baSelect(popup, { parts: [2] });
    assert.deepStrictEqual(rest.nodes.map(function (n) { return n.t; }), ['toolbar', 'text']);
    assert.deepStrictEqual([rest.nodes[0].x, rest.nodes[0].y, rest.nodes[1].x, rest.nodes[1].y, rest.nodes[1].labelX], [0, 0, 148, 40, 18]);
    assert.deepStrictEqual([rest.width, rest.height], [348, 60]);

    const box = page.__baSelect(popup, { parts: [0] });
    assert.deepStrictEqual(box.nodes.map(function (n) { return n.t; }), ['group']);
    assert.deepStrictEqual([box.nodes[0].x, box.nodes[0].y, box.nodes[0].children[0].x, box.nodes[0].children[0].y], [0, 0, 10, 30]);
    assert.deepStrictEqual([box.width, box.height], [580, 80]);
    assert.strictEqual(page.__baSelect(popup).nodes[0].t, 'popup');
});

test('a wrong list of parts copies nothing and never throws', function () {
    const source = masterDetail();
    [[], [99, -1, 'x', null, {}, 2.5, '__proto__', 'length']].forEach(function (ids) {
        const picked = page.__baSelect(source, { parts: ids, gridData: 'yes', splitters: 0 });
        assert.deepStrictEqual(picked.nodes, []);
        assert.strictEqual(capture.normalize(picked).ok, false);
    });
    assert.doesNotThrow(function () { page.__baHighlight({ x: 0, y: 0, w: 10, h: 10 }); page.__baHighlight(null); });
});

console.log('builder-capture: ' + passed + ' passed, ' + failures.length + ' failed');
failures.forEach(function (f) { console.log('  FAIL ' + f); });
process.exitCode = failures.length ? 1 : 0;
