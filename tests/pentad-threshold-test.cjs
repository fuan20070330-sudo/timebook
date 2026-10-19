const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 await page.waitForTimeout(400);
 const initial=await page.locator('.pentad-card:visible').count();
 await page.click('a[href="#pentads"]');
 await page.waitForTimeout(900);
 const afterNav=await page.locator('.pentad-card:visible').count();
 await page.locator('#pentadLoadZone').scrollIntoViewIfNeeded();
 await page.waitForTimeout(900);
 const afterScroll=await page.locator('.pentad-card:visible').count();
 console.log(JSON.stringify({initial,afterNav,afterScroll,errors},null,2));
 await browser.close();
})();
