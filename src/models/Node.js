import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Node represents a single DOM-like element in the page tree.
 *
 * @property {string}  id       — unique random identifier (UUID v4)
 * @property {string}  tagName  — HTML tag name (e.g. 'div', 'p', 'h1')
 * @property {Object}  attrs   — key/value map of HTML attributes
 * @property {Node[]}  items   — child nodes nested inside this node
 */
export class Node extends Serializable {
  constructor(tagName = 'div', attrs = {}) {
    super();
    this.id = crypto.randomUUID();
    this.tagName = tagName;
    this.attrs = { ...attrs };
    this.items = [];
  }

  /**
   * Converts this node and all its descendants into real DOM elements.
   * If attrs contains "textContent", it is applied as DOM textContent
   * instead of an HTML attribute (useful for leaf text nodes).
   * @returns {HTMLElement}
   */
  toDOM() {
    const el = document.createElement(this.tagName);

    // Separate textContent from regular HTML attributes
    let textContent = null;
    for (const [key, value] of Object.entries(this.attrs)) {
      if (key === 'textContent') {
        textContent = value;
      } else {
        el.setAttribute(key, String(value));
      }
    }

    if (textContent !== null) {
      el.textContent = textContent;
    } else {
      for (const child of this.items) {
        el.appendChild(child.toDOM());
      }
    }
    return el;
  }
}

registerType('Node', Node);
