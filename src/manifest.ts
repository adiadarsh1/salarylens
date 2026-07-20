import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'SalaryLens – CTC to In-Hand Salary Calculator (India)',
  version: pkg.version,
  description:
    'In-hand salary calculator for any Indian CTC — right on LinkedIn & Naukri. Decode take-home pay: EPF, tax, stock & estimates.',
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'SalaryLens',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  permissions: ['storage'],
  host_permissions: ['https://api.gumroad.com/*'],
  content_scripts: [
    {
      matches: [
        'https://www.naukri.com/*',
        'https://www.linkedin.com/*',
      ],
      js: ['src/content/main.ts'],
      run_at: 'document_idle',
    },
  ],
});
