import './shell.css';
const desktop = matchMedia('(min-width: 768px)');
let loaded = false;
async function boot() {
  if (!desktop.matches || loaded) return;
  loaded = true;
  try { await import('./text-ui/main'); }
  catch { loaded = false; document.querySelector('#app')!.textContent = 'The editor could not load. Please refresh to try again.'; }
}
desktop.addEventListener('change', boot);
void boot();
