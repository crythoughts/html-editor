import { getPageById, savePage, getProjectById, saveProject } from '../storage.js';

/**
 * NodeIdView — edit the node's HTML id attribute.
 * Works for both page nodes and component nodes.
 */
export class NodeIdView {
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
    let containerObj = null;
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
    heading.textContent = `ID — <${node.tagName}>`;
    container.appendChild(heading);

    const label = document.createElement('label');
    label.textContent = 'id';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'my-element-id';
    input.value = node.attrs.id || '';
    container.appendChild(label);
    container.appendChild(input);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save id';
    saveBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (val) {
        node.attrs.id = val;
      } else {
        delete node.attrs.id;
      }

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
