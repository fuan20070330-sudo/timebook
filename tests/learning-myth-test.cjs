const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('console',m=>{if(m.type()==='error') errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
 await page.waitForTimeout(400);
 const initial={
  myths:await page.locator('.myth-card').count(),
  mythOpen:await page.locator('.myth-card.is-open').count(),
  profileHidden:await page.locator('#learningProfile').getAttribute('hidden'),
  sourcePanel:await page.locator('#sourcePanel').count(),
  scienceNote:await page.locator('.pentad-science-note').isVisible()
 };
 const firstMyth=page.locator('.myth-card').first();
 await firstMyth.click();
 await page.waitForTimeout(250);
 const mythOpen={open:await page.locator('.myth-card.is-open').count(),expanded:await firstMyth.getAttribute('aria-expanded'),answerVisible:await firstMyth.locator('.myth-answer').isVisible()};
 for(let i=0;i<8;i++){
   await page.locator('.quiz-option').first().click();
   await page.locator('#quizNextBtn').click();
   await page.waitForTimeout(80);
 }
 await page.waitForTimeout(300);
 const result={
  score:await page.locator('.quiz-score').textContent(),
  bars:await page.locator('#quizBody .mastery-row').count(),
  profileVisible:await page.locator('#learningProfile').isVisible(),
  profileBars:await page.locator('#learningProfile .mastery-row').count(),
  recommendation:(await page.locator('#learningRecommendation').textContent()).trim(),
  storage:await page.evaluate(()=>localStorage.getItem('timebook.learning.v1'))
 };
 console.log(JSON.stringify({initial,mythOpen,result,errors},null,2));
 await browser.close();
})();
