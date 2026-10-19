const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const results=[];
 for(const viewport of [{width:1440,height:1000},{width:768,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});
  await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
  await page.waitForTimeout(300);
  const audit=await page.evaluate(()=>{
   const search=document.querySelector('.pentad-search').getBoundingClientRect();
   const meta=document.querySelector('.pentad-meta').getBoundingClientRect();
   return {
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    visibleCards:document.querySelectorAll('.pentad-card:not([hidden])').length,
    search:{left:search.left,right:search.right,width:search.width},
    meta:{left:meta.left,right:meta.right,width:meta.width},
    sectionWidth:document.querySelector('#pentads').getBoundingClientRect().width
   };
  });
  results.push({viewport,audit});
  await page.close();
 }
 console.log(JSON.stringify(results,null,2));
 await browser.close();
})();
