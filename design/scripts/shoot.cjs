// Screenshot Pulse routes from a running dev server: node design/scripts/shoot.cjs <baseUrl> <outDir> <route...>
const { chromium } = require('playwright');
(async () => {
  const [base, out, ...routes] = process.argv.slice(2);
  const browser = await chromium.launch();
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    for (const r of routes) {
      await page.goto(`${base}/#${r}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const name = (r.replace(/\//g, '') || 'home') + `-${vp.width}.png`;
      await page.screenshot({ path: `${out}/${name}`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      console.log(name, 'horizontal overflow px:', overflow);
    }
    await page.close();
  }
  await browser.close();
})();
