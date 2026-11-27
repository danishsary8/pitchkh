// Renders the covers from cover.source.html at 2x.
// Run from apps/web (for playwright + sharp): node ../../portfolio/cover/render.cjs
const { chromium } = require("playwright");
const path = require("path");
const sharp = require(require.resolve("sharp", { paths: [path.dirname(require.resolve("next/package.json", { paths: [process.cwd()] }))] }));
const dir = __dirname;
(async () => {
  const browser = await chromium.launch();
  for (const [mode, w, h] of [["card", 1600, 1000], ["banner", 1920, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await page.goto(`file://${dir}/cover.source.html?mode=${mode}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const png = await page.locator(".stage").screenshot();
    await sharp(png).webp({ quality: 88 }).toFile(`${dir}/${mode}.webp`);
    await sharp(png).resize(w).jpeg({ quality: 88, mozjpeg: true }).toFile(`${dir}/${mode}.jpg`);
    console.log("rendered", mode);
    await page.close();
  }
  // Overview board (all screens in flow order), full height.
  const page = await browser.newPage({ viewport: { width: 2000, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(`file://${dir}/overview.source.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const png = await page.screenshot({ fullPage: true });
  await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(dir, "..", "overview.jpg"));
  console.log("rendered overview");
  await browser.close();
})();
