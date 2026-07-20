/**
 * Preset — abstract base for template generators.
 *
 * Subclasses must implement:
 *   get name()         — display name
 *   getSettingsWindow() — returns a DOM element with form controls
 *   getTemplate(parentNode, settings) — modifies parentNode.items
 */

export class Preset {
  get name() { return ''; }

  /** Returns a DOM element containing settings controls. */
  getSettingsWindow() {
    const div = document.createElement('div');
    div.textContent = 'No settings.';
    return div;
  }

  /**
   * Create child nodes inside parentNode based on settings.
   * @param {import('../models/Node.js').Node} parentNode — the node to insert into
   * @param {Object} settings — values collected from the settings form
   */
  getTemplate(parentNode, settings) {
    // override in subclass
  }
}

/**
 * Collect settings values from a container that uses controls with data-key attributes.
 */
export function collectSettings(container) {
  const settings = {};
  container.querySelectorAll('[data-key]').forEach((el) => {
    const key = el.getAttribute('data-key');
    if (el.tagName === 'SELECT') {
      settings[key] = el.value;
    } else if (el.tagName === 'TEXTAREA') {
      settings[key] = el.value;
    } else if (el.type === 'number') {
      settings[key] = el.value;
    } else {
      settings[key] = el.value;
    }
  });
  return settings;
}
