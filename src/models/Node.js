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
    return this.type === 'node' || this.type === 'component' || this.type === 'include';
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
   * Build a CSS selector from a node's class and/or id attributes.
   * Returns '' if neither is present.
   * @private
   */
  _buildSelector(attrs) {
    const parts = [];
    if (attrs.id) {
      parts.push(`#${CSS.escape(attrs.id)}`);
    }
    if (attrs.class) {
      const classes = String(attrs.class).split(/\s+/).filter(Boolean);
      for (const cls of classes) {
        parts.push(`.${CSS.escape(cls)}`);
      }
    }
    return parts.join('');
  }

  /**
   * Converts this node and all its descendants into real DOM elements.
   *
   * Style behaviour:
   * - **Regular (non-component) context** (`styleRules` is null):
   *   all styles are applied inline via `el.style.setProperty()`.
   * - **Component context** (`styleRules` is an array):
   *   if the node has a class or id → styles are pushed into `styleRules`
   *   as CSS rules and NOT applied inline.
   *   If the node has no class/id → styles are applied inline as fallback.
   *
   * Include slots:
   *   `slotItems` — when rendering a component reference's items, these
   *   are the child nodes of the component reference node itself. An
   *   `include` node renders them at its position (slot mechanism).
   *
   * @param {Component[]} [components=[]] — project-level components
   * @param {number}      [depth=0]       — recursion depth limit
   * @param {Object}      [varValues={}]  — resolved variable values
   * @param {Array|null}  [styleRules=null] — collector for component CSS rules
   * @param {Node[]|null} [slotItems=null] — slot content from the referencing node
   * @returns {HTMLElement|DocumentFragment}
   */
  toDOM(components = [], depth = 0, varValues = {}, styleRules = null, slotItems = null) {
    // --- Include slot: render the slot items instead ---
    if (this.type === 'include') {
      const frag = document.createDocumentFragment();
      if (slotItems && slotItems.length > 0) {
        for (const slot of slotItems) {
          const childEl = slot.toDOM(components, depth, varValues, styleRules, null);
          if (childEl) frag.appendChild(childEl);
        }
      }
      return frag;
    }

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

        // Create a fresh collector for this component's CSS rules
        const childRules = [];
        const frag = document.createDocumentFragment();

        // Pass this node's own items as slotItems so <include> resolves them
        for (const item of comp.items) {
          const childEl = item.toDOM(components, depth + 1, mergedVars, childRules, this.items);
          if (childEl) frag.appendChild(childEl);
        }

        // Prepend a <style> block if any rules were collected
        if (childRules.length > 0) {
          const cssText = childRules
            .map((r) => `${r.selector} { ${r.css} }`)
            .join('\n');
          const styleEl = document.createElement('style');
          styleEl.textContent = cssText;
          frag.insertBefore(styleEl, frag.firstChild);
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
    const hasSelector = !!(this.attrs.class || this.attrs.id);

    // In component context with a class/id → collect styles as CSS rules
    if (styleRules && hasSelector && Object.keys(this.styles).length > 0) {
      const selector = this._buildSelector(this.attrs);
      if (selector) {
        const cssProps = Object.entries(this.styles)
          .map(([prop, val]) => `${prop}: ${val}`)
          .join('; ');
        styleRules.push({ selector, css: cssProps });
      }
    } else {
      // Otherwise apply styles inline as before
      for (const [prop, value] of Object.entries(this.styles)) {
        el.style.setProperty(prop, value);
      }
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
        const childEl = child.toDOM(components, depth, varValues, styleRules, null);
        if (childEl) el.appendChild(childEl);
      }
    }

    return el;
  }
}

registerType('Node', Node);
