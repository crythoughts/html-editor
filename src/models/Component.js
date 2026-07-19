import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Component — a reusable template that can be embedded into any page
 * inside the same project.
 *
 * @property {string}     id        — unique identifier (UUID)
 * @property {string}     name      — display / reference name
 * @property {Node[]}     items     — the component's DOM-like children
 * @property {Variable[]} variables — typed parameters that can be overridden
 */
export class Component extends Serializable {
  constructor(name = '') {
    super();
    this.id = crypto.randomUUID();
    this.name = name;
    this.items = [];
    this.variables = [];
  }

  /** Recursively finds a node by id inside this component's item tree. */
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

  /** Removes a node by id from the tree. Returns true if removed. */
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

registerType('Component', Component);
