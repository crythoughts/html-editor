import { Preset } from './Preset.js';
import { Node } from '../models/Node.js';

/**
 * BlockPreset — inserts a plain <div> block.
 */
export class BlockPreset extends Preset {
  get name() { return 'Block'; }

  getSettingsWindow() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
    const h = document.createElement('h3');
    h.textContent = 'Block settings';
    div.appendChild(h);
    const p = document.createElement('p');
    p.textContent = 'Creates a simple <div> block. No additional settings.';
    div.appendChild(p);
    return div;
  }

  getTemplate(parentNode, settings) {
    const node = new Node('div');
    node.presetName = this.name;
    parentNode.items.push(node);
    return node;
  }
}
