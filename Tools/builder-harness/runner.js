async (page, names, options) => {
  const opts = options || {};
  const base = opts.base || 'http://localhost:3988';
  const target = opts.target || (base + '/Builder');
  const out = [];
  const ev = (js) => page.evaluate((code) => (0, eval)(code), js);
  const q = (v) => JSON.stringify(v);
  await page.setViewportSize({ width: opts.width || 2200, height: opts.height || 1300 });
  async function open(keepDraft) {
    await page.evaluate(() => { if (window.builder) builder.savedSnapshot = JSON.stringify(builder.controls || []); }).catch(() => {});
    await page.goto(target, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.addScriptTag({ url: base + '/__helpers.js' });
    if (keepDraft) { await page.waitForTimeout(300); return; }
    await page.evaluate((u) => fetch(u + '/__reset', { method: 'POST', body: '{}' }).catch(() => {}), base);
    await page.evaluate(() => {
      if (window.builderStore) builderStore.keys().then(keys => keys.forEach(k => builderStore.remove(k))).catch(() => {});
      if (window.builderDraft) builderDraft.shown = null;
      $('#ubNotices').empty();
      if (builder.controls && builder.controls.length) {
        builder.controls = [];
        builder._clearCanvasContent();
        builder.markSaved('[]');
        if (builder.resetHistory) builder.resetHistory();
      }
      if (!$('.builder-wrapper').hasClass('props-collapsed')) $('#propToggle .pt-text').click();
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(400);
  }
  await open();
  const all = await page.evaluate((u) => fetch(u, { cache: 'no-store' }).then(r => r.json()), base + '/__scenarios');
  const suite = Array.isArray(all) ? { main: all } : all;
  const golden = await page.evaluate((u) => fetch(u, { cache: 'no-store' }).then(r => r.json()), base + '/__golden');
  const diff = (want, got) => { const a = want.split(' ; '), b = got.split(' ; '); const d = []; a.forEach((x, i) => { if (x !== b[i]) d.push(x + ' -> ' + b[i]); }); return d.join(' | '); };
  async function drag(from, to, n, fast, hold) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= (n || 14); i++) { await page.mouse.move(from.x + (to.x - from.x) * i / (n || 14), from.y + (to.y - from.y) * i / (n || 14)); await page.waitForTimeout(16); }
    if (!fast) await page.waitForTimeout(150 + (hold || 0));
    await page.mouse.up();
    await page.waitForTimeout(fast ? 700 : 300);
  }
  const mods = async (s, way) => { for (const key of (s.mods || [])) await page.keyboard[way](key); };
  const problems = async (allowHidden) => (await ev('__check()')).filter(p => !/: covered$/.test(p) && !(allowHidden && /: hidden$/.test(p)));
  const totals = { scenarios: 0, ok: 0, fail: 0, undoSame: 0, undoAll: 0 };
  let first = true;
  for (const name of (names && names.length ? names : Object.keys(suite))) {
    const steps = suite[name];
    if (!steps) { out.push('### ' + name + ': NOT FOUND'); totals.fail++; continue; }
    await page.setViewportSize({ width: opts.width || 2200, height: opts.height || 1300 });
    if (!first) await open();
    first = false;
    totals.scenarios++;
    out.push('### ' + name);
    const marks = [];
    const recorded = {};
    let allowHidden = false;
    for (const s of steps) {
      try {
        if (s.op === 'allowHidden') allowHidden = !!s.on;
        else if (s.op === 'add') { const p = await ev('__canvas(' + s.x + ',' + s.y + ')'); await page.evaluate(([t, u, x, y]) => builder.addControl(t, u || 'core', { clientX: x, clientY: y }), [s.type, s.ui, p.x, p.y]); await page.waitForTimeout(250); }
        else if (s.op === 'tool' || s.op === 'tap') {
          const a = await ev('__tool(' + q(s.type) + ',' + q(s.ui || '') + ')');
          if (!a) throw new Error('tool item not visible');
          if (s.op === 'tap') { await page.mouse.click(a.x, a.y); await page.waitForTimeout(300); }
          else { const b = s.at ? await ev(s.at) : await ev('__canvas(' + s.x + ',' + s.y + ')'); await drag(a, b, s.steps, s.fast); }
        }
        else if (s.op === 'esc') { await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }); await page.keyboard.press('Escape'); }
        else if (s.op === 'key') { await page.keyboard.press(s.key); await page.waitForTimeout(350); }
        else if (s.op === 'drag') { const a = await ev(s.from); const b = s.by ? { x: a.x + s.by[0], y: a.y + s.by[1] } : await ev(s.to); await mods(s, 'down'); await drag(a, b, s.steps, s.fast, s.hold); await mods(s, 'up'); }
        else if (s.op === 'carry') {
          const id = await ev(s.id);
          const before = await ev('__absMap()');
          const a = await ev(s.from || ('__grab(' + q(id) + ')'));
          const b = s.by ? { x: a.x + s.by[0], y: a.y + s.by[1] } : await ev(s.to);
          await drag(a, b, s.steps, s.fast);
          const after = await ev('__absMap()');
          const desc = await ev('__desc(' + q(id) + ')');
          const d = [after[id][0] - before[id][0], after[id][1] - before[id][1]];
          const off = (k, dx, dy) => !after[k] || !before[k] || Math.abs(after[k][0] - before[k][0] - dx) > 1 || Math.abs(after[k][1] - before[k][1] - dy) > 1 || after[k][2] !== before[k][2];
          const badKids = desc.filter(k => off(k, d[0], d[1]));
          const others = Object.keys(before).filter(k => k !== id && desc.indexOf(k) < 0);
          const badOthers = others.filter(k => off(k, 0, 0));
          const labels = async (ids) => (await Promise.all(ids.slice(0, 4).map(k => ev('__label(' + q(k) + ')')))).join(',');
          const good = !badKids.length && !badOthers.length && (d[0] !== 0 || d[1] !== 0);
          if (good) totals.ok++; else totals.fail++;
          out.push((good ? 'OK   ' : 'FAIL ') + 'carry ' + (s.title || '') + ': moved ' + d.join(',') + ' | kids follow ' + (desc.length - badKids.length) + '/' + desc.length + ' | others still ' + (others.length - badOthers.length) + '/' + others.length +
            (badKids.length ? ' | kids: ' + await labels(badKids) : '') + (badOthers.length ? ' | others: ' + await labels(badOthers) : ''));
        }
        else if (s.op === 'click') { const a = await ev(s.at); await mods(s, 'down'); await page.mouse.click(a.x, a.y, { button: s.button || 'left' }); await mods(s, 'up'); await page.waitForTimeout(200); }
        else if (s.op === 'dblclick') { const a = await ev(s.at); await page.mouse.dblclick(a.x, a.y); await page.waitForTimeout(250); }
        else if (s.op === 'type') { if (s.clear) await page.keyboard.press('Control+a'); await page.keyboard.type(s.text); await page.waitForTimeout(100); }
        else if (s.op === 'eval') out.push((s.title ? s.title + ': ' : '') + q(await ev(s.js)));
        else if (s.op === 'expect') { const got = String(await ev(s.js)); const good = got === String(s.want); if (good) totals.ok++; else totals.fail++; out.push((good ? 'OK   ' : 'FAIL ') + s.title + (good ? '' : ' -> got ' + got + ' want ' + s.want)); }
        else if (s.op === 'snap') { if (!s.brief) { out.push('--- ' + s.title); out.push((await ev('__state()')).slice(0, 14).join('\n')); } }
        else if (s.op === 'wait') await page.waitForTimeout(s.ms);
        else if (s.op === 'reload') await open(true);
        else if (s.op === 'goto') {
          await page.evaluate(() => { if (window.builder) builder.savedSnapshot = JSON.stringify(builder.controls || []); }).catch(() => {});
          await page.goto(target + (s.query || ''), { waitUntil: 'load', timeout: 60000 });
          await page.waitForTimeout(s.wait || 2500);
          await page.addScriptTag({ url: base + '/__helpers.js' });
        }
        else if (s.op === 'golden') {
          const got = String(await ev(s.js));
          if (opts.record) { recorded[s.title] = got; out.push('REC  ' + s.title + ' = ' + got.slice(0, 70)); }
          else { const want = (golden[name] || {})[s.title]; const good = got === want; if (good) totals.ok++; else totals.fail++; out.push((good ? 'OK   ' : 'FAIL ') + s.title + (good ? '' : ' -> got ' + got + ' want ' + want)); }
        }
        else if (s.op === 'viewport') { await page.setViewportSize({ width: s.width, height: s.height }); await page.waitForTimeout(500); }
        else if (s.op === 'shot' && opts.shotDir) await page.screenshot({ path: opts.shotDir + '/' + s.name + '.png' });
        if (['drag', 'carry', 'tool', 'tap', 'add', 'key', 'snap'].indexOf(s.op) >= 0) {
          const bad = await problems(allowHidden);
          if (bad.length) { totals.fail++; out.push('FAIL structure after ' + (s.title || s.op + ' ' + (s.type || s.key || '')) + ': ' + bad.slice(0, 5).join(' | ')); }
        }
        if (s.mark || s.op === 'mark') {
          const idx = await ev('builder.historyIndex');
          if (!marks.length || marks.idx !== idx) { marks.push(await ev('__abs()')); marks.idx = idx; }
          else { totals.fail++; out.push('FAIL no history step: ' + (s.title || s.op)); }
        }
        if (s.op === 'undoAll') {
          const res = [];
          let same = 0;
          for (const dir of ['undo', 'redo']) {
            for (let k = 1; k < marks.length; k++) {
              const i = dir === 'undo' ? marks.length - 1 - k : k;
              await page.keyboard.press(dir === 'undo' ? 'Control+z' : 'Control+y'); await page.waitForTimeout(350);
              const now = await ev('__abs()'); const bad = await problems(allowHidden);
              if (now === marks[i] && !bad.length) same++;
              else res.push(dir + i + ':' + (now === marks[i] ? 'same' : 'DIFF[' + diff(marks[i], now).slice(0, 300) + ']') + (bad.length ? ' PROBLEMS[' + bad.slice(0, 3).join(' | ') + ']' : ''));
            }
          }
          const count = 2 * (marks.length - 1);
          totals.undoSame += same; totals.undoAll += count;
          if (same === count) totals.ok++; else totals.fail++;
          out.push((same === count ? 'OK   ' : 'FAIL ') + 'undo/redo: ' + same + '/' + count + ' states identical' + (res.length ? ' | ' + res.join('  ') : ''));
        }
      } catch (e) { totals.fail++; out.push('FAIL step ' + JSON.stringify(s).slice(0, 120) + ' -> ' + String(e.message).slice(0, 200)); }
    }
    if (opts.record && Object.keys(recorded).length) {
      await page.evaluate(([u, payload]) => fetch(u, { method: 'POST', body: payload }), [base + '/__golden', JSON.stringify({ scenario: name, values: recorded })]);
      out.push('RECORDED ' + Object.keys(recorded).length + ' values for ' + name);
    }
  }
  out.push('=== ' + totals.scenarios + ' scenarios, ' + totals.ok + ' checks passed, ' + totals.fail + ' failed, undo/redo states identical ' + totals.undoSame + '/' + totals.undoAll);
  const text = out.join('\n');
  return opts.failuresOnly ? text.split('\n').filter(l => /^(###|FAIL|===|RECORDED)/.test(l)).join('\n').slice(0, 9000) : text.slice(0, 9000);
}
