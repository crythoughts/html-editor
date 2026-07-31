import { Preset } from './Preset.js';
import { Node } from '../models/Node.js';

/**
 * UlPreset — inserts a <ul> with three empty <li> items.
 */
export class UlPreset extends Preset {
  get name() { return 'List (ul)'; }

  getSettingsWindow() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
    const h = document.createElement('h3');
    h.textContent = 'List settings';
    div.appendChild(h);

    const p = document.createElement('p');
    p.textContent = 'Creates a <ul> with three <li> items. No additional settings.';
    div.appendChild(p);
    return div;
  }

  getTemplate(parentNode, settings) {
    const ul = new Node('ul');
    ul.presetName = this.name;
    for (let i = 1; i <= 3; i++) {
      const li = new Node('li', { textContent: `Item ${i}` });
      li.presetName = this.name;
      ul.items.push(li);
    }
    parentNode.items.push(ul);
    return ul;
  }
}
