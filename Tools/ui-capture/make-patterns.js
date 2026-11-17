'use strict';
const library = require('./library');

function screen(ui, title, width, height, nodes) {
    return { kind: 'ba-screen', v: 1, ui: ui, title: title, width: width, height: height, nodes: nodes };
}

function coreRow(y, items) {
    return items.map(function (item) {
        const node = { t: item.t || 'text', x: item.x + 130, y: y, w: item.w || 200, h: item.h || 22, caption: item.caption, labelX: item.x };
        if (item.required) node.required = true;
        return node;
    });
}

function essRow(y, items) {
    return items.map(function (item) {
        const node = { t: item.t || 'text', x: item.x + 150, y: y, w: item.w || 260, h: item.h || 30, caption: item.caption, labelX: item.x };
        if (item.required) node.required = true;
        return node;
    });
}

const patterns = [];

patterns.push({
    entry: {
        key: 'pattern-core-list', order: 110, name: 'Danh sách có thanh công cụ (Core)', group: 'Mẫu chung',
        description: 'Thanh công cụ, lưới có dòng lọc, cột chọn, sửa, xóa và phân trang. Dùng cho màn hình danh mục.'
    },
    screen: screen('core', 'List', 1100, 420, [
        { t: 'toolbar', x: 0, y: 0, w: 300, h: 30, buttons: [{ text: 'Add' }, { text: 'Delete' }, { text: 'Export' }] },
        {
            t: 'grid', x: 0, y: 44, w: 1060, h: 330, title: 'List', filterRow: true, pager: true, checkbox: true, actions: ['edit', 'delete'],
            columns: [{ caption: 'Code', w: 130 }, { caption: 'Name', w: 240 }, { caption: 'Description', w: 280 }, { caption: 'Effective Date', w: 130 }, { caption: 'Status', w: 110 }],
            toolbar: []
        }
    ])
});

patterns.push({
    entry: {
        key: 'pattern-core-popup-form', order: 120, name: 'Popup thêm mới / chỉnh sửa (Core)', group: 'Mẫu chung',
        description: 'Popup hai cột ô nhập, có ô bắt buộc, ô ghi chú và nút Save, Cancel.'
    },
    screen: screen('core', 'Add New', 800, 380, [
        {
            t: 'popup', x: 0, y: 0, w: 760, h: 340, title: 'Add New', children: [
                { t: 'toolbar', x: 6, y: 32, w: 160, h: 26, buttons: [{ text: 'Save' }, { text: 'Cancel' }] }
            ].concat(
                coreRow(84, [{ x: 20, caption: 'Code', required: true }, { x: 390, caption: 'Effective Date', t: 'date', w: 130 }]),
                coreRow(116, [{ x: 20, caption: 'Name', required: true }, { x: 390, caption: 'Status', t: 'combo', w: 160 }]),
                coreRow(148, [{ x: 20, caption: 'Type', t: 'combo' }, { x: 390, caption: 'Order No', t: 'number', w: 90 }]),
                coreRow(180, [{ x: 20, caption: 'Description', t: 'memo', w: 570, h: 70 }]),
                [{ t: 'checkbox', x: 150, y: 264, w: 110, h: 18, caption: 'Is Active' }]
            )
        }
    ])
});

patterns.push({
    entry: {
        key: 'pattern-core-report-filter', order: 130, name: 'Màn hình lọc báo cáo (Core)', group: 'Mẫu chung',
        description: 'Nhóm tham số báo cáo: khoảng ngày, công ty, phòng ban, nhân viên, định dạng; menu Open Report nằm trên dải tiêu đề như màn hình báo cáo của Core.'
    },
    screen: screen('core', 'Report Filter', 900, 260, [
        {
            t: 'section', x: 0, y: 0, w: 860, h: 250, caption: 'Report Parameters', children: [].concat(
                [{ t: 'toolbar', x: 150, y: 1, w: 190, h: 25, buttons: [{ text: 'Open Report' }, { text: 'Download' }] }],
                coreRow(52, [{ x: 20, caption: 'From Date', t: 'date', w: 130, required: true }, { x: 430, caption: 'To Date', t: 'date', w: 130, required: true }]),
                coreRow(84, [{ x: 20, caption: 'Company', t: 'combo', w: 240 }, { x: 430, caption: 'Department', t: 'multiselect', w: 240 }]),
                coreRow(116, [{ x: 20, caption: 'Employee', t: 'multiselect', w: 240 }, { x: 430, caption: 'Employee Status', t: 'combo', w: 160 }]),
                coreRow(148, [{ x: 20, caption: 'Report Format', t: 'combo', w: 160 }]),
                [{ t: 'checkbox', x: 150, y: 182, w: 190, h: 18, caption: 'Include Terminated Employees' }]
            )
        }
    ])
});

