const { chromium } = require('playwright');
const path=require('path');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage({viewport:{width:1280,height:900}});
 await p.goto('file:///'+path.resolve('时间之书_离线版.html').replaceAll('\\','/'),{waitUntil:'load'});
 await p.waitForTimeout(400);
 console.log(JSON.stringify({visible:await p.locator('.pentad-card:visible').count(),status:(await p.locator('#pentadStatus').textContent()).trim()}));
 await b.close();
})();
