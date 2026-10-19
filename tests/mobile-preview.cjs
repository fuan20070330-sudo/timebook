const { chromium } = require('playwright');
const path = require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 await page.waitForTimeout(400);
 await page.screenshot({path:path.resolve(__dirname,'..','previews','home-mobile.png')});
 await browser.close();
})();
