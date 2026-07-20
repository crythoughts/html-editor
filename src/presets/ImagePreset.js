import { Preset } from './Preset.js';
import { Node } from '../models/Node.js';

/**
 * ImagePreset — inserts an <img> element with src and alt attributes.
 */
export class ImagePreset extends Preset {
  get name() { return 'Image'; }

  getSettingsWindow() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

    const h = document.createElement('h3');
    h.textContent = 'Image settings';
    div.appendChild(h);

    // src
    const srcRow = document.createElement('label');
    srcRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    srcRow.innerHTML = '<span>src</span>';
    const srcInp = document.createElement('input');
    srcInp.type = 'text';
    srcInp.setAttribute('data-key', 'src');
    srcInp.placeholder = 'https://example.com/image.png';
    srcInp.style.width = '100%';
    srcRow.appendChild(srcInp);
    div.appendChild(srcRow);

    // alt
    const altRow = document.createElement('label');
    altRow.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    altRow.innerHTML = '<span>alt</span>';
    const altInp = document.createElement('input');
    altInp.type = 'text';
    altInp.setAttribute('data-key', 'alt');
    altInp.placeholder = 'Description';
    altInp.style.width = '100%';
    altRow.appendChild(altInp);
    div.appendChild(altRow);

    return div;
  }

  getTemplate(parentNode, settings) {
    const node = new Node('img', { src: settings.src || '', alt: settings.alt || '' });
    parentNode.items.push(node);
    return node;
  }
}
