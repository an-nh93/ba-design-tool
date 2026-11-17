async (page, options) => {
  options = options || {};
  const results = [];
  const pageErrors = [];
  const onError = (e) => pageErrors.push(String(e).slice(0, 200));
  page.on('pageerror', onError);
  let downloads = 0;
  const onDownload = () => { downloads++; };
  page.on('download', onDownload);
  let keyWrites = 0;
  const onRequest = (r) => { if (r.url().indexOf('/PgpTool.aspx/UpdateFolderConfigKeys') >= 0) keyWrites++; };
  page.on('request', onRequest);

  const mismatchPattern = /^File được mã hóa cho key ([0-9A-F]{16}(?:, [0-9A-F]{16})*), nhưng private key đang dùng là key ([0-9A-F]{16}(?:, [0-9A-F]{16})*)[.] Hãy dùng private key cùng cặp với public key đã mã hóa file[.]$/;
  const wrongPassphrase = 'Passphrase không đúng';
  const fileKeys = {};
  const keysInUse = {};
  const remember = (map, pair, value) => { (map[pair] = map[pair] || {})[value] = true; };
  const newline = String.fromCharCode(10);
  let expectedDownloads = 0;

  const check = (title, got, want) => {
    const ok = String(got) === String(want);
    results.push((ok ? 'ok   ' : 'FAIL ') + title + (ok ? '' : ' -> got [' + got + '] want [' + want + ']'));
    return ok;
  };
  const note = (text) => results.push('     ' + text);
  const refused = (title, d, text) => {
    if (!check(title, !!(d && d.success === false && d.message === text), true)) note('message: ' + (d && d.message));
  };
  const junkKey = 'VGhpcyBpcyBub3QgYSBQR1Aga2V5';
  const say = {
    decryptWithPublicKey: 'Key đang dùng để giải mã là Public Key. Giải mã cần Private Key cùng cặp: file Private Key, chuỗi Private Key hoặc key của cấu hình trong DB.',
    decryptWithMessage: 'Key đang dùng để giải mã là file đã mã hóa, không phải Private Key.',
    decryptWithJunk: 'Key đang dùng để giải mã không phải key PGP hợp lệ.',
    decryptKeyFile: 'File đã chọn để giải mã là file key, không phải file đã mã hóa PGP.',
    decryptPlainFile: 'File đã chọn để giải mã không phải file đã mã hóa PGP.',
    encryptWithPrivate: 'Key đang dùng để mã hóa là Private Key. Mã hóa cần Public Key của bên nhận.',
    encryptWithMessage: 'Key đang dùng để mã hóa là file đã mã hóa, không phải Public Key.',
    encryptWithJunk: 'Key đang dùng để mã hóa không phải key PGP hợp lệ.',
    exportPrivateAsPublic: 'Chuỗi key là Private Key nhưng loại key đang chọn là Public Key.',
    exportPublicAsPrivate: 'Chuỗi key là Public Key nhưng loại key đang chọn là Private Key.',
    exportJunk: 'Chuỗi key không phải key PGP hợp lệ.',
    notBase64: 'Dữ liệu file hoặc key không phải Base64 hợp lệ.'
  };
  const strip = (s) => String(s || '').replace(/[^A-Za-z0-9+/=]/g, '');
  const wrap = (s) => strip(s).match(/.{1,76}/g).join(newline);
  const api = (path, payload) => page.evaluate(async (args) => {
    const response = await fetch(args[0], { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(args[1] || {}) });
    const json = await response.json().catch(() => null);
    return json && json.d !== undefined ? json.d : json;
  }, [path, payload]);
  const idle = () => page.waitForFunction(() => !document.querySelector('#progressOverlay.show'), null, { timeout: 120000 });
  const tab = async (name) => { await idle(); await page.click('.ba-tab[data-tab="' + name + '"]'); };
  const radio = (name, value) => page.locator('input[name="' + name + '"][value="' + value + '"]').check();
  const setFile = async (selector, file) => {
    if (file.path) { await page.setInputFiles(selector, file.path); return; }
    await page.evaluate((args) => {
      const bin = atob(args.b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], args.name));
      const input = document.querySelector(args.selector);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { selector: selector, name: file.name, b64: file.b64 });
  };
  const capture = async (method, button) => {
    await idle();
    const wait = page.waitForResponse((r) => r.url().indexOf('/PgpTool.aspx/' + method) >= 0 && r.request().method() === 'POST', { timeout: 120000 });
    await page.click(button);
    const json = await (await wait).json().catch(() => null);
    await idle();
    const d = json && json.d !== undefined ? json.d : json;
    if (d && d.success && d.fileBase64) expectedDownloads++;
    return d;
  };

  const start = new URL(page.url());
  const tokenK = start.searchParams.get('k') || '';
  if (start.pathname !== '/PgpTool' || !tokenK) return 'NOT CONNECTED: open /PgpTool with the "Công cụ PGP" button of a database in Database Tools, then run again';

  try {
    await page.setViewportSize({ width: 1280, height: 620 });
    await page.goto(start.href, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => /^Đã chọn/.test(document.getElementById('configKeyStatus').textContent), null, { timeout: 30000 });
    const list = await api('/Pages/PgpTool.aspx/GetFolderConfigList', { tokenK: tokenK });
    const item = list.list[parseInt(await page.inputValue('#folderConfigSelect'), 10)];
    const stored = await api('/Pages/PgpTool.aspx/GetFolderConfigKeys', { tokenK: tokenK, tenantId: item.tenantId || '', code: item.code || '' });
    const db = { name: 'DB', pub: strip(stored.encryptionPublicKey), priv: strip(stored.encryptionPrimaryKey) };
    if (!check('the selected configuration has both keys', !!(db.pub && db.priv), true)) return results.join(newline);

    await tab('generate');
    await page.setChecked('#genSaveToDb', false);
    const passphrase = await page.evaluate(() => document.getElementById('genPassphrase').defaultValue);
    await page.fill('#genPassphrase', passphrase);
    const generated = await capture('GeneratePgpKey', '#btnGenerateKey');
    check('generate: a new key pair is returned', !!(generated && generated.success && generated.publicKeyBase64 && generated.privateKeyBase64), true);
    check('generate: the result dialog opens', await page.isVisible('#genResultModal'), true);
    await page.click('#genResultClose');
    const fresh = { name: 'new', pub: strip(generated.publicKeyBase64), priv: strip(generated.privateKeyBase64) };

    const runExport = async (source, type, pasted, code) => {
      await tab('export');
      await radio('exportSrc', source);
      await radio('keyType', type);
      if (source === 'paste' && pasted !== undefined) {
        await page.fill('#exportKeyBase64', pasted);
        await page.fill('#exportCode', code);
      }
      return (await capture('ExportKey', '#btnExport')) || {};
    };
    const exportKey = async (title, source, type, pasted, code) => {
      const d = await runExport(source, type, pasted, code);
      if (!check('export ' + title + ': done', !!d.success, true)) note('message: ' + d.message);
      return d;
    };
    const namePattern = (label, code) => ({ test: (name) => String(name).indexOf(label + '_' + code + '_') === 0 && /_[0-9]{8}_[0-9]{6}[.]asc$/.test(name) && String(name).length === (label + '_' + code).length + 20 });
    const freshPub = await exportKey('pasted public key', 'paste', 'public', wrap(fresh.pub), 'pgpcheck');
    check('export pasted public key: file holds the pasted key', freshPub.fileBase64 === fresh.pub, true);
    check('export pasted public key: file name', namePattern('Public Key', 'pgpcheck').test(freshPub.fileName), true);
    const freshPriv = await exportKey('pasted private key', 'paste', 'private', wrap(fresh.priv), 'pgpcheck');
    check('export pasted private key: file holds the pasted key', freshPriv.fileBase64 === fresh.priv, true);
    check('export pasted private key: file name', namePattern('Private Key', 'pgpcheck').test(freshPriv.fileName), true);
    const dbPub = await exportKey('configuration public key', 'config', 'public');
    check('export configuration public key: file holds the stored key', dbPub.fileBase64 === db.pub, true);
    check('export configuration public key: file name', namePattern('Public Key', item.code).test(dbPub.fileName), true);
    const dbPriv = await exportKey('configuration private key', 'config', 'private');
    check('export configuration private key: file holds the stored key', dbPriv.fileBase64 === db.priv, true);
    check('export configuration private key: file name', namePattern('Private Key', item.code).test(dbPriv.fileName), true);
    const invalid = await runExport('paste', 'public', 'not base64 !', 'pgpcheck');
    check('export text that is not Base64: refused', invalid.success === false && invalid.message === 'Chuỗi không phải Base64 hợp lệ.', true);
    await page.fill('#exportKeyBase64', wrap(fresh.pub));
    await page.fill('#exportCode', 'pgpcheck2');
    await radio('exportSrc', 'config');
    check('export from the configuration hides the pasted key and the file name code', await page.evaluate(() => ['exportPasteWrap', 'exportCodeWrap'].every((id) => document.getElementById(id).getBoundingClientRect().width === 0)), true);
    await radio('keyType', 'private');
    await radio('keyType', 'public');
    await radio('exportSrc', 'paste');
    check('back on the pasted key, the pasted key and code are kept', await page.evaluate(() => document.getElementById('exportCodeWrap').getBoundingClientRect().width > 0 && document.getElementById('exportCode').value), 'pgpcheck2');
    const again = await exportKey('pasted public key after switching to the configuration and back', 'paste', 'public');
    check('export after switching back: file holds the pasted key, not the stored one', again.fileBase64 === fresh.pub, true);
    check('export after switching back: file name uses the typed code', namePattern('Public Key', 'pgpcheck2').test(again.fileName), true);
    refused('export a pasted private key as Public Key: refused', await runExport('paste', 'public', wrap(fresh.priv), 'pgpcheck'), say.exportPrivateAsPublic);
    refused('export a pasted public key as Private Key: refused', await runExport('paste', 'private', wrap(fresh.pub), 'pgpcheck'), say.exportPublicAsPrivate);
    refused('export Base64 text that is not a key: refused', await runExport('paste', 'public', junkKey, 'pgpcheck'), say.exportJunk);
    fresh.pubFile = { name: freshPub.fileName, b64: freshPub.fileBase64 };
    fresh.privFile = { name: freshPriv.fileName, b64: freshPriv.fileBase64 };
    db.pubFile = { name: dbPub.fileName, b64: dbPub.fileBase64 };
    db.privFile = { name: dbPriv.fileName, b64: dbPriv.fileBase64 };

    await tab('encrypt');
    if (options.inputFile) {
      await page.setInputFiles('#encryptFileInput', options.inputFile);
    } else {
      await page.evaluate(() => {
        const lines = [];
        for (let i = 0; i < 600; i++) lines.push('2026-11-17 10:00:' + String(i % 60).padStart(2, '0') + ' INFO Dòng thử số ' + i + ': dữ liệu tiếng Việt có dấu, ký tự đặc biệt <>&" và số 1234567890');
        const transfer = new DataTransfer();
        transfer.items.add(new File([lines.join(String.fromCharCode(13, 10))], 'pgp-check.log'));
        const input = document.getElementById('encryptFileInput');
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    const original = await page.evaluate(() => new Promise((resolve) => {
      const f = document.getElementById('encryptFileInput').files[0];
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, b64: String(reader.result).split('base64,')[1] || '' });
      reader.readAsDataURL(f);
    }));

    const encrypted = [];
    const runEncrypt = async (source, text, file, ext, compress) => {
      await tab('encrypt');
      await radio('encKeySrc', source);
      if (source === 'base64') await page.fill('#encKeyBase64', text);
      if (source === 'file') await setFile('#encKeyFileInput', file);
      await radio('encExt', ext);
      await page.setChecked('#encryptCompress', compress);
      return capture('EncryptPgp', '#btnEncrypt');
    };
    const encrypt = async (title, pair, source, ext, compress) => {
      const d = await runEncrypt(source, source === 'base64' ? wrap(pair.pub) : null, pair.pubFile, ext, compress);
      if (check('encrypt [' + title + ']: done', !!(d && d.success), true)) {
        check('encrypt [' + title + ']: file name', d.fileName, original.name + ext);
        encrypted.push({ title: title, pair: pair.name, file: { name: d.fileName, b64: d.fileBase64 } });
      } else note('message: ' + (d && d.message));
    };
    await encrypt('new key, pasted Base64, .pgp', fresh, 'base64', '.pgp', true);
    await encrypt('new key, .asc file, .pgp', fresh, 'file', '.pgp', true);
    await encrypt('new key, pasted Base64, .asc', fresh, 'base64', '.asc', true);
    await encrypt('new key, pasted Base64, no compression', fresh, 'base64', '.pgp', false);
    await encrypt('DB key, configuration, .pgp', db, 'config', '.pgp', true);
    await encrypt('DB key, pasted Base64, .pgp', db, 'base64', '.pgp', true);
    await encrypt('DB key, exported .asc file, .pgp', db, 'file', '.pgp', true);
    await encrypt('DB key, configuration, .asc', db, 'config', '.asc', true);
    if (options.otherPublicKeyFile) await encrypt('other key, .asc file, .pgp', { name: 'other', pubFile: { path: options.otherPublicKeyFile } }, 'file', '.pgp', true);

    refused('encrypt with the new private key pasted: says a public key is needed', await runEncrypt('base64', wrap(fresh.priv), null, '.pgp', true), say.encryptWithPrivate);
    refused('encrypt with the new private key .asc file: says a public key is needed', await runEncrypt('file', null, fresh.privFile, '.pgp', true), say.encryptWithPrivate);
    refused('encrypt with the DB private key .asc file: says a public key is needed', await runEncrypt('file', null, db.privFile, '.pgp', true), say.encryptWithPrivate);
    refused('encrypt with an encrypted file as the key: says it is not a public key', await runEncrypt('file', null, encrypted[0].file, '.pgp', true), say.encryptWithMessage);
    refused('encrypt with Base64 text that is not a key: says it is not a PGP key', await runEncrypt('base64', junkKey, null, '.pgp', true), say.encryptWithJunk);
    refused('encrypt with text that is not Base64: says so', await runEncrypt('base64', 'not base64 !', null, '.pgp', true), say.notBase64);

    const privateKeys = [
      { title: 'new key pasted', pair: fresh, source: 'base64' },
      { title: 'new key .asc file', pair: fresh, source: 'file' },
      { title: 'DB configuration', pair: db, source: 'config' },
      { title: 'DB key pasted', pair: db, source: 'base64' },
      { title: 'DB key exported .asc file', pair: db, source: 'file' }
    ];
    const decrypt = async (file, key, pass) => {
      await tab('decrypt');
      await setFile('#decryptFileInput', file);
      await radio('decKeySrc', key.source);
      if (key.source === 'base64') await page.fill('#decKeyBase64', key.text !== undefined ? key.text : wrap(key.pair.priv));
      if (key.source === 'file') await setFile('#decKeyFileInput', key.file || key.pair.privFile);
      await page.fill('#decPassphrase', pass);
      return capture('DecryptPgp', '#btnDecrypt');
    };
    let refusalShown = false;
    const expectDecrypt = async (title, d, filePair, key, content, fileName) => {
      if (filePair === key.pair.name) {
        if (!check(title + ': opens', !!(d && d.success), true)) { note('message: ' + (d && d.message)); return; }
        if (content) check(title + ': same content as the original', d.fileBase64 === content, true);
        if (fileName) check(title + ': original file name', d.fileName, fileName);
        return;
      }
      const match = d && !d.success ? mismatchPattern.exec(String(d.message)) : null;
      if (!check(title + ': refused, names the key of the file and the key in use', !!match, true)) { note('message: ' + (d && d.message)); return; }
      remember(fileKeys, filePair, match[1]);
      remember(keysInUse, key.pair.name, match[2]);
      if (!refusalShown) {
        refusalShown = true;
        check('a refused decryption shows the reason on the page', await page.evaluate((text) => {
          const box = document.getElementById('decryptErr');
          return box.getBoundingClientRect().width > 0 && box.textContent === text;
        }, d.message), true);
      }
    };
    for (const enc of encrypted) {
      for (const key of privateKeys) {
        const d = await decrypt(enc.file, key, passphrase);
        await expectDecrypt('decrypt [' + enc.title + '] with ' + key.title, d, enc.pair, key, original.b64, original.name);
      }
    }

    const forDb = encrypted.filter((e) => e.pair === 'DB')[0];
    if (forDb) {
      const d = await decrypt(forDb.file, privateKeys[2], passphrase + 'x');
      if (!check('decrypt with a wrong passphrase: says the passphrase is wrong', !!(d && !d.success && String(d.message).indexOf(wrongPassphrase) === 0), true)) note('message: ' + (d && d.message));
      refused('decrypt with the DB public key exported .asc file: says a private key is needed', await decrypt(forDb.file, { source: 'file', file: db.pubFile }, passphrase), say.decryptWithPublicKey);
      check('a public key given for decryption shows the reason on the page', await page.evaluate((text) => {
        const box = document.getElementById('decryptErr');
        return box.getBoundingClientRect().width > 0 && box.textContent === text;
      }, say.decryptWithPublicKey), true);
      refused('decrypt with the DB public key pasted: says a private key is needed', await decrypt(forDb.file, { source: 'base64', text: wrap(db.pub) }, passphrase), say.decryptWithPublicKey);
      refused('decrypt with the new public key .asc file: says a private key is needed', await decrypt(forDb.file, { source: 'file', file: fresh.pubFile }, passphrase), say.decryptWithPublicKey);
      refused('decrypt with the encrypted file as the key: says it is not a private key', await decrypt(forDb.file, { source: 'file', file: forDb.file }, passphrase), say.decryptWithMessage);
      refused('decrypt with Base64 text that is not a key: says it is not a PGP key', await decrypt(forDb.file, { source: 'base64', text: junkKey }, passphrase), say.decryptWithJunk);
      refused('decrypt with key text that is not Base64: says so', await decrypt(forDb.file, { source: 'base64', text: 'not base64 !' }, passphrase), say.notBase64);
      refused('decrypt the original, not encrypted file: says it is not a PGP file', await decrypt(original, privateKeys[2], passphrase), say.decryptPlainFile);
      refused('decrypt the DB public key file: says it is a key file', await decrypt(db.pubFile, privateKeys[2], passphrase), say.decryptKeyFile);
      refused('decrypt the DB private key file: says it is a key file', await decrypt(db.privFile, privateKeys[2], passphrase), say.decryptKeyFile);
    }

    for (const f of options.encryptedFiles || []) {
      for (const key of privateKeys) {
        const d = await decrypt({ path: f.path }, key, passphrase);
        await expectDecrypt('decrypt ' + f.label + ' with ' + key.title, d, f.pair, key, f.sameContent ? original.b64 : null, null);
      }
      refused('decrypt ' + f.label + ' with the DB public key exported .asc file: says a private key is needed', await decrypt({ path: f.path }, { source: 'file', file: db.pubFile }, passphrase), say.decryptWithPublicKey);
      for (const publicKeyFile of options.publicKeyFiles || []) {
        refused('decrypt ' + f.label + ' with public key file ' + publicKeyFile.split('/').pop() + ': says a private key is needed', await decrypt({ path: f.path }, { source: 'file', file: { path: publicKeyFile } }, passphrase), say.decryptWithPublicKey);
      }
    }

    Object.keys(fileKeys).forEach((pair) => {
      const fileKey = Object.keys(fileKeys[pair]);
      check('every refused ' + pair + ' file names the same key', fileKey.length, 1);
      const inUse = Object.keys(keysInUse[pair] || {});
      if (inUse.length) {
        check('every refusal with the ' + pair + ' private key names the same keys in use', inUse.length, 1);
        check('the key of the ' + pair + ' files is one of the ' + pair + ' private key IDs', inUse[0].split(', ').indexOf(fileKey[0]) >= 0, true);
      }
      if (options.keyIds && options.keyIds[pair]) check('the ' + pair + ' files are reported as key ' + options.keyIds[pair], fileKey[0], options.keyIds[pair]);
    });

    if (forDb) {
      await page.context().addCookies([{ name: 'baLang', value: 'en', url: start.origin }]);
      await page.goto(start.href, { waitUntil: 'load', timeout: 90000 });
      await decrypt(forDb.file, privateKeys[0], passphrase);
      check('English: the refusal is translated', await page.waitForFunction(() => /^The file was encrypted for key [0-9A-F]{16}, but the private key in use is key [0-9A-F]{16}.* Use the private key from the same pair as the public key that encrypted the file/.test(document.getElementById('decryptErr').textContent), null, { timeout: 10000 }).then(() => true, () => false), true);
      await decrypt(forDb.file, { source: 'file', file: db.pubFile }, passphrase);
      check('English: a public key given for decryption is explained', await page.waitForFunction(() => document.getElementById('decryptErr').textContent.indexOf('The key used for decryption is a Public Key. Decryption needs the Private Key of the same pair') === 0, null, { timeout: 10000 }).then(() => true, () => false), true);
    }

    check('no key was written to the database', keyWrites, 0);
    check('every successful export, encryption and decryption downloads one file', downloads, expectedDownloads);
    check('no script errors', pageErrors.length, 0);
    pageErrors.forEach((e) => note('page error: ' + e));
  } catch (e) {
    results.push('FAIL stopped: ' + String(e && e.message || e).slice(0, 300));
  } finally {
    page.off('pageerror', onError);
    page.off('download', onDownload);
    page.off('request', onRequest);
    await page.context().addCookies([{ name: 'baLang', value: 'vi', url: start.origin }]).catch(() => {});
    await page.goto(start.href, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
  }

  const passed = results.filter((r) => r.indexOf('ok ') === 0).length;
  const failed = results.filter((r) => r.indexOf('FAIL') === 0).length;
  results.push('=== PGP tool: ' + passed + ' checks passed, ' + failed + ' failed');
  return results.join(newline);
}
