const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage();
 await p.goto('https://fuan20070330-sudo.github.io/timebook/?v='+Date.now(),{waitUntil:'networkidle',timeout:60000});
 await p.waitForTimeout(500);
 console.log(JSON.stringify({title:await p.title(),brand:(await p.locator('.brand-copy strong').textContent()).trim(),myths:await p.locator('.myth-card').count(),pentads:await p.locator('.pentad-card:visible').count()}));
 await b.close();
})();
