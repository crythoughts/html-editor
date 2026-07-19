import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * LinkTag — a single <link> element for the project head
 * (e.g. stylesheets, favicons, preloads).
 *
 * @property {Object} attrs — key/value map of HTML attributes
 */
export class LinkTag extends Serializable {
  constructor(attrs = {}) {
    super();
    this.attrs = { ...attrs };
  }

  /** Create a real <link> DOM element. */
  toDOM() {
    const el = document.createElement('link');
    for (const [key, value] of Object.entries(this.attrs)) {
      el.setAttribute(key, String(value));
    }
    return el;
  }
}

registerType('LinkTag', LinkTag);
