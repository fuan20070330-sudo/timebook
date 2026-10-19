const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const results = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:8766/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const audit = await page.evaluate(() => {
      const wheel = document.querySelector('.solar-wheel').getBoundingClientRect();
      const termRects = [...document.querySelectorAll('.wheel-term')].map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent, left: r.left - wheel.left, top: r.top - wheel.top, right: r.right - wheel.left, bottom: r.bottom - wheel.top };
      });
      const outsideWheel = termRects.filter(r => r.left < -1 || r.top < -1 || r.right > wheel.width + 1 || r.bottom > wheel.height + 1);
      const overlaps = [];
      for (let i = 0; i < termRects.length; i += 1) {
        for (let j = i + 1; j < termRects.length; j += 1) {
          const a = termRects[i], b = termRects[j];
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([a.text, b.text]);
        }
      }
      const clipped = [...document.querySelectorAll('h1,h2,h3,p,span,b,strong,dd,dt,a,button')]
        .filter(el => {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'absolute') return false;
          return el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && style.overflowX !== 'visible';
        })
        .slice(0, 20)
        .map(el => ({ tag: el.tagName, cls: el.className, text: (el.textContent || '').trim().slice(0, 50), client: el.clientWidth, scroll: el.scrollWidth }));
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyHeight: document.body.scrollHeight,
        wheel: { width: wheel.width, height: wheel.height },
        outsideWheel,
        overlaps,
        clipped,
        heroHeight: document.querySelector('.hero').getBoundingClientRect().height,
        termPanelHeight: document.querySelector('.term-panel').getBoundingClientRect().height
      };
    });
    results.push({ viewport, audit });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
