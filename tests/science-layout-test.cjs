const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const results=[];
 for(const viewport of [{width:1440,height:1000},{width:900,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});
  await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
  await page.waitForTimeout(300);
  await page.locator('#sourcePanel summary').click();
  await page.waitForTimeout(150);
  const audit=await page.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   clientWidth:document.documentElement.clientWidth,
   mythColumns:getComputedStyle(document.querySelector('.myth-grid')).gridTemplateColumns,
   sourceColumns:getComputedStyle(document.querySelector('.source-content')).gridTemplateColumns,
   sourceOpen:document.querySelector('#sourcePanel').open,
   sourceHeight:document.querySelector('.source-content').getBoundingClientRect().height,
   mythCount:document.querySelectorAll('.myth-card').length,
   quizCardHeight:document.querySelector('.quiz-card').getBoundingClientRect().height
  }));
  results.push({viewport,audit});
  await page.close();
 }
 console.log(JSON.stringify(results,null,2));
 await browser.close();
})();
