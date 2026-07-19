import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * MetaTag — a single <meta> element for the project head.
 * All attributes are stored in a flexible key/value map
 * (e.g. { name: "description", content: "..." }).
 *
 * @property {Object} attrs — key/value map of HTML attributes
 */
export class MetaTag extends Serializable {
  constructor(attrs = {}) {
    super();
    this.attrs = { ...attrs };
  }

  /** Create a real <meta> DOM element. */
  toDOM() {
    const el = document.createElement('meta');
    for (const [key, value] of Object.entries(this.attrs)) {
      el.setAttribute(key, String(value));
    }
    return el;
  }
}

registerType('MetaTag', MetaTag);
