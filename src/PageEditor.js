/**
 * PageEditor — manages editor modes and preview interaction.
 *
 * Modes:
 *   'cursor'    — default, no special behaviour
 *   'selection' — click selects nodes, shift-click additive, yellow outline,
 *                 hover shows tag label above element
 *   'transform' — mousedown on element starts drag interaction:
 *       default       → move (absolute/fixed: free; other: translate)
 *       Ctrl          → resize (changes width/height)
 *       Shift         → rotate
 *       On mouseup    → persists style changes to the data model via callback
 */
export class PageEditor {
  /**
   * @param {HTMLElement} previewEl       — the #preview container
   * @param {Function}    onNavigate       — (hash) open node settings
   * @param {Function}    onSaveStyles     — (nodeId, styles) persist after transform
   */
  constructor(previewEl, onNavigate, onSaveStyles) {
    this.previewEl = previewEl;
    this._onNavigate = onNavigate;
    this._onSaveStyles = onSaveStyles;
    this.mode = 'cursor';
    this._selectedIds = [];
    this._hoverLabel = null;
    this._styleEl = null;
    this._transform = null; // drag state

    this._boundClick = (e) => this._onClick(e);
    this._boundOver = (e) => this._onOver(e);
    this._boundOut = () => this._onOut();
    this._boundDown = (e) => this._onDown(e);
    this._boundMove = (e) => this._onMove(e);
    this._boundUp = (e) => this._onUp(e);

    this._injectStyles();
    this._attach();
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.clearSelection();
    this._endTransform();
  }

  clearSelection() {
    this._selectedIds = [];
    this._applyHighlights();
  }

  // -------------------------------------------------------------------
  // Attach / detach
  // -------------------------------------------------------------------

  _attach() {
    this.previewEl.addEventListener('click', this._boundClick);
    this.previewEl.addEventListener('mouseover', this._boundOver);
    this.previewEl.addEventListener('mouseout', this._boundOut);
    this.previewEl.addEventListener('mousedown', this._boundDown);
    document.addEventListener('mousemove', this._boundMove);
    document.addEventListener('mouseup', this._boundUp);
  }

  _detach() {
    this.previewEl.removeEventListener('click', this._boundClick);
    this.previewEl.removeEventListener('mouseover', this._boundOver);
    this.previewEl.removeEventListener('mouseout', this._boundOut);
    this.previewEl.removeEventListener('mousedown', this._boundDown);
    document.removeEventListener('mousemove', this._boundMove);
    document.removeEventListener('mouseup', this._boundUp);
    this._hideLabel();
  }

  // -------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------

  _injectStyles() {
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = `
      .pe-selected { outline: 2px solid #eab308 !important; outline-offset: 1px; }
      .pe-transform { outline: 2px dashed #3b82f6 !important; cursor: move; }
    `;
    document.head.appendChild(this._styleEl);
  }

  // -------------------------------------------------------------------
  // Selection mode
  // -------------------------------------------------------------------

  _onClick(e) {
    if (this.mode !== 'selection') return;
    const target = e.target.closest('[data-node-id]');
    if (!target) return;

    const nodeId = target.dataset.nodeId;
    if (e.shiftKey) {
      const idx = this._selectedIds.indexOf(nodeId);
      if (idx >= 0) this._selectedIds.splice(idx, 1);
      else this._selectedIds.push(nodeId);
    } else {
      this._selectedIds = [nodeId];
    }

    this._applyHighlights();
    this._openSettings();
  }

  _onOver(e) {
    if (this.mode !== 'selection') return;
    const target = e.target.closest('[data-node-id]');
    if (!target) return;
    this._showLabel(target, target.tagName.toLowerCase());
  }

  _onOut() {
    if (this.mode !== 'selection') return;
    this._hideLabel();
  }

