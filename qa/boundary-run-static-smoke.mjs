import fs from 'node:fs';

const html = fs.readFileSync('dist/index.html', 'utf8');
const js = fs.readFileSync('dist/main.js', 'utf8');
const css = fs.readFileSync('dist/styles.css', 'utf8');
const current = '8.8.3';
const checks = [
  ['html-title', html.includes('Boundary Run: The Little Signal')],
  ['version', html.includes(`v${current}`) && js.includes(`const VERSION = "${current}"`)],
  ['ari', html.includes('Ari') && js.includes('drawAri')],
  ['kibo', html.includes('Kibo') && js.includes('drawKibo')],
  ['context-space-action', js.includes('recommendedAction()')],
  ['seal-tutorial', js.includes('Seal Vault')],
  ['proof', html.includes('Replay Proof') && js.includes('state_hash')],
  ['no-service-worker', !/serviceWorker\.register/.test(html + js)],
  ['no-telemetry', !/gtag|google-analytics|analytics/i.test(html + js)],
  ['touch-action-none', css.includes('touch-action: none')],
  ['consent-token-ui', html.includes('ui-consent-tokens') && js.includes('ui-consent-tokens')],
  ['not-medical-device', html.includes('Not a medical device')],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('FAIL:', failed.join(', '));
  process.exit(1);
}
console.log('OK: Boundary Run static smoke passed');
