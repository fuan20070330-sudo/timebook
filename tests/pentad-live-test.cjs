const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('https://fuan20070330-sudo.github.io/timebook/?v='+Date.now(),{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(700);
 const initial={http:response.status(),visible:await page.locator('.pentad-card:visible').count(),status:(await page.locator('#pentadStatus').textContent()).trim(),placeholder:await page.locator('#pentadSearch').getAttribute('placeholder')};
 await page.locator('#pentadLoadZone').scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
 const loaded=await page.locator('.pentad-card:visible').count();
 await page.fill('#pentadSearch','立春'); await page.waitForTimeout(250);
 const search={visible:await page.locator('.pentad-card:visible').count(),terms:await page.locator('.pentad-card:visible').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.termName))]),status:(await page.locator('#pentadStatus').textContent()).trim()};
 console.log(JSON.stringify({initial,loaded,search,errors},null,2));
 await browser.close();
})();