patterns.push({
    entry: {
        key: 'pattern-core-organization-view', order: 135, name: 'Cây tổ chức ở chế độ xem (Core)', group: 'Mẫu chung',
        description: 'Nhóm Organizations có menu Assign Organization Unit trên dải tiêu đề và cây đơn vị cha - con với dấu tích xanh, như phần Permission của User. Bấm nút + / - trên cây để đóng hoặc mở một nhánh.'
    },
    screen: screen('core', 'Organizations', 640, 330, [
        {
            t: 'section', x: 0, y: 0, w: 600, h: 310, caption: 'Organizations', children: [
                { t: 'toolbar', x: 96, y: 1, w: 170, h: 25, buttons: [{ text: 'Assign Organization Unit', icon: 'add' }] },
                {
                    t: 'tree', x: 6, y: 30, w: 584, h: 270, check: 'mark', rowHeight: 25, indent: 40,
                    items: [
                        { text: 'Company', level: 0, checked: true, focused: true },
                        { text: 'Accounting', level: 1, checked: true },
                        { text: 'Accounts Payable', level: 2, checked: true },
                        { text: 'Accounts Receivable', level: 2, checked: true },
                        { text: 'Business Development', level: 1, checked: true },
                        { text: 'Human Resources', level: 1, checked: true },
                        { text: 'Recruitment', level: 2, checked: true },
                        { text: 'Payroll', level: 2, checked: true },
                        { text: 'Information Technology', level: 1, checked: true, open: false },
                        { text: 'Sales', level: 1, checked: true }
                    ]
                }
            ]
        }
    ])
});

patterns.push({
    entry: {
        key: 'pattern-ess-request', order: 140, name: 'Phiếu đăng ký (ESS)', group: 'Mẫu chung',
        description: 'Phiếu đăng ký trên ESS: loại, khoảng ngày, số ngày, lý do và các nút gửi duyệt, lưu nháp, hủy.'
    },
    screen: screen('ess', 'Request', 1000, 470, [
        {
            t: 'section', x: 0, y: 0, w: 960, h: 360, caption: 'Request Information', children: [].concat(
                essRow(70, [{ x: 24, caption: 'Request Type', t: 'combo', required: true }, { x: 490, caption: 'Request Date', t: 'date' }]),
                essRow(120, [{ x: 24, caption: 'From Date', t: 'date', required: true }, { x: 490, caption: 'To Date', t: 'date', required: true }]),
                essRow(170, [{ x: 24, caption: 'Number of Days', t: 'number', w: 120 }, { x: 490, caption: 'Approver', t: 'combo' }]),
                essRow(220, [{ x: 24, caption: 'Reason', t: 'memo', w: 726, h: 90, required: true }])
            )
        },
        { t: 'button', x: 0, y: 384, w: 110, h: 40, text: 'Submit', bg: '#0078d4', fg: '#ffffff' },
        { t: 'button', x: 122, y: 384, w: 120, h: 40, text: 'Save Draft', bg: '#ffffff', fg: '#333333', border: '#c5ccd6' },
        { t: 'button', x: 254, y: 384, w: 100, h: 40, text: 'Cancel', bg: '#ffffff', fg: '#333333', border: '#c5ccd6' }
    ])
});

patterns.push({
    entry: {
        key: 'pattern-ess-history', order: 150, name: 'Lịch sử đăng ký (ESS)', group: 'Mẫu chung',
        description: 'Bộ lọc theo khoảng ngày và trạng thái, bên dưới là lưới lịch sử có nút xem chi tiết.'
    },
    screen: screen('ess', 'History', 1100, 440, [].concat(
        essRow(6, [{ x: 0, caption: 'From Date', t: 'date', w: 170 }, { x: 350, caption: 'To Date', t: 'date', w: 170 }, { x: 700, caption: 'Status', t: 'combo', w: 170 }]),
        [
            { t: 'button', x: 0, y: 58, w: 100, h: 40, text: 'Search', bg: '#0078d4', fg: '#ffffff' },
            {
                t: 'grid', x: 0, y: 116, w: 1040, h: 280, title: 'Request History', checkbox: false, actions: ['view'], toolbar: [],
                columns: [{ caption: 'Request Date', w: 140 }, { caption: 'Request Type', w: 180 }, { caption: 'From Date', w: 130 }, { caption: 'To Date', w: 130 }, { caption: 'Days', w: 80 }, { caption: 'Status', w: 140 }, { caption: 'Approver', w: 180 }]
            }
        ]
    ))
});

patterns.forEach(function (p) {
    const record = library.save(p.entry, p.screen);
    console.log(record.key + ': ' + record.controls + ' controls');
});
