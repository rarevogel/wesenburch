const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2], b = await chromium.launch(), errs = [];
  const url = 'file://' + __dirname + '/../dist/wesenbuch.html';
  for (const [name, opt] of [['desktop', { viewport: { width: 1280, height: 860 } }], ['phone', devices['Pixel 7']], ['tablet', devices['Galaxy Tab S4 landscape']], ['dark', { viewport: { width: 1280, height: 860 }, colorScheme: 'dark' }]]) {
    const ctx = await b.newContext({ ...opt, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ' ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(name + ' ' + m.text()));
    const t0 = Date.now(); await p.goto(url); await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/w-${name}-grid.png` });
    await p.evaluate(() => __wesen.open('blutbad')); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/w-${name}-detail.png` });
    if (name === 'desktop') {
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
      console.log('next ->', await p.evaluate(() => location.hash));
      await p.click('[data-a=seen]'); await p.click('[data-a=fav]');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      console.log('closed', await p.evaluate(() => document.getElementById('detail').hidden), await p.evaluate(() => location.hash));
      await p.fill('#q', 'snake'); await p.waitForTimeout(200); console.log(await p.textContent('#count'));
      await p.fill('#q', ''); await p.selectOption('#season', '6'); console.log(await p.textContent('#count'));
      await p.selectOption('#season', '');
      await p.click('[data-tab=eps]'); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/w-eps.png` });
      await p.click('[data-tab=mine]'); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/w-mine.png` });
      // all detail pages open without errors
      const ids = await p.evaluate(() => __wesen.WESEN.map(w => w.id));
      for (const id of ids) await p.evaluate(id => __wesen.open(id), id);
      console.log('opened', ids.length);
    }
    if (name === 'phone') { await p.evaluate(() => __wesen.close()); await p.evaluate(() => scrollTo(0, 3000)); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/w-phone-scroll.png` }); }
    await ctx.close();
  }
  console.log('errors', errs.length ? errs : 'none'); await b.close();
})();
