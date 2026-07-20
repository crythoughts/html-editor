import { Preset } from './Preset.js';
import { Node } from '../models/Node.js';

/**
 * FlexBlockPreset — inserts a flex container with configurable layout.
 */
export class FlexBlockPreset extends Preset {
  get name() { return 'Flex block'; }

  getSettingsWindow() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

    const h = document.createElement('h3');
    h.textContent = 'Flex block settings';
    div.appendChild(h);

    const field = (label, control) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
      row.innerHTML = `<span>${label}</span>`;
      row.appendChild(control);
      return row;
    };

    // Direction
    const dirSel = document.createElement('select');
    dirSel.setAttribute('data-key', 'direction');
    ['row', 'column', 'row-reverse', 'column-reverse'].forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      if (v === 'row') o.selected = true;
      dirSel.appendChild(o);
    });
    div.appendChild(field('Direction', dirSel));

    // Gap
    const gapInp = document.createElement('input');
    gapInp.type = 'text';
    gapInp.setAttribute('data-key', 'gap');
    gapInp.value = '8px';
    div.appendChild(field('Gap', gapInp));

    // Justify content
    const jcSel = document.createElement('select');
    jcSel.setAttribute('data-key', 'justifyContent');
    ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'].forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      jcSel.appendChild(o);
    });
    div.appendChild(field('Justify content', jcSel));

    // Align items
    const aiSel = document.createElement('select');
    aiSel.setAttribute('data-key', 'alignItems');
    ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'].forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      aiSel.appendChild(o);
    });
    div.appendChild(field('Align items', aiSel));

    return div;
  }

  getTemplate(parentNode, settings) {
    const node = new Node('div');
    node.styles.display = 'flex';
    node.styles['flex-direction'] = settings.direction || 'row';
    if (settings.gap) node.styles.gap = settings.gap;
    if (settings.justifyContent) node.styles['justify-content'] = settings.justifyContent;
    if (settings.alignItems) node.styles['align-items'] = settings.alignItems;
    parentNode.items.push(node);
    return node;
  }
}
