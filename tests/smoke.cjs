const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:8766/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const initial = await page.evaluate(() => ({
    wheelTerms: document.querySelectorAll('.wheel-term').length,
    orbitNodes: document.querySelectorAll('.orbit-node').length,
    pentads: document.querySelectorAll('.pentad-card').length,
    quizOptions: document.querySelectorAll('.quiz-option').length,
    liveTerm: document.querySelector('#liveTermName')?.textContent?.trim(),
    liveLongitude: document.querySelector('#liveLongitude')?.textContent?.trim(),
    selectedTerm: document.querySelector('.term-title-row h3')?.textContent?.trim()
  }));

  await page.locator('.wheel-term', { hasText: '夏至' }).click();
  await page.waitForTimeout(250);
  const selected = await page.evaluate(() => ({
    title: document.querySelector('.term-title-row h3')?.textContent?.trim(),
    wheel: document.querySelector('#wheelTerm')?.textContent?.trim(),
    journal: document.querySelector('#journalTerm')?.value,
    theme: getComputedStyle(document.documentElement).getPropertyValue('--accent-deep').trim()
  }));

  await page.locator('.season-button[data-season="spring"]').click();
  const visibleSpring = await page.locator('.pentad-card:visible').count();

  const firstQuiz = page.locator('.quiz-option').first();
  await firstQuiz.click();
  const feedback = (await page.locator('#quizFeedback').textContent()).trim();

  await page.selectOption('#journalTerm', 'dongzhi');
  await page.fill('#journalNote', '今天傍晚风很轻，银杏叶已经落了大半。');
  await page.check('#journalPentads input');
  await page.click('#journalForm button[type="submit"]');
  await page.waitForTimeout(200);
  const journalCount = await page.locator('.journal-entry').count();

  const downloadPromise = page.waitForEvent('download');
  await page.click('#exportCardBtn');
  const download = await downloadPromise;
  const downloadName = download.suggestedFilename();
  await download.saveAs(path.join(__dirname, 'artifacts', downloadName));

  await page.screenshot({ path: path.join(__dirname, 'artifacts', 'desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const mobile = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    wheelTerms: document.querySelectorAll('.wheel-term').length,
    pentads: document.querySelectorAll('.pentad-card').length
  }));
  await page.screenshot({ path: path.join(__dirname, 'artifacts', 'mobile.png'), fullPage: true });

  console.log(JSON.stringify({ initial, selected, visibleSpring, feedback, journalCount, downloadName, mobile, errors }, null, 2));
  await browser.close();
})();
