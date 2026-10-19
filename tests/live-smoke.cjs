const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('https://fuan20070330-sudo.github.io/timebook/',{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(1200);
 const state=await page.evaluate(async()=>({
   status: document.readyState,
   terms: document.querySelectorAll('.wheel-term').length,
   pentads: document.querySelectorAll('.pentad-card').length,
   current: document.querySelector('#liveTermName')?.textContent?.trim(),
   longitude: document.querySelector('#liveLongitude')?.textContent?.trim(),
   next: document.querySelector('#scienceNextTerm')?.textContent?.trim(),
   scrollWidth: document.documentElement.scrollWidth,
   clientWidth: document.documentElement.clientWidth,
   serviceWorker: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistration())?.scope || null : null
 }));
 await page.locator('.wheel-term',{hasText:'立春'}).click();
 await page.waitForTimeout(200);
 const selected=await page.locator('.term-title-row h3').textContent();
 console.log(JSON.stringify({httpStatus:response.status(),state,selected,errors},null,2));
 await browser.close();
})();
