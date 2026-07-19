import { Serializable } from './Serializable.js';
import { registerType, getNextNodeId } from '../storage.js';

/**
 * Node represents a single DOM-like element in the page tree.
 *
 * @property {string}  id              — unique identifier (incremental number or UUID)
 * @property {string}  type            — 'node' (default), 'pseudo_class', 'pseudo_element', or 'component'
 * @property {string}  pseudo          — CSS pseudo notation, e.g. ':hover' or '::before'
 * @property {string}  tagName         — HTML tag name (e.g. 'div', 'p', 'h1')
 * @property {string}  component_name  — referenced Component name (when type='component')
 * @property {Object}  variables       — key/value overrides for Component variables
 * @property {Object}  attrs           — key/value map of HTML attributes
 * @property {Object}  styles          — key/value map of CSS properties (kebab-case)
 * @property {Node[]}  items           — child nodes nested inside this node
 */
export class Node extends Serializable {
  constructor(tagName = 'div', attrs = {}) {
    super();
    this.id = getNextNodeId();
    this.type = 'node';
    this.pseudo = '';
    this.component_name = '';
    this.variables = {};
    this.tagName = tagName;
    this.attrs = { ...attrs };
    this.styles = {};
    this.items = [];
  }

  /** Returns true if this node should produce its own DOM element. */
  isCreatesDOMElement() {
    return this.type === 'node' || this.type === 'component';
  }

  /**
   * Resolve a single attribute value. If it's a variable reference object
   * ({ type: "variable", value: "name" }), look up the value from varValues.
   * Otherwise return the value as-is.
   * @private
   */
  _resolveAttrValue(value, varValues) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.type === 'variable'
    ) {
      return varValues[value.value] ?? '';
    }
    return value;
  }

  /**
   * Converts this node and all its descendants into real DOM elements.
   * When type is 'component', the referenced Component's items are rendered
   * and returned as a DocumentFragment (no wrapper element).
   * Variable references in attrs are resolved using the current varValues.
   *
   * @param {Component[]} [components=[]] — project-level components for resolution
   * @param {number}      [depth=0]       — recursion depth (max 100 prevents loops)
   * @param {Object}      [varValues={}]  — resolved variable values for this scope
   * @returns {HTMLElement|DocumentFragment}
   */
  toDOM(components = [], depth = 0, varValues = {}) {
    // --- Component reference: render the component's items instead ---
    if (this.type === 'component' && this.component_name) {
      if (depth >= 100) {
        const el = document.createElement('div');
        el.textContent = `[max depth: ${this.component_name}]`;
        return el;
      }
      const comp = components.find((c) => c.name === this.component_name);
      if (comp) {
        // Build merged variable values: component defaults + node overrides
        const mergedVars = { ...varValues };
        for (const v of comp.variables) {
          if (!(v.name in mergedVars)) {
            mergedVars[v.name] = v.default;
          }
        }
        for (const [key, val] of Object.entries(this.variables)) {
          mergedVars[key] = val;
        }

        const frag = document.createDocumentFragment();
        for (const item of comp.items) {
          const childEl = item.toDOM(components, depth + 1, mergedVars);
          if (childEl) frag.appendChild(childEl);
        }
        return frag;
      }
      // Fallback placeholder
      const el = document.createElement('div');
      el.textContent = `[Component: ${this.component_name}]`;
      el.setAttribute('data-component', this.component_name);
      return el;
    }

    // --- Regular node ---
    const el = document.createElement(this.tagName);

    for (const [prop, value] of Object.entries(this.styles)) {
      el.style.setProperty(prop, value);
    }

    let textContent = null;
    for (const [key, value] of Object.entries(this.attrs)) {
      const resolved = this._resolveAttrValue(value, varValues);
      if (key === 'textContent') {
        textContent = resolved;
      } else {
        el.setAttribute(key, String(resolved));
      }
    }

    if (textContent !== null) {
      el.textContent = textContent;
    }

    for (const child of this.items) {
      if (child.isCreatesDOMElement()) {
        const childEl = child.toDOM(components, depth, varValues);
        if (childEl) el.appendChild(childEl);
      }
    }

    return el;
  }
}

registerType('Node', Node);
