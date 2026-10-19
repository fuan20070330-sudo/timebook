const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'});
 await page.waitForTimeout(500);
 const visual={
  methodSteps:await page.locator('.method-step').count(),
  rulerValue:(await page.locator('#solarRulerValue').textContent()).trim(),
  rulerLeft:await page.locator('#solarRulerMarker').evaluate(el=>el.style.left),
  sourceBadges:await page.locator('#termDetail .source-id').count()
 };
 await page.locator('[data-open-sources]').first().click();
 await page.waitForTimeout(200);
 const sourceOpen=await page.locator('#sourcePanel').getAttribute('open');
 await page.selectOption('#journalWeather','晴');
 await page.selectOption('#journalWind','微风');
 await page.selectOption('#journalTemp','舒适');
 await page.fill('#journalNote','傍晚天空通透，银杏叶开始变黄。');
 await page.check('#journalPentads input');
 await page.click('#journalForm button[type="submit"]');
 await page.waitForTimeout(200);
 const entryChips=await page.locator('.entry-conditions span').allTextContents();
 for(let i=0;i<8;i++){await page.locator('.quiz-option').first().click();await page.locator('#quizNextBtn').click();await page.waitForTimeout(60);}
 await page.waitForTimeout(250);
 const reviewBtn=page.locator('#learningReviewBtn');
 const review={visible:await reviewBtn.isVisible(),text:(await reviewBtn.textContent()).trim(),term:await reviewBtn.getAttribute('data-term-id'),target:await reviewBtn.getAttribute('data-review-target')};
 if(review.visible){await reviewBtn.click(); await page.waitForTimeout(900);}
 const afterReview={wheelTerm:(await page.locator('#wheelTerm').textContent()).trim(),pentadSearch:await page.locator('#pentadSearch').inputValue()};
 console.log(JSON.stringify({visual,sourceOpen,entryChips,review,afterReview,errors},null,2));
 await browser.close();
})();
