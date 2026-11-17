'use strict';
const fs = require('fs');
const library = require('./library.js');

function readCapture(file) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    if (typeof data === 'string') data = JSON.parse(data);
    if (Array.isArray(data)) data = require('../../BADesign/Scripts/builder/builder-capture-page.js').__baMergeTabs(data);
    return data;
}

function main(argv) {
    if (argv.length < 5) {
        console.log('Usage: node Tools/ui-capture/add-screen.js <key> <name> <group> <order> <capture.json> [description]');
        process.exit(1);
    }
    const screen = readCapture(argv[4]);
    const record = library.save({
        key: argv[0],
        name: argv[1],
        group: argv[2],
        order: parseInt(argv[3], 10) || 1000,
        description: argv[5] || ''
    }, screen);
    console.log(record.key + ': ' + record.controls + ' controls, ' + record.width + 'x' + record.height + ', ui=' + record.ui);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { readCapture: readCapture };
