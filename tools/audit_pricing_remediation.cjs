const playwright = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await playwright.chromium.launch();

  // 1. LIGHT MODE TEST
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.addInitScript(() => {
      localStorage.setItem('applyvise_be_appearance', 'light');
      localStorage.setItem('applyvise_black_appearance', 'light');
    });
    await page.goto('http://localhost:3000/pricing');
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const freeCard = document.querySelector('[data-testid="pricing-card-free"]');
      const proCard = document.querySelector('[data-testid="pricing-card-pro"]');
      const blackCard = document.querySelector('[data-testid="pricing-card-black"]');
      
      const currencyButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && (b.textContent.includes('INR (₹)') || b.textContent.includes('USD ($)')));

      const getStyle = (el) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderColor,
          classes: el.className
        };
      };

      const blackInner = blackCard ? blackCard.querySelector('.relative.rounded-\\[22px\\]') : null;
      const blackEntitlements = blackCard ? blackCard.querySelector('[class*="rounded-2xl p-4"]') : null;

      return {
        currencyButtonCount: currencyButtons.length,
        freeCard: getStyle(freeCard),
        proCard: getStyle(proCard),
        blackCard: getStyle(blackCard),
        blackInner: getStyle(blackInner),
        blackEntitlements: getStyle(blackEntitlements)
      };
    });

    console.log('LIGHT MODE AUDIT:');
    console.log(JSON.stringify(data, null, 2));

    await page.screenshot({ path: 'pricing_remediation_light.png', fullPage: true });
    await page.close();
  }

  // 2. DARK MODE TEST
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.addInitScript(() => {
      localStorage.setItem('applyvise_be_appearance', 'dark');
      localStorage.setItem('applyvise_black_appearance', 'dark');
    });
    await page.goto('http://localhost:3000/pricing');
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const freeCard = document.querySelector('[data-testid="pricing-card-free"]');
      const proCard = document.querySelector('[data-testid="pricing-card-pro"]');
      const blackCard = document.querySelector('[data-testid="pricing-card-black"]');
      
      const getStyle = (el) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderColor,
          classes: el.className
        };
      };

      const blackInner = blackCard ? blackCard.querySelector('.relative.rounded-\\[22px\\]') : null;

      return {
        freeCard: getStyle(freeCard),
        proCard: getStyle(proCard),
        blackCard: getStyle(blackCard),
        blackInner: getStyle(blackInner)
      };
    });

    console.log('DARK MODE AUDIT:');
    console.log(JSON.stringify(data, null, 2));

    await page.screenshot({ path: 'pricing_remediation_dark.png', fullPage: true });
    await page.close();
  }

  await browser.close();
})();
