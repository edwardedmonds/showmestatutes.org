// Progressive enhancement: reading and permanent links also work without JavaScript.
const status = document.querySelector('#copy-status');
let clearStatus;
for (const button of document.querySelectorAll('[data-copy-fragment], [data-copy-citation]')) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const url = new URL(location.href);
    url.search = '';
    url.hash = button.dataset.copyFragment ? encodeURIComponent(button.dataset.copyFragment) : '';
    const value = button.dataset.copyCitation || url.href;
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = button.dataset.copyCitation ? 'Citation with source version copied.' : 'Subsection link copied.';
    } catch {
      status.textContent = 'Copy is unavailable. Select the section details or open a subsection link and copy the address from your browser.';
    }
    clearTimeout(clearStatus);
    clearStatus = setTimeout(() => { status.textContent = ''; }, 7000);
  });
}
function decodeHash(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
function updateGuide() {
  const currentHash = decodeHash(location.hash);
  for (const link of document.querySelectorAll('.reading-links a')) {
    if (decodeHash(link.hash) === currentHash) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', updateGuide);
updateGuide();
