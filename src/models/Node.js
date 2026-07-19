import { Serializable } from './Serializable.js';
import { registerType, getNextNodeId } from '../storage.js';

/**
 * Node represents a single DOM-like element in the page tree.
 *
 * @property {string}  id       — unique identifier (incremental number or UUID)
 * @property {string}  type     — 'node' (default), 'pseudo_class', or 'pseudo_element'
 * @property {string}  pseudo   — CSS pseudo notation, e.g. ':hover' or '::before'
 * @property {string}  tagName  — HTML tag name (e.g. 'div', 'p', 'h1')
 * @property {Object}  attrs   — key/value map of HTML attributes
 * @property {Object}  styles  — key/value map of CSS properties (kebab-case)
 * @property {Node[]}  items   — child nodes nested inside this node
 */
export class Node extends Serializable {
  constructor(tagName = 'div', attrs = {}) {
    super();
    this.id = getNextNodeId();
    this.type = 'node';
    this.pseudo = '';
    this.tagName = tagName;
    this.attrs = { ...attrs };
    this.styles = {};
    this.items = [];
  }

    isCreatesDOMElement() {
        return this._type === "node";
    }

  /**
   * Converts this node and all its descendants into real DOM elements.
   * If attrs contains "textContent", it is applied as DOM textContent
   * instead of an HTML attribute (useful for leaf text nodes).
   * @returns {HTMLElement}
   */
  toDOM() {
    const el = document.createElement(this.tagName);

    // Apply inline styles
    for (const [prop, value] of Object.entries(this.styles)) {
      el.style.setProperty(prop, value);
    }

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
    }

    for (const child of this.items) {
        // Pseudo items don't create DOM elements; their styles are
        // only relevant for the parent (stored in the data model).
        if (child.isCreatesDOMElement()) {
            const childEl = child.toDOM();
            if (childEl) {
                el.appendChild(childEl);
            }
        }
    }

    return el;
  }
}

registerType('Node', Node);
