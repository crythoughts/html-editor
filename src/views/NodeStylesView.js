import { getPageById, savePage, getProjectById, saveProject } from '../storage.js';

/**
 * NodeStylesView — edit a node's inline styles as key/value pairs.
 * Works for both page nodes and component nodes.
 */
export class NodeStylesView {
  constructor(router, projectId, pageId, nodeId, componentId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = pageId != null ? parseInt(pageId, 10) : null;
    this.nodeId = nodeId;
    this.componentId = componentId != null ? parseInt(componentId, 10) : null;
  }

  render() {
    const container = document.createElement('div');

    const isComp = this.componentId != null;
    let project = null;
    let containerObj = null; // Page or Component
    let node = null;

    if (isComp) {
      project = getProjectById(this.projectId);
      const comp = project ? project.components[this.componentId] : null;
      containerObj = comp;
      node = comp ? comp.findNodeById(this.nodeId) : null;
    } else {
      const page = getPageById(this.projectId, this.pageId);
      containerObj = page;
      node = page ? page.findNodeById(this.nodeId) : null;
    }

    if (!containerObj || !node) {
      container.appendChild(document.createTextNode('Node not found.'));
      return container;
    }

    const base = isComp
      ? `/project/${this.projectId}/components/${this.componentId}`
      : `/project/${this.projectId}/${this.pageId}`;

    const heading = document.createElement('h3');
    heading.textContent = `Styles — <${node.tagName}>`;
    container.appendChild(heading);

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

    for (const [prop, value] of Object.entries(node.styles ?? {})) {
      addStyleRow(prop, value);
    }

    container.appendChild(stylesContainer);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => addStyleRow('', ''));
    container.appendChild(addBtn);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save styles';
    saveBtn.addEventListener('click', () => {
      const newStyles = {};
      for (const row of stylesContainer.children) {
        const inputs = row.querySelectorAll('input');
        const prop = inputs[0].value.trim();
        if (prop) newStyles[prop] = inputs[1].value;
      }
      node.styles = newStyles;

      if (isComp) {
        project.edited_at = Date.now();
        saveProject(this.projectId, project);
      } else {
        savePage(this.projectId, this.pageId, containerObj);
      }

      this.router.navigate(`${base}/node/${this.nodeId}/edit`);
    });
    container.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.router.navigate(`${base}/node/${this.nodeId}/edit`);
    });
    container.appendChild(cancelBtn);

    return container;
  }
}
