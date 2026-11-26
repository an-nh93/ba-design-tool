async (page) => {
  const base = 'http://localhost:3393';
  const stamp = String(Date.now()).slice(-6);
  const prefix = 'TEST Home ';
  const names = {
    alpha: prefix + stamp + ' Alpha',
    beta: prefix + stamp + ' Beta <b>dam</b> "q" \'a\' & <img src=x>',
    gamma: prefix + stamp + ' Gamma'
  };
  const projectName = prefix + stamp + ' du an';
  const results = [];
  const pageErrors = [];
  const onError = (e) => pageErrors.push(String(e).slice(0, 200));
  page.on('pageerror', onError);

  const skipped = [];
  const check = (name, got, want) => {
    const ok = String(got) === String(want);
    results.push((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' -> got [' + got + '] want [' + want + ']'));
    return ok;
  };
  const api = (path, payload) => page.evaluate(async (args) => {
    const response = await fetch(args[0], { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(args[1] || {}) });
    const json = await response.json().catch(() => null);
    return json && json.d !== undefined ? json.d : json;
  }, [path, payload]);
  const settled = async () => {
    await page.waitForFunction(() => { const r = document.querySelector('#hdResult'); return r && r.textContent !== '' && !document.querySelector('#hdGrid .hd-skel'); }, null, { timeout: 30000 });
    await page.waitForTimeout(350);
  };
  const open = async (hash) => {
    await page.goto(base + '/Home' + (hash || ''), { waitUntil: 'load', timeout: 90000 });
    if (hash) await page.reload({ waitUntil: 'load', timeout: 90000 });
    await settled();
  };
  const shownNames = () => page.evaluate(() => Array.from(document.querySelectorAll('#hdGrid .hd-card .hd-name, #hdRows .hd-name')).map((e) => e.textContent));
  const testNames = async () => (await shownNames()).filter((n) => n.indexOf('TEST Home ') === 0).map((n) => n.replace(/^TEST Home \d+ /, '').split(' ')[0]).join(',');
  const lastToast = () => page.evaluate(() => { const list = document.querySelectorAll('.ba-toast-msg'); return list.length ? list[list.length - 1].textContent : ''; });
  const cardOf = (name) => page.locator('#hdGrid .hd-card', { has: page.locator('.hd-name', { hasText: name.slice(0, 22) }) }).first();
  const confirmText = () => page.evaluate(() => { const b = document.querySelector('.ba-confirm-body'); return b ? b.textContent : ''; });
  const mineList = async () => ((await api('/Pages/Home.aspx/ListDesigns')) || {}).mine || [];
  const cleanup = async () => {
    for (const item of await mineList()) {
      if (String(item.Name).indexOf(prefix) === 0) await api('/Pages/Home.aspx/DeleteDesign', { controlId: item.Id });
    }
    for (const project of (await api('/Pages/Builder.aspx/GetProjects')) || []) {
      if (String(project.name).indexOf(prefix) === 0) await api('/Pages/Builder.aspx/DeleteProject', { projectId: project.projectId });
    }
  };
  const save = async (name, projectId) => ((await api('/Pages/Builder.aspx/SaveDesign', { controlId: null, pageName: name, controlName: name, controlType: 'page', jsonConfig: '[]', isPublic: false, thumbnailData: null, projectId: projectId })) || {}).controlId;

  await page.setViewportSize({ width: 1280, height: 620 });
  await page.context().addCookies([{ name: 'baLang', value: 'vi', url: base }]);
  await page.goto(base + '/Home', { waitUntil: 'load', timeout: 90000 });
  if (new URL(page.url()).pathname !== '/Home') return 'NOT LOGGED IN: open ' + base + '/Login and sign in with a test account first';
  await page.evaluate(() => { localStorage.setItem('designs-view', 'grid'); localStorage.setItem('theme', localStorage.getItem('theme') || 'dark'); });
  await cleanup();
  const before = (await mineList()).length;

  try {
    await open();
    check('the page uses the shared frame', await page.evaluate(() => [!!document.querySelector('.ba-sidebar'), (document.querySelector('.ba-sidebar .ba-nav-item.active') || {}).textContent.trim(), document.querySelector('.ba-top-bar-title').textContent.trim()].join('|')), 'true|Thiết kế giao diện|Thiết kế giao diện');
    check('the removed placeholders are gone', await page.evaluate(() => /Drafts|Starred|Recents|Community/.test(document.querySelector('.ba-main').innerText)), 'false');
    check('the draw.io button leads to the import dialog of the Builder', await page.evaluate(() => { const link = document.querySelector('#hdFromDrawio'); return link ? link.getAttribute('href') + '|' + link.textContent.trim() : 'missing'; }), '/Builder?drawio=1|Từ file draw.io');
    await page.click('#hdFromDrawio');
    await page.waitForURL(/\/Builder/, { timeout: 60000 });
    await page.waitForFunction(() => { const dialog = document.querySelector('#bstDrawio'); return dialog && dialog.classList.contains('is-open'); }, null, { timeout: 60000 });
    check('the Builder opens the draw.io dialog and cleans the address', await page.evaluate(() => location.pathname + location.search + '|' + !!document.querySelector('#bstDrawio .bst-drop')), '/Builder|true');
    await open();
    check('the HTML file button leads to the import dialog of the Builder', await page.evaluate(() => { const link = document.querySelector('#hdFromHtml'); return link ? link.getAttribute('href') + '|' + link.textContent.trim() : 'missing'; }), '/Builder?htmlfile=1|Từ file HTML');
    await page.click('#hdFromHtml');
    await page.waitForURL(/\/Builder/, { timeout: 60000 });
    await page.waitForFunction(() => { const dialog = document.querySelector('#bstHtml'); return dialog && dialog.classList.contains('is-open'); }, null, { timeout: 60000 });
    check('the Builder opens the HTML file dialog and cleans the address', await page.evaluate(() => location.pathname + location.search + '|' + !!document.querySelector('#bstHtml .bst-drop')), '/Builder|true');
    await open();

    const projectBefore = ((await api('/Pages/Builder.aspx/GetProjects')) || []).length;
    await page.click('#hdProjectBtn');
    await page.click('#hdProjectNew');
    await page.click('#hdProjectCreate');
    check('an empty project name is refused', await page.evaluate(() => document.querySelector('#hdProjectError').textContent), 'Chưa nhập tên dự án.');
    await page.fill('#hdProjectName', projectName);
    await page.fill('#hdProjectDescription', 'Dữ liệu thử, sẽ xóa');
    await page.click('#hdProjectCreate');
    await page.waitForFunction(() => !document.querySelector('#hdProjectModal').classList.contains('show'), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    check('creating a project shows a message', await lastToast(), 'Đã tạo dự án.');
    const project = ((await api('/Pages/Builder.aspx/GetProjects')) || []).filter((p) => p.name === projectName)[0];
    check('the project exists once', ((await api('/Pages/Builder.aspx/GetProjects')) || []).length - projectBefore + '|' + !!project, '1|true');
    await page.click('#hdProjectBtn');
    await page.click('#hdProjectNew');
    await page.fill('#hdProjectName', projectName.toUpperCase());
    await page.click('#hdProjectCreate');
    await page.waitForFunction(() => document.querySelector('#hdProjectError').textContent !== '', null, { timeout: 15000 });
    check('a duplicate project name is refused in Vietnamese', await page.evaluate(() => document.querySelector('#hdProjectError').textContent), 'Tên dự án đã có. Hãy chọn tên khác.');
    await page.keyboard.press('Escape');

    const ids = { alpha: await save(names.alpha, null) };
    await page.waitForTimeout(1100);
    ids.beta = await save(names.beta, null);
    await page.waitForTimeout(1100);
    ids.gamma = await save(names.gamma, project.projectId);
    check('three test designs were saved', [ids.alpha, ids.beta, ids.gamma].filter((n) => typeof n === 'number' && n > 0).length, 3);

    await open();
    const total = before + 3;
    check('the tab count and the result line match the list', await page.evaluate(() => [document.querySelector('#hdCountMine').textContent, document.querySelectorAll('#hdGrid .hd-card').length, document.querySelector('#hdResult').textContent].join('|')), total + '|' + total + '|' + total + ' thiết kế');
    check('newest designs come first', await testNames(), 'Gamma,Beta,Alpha');
    check('a name with HTML is shown as text', await page.evaluate((name) => { const el = Array.from(document.querySelectorAll('#hdGrid .hd-name')).filter((e) => e.textContent === name)[0]; return !!el + '|' + (el ? el.children.length : -1) + '|' + document.querySelectorAll('#hdGrid .hd-card-body img, #hdGrid .hd-card-body b').length; }, names.beta), 'true|0|0');
    check('nothing scrolls sideways on a laptop screen', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.ba-content').scrollWidth <= document.querySelector('.ba-content').clientWidth), 'true');
    check('the second row of cards is in view on a laptop screen', await page.evaluate(() => { const cards = document.querySelectorAll('#hdGrid .hd-card'); const perRow = Array.from(cards).filter((c) => c.getBoundingClientRect().top === cards[0].getBoundingClientRect().top).length; return perRow + '|' + (cards.length > perRow ? cards[perRow].getBoundingClientRect().top < window.innerHeight - 120 : 'one row'); }), '4|true');

    check('a design without a preview image shows the placeholder', await page.evaluate((name) => { const card = Array.from(document.querySelectorAll('#hdGrid .hd-card')).filter((c) => c.querySelector('.hd-name').textContent === name)[0]; const thumb = card.querySelector('.hd-thumb'); const box = thumb.querySelector('.hd-noimg'); if (!box) return 'no placeholder'; const a = thumb.getBoundingClientRect(); const b = box.getBoundingClientRect(); return thumb.querySelectorAll('img').length + '|' + box.querySelector('.hd-noimg-text').textContent + '|' + (Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 2); }, names.alpha), '0|Chưa có ảnh xem trước|true');
    const broken = await page.evaluate(() => { const img = document.querySelector('#hdGrid .hd-thumb img'); if (!img) return null; const thumb = img.parentNode; img.dispatchEvent(new Event('error')); return thumb.querySelectorAll('img').length + '|' + thumb.querySelectorAll('.hd-noimg').length; });
    if (broken === null) skipped.push('a preview image that cannot be loaded (this account has no design with a preview image)');
    else check('a preview image that cannot be loaded becomes the placeholder', broken, '0|1');

    await page.fill('#hdSearch', 'alpha');
    await page.waitForTimeout(200);
    check('search keeps matching designs', (await testNames()) + '|' + await page.evaluate(() => document.querySelector('#hdResult').textContent), 'Alpha|Hiện 1 trên ' + total + ' thiết kế');
    await page.fill('#hdSearch', projectName.toLowerCase());
    await page.waitForTimeout(200);
    check('search also matches the project name', await testNames(), 'Gamma');
    await page.fill('#hdSearch', 'khong-co-ten-nay');
    await page.waitForTimeout(200);
    check('no match shows the filter message', await page.evaluate(() => getComputedStyle(document.querySelector('#hdEmpty')).display !== 'none' ? document.querySelector('#hdEmptyTitle').textContent : 'hidden'), 'Không có thiết kế nào khớp bộ lọc');
    await page.click('#hdEmptyActions .ba-btn');
    await page.waitForTimeout(200);
    check('clearing the filters shows everything again', await page.evaluate(() => document.querySelectorAll('#hdGrid .hd-card').length + '|' + document.querySelector('#hdSearch').value), total + '|');

    await page.selectOption('#hdSort', 'name-asc');
    check('sorting by name', await testNames(), 'Alpha,Beta,Gamma');
    await page.selectOption('#hdSort', 'name-desc');
    check('sorting by name, reversed', await testNames(), 'Gamma,Beta,Alpha');
    await page.selectOption('#hdSort', 'date-asc');
    check('oldest first', await testNames(), 'Alpha,Beta,Gamma');
    await page.selectOption('#hdSort', 'date-desc');

    await page.click('#hdProjectBtn');
    await page.locator('#hdProjectList .hd-pop-item', { hasText: projectName }).locator('input').check();
    await page.waitForTimeout(200);
    check('filtering by a project', (await testNames()) + '|' + await page.evaluate(() => document.querySelector('#hdProjectLabel').textContent + '|' + document.querySelectorAll('#hdGrid .hd-card').length), 'Gamma|' + projectName + '|1');
    await page.locator('#hdProjectList .hd-pop-item').first().locator('input').check();
    await page.waitForTimeout(200);
    check('All projects clears the project filter', await page.evaluate(() => document.querySelector('#hdProjectLabel').textContent + '|' + document.querySelectorAll('#hdGrid .hd-card').length), 'Tất cả dự án|' + total);
    await page.keyboard.press('Escape');

    await cardOf(names.alpha).locator('.hd-act[title="Chuyển thành công khai"]').click();
    await page.waitForFunction((name) => Array.from(document.querySelectorAll('#hdGrid .hd-card')).some((c) => c.querySelector('.hd-name').textContent === name && c.querySelector('.hd-chip-public')), names.alpha, { timeout: 15000 });
    check('making a design public', (await lastToast()) + '|' + await page.evaluate(() => document.querySelector('#hdCountShared').textContent - 0 > 0), 'Đã chuyển thiết kế thành công khai.|true');
    await page.selectOption('#hdVisibility', 'public');
    check('the Public filter', (await testNames()), 'Alpha');
    await page.selectOption('#hdVisibility', 'private');
    check('the Private filter', (await testNames()), 'Gamma,Beta');
    await page.selectOption('#hdVisibility', 'all');

    await page.click('#hdTabs .ba-tab[data-scope="shared"]');
    await page.waitForTimeout(300);
    check('the public tab lists the design as yours, with a clone link', await page.evaluate((args) => { const card = Array.from(document.querySelectorAll('#hdGrid .hd-card')).filter((c) => c.querySelector('.hd-name').textContent === args[0])[0]; return card ? card.querySelector('.hd-project').textContent.trim() + '|' + card.querySelector('a.ba-btn').getAttribute('href') + '|' + card.querySelectorAll('.hd-act-danger').length : 'missing'; }, [names.alpha]), 'Bạn|/Builder?cloneId=' + ids.alpha + '|0');
    check('the clone link opens the Builder', await page.evaluate(async (id) => (await fetch('/Builder?cloneId=' + id)).status, ids.alpha), 200);
    check('the project and status filters are hidden on the public tab', await page.evaluate(() => [getComputedStyle(document.querySelector('#hdProjectWrap')).display, getComputedStyle(document.querySelector('#hdVisibility')).display].join('|')), 'none|none');
    await cardOf(names.alpha).locator('.hd-thumb').click();
    check('a public thumbnail opens the preview, with the placeholder when there is no image', await page.evaluate(() => { const box = document.querySelector('#hdPreviewBody .hd-noimg'); return [document.querySelector('#hdPreview').classList.contains('show'), document.querySelector('#hdPreviewTitle').textContent, document.querySelectorAll('#hdPreviewBody img').length, box ? box.getBoundingClientRect().height > 150 : 'no placeholder'].join('|'); }), 'true|' + names.alpha + '|0|true');
    await page.keyboard.press('Escape');
    check('Escape closes the preview', await page.evaluate(() => document.querySelector('#hdPreview').classList.contains('show')), 'false');
    await open('#shared');
    check('the address remembers the public tab after a reload', await page.evaluate((name) => document.querySelector('#hdTabs .ba-tab.active').getAttribute('data-scope') + '|' + Array.from(document.querySelectorAll('#hdGrid .hd-card')).filter((c) => c.querySelector('.hd-name').textContent === name && c.querySelector('a.ba-btn')).length, names.alpha), 'shared|1');
    await page.click('#hdTabs .ba-tab[data-scope="mine"]');

    await cardOf(names.alpha).locator('.hd-act[title="Chuyển thành riêng tư"]').click();
    await page.waitForFunction((name) => Array.from(document.querySelectorAll('#hdGrid .hd-card')).some((c) => c.querySelector('.hd-name').textContent === name && c.querySelector('.hd-chip-private')), names.alpha, { timeout: 15000 });
    check('making it private again removes it from the public list', (await lastToast()) + '|' + ((await api('/Pages/Home.aspx/ListDesigns')).shared || []).filter((d) => d.Id === ids.alpha).length, 'Đã chuyển thiết kế thành riêng tư.|0');

    await page.click('#hdView .hd-view-btn[data-view="table"]');
    await page.waitForTimeout(200);
    check('the list view shows the same designs', await page.evaluate((name) => [document.querySelectorAll('#hdRows tr').length, getComputedStyle(document.querySelector('#hdGrid')).display, Array.from(document.querySelectorAll('#hdRows .hd-name')).filter((e) => e.textContent === name && e.children.length === 0).length].join('|'), names.beta), total + '|none|1');
    check('the list view shows the placeholder as an icon only', await page.evaluate((name) => { const tr = Array.from(document.querySelectorAll('#hdRows tr')).filter((r) => r.querySelector('.hd-name').textContent === name)[0]; const thumb = tr.querySelector('.hd-row-thumb'); const box = thumb.querySelector('.hd-noimg'); if (!box) return 'no placeholder'; return getComputedStyle(box.querySelector('.hd-noimg-text')).display + '|' + (box.scrollHeight <= thumb.clientHeight) + '|' + (box.querySelector('.hd-icon').getBoundingClientRect().height <= 16); }, names.alpha), 'none|true|true');
    await open();
    check('the list view is remembered', await page.evaluate(() => document.querySelector('#hdView .hd-view-btn.active').getAttribute('data-view') + '|' + document.querySelectorAll('#hdRows tr').length), 'table|' + total);
    await page.click('#hdView .hd-view-btn[data-view="grid"]');

    await cardOf(names.beta).locator('.hd-act-danger').click();
    check('deleting asks first and names the design', (await confirmText()).indexOf('Xóa thiết kế "' + names.beta + '"?') === 0, 'true');
    await page.click('.ba-confirm-cancel');
    check('answering No keeps the design', (await mineList()).filter((d) => d.Id === ids.beta).length, 1);
    await cardOf(names.beta).locator('.hd-act-danger').click();
    await page.click('.ba-confirm-ok');
    await page.waitForFunction((count) => document.querySelectorAll('#hdGrid .hd-card').length === count, total - 1, { timeout: 15000 });
    check('deleting removes the design', (await lastToast()) + '|' + (await mineList()).filter((d) => d.Id === ids.beta).length + '|' + await page.evaluate(() => document.querySelector('#hdCountMine').textContent), 'Đã xóa thiết kế.|0|' + (total - 1));

    check('an unknown design cannot be deleted or shared', JSON.stringify([(await api('/Pages/Home.aspx/DeleteDesign', { controlId: 2147483000 })).success, (await api('/Pages/Home.aspx/SetDesignPublic', { controlId: 2147483000, isPublic: true })).success]), '[false,false]');
    const guest = await page.context().browser().newContext();
    const answer = await guest.request.post(base + '/Pages/Home.aspx/ListDesigns', { data: {}, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    const guestText = await answer.text();
    await guest.close();
    check('a visitor who is not signed in gets no designs', /"mine"|"shared"|"Name"/.test(guestText), 'false');

    await page.click('#hdProjectBtn');
    await page.locator('#hdProjectList .hd-pop-item', { hasText: projectName }).locator('.hd-act-danger').click();
    check('deleting a project explains what happens to its designs', (await confirmText()).indexOf('Dự án có 1 thiết kế; các thiết kế này không bị xóa') > 0, 'true');
    await page.click('.ba-confirm-ok');
    await page.waitForFunction(() => { const list = document.querySelectorAll('.ba-toast-msg'); return list.length && list[list.length - 1].textContent === 'Đã xóa dự án.'; }, null, { timeout: 15000 });
    await page.waitForTimeout(700);
    const projectsAfter = (await api('/Pages/Builder.aspx/GetProjects')) || [];
    const gammaAfter = (await mineList()).filter((d) => d.Id === ids.gamma);
    check('the project is gone and its design stays, without a project', projectsAfter.filter((p) => p.name === projectName).length + '|' + gammaAfter.length + '|' + String((gammaAfter[0] || {}).ProjectId) + '|' + projectsAfter.filter((p) => p.name === 'Uncategorized').length, '0|1|null|0');

    await page.evaluate(() => document.body.classList.add('light-theme'));
    check('names are readable in the light theme', await page.evaluate(() => { const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; }; const name = document.querySelector('#hdGrid .hd-name'); const card = document.querySelector('#hdGrid .hd-card'); const input = document.querySelector('#hdSearch'); return (lum(getComputedStyle(card).backgroundColor) - lum(getComputedStyle(name).color) > 120) + '|' + (lum(getComputedStyle(input).backgroundColor) - lum(getComputedStyle(input).color) > 120); }), 'true|true');
    await page.evaluate(() => document.body.classList.remove('light-theme'));

    await page.context().addCookies([{ name: 'baLang', value: 'en', url: base }]);
    await open();
    await page.evaluate(() => BaI18n.debug(true));
    await page.click('#hdProjectBtn');
    await page.click('#hdProjectNew');
    await page.keyboard.press('Escape');
    await page.click('#hdView .hd-view-btn[data-view="table"]');
    await page.click('#hdTabs .ba-tab[data-scope="shared"]');
    await page.click('#hdView .hd-view-btn[data-view="grid"]');
    await page.fill('#hdSearch', 'khong-co-ten-nay');
    await page.click('#hdTabs .ba-tab[data-scope="mine"]');
    await page.fill('#hdSearch', '');
    await page.waitForTimeout(300);
    await cardOf(names.gamma).locator('.hd-act-danger').click();
    await page.waitForTimeout(400);
    const english = await page.evaluate(() => ({ tabs: Array.from(document.querySelectorAll('#hdTabs .ba-tab span:first-child')).map((e) => e.textContent).join('|'), confirm: (document.querySelector('.ba-confirm-body') || {}).textContent || '', missing: (BaI18n.missing() || []).join(' ; ') }));
    await page.click('.ba-confirm-cancel');
    check('English mode translates the tabs', english.tabs, 'My designs|Public designs');
    check('English mode translates the delete question', english.confirm.indexOf('Delete design "' + names.gamma + '"?') === 0, 'true');
    check('English mode leaves no Vietnamese text behind', english.missing, '');
    await page.evaluate(() => window.builderTemplates.openGallery());
    await page.waitForFunction(() => document.querySelectorAll('#bstGallery .bst-card').length > 0, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    check('English mode translates the module filter and the file buttons of the gallery', await page.evaluate(() => { const select = document.querySelector('#bstGallery .bst-select'); const buttons = Array.from(document.querySelectorAll('#bstGallery .bst-head-btn')).map((b) => b.textContent); return [select.options[0].textContent, select.options[select.options.length - 1].textContent, select.title].concat(buttons.slice(-2)).join('|'); }), 'All modules|No module assigned|Filter by HR module|Open a draw.io file|Open an HTML file');
    check('English mode translates the name, group and description of a standard screen', await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('#bstGallery .bst-card')).filter((c) => c.querySelector('.bst-name').textContent === 'List with toolbar (Core)')[0];
      if (!card) return 'card not found';
      return /^Common patterns( · [^·]+)? · 2 controls$/.test(card.querySelector('.bst-meta').textContent) + '|' + card.querySelector('.bst-desc').textContent + '|' + card.querySelector('.bst-btn').textContent;
    }), 'true|Toolbar and a grid with a filter row, select, edit and delete columns and paging. Used for list screens.|Use this screen');
    await page.fill('#bstGallery .bst-search', 'toolbar');
    check('the gallery search matches the English text on the cards', await page.evaluate(() => Array.from(document.querySelectorAll('#bstGallery .bst-card .bst-name')).map((e) => e.textContent).indexOf('List with toolbar (Core)') >= 0), 'true');
    await page.fill('#bstGallery .bst-search', '');
    await page.click('#bstGallery .bst-head-btn');
    await page.waitForFunction(() => { const link = document.querySelector('#bstCapture .bst-bookmark'); return link && !link.classList.contains('is-disabled'); }, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    check('English mode leaves no Vietnamese text in the gallery and the capture dialog', await page.evaluate(() => (BaI18n.missing() || []).join(' ; ')), '');
    check('the bookmark carries the English texts of the panel shown on the HRM page', await page.evaluate(() => { const code = decodeURIComponent(document.querySelector('#bstCapture .bst-bookmark').getAttribute('href').slice(11)); return code.slice(code.lastIndexOf(')({')).indexOf('"done":"Screen captured"') >= 0; }), 'true');
    await page.evaluate(() => { window.builderTemplates.closeCapture(); window.builderTemplates.closeGallery(); });
  } finally {
    await page.evaluate(() => window.BaI18n && BaI18n.debug(false)).catch(() => null);
    await page.context().addCookies([{ name: 'baLang', value: 'vi', url: base }]);
    await cleanup();
    await page.evaluate(() => localStorage.setItem('designs-view', 'grid')).catch(() => null);
    page.off('pageerror', onError);
  }

  const leftovers = (await mineList()).filter((d) => String(d.Name).indexOf(prefix) === 0).length + (((await api('/Pages/Builder.aspx/GetProjects')) || []).filter((p) => String(p.name).indexOf(prefix) === 0).length);
  check('test data is removed', leftovers + '|' + (await mineList()).length, '0|' + before);
  check('no script errors', pageErrors.join(' ; '), '');
  await open();
  const failed = results.filter((r) => r.indexOf('FAIL') === 0);
  return failed.concat(skipped.map((s) => 'skip ' + s), ['=== Home: ' + (results.length - failed.length) + ' checks passed, ' + failed.length + ' failed' + (skipped.length ? ', ' + skipped.length + ' skipped' : '')]).join('\n');
}
