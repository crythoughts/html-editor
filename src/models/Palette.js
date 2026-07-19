import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Palette — a named collection of colours that can be enabled globally.
 * When enabled, its colours become available as CSS custom properties
 * via `--color-id`.
 *
 * @property {string}  id       — immutable identifier (slug from name)
 * @property {string}  name     — display label
 * @property {Color[]} colors   — colour entries
 * @property {boolean} enabled  — whether this palette's vars are emitted
 */
export class Palette extends Serializable {
  constructor(name = '') {
    super();
    this.id = Palette.slugify(name) || `palette-${Date.now()}`;
    this.name = name;
    this.colors = [];
    this.enabled = true;
  }

  static slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

registerType('Palette', Palette);
