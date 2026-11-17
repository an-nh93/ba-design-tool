async (page) => {
  const base = 'http://localhost:3393';
  const stamp = String(Date.now()).slice(-6);
  const prefix = 'TEST Phân hệ ';
  const name = prefix + stamp;
  const renamed = prefix + stamp + ' B';
  const screenKey = 'pattern-core-list';
  const results = [];
  const pageErrors = [];
  const onError = (e) => pageErrors.push(String(e).slice(0, 200));
  page.on('pageerror', onError);

  const check = (title, got, want) => {
    const ok = String(got) === String(want);
    results.push((ok ? 'ok   ' : 'FAIL ') + title + (ok ? '' : ' -> got [' + got + '] want [' + want + ']'));
    return ok;
  };
  const api = (path, payload) => page.evaluate(async (args) => {
    const response = await fetch(args[0], { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(args[1] || {}) });
    const json = await response.json().catch(() => null);
    return json && json.d !== undefined ? json.d : json;
  }, [path, payload]);
  const loadAll = () => api('/Pages/HrModules.aspx/LoadAll');
  const snapshot = async () => {
    const all = await loadAll();
    return JSON.stringify({
      modules: (all.modules || []).map((m) => [m.Name, m.IsActive]),
      items: (all.items || []).map((i) => [i.Kind, i.Key, i.ModuleId || 0]).sort()
    });
  };
  const open = async () => {
    await page.goto(base + '/HrModules', { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => document.querySelectorAll('#hmItems tr').length > 0, null, { timeout: 30000 });
    await page.waitForTimeout(300);
  };
  const rowOf = (text) => page.locator('#hmModules tr', { has: page.locator('.hm-name', { hasText: text }) }).first();
  const moduleNames = () => page.evaluate(() => Array.from(document.querySelectorAll('#hmModules .hm-name')).map((e) => e.textContent).join('|'));
  const lastToast = () => page.evaluate(() => { const list = document.querySelectorAll('.ba-toast-msg'); return list.length ? list[list.length - 1].textContent : ''; });
  const toastIs = (text) => page.waitForFunction((t) => { const list = document.querySelectorAll('.ba-toast-msg'); return list.length && list[list.length - 1].textContent === t; }, text, { timeout: 15000 });
  const modalError = () => page.evaluate(() => document.querySelector('#hmModalError').textContent);
  const cleanup = async () => {
    const all = await loadAll();
    for (const module of (all && all.modules) || []) {
      if (String(module.Name).indexOf(prefix) === 0) await api('/Pages/HrModules.aspx/DeleteModule', { moduleId: module.ModuleId });
    }
  };

  await page.setViewportSize({ width: 1280, height: 620 });
  await page.context().addCookies([{ name: 'baLang', value: 'vi', url: base }]);
  await page.goto(base + '/HrModules', { waitUntil: 'load', timeout: 90000 });
  if (new URL(page.url()).pathname !== '/HrModules') return 'NOT ALLOWED: sign in at ' + base + '/Login with a test account that may manage UI templates (Super Admin or UITemplateAdmin)';
  await cleanup();
  const before = await snapshot();
  const initial = await loadAll();
  const initialNames = initial.modules.map((m) => m.Name).join('|');
  const looseBefore = initial.items.filter((i) => !i.ModuleId).length;

  try {
    await open();
    check('the page uses the shared frame', await page.evaluate(() => [!!document.querySelector('.ba-sidebar'), (document.querySelector('.ba-sidebar .ba-nav-item.active') || {}).textContent.trim(), document.querySelector('.ba-top-bar-title').textContent.trim()].join('|')), 'true|Phân hệ HR|Phân hệ HR');
    check('the lists show the modules and every library screen', (await moduleNames()) + '|' + await page.evaluate(() => document.querySelector('#hmResult').textContent), initialNames + '|' + initial.items.length + ' màn hình');
    check('nothing scrolls sideways on a laptop screen', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'true');

    await page.click('#hmAdd');
    await page.click('#hmSave');
    check('an empty module name is refused', await modalError(), 'Chưa nhập tên phân hệ.');
    await page.fill('#hmName', 'TEST <b>x</b>');
    await page.click('#hmSave');
    await page.waitForFunction(() => /ký tự/.test(document.querySelector('#hmModalError').textContent), null, { timeout: 15000 });
    check('a name with markup is refused by the server', await modalError(), 'Tên phân hệ không được chứa ký tự < > hoặc ký tự điều khiển.');
    await page.fill('#hmName', '  ' + name + '  ');
    await page.click('#hmSave');
    await toastIs('Đã lưu phân hệ.');
    await page.waitForFunction((n) => Array.from(document.querySelectorAll('#hmModules .hm-name')).some((e) => e.textContent === n), name, { timeout: 15000 });
    check('a new module is added at the end, trimmed and in use', (await moduleNames()) + '|' + await rowOf(name).locator('td').nth(4).textContent(), initialNames + '|' + name + '|Đang dùng');

    await page.click('#hmAdd');
    await page.fill('#hmName', name.toUpperCase());
    await page.click('#hmSave');
    await page.waitForFunction(() => document.querySelector('#hmModalError').textContent !== '', null, { timeout: 15000 });
    check('a duplicate module name is refused', await modalError(), 'Tên phân hệ đã có. Hãy chọn tên khác.');
    await page.keyboard.press('Escape');

    await rowOf(name).locator('.hm-acts button', { hasText: 'Đổi tên' }).click();
    check('the rename box starts with the current name', await page.inputValue('#hmName'), name);
    await page.fill('#hmName', renamed);
    await page.click('#hmSave');
    await page.waitForFunction((n) => Array.from(document.querySelectorAll('#hmModules .hm-name')).some((e) => e.textContent === n), renamed, { timeout: 15000 });
    check('renaming keeps the module in place', await moduleNames(), initialNames + '|' + renamed);

    await rowOf(renamed).locator('.hm-acts button', { hasText: 'Ẩn' }).click();
    await page.waitForFunction((n) => Array.from(document.querySelectorAll('#hmModules tr')).some((tr) => tr.querySelector('.hm-name').textContent === n && tr.cells[4].textContent === 'Đang ẩn'), renamed, { timeout: 15000 });
    check('a hidden module is not offered in the UI Builder', ((await api('/Pages/Builder.aspx/GetHrModules')) || []).filter((m) => m.Name === renamed).length, 0);
    await rowOf(renamed).locator('.hm-acts button', { hasText: 'Hiện' }).click();
    await page.waitForFunction((n) => Array.from(document.querySelectorAll('#hmModules tr')).some((tr) => tr.querySelector('.hm-name').textContent === n && tr.cells[4].textContent === 'Đang dùng'), renamed, { timeout: 15000 });
    check('showing it again offers it in the UI Builder', ((await api('/Pages/Builder.aspx/GetHrModules')) || []).filter((m) => m.Name === renamed).length, 1);

    const names = initialNames.split('|');
    await rowOf(renamed).locator('.hm-order button').first().click();
    const movedUp = names.slice(0, -1).concat([renamed, names[names.length - 1]]).join('|');
    await page.waitForFunction((want) => Array.from(document.querySelectorAll('#hmModules .hm-name')).map((e) => e.textContent).join('|') === want, movedUp, { timeout: 15000 });
    check('moving up changes the order for everyone', ((await api('/Pages/Builder.aspx/GetHrModules')) || []).map((m) => m.Name).join('|'), movedUp);
    await rowOf(renamed).locator('.hm-order button').nth(1).click();
    await page.waitForFunction((want) => Array.from(document.querySelectorAll('#hmModules .hm-name')).map((e) => e.textContent).join('|') === want, initialNames + '|' + renamed, { timeout: 15000 });
    check('moving down restores the order', await moduleNames(), initialNames + '|' + renamed);
    check('the first module cannot move up and the last cannot move down', await page.evaluate(() => { const rows = document.querySelectorAll('#hmModules tr'); return rows[0].querySelector('.hm-order button').disabled + '|' + rows[rows.length - 1].querySelectorAll('.hm-order button')[1].disabled; }), 'true|true');

    const row = page.locator('#hmItems tr[data-key="screen:' + screenKey + '"]');
    check('the test screen starts without a module', await row.locator('select').inputValue(), '0');
    await row.locator('select').selectOption({ label: renamed });
    await toastIs('Đã lưu phân hệ của màn hình.');
    await page.waitForFunction((n) => Array.from(document.querySelectorAll('#hmModules tr')).some((tr) => tr.querySelector('.hm-name').textContent === n && tr.cells[2].textContent === '1'), renamed, { timeout: 15000 });
    const screens = (await api('/Pages/Builder.aspx/GetStandardScreens')) || [];
    check('the screen carries its module in the UI Builder', screens.filter((s) => s.Key === screenKey).map((s) => s.Module).join(','), renamed);
    await page.selectOption('#hmFilter', 'none');
    check('the unassigned filter drops the screen that now has a module', await page.evaluate(() => document.querySelectorAll('#hmItems tr').length + '|' + document.querySelector('#hmResult').textContent), (looseBefore - 1) + '|Hiện ' + (looseBefore - 1) + ' trên ' + initial.items.length + ' màn hình');
    await page.selectOption('#hmFilter', 'all');
    await page.fill('#hmSearch', 'khong-co-man-hinh-nay');
    check('a search without matches says so', await page.evaluate(() => getComputedStyle(document.querySelector('#hmItemEmpty')).display !== 'none' ? document.querySelector('#hmItemEmpty').textContent : 'hidden'), 'Không có màn hình nào khớp.');
    await page.fill('#hmSearch', '');

    check('unknown modules and screens are refused', JSON.stringify([
      (await api('/Pages/HrModules.aspx/SaveModule', { moduleId: 2147483000, name: 'TEST x', isActive: true })).success,
      (await api('/Pages/HrModules.aspx/Assign', { kind: 'screen', key: 'khong-co-man-hinh', moduleId: 1 })).success,
      (await api('/Pages/HrModules.aspx/Assign', { kind: 'screen', key: screenKey, moduleId: 2147483000 })).success,
      (await api('/Pages/HrModules.aspx/Assign', { kind: 'template', key: '2147483000', moduleId: 0 })).success,
      (await api('/Pages/HrModules.aspx/DeleteModule', { moduleId: 2147483000 })).success
    ]), '[false,false,false,false,false]');
    const guest = await page.context().browser().newContext();
    const answer = await guest.request.post(base + '/Pages/HrModules.aspx/LoadAll', { data: {}, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    const guestText = await answer.text();
    await guest.close();
    check('a visitor who is not signed in gets no module data', /"modules"|"items"|"Name"/.test(guestText), 'false');

    await page.goto(base + '/Home', { waitUntil: 'load', timeout: 90000 });
    await page.click('#hdFromStandard');
    await page.waitForFunction(() => document.querySelectorAll('#bstGallery .bst-card').length > 0, null, { timeout: 30000 });
    check('the gallery offers every module in use', await page.evaluate(() => Array.from(document.querySelectorAll('#bstGallery .bst-select option')).map((o) => o.textContent).join('|')), 'Tất cả phân hệ|' + initialNames + '|' + renamed + '|Chưa gán phân hệ');
    await page.selectOption('#bstGallery .bst-select', { label: renamed });
    check('filtering by the module leaves its screen', await page.evaluate(() => Array.from(document.querySelectorAll('#bstGallery .bst-card')).map((c) => c.querySelector('.bst-meta').textContent).join('|')), 'Mẫu chung · ' + renamed + ' · ' + (screens.filter((s) => s.Key === screenKey)[0] || {}).Controls + ' control');
    await page.selectOption('#bstGallery .bst-select', 'none');
    check('the last choice lists screens without a module', await page.evaluate(() => document.querySelectorAll('#bstGallery .bst-card').length), looseBefore - 1);
    await page.keyboard.press('Escape');

    await open();
    await rowOf(renamed).locator('.hm-acts button', { hasText: 'Xóa' }).click();
    const question = await page.evaluate(() => (document.querySelector('.ba-confirm-body') || {}).textContent || '');
    check('deleting asks first and tells what happens to its screens', question.indexOf('Xóa phân hệ "' + renamed + '"?') === 0 && question.indexOf('Có 1 màn hình đang gán phân hệ này') > 0, 'true');
    await page.click('.ba-confirm-cancel');
    check('answering No keeps the module', (await loadAll()).modules.filter((m) => m.Name === renamed).length, 1);
    await rowOf(renamed).locator('.hm-acts button', { hasText: 'Xóa' }).click();
    await page.click('.ba-confirm-ok');
    await toastIs('Đã xóa phân hệ.');
    await page.waitForFunction((n) => !Array.from(document.querySelectorAll('#hmModules .hm-name')).some((e) => e.textContent === n), renamed, { timeout: 15000 });
    check('deleting removes the module and frees its screen', (await moduleNames()) + '|' + await page.locator('#hmItems tr[data-key="screen:' + screenKey + '"] select').inputValue(), initialNames + '|0');

    await page.evaluate(() => document.body.classList.add('light-theme'));
    check('names are readable in the light theme', await page.evaluate(() => { const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; }; const text = document.querySelector('#hmModules .hm-name'); const card = text.closest('.ba-card'); return lum(getComputedStyle(card).backgroundColor) - lum(getComputedStyle(text).color) > 120; }), 'true');
    await page.evaluate(() => document.body.classList.remove('light-theme'));

    await page.context().addCookies([{ name: 'baLang', value: 'en', url: base }]);
    await open();
    await page.evaluate(() => BaI18n.debug(true));
    await page.click('#hmAdd');
    await page.click('#hmSave');
    await page.keyboard.press('Escape');
    await page.selectOption('#hmFilter', 'none');
    await page.waitForTimeout(400);
    const english = await page.evaluate(() => ({ title: document.querySelector('.ba-top-bar-title').textContent.trim(), add: document.querySelector('#hmAdd').textContent.trim(), missing: (BaI18n.missing() || []).join(' ; ') }));
    check('English mode translates the page', english.title + '|' + english.add, 'HR modules|Add module');
    check('English mode leaves no Vietnamese text behind', english.missing, '');
  } finally {
    await page.evaluate(() => window.BaI18n && BaI18n.debug(false)).catch(() => null);
    await page.context().addCookies([{ name: 'baLang', value: 'vi', url: base }]);
    await page.goto(base + '/HrModules', { waitUntil: 'load', timeout: 90000 }).catch(() => null);
    await cleanup();
    page.off('pageerror', onError);
  }

  check('modules and assignments are back to what they were', await snapshot(), before);
  check('no script errors', pageErrors.join(' ; '), '');
  const failed = results.filter((r) => r.indexOf('FAIL') === 0);
  return failed.concat(['=== HR modules: ' + (results.length - failed.length) + ' checks passed, ' + failed.length + ' failed']).join('\n');
}
