/**
 * PageEditor — manages editor modes, preview interaction, context menu,
 * and inline text editing.
 *
 * Modes:
 *   'cursor'    — default
 *   'selection' — click selects nodes, shift-click additive, yellow outline
 *   'transform' — drag: move / resize (Ctrl) / rotate (Shift)
 *   'text'      — click element to edit its text content inline
 */
export class PageEditor {
  /**
   * @param {HTMLElement} previewEl
   * @param {Function}    onNavigate       — (nodeIds)
   * @param {Function}    onSaveStyles     — (nodeId, styles)
   * @param {Function}    onContextPreset  — (nodeId, presetName)
   * @param {Function}    onEditText       — (nodeId, text) — called when inline text editing finishes
   */
  constructor(previewEl, onNavigate, onSaveStyles, onContextPreset, onEditText) {
    this.previewEl = previewEl;
    this._onNavigate = onNavigate;
    this._onSaveStyles = onSaveStyles;
    this._onContextPreset = onContextPreset;
    this._onEditText = onEditText;
    this.mode = 'cursor';
    this._selectedIds = [];
    this._hoverLabel = null;
    this._styleEl = null;
    this._transform = null;
    this._ctxMenu = null;
    this._editingNodeId = null;
    this._editingEl = null;

    this._boundClick = (e) => this._onClick(e);
    this._boundOver = (e) => this._onOver(e);
    this._boundOut = () => this._onOut();
    this._boundDown = (e) => this._onDown(e);
    this._boundMove = (e) => this._onMove(e);
    this._boundUp = (e) => this._onUp(e);
    this._boundCtx = (e) => this._onContext(e);

    this._injectStyles();
    this._attach();
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this._finishEditing();
    this.mode = mode;
    this.clearSelection();
    this._endTransform();
    this._hideCtxMenu();
  }

  clearSelection() {
    this._selectedIds = [];
    this._applyHighlights();
  }

  // -------------------------------------------------------------------
  // Attach / detach
  // -------------------------------------------------------------------

  _attach() {
    const p = this.previewEl;
    p.addEventListener('click', this._boundClick);
    p.addEventListener('mouseover', this._boundOver);
    p.addEventListener('mouseout', this._boundOut);
    p.addEventListener('mousedown', this._boundDown);
    p.addEventListener('contextmenu', this._boundCtx);
    document.addEventListener('mousemove', this._boundMove);
    document.addEventListener('mouseup', this._boundUp);
  }

