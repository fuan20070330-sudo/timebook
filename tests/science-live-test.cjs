const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('https://fuan20070330-sudo.github.io/timebook/?v='+Date.now(),{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(900);
 const initial={http:response.status(),pentads:await page.locator('.pentad-card:visible').count(),myths:await page.locator('.myth-card').count(),source:await page.locator('#sourcePanel').count()};
 const myth=page.locator('.myth-card').first(); await myth.click(); await page.waitForTimeout(200);
 const mythOpen={expanded:await myth.getAttribute('aria-expanded'),visible:await myth.locator('.myth-answer').isVisible()};
 for(let i=0;i<8;i++){await page.locator('.quiz-option').first().click();await page.locator('#quizNextBtn').click();await page.waitForTimeout(50);}
 await page.waitForTimeout(250);
 const learning={score:(await page.locator('.quiz-score').textContent()).trim(),bars:await page.locator('#quizBody .mastery-row').count(),profile:await page.locator('#learningProfile').isVisible(),recommendation:(await page.locator('#learningRecommendation').textContent()).trim()};
 const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
 console.log(JSON.stringify({initial,mythOpen,learning,scripts,errors},null,2));
 await browser.close();
})();
