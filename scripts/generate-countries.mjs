// scripts/generate-countries.mjs

import { writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const countries = require('i18n-iso-countries');
const enLocale = require('i18n-iso-countries/langs/en.json');

countries.registerLocale(enLocale);
const codeToName = countries.getNames('en', { select: 'official' });

const options = Object.entries(codeToName)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync('src/lib/countries-data.json', JSON.stringify(options, null, 2));

console.log(`Generated ${options.length} countries`);
