const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:8000', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('OPENAI_KEY', 'sk-fake');
    localStorage.setItem('EL_KEY', '');
    localStorage.setItem('AUDIO_MODE', 'false');
  });

  await page.reload();

  try {
      await page.waitForSelector('#view-onboarding', {visible: true});
      await page.click('#btn-start');
      
      await page.waitForSelector('#view-workshop', {visible: true});
      await page.evaluate(() => {
          document.querySelector('button[data-age="4-5"]').click();
          document.querySelector('button[data-theme="animals"]').click();
          document.querySelector('.len-card[data-len="5"]').click();
      });

      await page.click('#btn-create');

      await page.waitForFunction(() => {
          const isError = !document.getElementById('view-error').classList.contains('hidden');
          const isStory = !document.getElementById('view-story').classList.contains('hidden');
          return isError || isStory;
      }, { timeout: 15000 });

      const hasError = await page.evaluate(() => !document.getElementById('view-error').classList.contains('hidden'));
      const errorTitle = await page.evaluate(() => document.getElementById('error-title').innerText);
      const errorDesc = await page.evaluate(() => document.getElementById('error-desc').innerText);

      console.log('Result. Has Error:', hasError, 'Title:', errorTitle, 'Desc:', errorDesc);
  } catch(e) {
      console.error(e);
  }

  await browser.close();
})();
