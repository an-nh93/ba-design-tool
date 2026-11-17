'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', 'BADesign');
const port = parseInt(process.argv[2] || process.env.BUILDER_HARNESS_PORT || '3988', 10);
const types = {
    '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
    '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff': 'font/woff',
    '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.ico': 'image/x-icon'
};
const own = {
    '/__runner': { file: 'runner.js', type: 'text/plain; charset=utf-8' },
    '/__helpers.js': { file: 'page-helpers.js', type: types['.js'] },
    '/__scenarios': { file: 'scenarios.json', type: types['.json'] },
    '/__golden': { file: 'golden.json', type: types['.json'] }
};

function builderPage() {
    let t = fs.readFileSync(path.join(root, 'Pages', 'Builder.aspx'), 'utf8');
    t = t.replace(/<%@[^%]*%>/, '');
    t = t.replace('<head runat="server">', '<head>');
    t = t.replace('<form id="form1" runat="server">', '<form id="form1" onsubmit="return false">');
    t = t.replace(/<asp:ScriptManager[^>]*\/>/, '');
    t = t.replace(/<asp:HiddenField[^>]*ID="(\w+)"[^>]*\/>/g, function (m, id) { return '<input type="hidden" id="' + id + '" value="0" />'; });
    t = t.replace(/<%[:=][^%]*%>/g, 'tester');
    return t;
}

let memory = { versions: {}, versionSeed: 1, designs: {}, requests: [], requestSeed: 1 };

function now() {
    const d = new Date(), two = function (n) { return (n < 10 ? '0' : '') + n; };
    return two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
}

function countControls(json) {
    try { return JSON.parse(json || '[]').length; } catch (e) { return 0; }
}

function addVersion(id, kind, name, json) {
    const list = memory.versions[id] || (memory.versions[id] = []);
    const saves = list.filter(function (v) { return v.Kind === 'save'; });
    if (kind === 'save' && saves.length && saves[saves.length - 1].json === json) return;
    if (kind === 'baseline' && list.some(function (v) { return v.Kind === 'baseline'; })) return;
    list.push({
        VersionId: memory.versionSeed++, VersionNo: kind === 'baseline' ? 0 : saves.length + 1, Kind: kind, Name: name,
        ControlCount: countControls(json), CreatedAt: now(), CreatedBy: 'tester', json: json
    });
}

function requestInfo(request, withJson) {
    const pending = request.Status === 'Pending' ? request.steps[request.CurrentStepNo - 1] : null;
    const timeline = [{ Kind: 'submitted', StepNo: 0, Title: 'Gửi mẫu', Status: 'done', By: 'tester (BA)', At: request.SubmittedAt, Note: request.SubmitNote }];
    request.steps.forEach(function (step, index) {
        const status = step.Status === 'Approved' ? 'approved' : step.Status === 'Rejected' ? 'rejected' : step.Status === 'Auto' ? 'autochain'
            : (step.Status === 'Pending' && request.Status === 'Pending' ? 'pending' : 'waiting');
        timeline.push({ Kind: 'step', StepNo: index + 1, Title: 'Bước ' + (index + 1) + ': ' + step.StepName, Status: status, By: step.ActedBy || null, At: step.ActedAt || null, Note: step.Comment || null, Waiting: step.approvers });
    });
    if (request.Status === 'Approved') timeline.push({ Kind: 'result', Title: 'Đã vào thư viện chung', Status: 'approved', By: request.CompletedBy, At: request.CompletedAt });
    if (request.Status === 'Rejected') timeline.push({ Kind: 'result', Title: 'Bị từ chối', Status: 'rejected', By: request.CompletedBy, At: request.CompletedAt, Note: request.CompletedNote });
    return {
        RequestId: request.RequestId, SourceControlId: request.SourceControlId, Name: request.Name, Category: request.Category, UiKind: request.UiKind,
        Description: request.Description, Status: request.Status, SubmitterName: 'tester', SubmitterRole: 'BA', SubmittedAt: request.SubmittedAt,
        SubmitNote: request.SubmitNote, WorkflowName: 'Quy trình BA', CurrentStepNo: request.CurrentStepNo || 0, TotalSteps: request.steps.length,
        CompletedAt: request.CompletedAt || null, CompletedBy: request.CompletedBy || null, CompletedNote: request.CompletedNote || null,
        IsInLibrary: !!request.IsInLibrary, ControlCount: countControls(request.JsonConfig), Thumb: null,
        PendingWith: pending ? pending.approvers : [],
        ApprovedBy: request.steps.filter(function (s) { return s.Status === 'Approved'; }).map(function (s) { return s.ActedBy; }),
        IsMine: true, CanAct: !!pending, CanCancel: !!pending, CanRemove: !!request.IsInLibrary,
        Timeline: timeline, JsonConfig: withJson ? request.JsonConfig : null,
        ModuleId: request.ModuleId || null, ModuleName: moduleName(request.ModuleId)
    };
}

