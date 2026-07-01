import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const sites = [
  { url: "https://recaf.sa/", name: "recaf-sa" },
  { url: "https://mallsapp.me/", name: "mallsapp-me" },
  { url: "https://brokerapp.me/", name: "brokerapp-me" },
  { url: "https://lago.com.sa/en", name: "lago-com-sa-en" },
];

const outDir = join(process.cwd(), "screenshots");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

for (const site of sites) {
  const page = await context.newPage();
  console.log(`Capturing ${site.url} ...`);
  try {
    await page.goto(site.url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);
    const path = join(outDir, `${site.name}.png`);
    await page.screenshot({ path, fullPage: true, type: "png" });
    console.log(`Saved ${path}`);
  } catch (err) {
    console.error(`Failed ${site.url}:`, err.message);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log("Done.");
