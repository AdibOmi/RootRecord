// Usage: node render.mjs <jobs.json>
// jobs.json: [{ "html": "abs path", "pdf": "abs path", "title": "..." }]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage()
for (const job of jobs) {
  await page.goto(pathToFileURL(job.html).href, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__mermaidDone === true, null, { timeout: 120000 })
  const errors = await page.evaluate(() => window.__mermaidErrors || 0)
  await page.pdf({
    path: job.pdf,
    format: 'A4',
    printBackground: true,
    outline: true,
    tagged: true,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7px;width:100%;padding:0 14mm;color:#888;font-family:Segoe UI,Arial">${job.title}</div>`,
    footerTemplate:
      '<div style="font-size:8px;width:100%;text-align:center;color:#666;font-family:Segoe UI,Arial">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  })
  console.log(`OK ${job.pdf} mermaidErrors=${errors}`)
}
await browser.close()
