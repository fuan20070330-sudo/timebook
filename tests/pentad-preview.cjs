const { chromium } = require('playwright');
const path = require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 await page.locator('#pentads').scrollIntoViewIfNeeded();
 await page.waitForTimeout(300);
 await page.locator('#pentads').screenshot({path:path.resolve(__dirname,'..','previews','pentads-lazy.png')});
 await page.fill('#pentadSearch','立春');
 await page.waitForTimeout(250);
 await page.locator('#pentads').screenshot({path:path.resolve(__dirname,'..','previews','pentads-search.png')});
 await browser.close();
})();
