const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage({viewport:{width:1280,height:900}});
 const errors=[]; p.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); p.on('pageerror',e=>errors.push(e.message));
 const r=await p.goto('https://fuan20070330-sudo.github.io/timebook/?v='+Date.now(),{waitUntil:'networkidle',timeout:60000});
 await p.waitForTimeout(800);
 const card=p.locator('.myth-card').first(); const before=await card.locator('.myth-answer').getAttribute('aria-hidden'); await card.click(); const after=await card.locator('.myth-answer').getAttribute('aria-hidden');
 console.log(JSON.stringify({http:r.status(),pentads:await p.locator('.pentad-card:visible').count(),myths:await p.locator('.myth-card').count(),before,after,scripts:await p.locator('script[src]').evaluateAll(n=>n.map(x=>x.getAttribute('src'))),errors},null,2));
 await b.close();
})();
