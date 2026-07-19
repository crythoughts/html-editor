import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Page represents a single page/document inside a Project.
 *
 * @property {string} title  — display title of the page
 * @property {Node[]} items  — top-level Node objects that form the page content
 */
export class Page extends Serializable {
  constructor(title = '') {
    super();
    this.title = title;
    this.items = [];
  }

  /**
   * Renders all top-level items into a DocumentFragment.
   * @returns {DocumentFragment}
   */
  render() {
    const fragment = document.createDocumentFragment();
    for (const item of this.items) {
      fragment.appendChild(item.toDOM());
    }
    return fragment;
  }

  /**
   * Recursively searches the entire node tree for a node with the given id.
   * @param {string} nodeId
   * @returns {Node|null}
   */
  findNodeById(nodeId) {
    for (const item of this.items) {
      const found = this._findInTree(item, nodeId);
      if (found) return found;
    }
    return null;
  }

  /** @private */
  _findInTree(node, nodeId) {
    if (node.id === nodeId) return node;
    for (const child of node.items) {
      const found = this._findInTree(child, nodeId);
      if (found) return found;
    }
    return null;
  }
}

registerType('Page', Page);
