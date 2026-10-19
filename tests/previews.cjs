const { chromium } = require('playwright');
const path = require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 await page.waitForTimeout(500);
 await page.screenshot({path:path.join(__dirname,'artifacts','preview-hero.png')});
 await page.locator('#wheel').screenshot({path:path.join(__dirname,'artifacts','preview-wheel.png')});
 await page.locator('#learning').screenshot({path:path.join(__dirname,'artifacts','preview-learning.png')});
 await browser.close();
})();
