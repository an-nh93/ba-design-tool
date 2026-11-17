'use strict';
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const folder = path.join(repoRoot, 'BADesign', 'App_Data', 'BuilderTemplates');
const thumbFolder = path.join(repoRoot, 'BADesign', 'Content', 'builder-templates');
const capture = require(path.join(repoRoot, 'BADesign', 'Scripts', 'builder', 'builder-capture.js'));

const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;

function readIndex() {
    const file = path.join(folder, 'index.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeIndex(entries) {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'index.json'), JSON.stringify(entries, null, 2) + '\n', 'utf8');
}

function save(entry, screen) {
    if (!KEY.test(entry.key)) throw new Error('Invalid key: ' + entry.key);
    const normalized = capture.normalize(screen);
    if (!normalized.ok) throw new Error(entry.key + ': ' + normalized.error);
    const converted = capture.convert(normalized.screen, { idSeed: 'check' });
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, entry.key + '.json'), JSON.stringify(normalized.screen) + '\n', 'utf8');
    const drawing = capture.outline(normalized.screen, 300);
    const record = {
        key: entry.key,
        name: entry.name,
        ui: normalized.screen.ui,
        group: entry.group || '',
        description: entry.description || '',
        thumb: fs.existsSync(path.join(thumbFolder, entry.key + '.png')) ? entry.key + '.png' : '',
        controls: converted.controls.length,
        width: drawing.width,
        height: drawing.height,
        outline: JSON.stringify(drawing.shapes),
        file: entry.key + '.json'
    };
    const entries = readIndex().filter(function (e) { return e.key !== entry.key; });
    entries.push(record);
    const order = entry.order != null ? entry.order : 1000;
    record.order = order;
    entries.sort(function (a, b) { return (a.order || 1000) - (b.order || 1000) || a.name.localeCompare(b.name); });
    writeIndex(entries);
    return record;
}

function refreshThumbs() {
    const entries = readIndex();
    entries.forEach(function (e) {
        e.thumb = fs.existsSync(path.join(thumbFolder, e.key + '.png')) ? e.key + '.png' : '';
    });
    writeIndex(entries);
    return entries;
}

module.exports = { folder: folder, thumbFolder: thumbFolder, readIndex: readIndex, save: save, refreshThumbs: refreshThumbs, capture: capture };
