import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Project is the top-level entity that groups related pages together.
 *
 * @property {string} name        — project display name
 * @property {string} description — brief project description
 * @property {string} author      — author identifier
 * @property {number} created_at  — unix timestamp (ms) of creation
 * @property {number} edited_at   — unix timestamp (ms) of last modification
 * @property {Page[]} pages       — ordered list of pages in this project
 */
export class Project extends Serializable {
  constructor(name = '', description = '', author = '') {
    super();
    this.name = name;
    this.description = description;
    this.author = author;
    this.created_at = Date.now();
    this.edited_at = Date.now();
    this.pages = [];
  }

  /** Adds a Page and bumps the edited_at timestamp. */
  addPage(page) {
    this.pages.push(page);
    this.edited_at = Date.now();
  }

  /** Removes a Page by index and bumps the edited_at timestamp. */
  removePage(index) {
    if (index >= 0 && index < this.pages.length) {
      this.pages.splice(index, 1);
      this.edited_at = Date.now();
    }
  }

  /** Convenience: create a top-level Node and add it as a page item. */
  addNode(pageIndex, node) {
    if (this.pages[pageIndex]) {
      this.pages[pageIndex].items.push(node);
      this.edited_at = Date.now();
    }
  }
}

registerType('Project', Project);
