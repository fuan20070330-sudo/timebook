const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage();
 await p.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'});
 console.log(JSON.stringify({title:await p.title(),brand:(await p.locator('.brand-copy strong').textContent()).trim(),h1:(await p.locator('h1').textContent()).replace(/\s+/g,' ').trim()}));
 await b.close();
})();