  _detach() {
    const p = this.previewEl;
    p.removeEventListener('click', this._boundClick);
    p.removeEventListener('mouseover', this._boundOver);
    p.removeEventListener('mouseout', this._boundOut);
    p.removeEventListener('mousedown', this._boundDown);
    p.removeEventListener('contextmenu', this._boundCtx);
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
      .pe-selected { outline:2px solid #eab308 !important; outline-offset:1px; }
      .pe-transform { outline:2px dashed #3b82f6 !important; cursor:move; }
      .pe-editing { outline:2px solid #22c55e !important; }
    `;
    document.head.appendChild(this._styleEl);
  }

  // -------------------------------------------------------------------
  // Clicks — dispatched by mode
  // -------------------------------------------------------------------

  _onClick(e) {
    if (this.mode === 'selection') this._onClickSelection(e);
    else if (this.mode === 'text') this._onClickText(e);
  }

  // -------------------------------------------------------------------
  // Selection mode
  // -------------------------------------------------------------------

  _onClickSelection(e) {
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
  // Text mode — inline content editing
  // -------------------------------------------------------------------

  _onClickText(e) {
    const target = e.target.closest('[data-node-id]');
    if (!target) return;

    // If already editing, finish and return
    if (this._editingEl) {
      this._finishEditing();
      // If clicking the same element again, don't restart
      if (this._editingEl === target) return;
    }

    const nodeId = target.dataset.nodeId;
    this._startEditing(nodeId, target);
  }

  _startEditing(nodeId, el) {
    this._finishEditing();
    this._editingNodeId = nodeId;
    this._editingEl = el;
    el.classList.add('pe-editing');
    el.contentEditable = 'plaintext-only';

    // Focus and select all text
    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) { /* ignore */ }

    // Save on blur or Enter
    el.addEventListener('blur', this._boundFinish = () => this._finishEditing(), { once: true });
    el.addEventListener('keydown', this._boundKeydown = (e) => {
      if (e.key === 'Escape') {
        el.blur();
      }
    });
  }

  _finishEditing() {
    if (!this._editingEl) return;
    const el = this._editingEl;
    const nodeId = this._editingNodeId;

    el.classList.remove('pe-editing');
    el.contentEditable = 'false';
    el.removeEventListener('blur', this._boundFinish);
    el.removeEventListener('keydown', this._boundKeydown);

    const text = el.textContent.trim();
    if (text && nodeId) {
      this._onEditText(nodeId, text);
    }

    this._editingEl = null;
    this._editingNodeId = null;
  }

  // -------------------------------------------------------------------
  // Context menu
  // -------------------------------------------------------------------

  showCtxMenu(nodeId, presetsArr, x, y) {
    this._hideCtxMenu();
    this._ctxNodeId = nodeId;
    const menu = document.createElement('div');
    menu.style.cssText =
      'position:fixed; left:' + x + 'px; top:' + y + 'px; ' +
      'background:#fff; color:#000; border:1px solid #999; ' +
      'border-radius:4px; box-shadow:2px 2px 8px rgba(0,0,0,0.2); ' +
      'max-height:200px; overflow-y:auto; z-index:10001;';
    const list = document.createElement('div');
    list.style.cssText = 'display:flex; flex-direction:column;';
    presetsArr.forEach((p) => {
      const btn = document.createElement('button');
      btn.textContent = p.name;
      btn.style.cssText =
        'padding:6px 16px; text-align:left; border:none; background:none; ' +
        'cursor:pointer; font:inherit;';
      btn.addEventListener('mouseenter', () => { btn.style.background = '#eee'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
      btn.addEventListener('click', () => {
        this._hideCtxMenu();
        if (this._ctxNodeId) this._onContextPreset(this._ctxNodeId, p.name);
      });
      list.appendChild(btn);
    });
    menu.appendChild(list);
    document.body.appendChild(menu);
    this._ctxMenu = menu;
    setTimeout(() => {
      document.addEventListener('click', this._boundCloseCtx = () => {
        this._hideCtxMenu();
      }, { once: true });
    }, 0);
  }

  _onContext(e) {
    const target = e.target.closest('[data-node-id]');
    if (!target) return;
    e.preventDefault();
    this._ctxPendingNodeId = target.dataset.nodeId;
    this._ctxPendingX = e.clientX;
    this._ctxPendingY = e.clientY;
    this.previewEl.dispatchEvent(new CustomEvent('editor-context', {
      detail: {
        nodeId: this._ctxPendingNodeId,
        x: this._ctxPendingX,
        y: this._ctxPendingY,
      },
      bubbles: true,
    }));
  }

  _hideCtxMenu() {
    if (this._ctxMenu) { this._ctxMenu.remove(); this._ctxMenu = null; }
    this._ctxNodeId = null;
  }

  // -------------------------------------------------------------------
  // Transform mode
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
      nodeId, el: target, type,
      startX: e.clientX, startY: e.clientY, startRect: rect,
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
      const pos = el.style.position || getComputedStyle(el).position;
      if (pos === 'absolute' || pos === 'fixed') {
        const prect = this.previewEl.getBoundingClientRect();
        el.style.left = `${(s.startRect.left - prect.left) + dx}px`;
        el.style.top = `${(s.startRect.top - prect.top) + dy}px`;
      } else {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    } else if (s.type === 'resize') {
      el.style.width = `${Math.max(20, s.startRect.width + dx)}px`;
      el.style.height = `${Math.max(20, s.startRect.height + dy)}px`;
    } else if (s.type === 'rotate') {
      el.style.transform = `rotate(${dx * 0.5}deg)`;
    }
  }

  _onUp() {
    const s = this._transform;
    if (!s) return;
    s.el.classList.remove('pe-transform');
    const changed = {};
    const style = s.el.style;
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
