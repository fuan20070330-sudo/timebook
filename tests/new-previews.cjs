const { chromium } = require('playwright');
const path=require('path');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage({viewport:{width:1440,height:1000}});
 await p.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'});
 await p.waitForTimeout(400);
 await p.locator('.method-strip').screenshot({path:path.resolve('previews','method-strip.png')});
 await p.locator('.term-panel').screenshot({path:path.resolve('previews','source-annotations.png')});
 await p.locator('.journal-form').screenshot({path:path.resolve('previews','journal-structured.png')});
 await b.close();
})();
