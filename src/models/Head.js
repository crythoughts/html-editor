import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Head — shared <head> content applied to all pages of a project.
 *
 * @property {MetaTag[]} meta  — <meta> elements
 * @property {LinkTag[]} links — <link> elements
 */
export class Head extends Serializable {
  constructor() {
    super();
    this.meta = [];
    this.links = [];
  }

  /** Append all meta/link elements to a given parent (usually document.head). */
  applyTo(parent) {
    for (const m of this.meta) {
      parent.appendChild(m.toDOM());
    }
    for (const l of this.links) {
      parent.appendChild(l.toDOM());
    }
  }
}

registerType('Head', Head);
