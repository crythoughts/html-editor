/**
 * Dialog — a simple modal overlay for showing arbitrary UI content.
 */
export class Dialog {
  constructor() {
    this._overlay = document.createElement('div');
    this._overlay.style.cssText =
      'position:fixed; inset:0; background:rgba(0,0,0,0.4); ' +
      'display:flex; align-items:center; justify-content:center; ' +
      'z-index:10000; visibility:hidden;';

    this._box = document.createElement('div');
    this._box.style.cssText =
      'background:#fff; color:#000; border-radius:8px; ' +
      'padding:24px; min-width:360px; max-width:600px; ' +
      'max-height:80vh; overflow-y:auto; box-shadow:0 8px 30px rgba(0,0,0,0.3);';

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.hide();
    });

    this._overlay.appendChild(this._box);
    document.body.appendChild(this._overlay);
  }

  /** Replace the box content with a DOM element (or string). */
  show(content) {
    this._box.innerHTML = '';
    if (typeof content === 'string') {
      this._box.textContent = content;
    } else {
      this._box.appendChild(content);
    }
    this._overlay.style.visibility = 'visible';
  }

  hide() {
    this._overlay.style.visibility = 'hidden';
  }
}
