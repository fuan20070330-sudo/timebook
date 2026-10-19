const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const p=await b.newPage({viewport:{width:1440,height:1000}});
 await p.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 const r=await p.evaluate(()=>{
  const wheel=document.querySelector('.solar-wheel').getBoundingClientRect();
  return [...document.querySelectorAll('.wheel-term')].map(el=>{const x=el.getBoundingClientRect();const s=getComputedStyle(el);return {t:el.textContent,w:x.width,h:x.height,l:x.left-wheel.left,tp:x.top-wheel.top,m:s.margin,tr:s.transform,font:s.fontSize,padding:s.padding};});
 });
 console.log(JSON.stringify(r.slice(0,8),null,2));
 await b.close();
})();
