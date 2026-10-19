const { chromium } = require('playwright');
const path = require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'});
 await page.waitForTimeout(300);
 await page.locator('.myth-card').first().click();
 await page.locator('#sourcePanel summary').click();
 await page.locator('#mythGrid').screenshot({path:path.resolve('previews','science-myths.png')});
 for(let i=0;i<8;i++){
   await page.locator('.quiz-option').first().click();
   await page.locator('#quizNextBtn').click();
   await page.waitForTimeout(60);
 }
 await page.waitForTimeout(250);
 await page.locator('#quizCard').screenshot({path:path.resolve('previews','learning-profile.png')});
 const beforeReload={profileVisible:await page.locator('#learningProfile').isVisible(),bars:await page.locator('#learningProfile .mastery-row').count()};
 await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(300);
 const afterReload={profileVisible:await page.locator('#learningProfile').isVisible(),bars:await page.locator('#learningProfile .mastery-row').count()};
 await page.setViewportSize({width:390,height:844});
 await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(300);
 const mobile=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,myths:document.querySelectorAll('.myth-card').length,profileVisible:!document.querySelector('#learningProfile').hidden}));
 console.log(JSON.stringify({beforeReload,afterReload,mobile,errors},null,2));
 await browser.close();
})();
