const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('https://fuan20070330-sudo.github.io/timebook/?cache='+Date.now(),{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(800);
 const initial=await page.locator('.pentad-card:visible').count();
 await page.click('a[href="#pentads"]'); await page.waitForTimeout(700);
 const afterNav=await page.locator('.pentad-card:visible').count();
 await page.mouse.move(700,700); await page.mouse.wheel(0,420); await page.waitForTimeout(700);
 const afterWheel=await page.locator('.pentad-card:visible').count();
 await page.fill('#pentadSearch','立春'); await page.waitForTimeout(250);
 const search={visible:await page.locator('.pentad-card:visible').count(),term:await page.locator('.pentad-card:visible').first().getAttribute('data-term-name')};
 const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
 console.log(JSON.stringify({http:response.status(),initial,afterNav,afterWheel,search,scripts,errors},null,2));
 await browser.close();
})();
