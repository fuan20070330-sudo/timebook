const { chromium } = require('playwright');
const path=require('path');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const p=await ctx.newPage();
 const errors=[]; p.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'});
 await p.waitForTimeout(400);
 const initial={pentads:await p.locator('.pentad-card:visible').count(),methods:await p.locator('.method-step').count(),sources:await p.locator('#termDetail .source-id').count(),ruler:(await p.locator('#solarRulerValue').textContent()).trim()};
 await p.selectOption('#journalWeather','多云'); await p.selectOption('#journalWind','微风'); await p.selectOption('#journalTemp','偏冷');
 await p.fill('#journalNote','傍晚云层渐散，梧桐叶开始变黄。'); await p.check('#journalPentads input');
 const downloadPromise=p.waitForEvent('download'); await p.click('#exportCardBtn'); const dl=await downloadPromise; await dl.saveAs(path.resolve('previews','export-card.png'));
 for(let i=0;i<8;i++){await p.locator('.quiz-option').first().click();await p.locator('#quizNextBtn').click();await p.waitForTimeout(50);}
 await p.waitForTimeout(200);
 const review={visible:await p.locator('#learningReviewBtn').isVisible(),text:(await p.locator('#learningReviewBtn').textContent()).trim()};
 await p.locator('#learningReviewBtn').click(); await p.waitForTimeout(800);
 const after={wheel:(await p.locator('#wheelTerm').textContent()).trim(),search:await p.locator('#pentadSearch').inputValue()};
 console.log(JSON.stringify({initial,review,after,errors},null,2));
 await b.close();

 const offline=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const op=await offline.newPage({viewport:{width:390,height:844}});
 await op.goto('file:///'+path.resolve('时间之书_离线版.html').replaceAll('\\','/'),{waitUntil:'load'}); await op.waitForTimeout(400);
 console.log(JSON.stringify({offline:{methods:await op.locator('.method-step').count(),sources:await op.locator('#termDetail .source-id').count(),overflow:(await op.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))}}));
 await offline.close();
})();