const MODULES = [
    { ModuleId: 1, Name: 'Staffing', SortOrder: 1, IsActive: true, ScreenCount: 0, TemplateCount: 0 },
    { ModuleId: 2, Name: 'Time-Attendance', SortOrder: 2, IsActive: true, ScreenCount: 0, TemplateCount: 0 }
];
const SCREEN_MODULES = { 'core-employee-profile': 1, 'core-overtime': 2, 'core-report-filter': 0 };

function moduleName(id) {
    const found = MODULES.filter(function (m) { return m.ModuleId === id; })[0];
    return found ? found.Name : null;
}

function standardScreens() {
    const index = JSON.parse(fs.readFileSync(path.join(root, 'App_Data', 'BuilderTemplates', 'index.json'), 'utf8'));
    return index.filter(function (entry) { return Object.prototype.hasOwnProperty.call(SCREEN_MODULES, entry.key); }).map(function (entry) {
        const moduleId = SCREEN_MODULES[entry.key] || null;
        return {
            Key: entry.key, Name: entry.name, Ui: entry.ui, Group: entry.group || '', Description: entry.description || '', Thumb: '',
            Controls: entry.controls || 0, Width: entry.width || 0, Height: entry.height || 0, Outline: '', ModuleId: moduleId, Module: moduleName(moduleId)
        };
    });
}

function findRequest(id) {
    return memory.requests.filter(function (r) { return r.RequestId === id; })[0] || null;
}

