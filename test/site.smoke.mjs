// Headless browser check of the built page: loads site/index.html, waits, and checks that it runs cleanly.
//   npm run test:site        (needs the dev dependency: npm ci && npx playwright install chromium)
import { chromium } from "playwright";
import assert from "node:assert/strict";

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// serve site/ over http, the way Netlify does, so the separately loaded three.js file works
const root = new URL("../site/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader("content-type", types[path.extname(file)] || "application/octet-stream"); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await chromium.launch();
const errors = [];
try {
  for (const width of [360, 400, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", (e) => errors.push(`${width}px: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/fonts\.googleapis|fonts\.gstatic|ERR_/.test(m.text())) errors.push(`${width}px: ${m.text()}`); });
    await page.goto(url);
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${width}px: page is ${overflow}px wider than the viewport`);
    if (width === 1440) {
      // poke the brain and check that neurons light up
      await page.click('#stimButtons [data-stim="touch-tail"]');
      await page.waitForTimeout(1500);
      const active = Number(await page.textContent("#heroActive"));
      assert.ok(active > 0, `no active neurons after a stimulus (${active})`);
      // the compare panel runs a second brain on shuffled wiring
      await page.click("#cmpToggle");
      await page.waitForTimeout(800);
      assert.equal(await page.isVisible("#cmp"), true);
      // the three.js nebula loaded and switched on
      assert.equal(await page.evaluate(() => document.getElementById("nebula")?.classList.contains("on")), true, "nebula did not start");
      // the genome maps are drawn on load from the inlined data
      assert.equal(await page.locator("#chroms canvas").count(), 12);
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log("site smoke test passed at 360, 400, 768 and 1440 px");
} finally {
  await browser.close();
  server.close();
}
