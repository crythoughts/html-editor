import { getPageById, savePage } from '../storage.js';

/**
 * NodeStylesView — edit a node's inline styles as key/value pairs.
 * Each row has a CSS property name and its value, with +/- buttons.
 */
export class NodeStylesView {
  constructor(router, projectId, pageId, nodeId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = parseInt(pageId, 10);
    this.nodeId = nodeId;
  }

  render() {
    const container = document.createElement('div');

    const page = getPageById(this.projectId, this.pageId);
    const node = page ? page.findNodeById(this.nodeId) : null;

    if (!page || !node) {
      const msg = document.createElement('p');
      msg.textContent = 'Node not found.';
      container.appendChild(msg);
      return container;
    }

    // --- Heading ---
    const heading = document.createElement('h3');
    heading.textContent = `Styles — <${node.tagName}>`;
    container.appendChild(heading);

    // --- Style rows ---
    const stylesContainer = document.createElement('div');

    const addStyleRow = (prop, value) => {
      const row = document.createElement('div');

      const propInput = document.createElement('input');
      propInput.type = 'text';
      propInput.placeholder = 'Property (e.g. font-size)';
      propInput.value = prop;
      row.appendChild(propInput);

      const valInput = document.createElement('input');
      valInput.type = 'text';
      valInput.placeholder = 'Value (e.g. 14px)';
      valInput.value = value;
      row.appendChild(valInput);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2212';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      stylesContainer.appendChild(row);
    };

    // Populate from existing styles
    for (const [prop, value] of Object.entries(node.styles ?? {})) {
      addStyleRow(prop, value);
    }

    container.appendChild(stylesContainer);

    // --- Add button ---
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => addStyleRow('', ''));
    container.appendChild(addBtn);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save styles';
    saveBtn.addEventListener('click', () => {
      const newStyles = {};
      for (const row of stylesContainer.children) {
        const inputs = row.querySelectorAll('input');
        const prop = inputs[0].value.trim();
        if (prop) {
          newStyles[prop] = inputs[1].value;
        }
      }
      node.styles = newStyles;
      savePage(this.projectId, this.pageId, page);
      this.router.navigate(
        `/project/${this.projectId}/${this.pageId}/node/${this.nodeId}/edit`,
      );
    });
    container.appendChild(saveBtn);

    // --- Cancel ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.router.navigate(
        `/project/${this.projectId}/${this.pageId}/node/${this.nodeId}/edit`,
      );
    });
    container.appendChild(cancelBtn);

    return container;
  }
}
