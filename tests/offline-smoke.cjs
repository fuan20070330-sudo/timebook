const { chromium } = require('playwright');
const path = require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 const fileUrl='file:///' + path.resolve(__dirname,'..','时间之书_离线版.html').replaceAll('\\','/');
 await page.goto(fileUrl, {waitUntil:'load'});
 await page.waitForTimeout(400);
 const state=await page.evaluate(()=>({
  terms:document.querySelectorAll('.wheel-term').length,
  pentads:document.querySelectorAll('.pentad-card').length,
  current:document.querySelector('#liveTermName')?.textContent?.trim(),
  hasExternalLink:[...document.querySelectorAll('link[rel="stylesheet"],script[src]')].length,
  scrollWidth:document.documentElement.scrollWidth,
  clientWidth:document.documentElement.clientWidth
 }));
 console.log(JSON.stringify({state,errors},null,2));
 await browser.close();
})();
