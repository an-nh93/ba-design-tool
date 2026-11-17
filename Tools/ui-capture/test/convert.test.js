'use strict';
const assert = require('assert');
const path = require('path');
const capture = require(path.resolve(__dirname, '..', '..', '..', 'BADesign', 'Scripts', 'builder', 'builder-capture.js'));

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
    const page = require(path.resolve(__dirname, '..', '..', '..', 'BADesign', 'Scripts', 'builder', 'builder-capture-page.js'));
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

console.log('builder-capture: ' + passed + ' passed, ' + failures.length + ' failed');
failures.forEach(function (f) { console.log('  FAIL ' + f); });
process.exitCode = failures.length ? 1 : 0;
