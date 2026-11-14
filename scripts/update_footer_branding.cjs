const fs = require('fs');
const path = require('path');

// 1. Update LandingPage.tsx
const lpPath = path.resolve('src/components/LandingPage.tsx');
let lp = fs.readFileSync(lpPath, 'utf8');
if (!lp.includes('GlobalFooter')) {
  lp = lp.replace(
    "import { BrandLogo } from './BrandLogo.tsx';",
    "import { BrandLogo } from './BrandLogo.tsx';\r\nimport { GlobalFooter } from './GlobalFooter.tsx';"
  );
  
  const footerPattern = /\{\/\* Footer \*\/\}[\s\S]*?<\/footer>/;
  const newFooter = `{/* Footer */}
      <GlobalFooter
        variant="landing"
        onOpenAbout={onOpenAbout}
        onOpenPricing={onOpenPricing}
        onOpenAdmin={onOpenAdmin}
        onOpenPrivacy={onOpenPrivacy}
        onOpenTerms={onOpenTerms}
      />`;
  lp = lp.replace(footerPattern, newFooter);
  fs.writeFileSync(lpPath, lp, 'utf8');
  console.log('Updated LandingPage.tsx');
} else {
  console.log('LandingPage.tsx already has GlobalFooter');
}

// 2. Update AboutPage.tsx
const apPath = path.resolve('src/components/AboutPage.tsx');
let ap = fs.readFileSync(apPath, 'utf8');
if (!ap.includes('GlobalFooter')) {
  ap = ap.replace(
    "import { BrandLogo } from './BrandLogo.tsx';",
    "import { BrandLogo } from './BrandLogo.tsx';\r\nimport { GlobalFooter } from './GlobalFooter.tsx';"
  );
  const apFooterPattern = /\{\/\* Footer \*\/\}[\s\S]*?<\/footer>/;
  const newApFooter = `{/* Footer */}
      <GlobalFooter
        variant="landing"
        onNavigateHome={onNavigateHome}
        onNavigatePricing={onExplorePro}
      />`;
  ap = ap.replace(apFooterPattern, newApFooter);
  fs.writeFileSync(apPath, ap, 'utf8');
  console.log('Updated AboutPage.tsx');
} else {
  console.log('AboutPage.tsx already has GlobalFooter');
}

// 3. Update PricingPage.tsx
const ppPath = path.resolve('src/components/PricingPage.tsx');
let pp = fs.readFileSync(ppPath, 'utf8');
if (!pp.includes('GlobalFooter')) {
  pp = pp.replace(
    "import { BrandLogo } from './BrandLogo.tsx';",
    "import { BrandLogo } from './BrandLogo.tsx';\r\nimport { GlobalFooter } from './GlobalFooter.tsx';"
  );
  const ppFooterPattern = /\{\/\* Footer \*\/\}[\s\S]*?<\/footer>/;
  const newPpFooter = `{/* Footer */}
      <GlobalFooter
        variant="landing"
        plan={isBlack ? 'black' : 'free'}
        onNavigateHome={onNavigateHome}
      />`;
  pp = pp.replace(ppFooterPattern, newPpFooter);
  fs.writeFileSync(ppPath, pp, 'utf8');
  console.log('Updated PricingPage.tsx');
} else {
  console.log('PricingPage.tsx already has GlobalFooter');
}

// 4. Update JobImportModal.tsx
const jmPath = path.resolve('src/components/JobImportModal.tsx');
let jm = fs.readFileSync(jmPath, 'utf8');
if (jm.includes('ApplyVise AI · Career Operating System')) {
  jm = jm.replace(
    'ApplyVise AI · Career Operating System',
    'ApplyVise AI · Your Career. Intelligently Orchestrated.'
  );
  fs.writeFileSync(jmPath, jm, 'utf8');
  console.log('Updated JobImportModal.tsx');
}

// 5. Update NotFoundPage.tsx
const nfPath = path.resolve('src/components/NotFoundPage.tsx');
let nf = fs.readFileSync(nfPath, 'utf8');
if (!nf.includes('GlobalFooter')) {
  nf = nf.replace(
    "import { BrandLogo } from './BrandLogo.tsx';",
    "import { BrandLogo } from './BrandLogo.tsx';\r\nimport { GlobalFooter } from './GlobalFooter.tsx';"
  );
  const nfFooterPattern = /\{\/\* Footer \*\/\}[\s\S]*?<\/footer>/;
  const newNfFooter = `{/* Footer */}
      <GlobalFooter variant="minimal" onNavigateHome={onNavigateHome} className="z-10" />`;
  nf = nf.replace(nfFooterPattern, newNfFooter);
  fs.writeFileSync(nfPath, nf, 'utf8');
  console.log('Updated NotFoundPage.tsx');
}
