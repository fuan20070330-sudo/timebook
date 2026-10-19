const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage({viewport:{width:1280,height:900}});
 await p.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'});
 const card=p.locator('.myth-card').first();
 const before=await card.locator('.myth-answer').getAttribute('aria-hidden');
 await card.click();
 const after=await card.locator('.myth-answer').getAttribute('aria-hidden');
 console.log(JSON.stringify({before,after,myths:await p.locator('.myth-card').count(),scripts:await p.locator('script[src]').evaluateAll(n=>n.map(x=>x.getAttribute('src')))}));
 await b.close();
})();
