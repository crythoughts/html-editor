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
   * @param {Function}    onPenFinish      — (points) — called when a pen drawing is completed
   */
  constructor(previewEl, onNavigate, onSaveStyles, onContextPreset, onEditText, onPenFinish) {
    this.previewEl = previewEl;
    this._onNavigate = onNavigate;
    this._onSaveStyles = onSaveStyles;
    this._onContextPreset = onContextPreset;
    this._onEditText = onEditText;
    this._onPenFinish = onPenFinish;
    this.mode = 'cursor';
    this._selectedIds = [];
    this._hoverLabel = null;
    this._styleEl = null;
    this._transform = null;
    this._ctxMenu = null;
    this._editingNodeId = null;
    this._editingEl = null;
    this._penPoints = []; // {x, y}
    this._penOverlay = null;

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
    this._cancelPen();
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
    else if (this.mode === 'color') this._onClickColor(e);
    else if (this.mode === 'pen') this._onClickPen(e);
    else if (this.mode === 'layout') this._onClickLayoutAttr(e, 'layout');
    else if (this.mode === 'attr') this._onClickLayoutAttr(e, 'attr');
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
  // Color mode — floating panel for stroke / fill
  // -------------------------------------------------------------------

  _onClickColor(e) {
    const target = e.target.closest('[data-node-id]');
    if (!target) return;
    const nodeId = target.dataset.nodeId;
    this._showColorPanel(nodeId, target);
  }

  _showColorPanel(nodeId, el) {
    this._hideCtxMenu();

    const panel = document.createElement('div');
    panel.style.cssText =
      'position:fixed; background:#fff; color:#000; border:1px solid #999; ' +
      'border-radius:6px; padding:12px; box-shadow:2px 2px 12px rgba(0,0,0,0.25); ' +
      'z-index:10001; display:flex; flex-direction:column; gap:8px; min-width:200px;';

    // Position near the element
    const rect = el.getBoundingClientRect();
    panel.style.left = `${rect.right + 8}px`;
    panel.style.top = `${rect.top}px`;
    // Keep on screen
    if (rect.right + 220 > window.innerWidth) {
      panel.style.left = `${rect.left - 220}px`;
    }

    const curStyles = getComputedStyle(el);

    // Border width
    const bwRow = document.createElement('label');
    bwRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    bwRow.innerHTML = '<span>Border width</span>';
    const bwInp = document.createElement('input');
    bwInp.type = 'text';
    bwInp.value = parseFloat(curStyles.borderWidth) || 0;
    bwRow.appendChild(bwInp);
    panel.appendChild(bwRow);

    // Border color
    const bcRow = document.createElement('label');
    bcRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    bcRow.innerHTML = '<span>Border color</span>';
    const bcInp = document.createElement('input');
    bcInp.type = 'color';
    bcInp.value = this._toHex(curStyles.borderColor) || '#000000';
    bcRow.appendChild(bcInp);
    panel.appendChild(bcRow);

    // Fill (background)
    const bgRow = document.createElement('label');
    bgRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    bgRow.innerHTML = '<span>Fill</span>';
    const bgInp = document.createElement('input');
    bgInp.type = 'color';
    bgInp.value = this._toHex(curStyles.backgroundColor) || '#ffffff';
    bgRow.appendChild(bgInp);
    panel.appendChild(bgRow);

    // Text color
    const tcRow = document.createElement('label');
    tcRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    tcRow.innerHTML = '<span>Text color</span>';
    const tcInp = document.createElement('input');
    tcInp.type = 'color';
    tcInp.value = this._toHex(curStyles.color) || '#000000';
    tcRow.appendChild(tcInp);
    panel.appendChild(tcRow);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:4px; margin-top:4px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Apply';
    saveBtn.addEventListener('click', () => {
      const styles = {};
      const bw = parseFloat(bwInp.value);
      if (bw > 0) {
        styles['border-width'] = bw + 'px';
        styles['border-style'] = 'solid';
        styles['border-color'] = bcInp.value;
      } else {
        styles['border-width'] = '0';
        styles['border-style'] = 'none';
      }
      styles['background-color'] = bgInp.value;
      styles['color'] = tcInp.value;
      this._onSaveStyles(nodeId, styles);
      panel.remove();
    });
    btnRow.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => panel.remove());
    btnRow.appendChild(cancelBtn);

    panel.appendChild(btnRow);
    document.body.appendChild(panel);

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function _close(e) {
        if (!panel.contains(e.target)) {
          panel.remove();
          document.removeEventListener('click', _close);
        }
      });
    }, 0);
  }

  /** Convert any CSS colour to hex. */
  _toHex(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return '';
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = color;
    const hex = ctx.fillStyle;
    return hex;
  }

  // -------------------------------------------------------------------
  // Layout / Attr mode — floating panels
  // -------------------------------------------------------------------

  _onClickLayoutAttr(e, mode) {
    const target = e.target.closest('[data-node-id]');
    if (!target) return;
    const nodeId = target.dataset.nodeId;
    if (mode === 'layout') this._showLayoutPanel(nodeId, target);
    else this._showAttrPanel(nodeId, target);
  }

  _showLayoutPanel(nodeId, el) {
    this._hideCtxMenu();
    const panel = this._makePanel(el);
    const cur = getComputedStyle(el);

    const field = (label, inp) => {
      const r = document.createElement('label');
      r.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
      r.innerHTML = `<span>${label}</span>`;
      r.appendChild(inp);
      return r;
    };

    // Position
    const posSel = document.createElement('select');
    ['static','relative','absolute','fixed','sticky'].forEach((v) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === cur.position) o.selected = true;
      posSel.appendChild(o);
    });
    panel.appendChild(field('Position', posSel));

    // Width
    const wInp = document.createElement('input');
    wInp.type = 'text'; wInp.value = cur.width;
    panel.appendChild(field('Width', wInp));

    // Height
    const hInp = document.createElement('input');
    hInp.type = 'text'; hInp.value = cur.height;
    panel.appendChild(field('Height', hInp));

    // Margin
    const mInp = document.createElement('input');
    mInp.type = 'text'; mInp.value = cur.margin;
    panel.appendChild(field('Margin', mInp));

    // Padding
    const pInp = document.createElement('input');
    pInp.type = 'text'; pInp.value = cur.padding;
    panel.appendChild(field('Padding', pInp));

    // Box-sizing
    const bsSel = document.createElement('select');
    ['content-box','border-box'].forEach((v) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === cur.boxSizing) o.selected = true;
      bsSel.appendChild(o);
    });
    panel.appendChild(field('Box-sizing', bsSel));

    // Z-index
    const zInp = document.createElement('input');
    zInp.type = 'number'; zInp.value = cur.zIndex;
    if (cur.zIndex === 'auto') zInp.value = '';
    panel.appendChild(field('Z-index', zInp));

    this._addSaveBtn(panel, nodeId, () => ({
      position: posSel.value === 'static' ? '' : posSel.value,
      width: wInp.value || '',
      height: hInp.value || '',
      margin: mInp.value || '',
      padding: pInp.value || '',
      'box-sizing': bsSel.value === 'content-box' ? '' : bsSel.value,
      'z-index': zInp.value || '',
    }));
  }

  _showAttrPanel(nodeId, el) {
    this._hideCtxMenu();
    const panel = this._makePanel(el);
    panel.style.minWidth = '260px';

    // We need to look up the node model; for now show computed from the element
    const cur = getComputedStyle(el);

    const h = document.createElement('h4');
    h.textContent = 'Attributes';
    panel.appendChild(h);

    const attrList = document.createElement('div');
    attrList.style.cssText = 'font:11px monospace; max-height:200px; overflow-y:auto;';
    for (const attr of el.attributes) {
      const r = document.createElement('div');
      r.textContent = `${attr.name} = "${attr.value}"`;
      attrList.appendChild(r);
    }
    if (el.attributes.length === 0) attrList.textContent = '(none)';
    panel.appendChild(attrList);

    const sh = document.createElement('h4');
    sh.textContent = 'Styles';
    panel.appendChild(sh);

    // Get inline styles (node.styles) — stored in style attribute
    const styleAttr = el.getAttribute('style') || '';
    const styleList = document.createElement('div');
    styleList.style.cssText = 'font:11px monospace; max-height:200px; overflow-y:auto;';
    if (styleAttr) {
      styleAttr.split(';').filter(Boolean).forEach((d) => {
        const r = document.createElement('div');
        r.textContent = d.trim();
        styleList.appendChild(r);
      });
    } else {
      styleList.textContent = '(none)';
    }
    panel.appendChild(styleList);

    // Close button only
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => panel.remove());
    panel.appendChild(closeBtn);
  }

  /** Create a positioned floating panel near an element. */
  _makePanel(el) {
    const panel = document.createElement('div');
    panel.style.cssText =
      'position:fixed; background:#fff; color:#000; border:1px solid #999; ' +
      'border-radius:6px; padding:12px; box-shadow:2px 2px 12px rgba(0,0,0,0.25); ' +
      'z-index:10001; display:flex; flex-direction:column; gap:6px; min-width:200px;';
    const rect = el.getBoundingClientRect();
    panel.style.left = `${Math.min(rect.right + 8, window.innerWidth - 280)}px`;
    panel.style.top = `${Math.min(rect.top, window.innerHeight - 400)}px`;
    document.body.appendChild(panel);
    return panel;
  }

  /** Add Apply / Cancel buttons and save logic. */
  _addSaveBtn(panel, nodeId, getStyles) {
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:4px; margin-top:4px;';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Apply';
    saveBtn.addEventListener('click', () => {
      const styles = getStyles();
      // Remove empty values so they revert to default
      for (const k of Object.keys(styles)) {
        if (!styles[k]) delete styles[k];
      }
      this._onSaveStyles(nodeId, styles);
      panel.remove();
    });
    btnRow.appendChild(saveBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => panel.remove());
    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);
  }

  // -------------------------------------------------------------------
  // Pen mode — draw SVG polygons point by point
  // -------------------------------------------------------------------

  _onClickPen(e) {
    const rect = this.previewEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitIdx = this._penPoints.findIndex(
      (p) => Math.abs(p.x - x) < 8 && Math.abs(p.y - y) < 8,
    );

    if (hitIdx >= 0 && hitIdx !== this._penPoints.length - 1) {
      this._finishPen();
      return;
    }

    if (this._penPoints.length > 0 && hitIdx === this._penPoints.length - 1) {
      this._finishPen();
      return;
    }

    this._penPoints.push({ x, y });
    this._updatePenOverlay();
  }

  _updatePenOverlay() {
    if (!this._penOverlay) {
      this._penOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this._penOverlay.style.cssText =
        'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:999;';
      this.previewEl.style.position = 'relative';
      this.previewEl.appendChild(this._penOverlay);
    }
    this._penOverlay.innerHTML = '';
    const pts = this._penPoints;
    if (pts.length < 2) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#3b82f6');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4 2');
    this._penOverlay.appendChild(line);

    for (const p of pts) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', '#3b82f6');
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '1.5');
      this._penOverlay.appendChild(circle);
    }
  }

  _finishPen() {
    const pts = this._penPoints;
    this._cancelPen();
    if (pts.length < 2) return;

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const w = maxX - minX || 100;
    const h = maxY - minY || 100;
    const relPts = pts.map((p) => ({ x: p.x - minX, y: p.y - minY }));
    const pointsStr = relPts.map((p) => `${p.x},${p.y}`).join(' ');

    this._onPenFinish({
      svgAttrs: { viewBox: `0 0 ${w} ${h}`, width: String(w), height: String(h) },
      shapeAttrs: {
        points: pointsStr,
        fill: 'rgba(59,130,246,0.2)',
        stroke: '#3b82f6',
        'stroke-width': '2',
      },
    });
  }

  _cancelPen() {
    this._penPoints = [];
    if (this._penOverlay) {
      this._penOverlay.remove();
      this._penOverlay = null;
    }
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
  // Move / Scale / Rotate / Square modes
  // -------------------------------------------------------------------

  _onDown(e) {
    const mode = this.mode;
    if (mode !== 'move' && mode !== 'scale' && mode !== 'rotate' && mode !== 'square') return;

    let target = e.target.closest('[data-node-id]');
    while (target && target.dataset.undraggable === 'true') {
      target = target.parentElement ? target.parentElement.closest('[data-node-id]') : null;
    }
    if (!target) return;

    const nodeId = target.dataset.nodeId;
    const rect = target.getBoundingClientRect();
    const prect = this.previewEl.getBoundingClientRect();

    if (mode === 'square') {
      // Draw a new block — measure relative to preview
      this._squareState = {
        startX: e.clientX - prect.left,
        startY: e.clientY - prect.top,
        nodeId,
        previewRect: prect,
      };
      this._createSquareOverlay(e.clientX - prect.left, e.clientY - prect.top, 0, 0);
      e.preventDefault();
      return;
    }

    const type = mode === 'scale' ? 'resize' : mode === 'rotate' ? 'rotate' : 'move';
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
    // Square
    if (this._squareState) {
      const s = this._squareState;
      const cx = e.clientX - s.previewRect.left;
      const cy = e.clientY - s.previewRect.top;
      const w = Math.abs(cx - s.startX);
      const h = Math.abs(cy - s.startY);
      const left = Math.min(cx, s.startX);
      const top = Math.min(cy, s.startY);
      this._updateSquareOverlay(left, top, w, h);
      return;
    }

    const t = this._transform;
    if (!t) return;
    const dx = e.clientX - t.startX;
    const dy = e.clientY - t.startY;
    const el = t.el;

    if (t.type === 'move') {
      const pos = el.style.position || getComputedStyle(el).position;
      if (pos === 'absolute' || pos === 'fixed') {
        const prect = this.previewEl.getBoundingClientRect();
        el.style.left = `${(t.startRect.left - prect.left) + dx}px`;
        el.style.top = `${(t.startRect.top - prect.top) + dy}px`;
      } else {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    } else if (t.type === 'resize') {
      el.style.width = `${Math.max(20, t.startRect.width + dx)}px`;
      el.style.height = `${Math.max(20, t.startRect.height + dy)}px`;
    } else if (t.type === 'rotate') {
      el.style.transform = `rotate(${dx * 0.5}deg)`;
    }
  }

  _onUp() {
    // Square finish
    if (this._squareState) {
      this._removeSquareOverlay();
      const s = this._squareState;
      const cx = this._lastSquareX ?? s.startX;
      const cy = this._lastSquareY ?? s.startY;
      const w = Math.abs(cx - s.startX);
      const h = Math.abs(cy - s.startY);
      if (w > 10 && h > 10) {
        const left = Math.min(cx, s.startX);
        const top = Math.min(cy, s.startY);
        this._onSaveStyles(s.nodeId, {
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${w}px`,
          height: `${h}px`,
          background: 'rgba(59,130,246,0.2)',
          border: '1px solid #3b82f6',
        });
      }
      this._squareState = null;
      return;
    }

    const t = this._transform;
    if (!t) return;
    t.el.classList.remove('pe-transform');
    const changed = {};
    const style = t.el.style;
    const pos = t.el.style.position || getComputedStyle(t.el).position;

    if (t.type === 'move') {
      if (pos === 'absolute' || pos === 'fixed') {
        if (style.left) changed.left = style.left;
        if (style.top) changed.top = style.top;
      } else {
        if (style.transform && style.transform !== t.startStyles.transform) {
          changed.transform = style.transform;
        }
      }
    } else if (t.type === 'resize') {
      if (style.width) changed.width = style.width;
      if (style.height) changed.height = style.height;
    } else if (t.type === 'rotate') {
      if (style.transform && style.transform !== t.startStyles.transform) {
        changed.transform = style.transform;
      }
    }
    if (Object.keys(changed).length > 0) {
      this._onSaveStyles(t.nodeId, changed);
    }
    this._transform = null;
  }

  _endTransform() {
    if (this._transform) {
      this._transform.el.classList.remove('pe-transform');
      this._transform = null;
    }
    this._removeSquareOverlay();
    this._squareState = null;
  }

  // Square overlay
  _createSquareOverlay(x, y, w, h) {
    this._removeSquareOverlay();
    const el = document.createElement('div');
    el.id = 'pe-square-overlay';
    el.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:${w}px; height:${h}px; background:rgba(59,130,246,0.15); border:1px dashed #3b82f6; pointer-events:none; z-index:10002;`;
    document.body.appendChild(el);
  }

  _updateSquareOverlay(x, y, w, h) {
    this._lastSquareX = x + w;
    this._lastSquareY = y + h;
    const el = document.getElementById('pe-square-overlay');
    if (!el) return this._createSquareOverlay(x, y, w, h);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
  }

  _removeSquareOverlay() {
    const el = document.getElementById('pe-square-overlay');
    if (el) el.remove();
  }
}
