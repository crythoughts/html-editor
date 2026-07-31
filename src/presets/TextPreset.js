import { Preset } from './Preset.js';
import { Node } from '../models/Node.js';

/**
 * TextPreset — inserts a text element (span or p) with inline styles.
 */
export class TextPreset extends Preset {
  get name() { return 'Text'; }

  getSettingsWindow() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

    const h = document.createElement('h3');
    h.textContent = 'Text settings';
    div.appendChild(h);

    // Tag
    const tagRow = document.createElement('label');
    tagRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    tagRow.innerHTML = '<span>Tag</span>';
    const tagSel = document.createElement('select');
    tagSel.setAttribute('data-key', 'tag');
    ['span', 'p'].forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      if (t === 'span') o.selected = true;
      tagSel.appendChild(o);
    });
    tagRow.appendChild(tagSel);
    div.appendChild(tagRow);

    // Font size
    const sizeRow = document.createElement('label');
    sizeRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    sizeRow.innerHTML = '<span>Font size</span>';
    const sizeInp = document.createElement('input');
    sizeInp.type = 'text';
    sizeInp.setAttribute('data-key', 'fontSize');
    sizeInp.value = '12px';
    sizeRow.appendChild(sizeInp);
    div.appendChild(sizeRow);

    // Content
    const contRow = document.createElement('label');
    contRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    contRow.innerHTML = '<span>Content</span>';
    const textarea = document.createElement('textarea');
    textarea.setAttribute('data-key', 'content');
    textarea.rows = 4;
    textarea.style.width = '100%';
    contRow.appendChild(textarea);
    div.appendChild(contRow);

    return div;
  }

  getTemplate(parentNode, settings) {
    const tag = settings.tag || 'span';
    const size = settings.fontSize || '12px';
    const content = settings.content || '';

    const node = new Node(tag, { textContent: content });
    node.presetName = this.name;
    node.styles['font-size'] = size;
    parentNode.items.push(node);
    return node;
  }
}
