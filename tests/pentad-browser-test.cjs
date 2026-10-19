const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 await page.waitForTimeout(500);
 const initial={
   visible: await page.locator('.pentad-card:visible').count(),
   status: (await page.locator('#pentadStatus').textContent()).trim(),
   placeholder: await page.locator('#pentadSearch').getAttribute('placeholder'),
   loadVisible: await page.locator('#pentadLoadZone').isVisible()
 };
 await page.locator('#pentadLoadZone').scrollIntoViewIfNeeded();
 await page.waitForTimeout(700);
 const afterScroll={
   visible: await page.locator('.pentad-card:visible').count(),
   status: (await page.locator('#pentadStatus').textContent()).trim()
 };
 await page.click('#pentadLoadZone');
 await page.waitForTimeout(250);
 const afterClick=await page.locator('.pentad-card:visible').count();
 await page.fill('#pentadSearch','立春');
 await page.waitForTimeout(200);
 const searchTerm={
   visible: await page.locator('.pentad-card:visible').count(),
   terms: await page.locator('.pentad-card:visible').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.termName))]),
   status: (await page.locator('#pentadStatus').textContent()).trim(),
   loadVisible: await page.locator('#pentadLoadZone').isVisible()
 };
 await page.fill('#pentadSearch','解冻');
 await page.waitForTimeout(200);
 const searchNonTerm={
   visible: await page.locator('.pentad-card:visible').count(),
   empty: await page.locator('#pentadEmpty').isVisible(),
   emptyText: (await page.locator('#pentadEmpty').textContent()).trim()
 };
 await page.click('#clearPentadSearch');
 await page.waitForTimeout(150);
 const cleared=await page.locator('.pentad-card:visible').count();
 await page.click('.season-button[data-season="summer"]');
 await page.waitForTimeout(150);
 const summer={
   visible: await page.locator('.pentad-card:visible').count(),
   status: (await page.locator('#pentadStatus').textContent()).trim(),
   seasons: await page.locator('.pentad-card:visible').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.season))])
 };
 console.log(JSON.stringify({initial,afterScroll,afterClick,searchTerm,searchNonTerm,cleared,summer,errors},null,2));
 await browser.close();
})();
