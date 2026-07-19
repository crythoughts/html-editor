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
   * Components array is passed to Node.toDOM() for component resolution.
   * @param {Component[]} [components=[]]
   * @param {Object}      [varValues={}]  — variable values for this page scope
   * @returns {DocumentFragment}
   */
  render(components = [], varValues = {}) {
    const fragment = document.createDocumentFragment();
    for (const item of this.items) {
      const childEl = item.toDOM(components, 0, varValues);
      if (childEl) fragment.appendChild(childEl);
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

  /**
   * Removes a node (by id) from the tree, searching all nesting levels.
   * Returns true if found and removed, false otherwise.
   */
  removeNodeById(nodeId) {
    const idx = this.items.findIndex((item) => item.id === nodeId);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      return true;
    }
    for (const item of this.items) {
      if (this._removeFromTree(item, nodeId)) return true;
    }
    return false;
  }

  /** @private */
  _removeFromTree(node, nodeId) {
    const idx = node.items.findIndex((child) => child.id === nodeId);
    if (idx !== -1) {
      node.items.splice(idx, 1);
      return true;
    }
    for (const child of node.items) {
      if (this._removeFromTree(child, nodeId)) return true;
    }
    return false;
  }
}

registerType('Page', Page);