function stub(method, body) {
    body = body || {};
    if (method === '__reset') {
        memory = { versions: {}, versionSeed: 1, designs: {}, requests: [], requestSeed: 1 };
        return { d: true };
    }
    if (method === 'LoadConfig') return { d: '[]' };
    if (method === 'GetHrModules') return { d: MODULES };
    if (method === 'GetStandardScreens') return { d: standardScreens() };
    if (method === 'LoadStandardScreen') {
        const key = String(body.key || '').replace(/[^a-z0-9-]/g, '');
        const file = path.join(root, 'App_Data', 'BuilderTemplates', key + '.json');
        return { d: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null };
    }
    if (method === 'SaveDesign') {
        const id = body.controlId || 9001;
        memory.designs[id] = { name: body.pageName, json: body.jsonConfig };
        addVersion(id, 'save', body.pageName, body.jsonConfig);
        return { d: id };
    }
    if (method === 'SaveControl') return { d: 9001 };
    if (method === 'LoadControl') return { d: null };
    if (method === 'KeepAlive') return { d: true };
    if (method === 'SaveDesignBaseline') {
        if (!memory.designs[body.controlId]) return { d: false };
        addVersion(body.controlId, 'baseline', 'Bản gốc', body.baselineJson);
        return { d: true };
    }
    if (method === 'GetDesignVersions') {
        const list = (memory.versions[body.controlId] || []).slice().sort(function (a, b) {
            return (a.Kind === 'baseline' ? 1 : 0) - (b.Kind === 'baseline' ? 1 : 0) || b.VersionNo - a.VersionNo;
        });
        return { d: list.map(function (v) { return { VersionId: v.VersionId, VersionNo: v.VersionNo, Kind: v.Kind, Name: v.Name, ControlCount: v.ControlCount, CreatedAt: v.CreatedAt, CreatedBy: v.CreatedBy }; }) };
    }
    if (method === 'LoadDesignVersion') {
        let found = null;
        Object.keys(memory.versions).forEach(function (id) {
            memory.versions[id].forEach(function (v) { if (v.VersionId === body.versionId) found = v; });
        });
        return { d: found ? found.json : null };
    }
    if (method === 'GetTemplateSubmitInfo') {
        return {
            d: {
                success: true, workflowName: 'Quy trình BA',
                steps: [
                    { stepNo: 1, stepName: 'Trưởng nhóm BA duyệt', approvers: ['Lead A', 'Lead B'] },
                    { stepNo: 2, stepName: 'Quản lý duyệt', approvers: ['Manager C'] }
                ]
            }
        };
    }
    if (method === 'SubmitTemplate') {
        const design = memory.designs[body.controlId];
        if (!design) return { d: { Success: false, Message: 'Không tìm thấy thiết kế, hoặc thiết kế không phải của bạn. Hãy lưu thiết kế trước khi gửi.' } };
        const request = {
            RequestId: memory.requestSeed++, SourceControlId: body.controlId, Name: body.name, Category: body.category || null, UiKind: body.uiKind || null,
            Description: body.description || null, SubmitNote: body.note || null, Status: 'Pending', SubmittedAt: now(), CurrentStepNo: 1,
            JsonConfig: design.json, IsInLibrary: false, ModuleId: moduleName(body.moduleId) ? body.moduleId : null,
            steps: [
                { StepName: 'Trưởng nhóm BA duyệt', approvers: ['Lead A', 'Lead B'], Status: 'Pending' },
                { StepName: 'Quản lý duyệt', approvers: /#chain/.test(body.note || '') ? ['Lead A', 'Manager C'] : ['Manager C'], Status: 'Waiting' }
            ]
        };
        memory.requests.push(request);
        return { d: { Success: true, RequestId: request.RequestId, Status: 'Pending', Message: 'Đã gửi mẫu. Người duyệt sẽ nhận được email.' } };
    }
    if (method === 'LoadTemplateRequest') {
        const request = findRequest(body.requestId);
        return { d: request ? requestInfo(request, true) : null };
    }
    if (method === 'ReviewTemplateRequest') {
        const request = findRequest(body.requestId);
        if (!request || request.Status !== 'Pending') return { d: { Success: false, Message: 'Yêu cầu này đã được xử lý, không còn chờ duyệt.' } };
        if (!body.approve && String(body.comment || '').trim().length < 3) return { d: { Success: false, Message: 'Hãy ghi lý do từ chối để người gửi biết cần sửa gì.' } };
        const step = request.steps[request.CurrentStepNo - 1];
        step.Status = body.approve ? 'Approved' : 'Rejected';
        step.ActedBy = step.approvers[0];
        step.ActedAt = now();
        step.Comment = body.comment || null;
        if (!body.approve) {
            request.Status = 'Rejected'; request.CompletedAt = now(); request.CompletedBy = step.ActedBy; request.CompletedNote = body.comment;
            return { d: { Success: true, RequestId: request.RequestId, Status: 'Rejected', Message: 'Đã từ chối. Người gửi sẽ nhận được email kèm lý do.' } };
        }
        while (request.CurrentStepNo < request.steps.length) {
            const next = request.steps[request.CurrentStepNo];
            request.CurrentStepNo++;
            if (next.approvers.indexOf(step.ActedBy) >= 0) {
                next.Status = 'Auto';
                next.ActedBy = step.ActedBy;
                next.ActedAt = now();
                continue;
            }
            next.Status = 'Pending';
            return { d: { Success: true, RequestId: request.RequestId, Status: 'Pending', Message: 'Đã duyệt. Yêu cầu chuyển sang bước duyệt tiếp theo.' } };
        }
        request.Status = 'Approved'; request.CompletedAt = now(); request.CompletedBy = step.ActedBy; request.IsInLibrary = true; request.CurrentStepNo = 0;
        return { d: { Success: true, RequestId: request.RequestId, Status: 'Approved', Message: 'Đã duyệt. Mẫu đã vào thư viện chung.' } };
    }
    if (method === 'GetTeamTemplates') {
        return { d: memory.requests.filter(function (r) { return r.IsInLibrary; }).map(function (r) { return requestInfo(r, false); }) };
    }
    if (method === 'LoadTeamTemplate') {
        const request = findRequest(body.requestId);
        return { d: request && request.IsInLibrary ? request.JsonConfig : null };
    }
    return { d: [] };
}

http.createServer(function (req, res) {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (req.method === 'POST') {
        let data = '';
        req.on('data', function (c) { data += c; });
        req.on('end', function () {
            let body = {};
            try { body = JSON.parse(data || '{}'); } catch (e) { body = {}; }
            if (url === '/__golden') {
                const file = path.join(__dirname, own[url].file);
                const all = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (/^[a-z0-9]+$/i.test(String(body.scenario || '')) && body.values && typeof body.values === 'object') {
                    all[body.scenario] = body.values;
                    fs.writeFileSync(file, JSON.stringify(all, null, 1) + '\n');
                }
                res.writeHead(200, { 'Content-Type': types['.json'], 'Access-Control-Allow-Origin': '*' });
                res.end('{"ok":true}');
                return;
            }
            res.writeHead(200, { 'Content-Type': types['.json'] });
            res.end(JSON.stringify(stub(url.split('/').pop(), body)));
        });
        return;
    }
    if (own[url]) {
        res.writeHead(200, { 'Content-Type': own[url].type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
        res.end(fs.readFileSync(path.join(__dirname, own[url].file), 'utf8'));
        return;
    }
    if (url === '/Builder' || url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(builderPage());
        return;
    }
    if (/^\/(Scripts|Content)\//.test(url) && url.indexOf('..') < 0) {
        const file = path.join(root, url);
        if (fs.existsSync(file) && fs.statSync(file).isFile()) {
            res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            fs.createReadStream(file).pipe(res);
            return;
        }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
}).listen(port, '127.0.0.1', function () { console.log('builder harness: http://localhost:' + port + '/Builder'); });
