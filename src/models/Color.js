import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Color — a single named colour in a Palette.
 *
 * @property {string} id     — immutable identifier used in CSS variable (--id)
 * @property {string} name   — display label
 * @property {string} value  — hex colour string (e.g. "#ff0000")
 */
export class Color extends Serializable {
  constructor(name = '', value = '#000000') {
    super();
    this.id = Color.slugify(name) || `color-${Date.now()}`;
    this.name = name;
    this.value = value;
  }

  /** Crude slug from a display name. */
  static slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

registerType('Color', Color);
