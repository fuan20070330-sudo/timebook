const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const out=[];
 for(const viewport of [{width:1440,height:1000},{width:768,height:900},{width:390,height:844}]){
  const p=await b.newPage({viewport});
  await p.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(300);
  await p.locator('#sourcePanel summary').click();
  const audit=await p.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   clientWidth:document.documentElement.clientWidth,
   methodColumns:getComputedStyle(document.querySelector('.method-strip')).gridTemplateColumns,
   journalColumns:getComputedStyle(document.querySelector('.journal-conditions')).gridTemplateColumns,
   rulerWidth:document.querySelector('.solar-ruler').getBoundingClientRect().width,
   sourceHeight:document.querySelector('.source-content').getBoundingClientRect().height,
   visiblePentads:document.querySelectorAll('.pentad-card:not([hidden])').length
  }));
  out.push({viewport,audit});
  await p.close();
 }
 console.log(JSON.stringify(out,null,2));
 await b.close();
})();
