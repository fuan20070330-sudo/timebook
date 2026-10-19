const { chromium } = require('playwright');
const path=require('path');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage({viewport:{width:1440,height:1000}});
 await p.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 await p.locator('#pentads').scrollIntoViewIfNeeded();
 await p.waitForTimeout(500);
 await p.locator('#pentads').screenshot({path:path.resolve('previews','pentads-lazy.png')});
 console.log('visible',await p.locator('.pentad-card:visible').count());
 await b.close();
})();