  _showLabel(el, tagName) {
    if (!this._hoverLabel) {
      this._hoverLabel = document.createElement('div');
      this._hoverLabel.style.cssText =
        'position:fixed; pointer-events:none; font:12px monospace; ' +
        'background:#333; color:#fff; padding:1px 6px; border-radius:3px; ' +
        'z-index:9999; display:none;';
      document.body.appendChild(this._hoverLabel);
    }
    const rect = el.getBoundingClientRect();
    this._hoverLabel.textContent = `<${tagName}>`;
    this._hoverLabel.style.display = 'block';
    this._hoverLabel.style.left = `${rect.left}px`;
    this._hoverLabel.style.top = `${rect.top - 20}px`;
  }

  _hideLabel() {
    if (this._hoverLabel) this._hoverLabel.style.display = 'none';
  }

  _applyHighlights() {
    this.previewEl.querySelectorAll('.pe-selected').forEach((el) => {
      el.classList.remove('pe-selected');
    });
    for (const id of this._selectedIds) {
      const el = this.previewEl.querySelector(`[data-node-id="${id}"]`);
      if (el) el.classList.add('pe-selected');
    }
  }

  _openSettings() {
    if (this._selectedIds.length === 0) return;
    this._onNavigate(this._selectedIds.join(','));
  }

  // -------------------------------------------------------------------
  // Transform mode (move / resize / rotate)
  // -------------------------------------------------------------------

  _onDown(e) {
    if (this.mode !== 'transform') return;
    const target = e.target.closest('[data-node-id]');
    if (!target) return;

    const nodeId = target.dataset.nodeId;
    let type = 'move';
    if (e.ctrlKey || e.metaKey) type = 'resize';
    if (e.shiftKey) type = 'rotate';

    const rect = target.getBoundingClientRect();
    this._transform = {
      nodeId,
      el: target,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startRect: rect,
      // Snapshot of inline styles
      startStyles: {
        left: target.style.left || '',
        top: target.style.top || '',
        width: target.style.width || '',
        height: target.style.height || '',
        transform: target.style.transform || '',
      },
    };
    target.classList.add('pe-transform');
    e.preventDefault();
  }

  _onMove(e) {
    const s = this._transform;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const el = s.el;

    if (s.type === 'move') {
      const pos = (el.style.position || getComputedStyle(el).position);
      if (pos === 'absolute' || pos === 'fixed') {
        // Position relative to preview container
        const previewRect = this.previewEl.getBoundingClientRect();
        el.style.left = `${(s.startRect.left - previewRect.left) + dx}px`;
        el.style.top = `${(s.startRect.top - previewRect.top) + dy}px`;
      } else {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    } else if (s.type === 'resize') {
      el.style.width = `${Math.max(20, s.startRect.width + dx)}px`;
      el.style.height = `${Math.max(20, s.startRect.height + dy)}px`;
    } else if (s.type === 'rotate') {
      const angle = (dx * 0.5); // 0.5 deg per pixel
      el.style.transform = `rotate(${angle}deg)`;
    }
  }

  _onUp() {
    const s = this._transform;
    if (!s) return;

    s.el.classList.remove('pe-transform');

    // Collect updated styles
    const changed = {};
    const style = s.el.style;

    // Determine which properties changed based on transform type
    const pos = s.el.style.position || getComputedStyle(s.el).position;
    if (s.type === 'move') {
      if (pos === 'absolute' || pos === 'fixed') {
        if (style.left) changed.left = style.left;
        if (style.top) changed.top = style.top;
      } else {
        if (style.transform && style.transform !== s.startStyles.transform) {
          changed.transform = style.transform;
        }
      }
    } else if (s.type === 'resize') {
      if (style.width) changed.width = style.width;
      if (style.height) changed.height = style.height;
    } else if (s.type === 'rotate') {
      if (style.transform && style.transform !== s.startStyles.transform) {
        changed.transform = style.transform;
      }
    }

    if (Object.keys(changed).length > 0) {
      this._onSaveStyles(s.nodeId, changed);
    }

    this._transform = null;
  }

  _endTransform() {
    if (this._transform) {
      this._transform.el.classList.remove('pe-transform');
      this._transform = null;
    }
  }
}
