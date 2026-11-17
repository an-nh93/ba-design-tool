async (page) => {
  const base = 'http://localhost:3393';
  const results = [];
  const pageErrors = [];
  const onError = (e) => pageErrors.push(String(e).slice(0, 200));
  page.on('pageerror', onError);

  const check = (name, got, want) => {
    const ok = String(got) === String(want);
    results.push((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' -> got [' + got + '] want [' + want + ']'));
    return ok;
  };
  const metrics = () => page.evaluate(async () => {
    const response = await fetch('/Pages/ServerMonitor.aspx/GetMetrics', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: '{}' });
    const json = await response.json().catch(() => null);
    return json && json.d !== undefined ? json.d : json;
  });
  const open = async () => {
    await page.goto(base + '/ServerMonitor', { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => document.querySelectorAll('#metricRunner .ba-metric-card').length === 3, null, { timeout: 30000 });
    await page.waitForTimeout(300);
  };

  await page.setViewportSize({ width: 1280, height: 620 });
  await page.context().addCookies([{ name: 'baLang', value: 'vi', url: base }]);
  await page.goto(base + '/ServerMonitor', { waitUntil: 'load', timeout: 90000 });
  const landed = new URL(page.url()).pathname;
  if (landed !== '/ServerMonitor') return 'NOT ALLOWED: sign in at ' + base + '/Login with a Super Admin test account first (landed on ' + landed + ')';

  let mode = '';
  try {
    await open();
    const data = (await metrics()) || {};
    const runner = data.jobRunner || {};
    const usesWorker = runner.claimsHere === false;
    mode = usesWorker ? 'Worker' : 'web site';
    check('the server reports where jobs run', typeof runner.claimsHere, 'boolean');
    check('the job runner group shows the same place', await page.evaluate(() => document.querySelector('#metricRunner .ba-metric-card .ba-metric-value').textContent), usesWorker ? 'BADesign.Worker' : 'Trong site web');
    check('the Worker group and its three cards are on the page only when the Worker runs the jobs', await page.evaluate(() => document.querySelectorAll('#metricWorker').length + '|' + document.querySelectorAll('#metricWorker .ba-metric-card').length), usesWorker ? '1|3' : '0|0');
    check('the Worker group title follows the same rule', await page.evaluate(() => Array.from(document.querySelectorAll('.ba-metric-group-title')).filter((e) => e.textContent.trim() === 'BADesign.Worker.exe').length), usesWorker ? 1 : 0);
    check('the server collects Worker figures only when the Worker is used', Object.prototype.hasOwnProperty.call(data, 'worker'), usesWorker);
    check('there is one intro and it names the Worker only when the Worker is used', await page.evaluate(() => document.querySelectorAll('.ba-monitor-intro').length + '|' + /BADesign\.Worker/.test(document.querySelector('.ba-monitor-intro').textContent)), '1|' + usesWorker);
    check('the job runner group keeps its three cards', await page.evaluate(() => document.querySelectorAll('#metricRunner .ba-metric-card').length), 3);
    check('nothing scrolls sideways on a laptop screen', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'true');

    await page.context().addCookies([{ name: 'baLang', value: 'en', url: base }]);
    await open();
    await page.evaluate(() => BaI18n.debug(true));
    await page.waitForTimeout(800);
    const english = await page.evaluate(() => ({
      intro: document.querySelector('.ba-monitor-intro').textContent.replace(/\s+/g, ' ').trim(),
      missing: (BaI18n.missing() || []).join(' ; ')
    }));
    check('English mode translates the intro', /Process CPU\/RAM/.test(english.intro) + '|' + (/including the background jobs/.test(english.intro) === !usesWorker), 'true|true');
    check('English mode leaves no Vietnamese text behind', english.missing, '');
  } finally {
    await page.evaluate(() => window.BaI18n && BaI18n.debug(false)).catch(() => null);
    await page.context().addCookies([{ name: 'baLang', value: 'vi', url: base }]);
    page.off('pageerror', onError);
  }

  check('no script errors', pageErrors.join(' ; '), '');
  const failed = results.filter((r) => r.indexOf('FAIL') === 0);
  return failed.concat(['=== Server monitor (jobs run in the ' + mode + '): ' + (results.length - failed.length) + ' checks passed, ' + failed.length + ' failed']).join('\n');
}
