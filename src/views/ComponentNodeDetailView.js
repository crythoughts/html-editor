import { getProjectById } from '../storage.js';

/**
 * ComponentNodeDetailView — shows a node's properties within a component's
 * item tree. Very similar to NodeDetailView but operates on component items.
 */
export class ComponentNodeDetailView {
  constructor(router, projectId, compId, nodeId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.compId = parseInt(compId, 10);
    this.nodeId = nodeId;
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);
    const comp = project ? project.components[this.compId] : null;
    const node = comp ? comp.findNodeById(this.nodeId) : null;

    if (!project || !comp || !node) {
      container.appendChild(document.createTextNode('Node not found.'));
      return container;
    }

    // --- Breadcrumb ---
    const breadcrumb = document.createElement('div');
    const compLink = document.createElement('a');
    compLink.href = `#/project/${this.projectId}/components/${this.compId}/edit`;
    compLink.textContent = comp.name;
    breadcrumb.appendChild(compLink);
    breadcrumb.appendChild(
      document.createTextNode(
        node.type === 'component'
          ? ` / [Component: ${node.component_name}]`
          : ` / <${node.tagName}>`,
      ),
    );
    container.appendChild(breadcrumb);

    // --- Type / tag / component info ---
    const infoRow = document.createElement('div');
    if (node.type === 'component') {
      infoRow.textContent = `Component: ${node.component_name}`;
    } else if (node.type !== 'node') {
      infoRow.textContent = `Type: ${node.type} — ${node.pseudo}`;
    } else {
      infoRow.textContent = `Tag: <${node.tagName}>`;
    }
    container.appendChild(infoRow);

    // --- ID ---
    const idRow = document.createElement('div');
    idRow.textContent = `ID: ${node.id}`;
    container.appendChild(idRow);

    // --- Attributes ---
    const attrsHeading = document.createElement('h4');
    attrsHeading.textContent = 'Attributes';
    container.appendChild(attrsHeading);

    const attrKeys = Object.keys(node.attrs);
    if (attrKeys.length === 0) {
      const none = document.createElement('p');
      none.textContent = '(none)';
      container.appendChild(none);
    } else {
      const attrList = document.createElement('ul');
      for (const [key, value] of Object.entries(node.attrs)) {
        const li = document.createElement('li');
        li.textContent = `${key} = "${value}"`;
        attrList.appendChild(li);
      }
      container.appendChild(attrList);
    }

    // --- Styles summary ---
    const styleKeys = Object.keys(node.styles);
    const stylesInfo = document.createElement('p');
    stylesInfo.textContent = `Styles: ${styleKeys.length} properties`;
    container.appendChild(stylesInfo);

    // --- Children ---
    const realItems = node.items.filter(
      (c) => c.type === 'node' || c.type === 'component',
    );
    const pseudoItems = node.items.filter(
      (c) => c.type !== 'node' && c.type !== 'component',
    );

    const childrenHeading = document.createElement('h4');
    childrenHeading.textContent = `Children (${realItems.length})`;
    container.appendChild(childrenHeading);

    const createLink = document.createElement('a');
    createLink.href =
      `#/project/${this.projectId}/components/${this.compId}/node/${node.id}/create`;
    createLink.textContent = '+ Create child node';
    container.appendChild(createLink);

    if (realItems.length === 0 && pseudoItems.length === 0) {
      const none = document.createElement('p');
      none.textContent = '(no children)';
      container.appendChild(none);
    }

    if (realItems.length > 0) {
      const childList = document.createElement('ul');
      realItems.forEach((child) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href =
          `#/project/${this.projectId}/components/${this.compId}/node/${child.id}`;
        link.textContent =
          child.type === 'component'
            ? `[Component: ${child.component_name}] — ${child.items.length} children`
            : `<${child.tagName}> — ${child.items.length} children`;
        li.appendChild(link);
        childList.appendChild(li);
      });
      container.appendChild(childList);
    }

    // Pseudo toggle
    if (pseudoItems.length > 0) {
      const toggle = document.createElement('a');
      toggle.href = '#';
      toggle.textContent = `Show pseudo-classes (${pseudoItems.length})`;
      const pseudoList = document.createElement('ul');
      pseudoList.style.display = 'none';
      pseudoItems.forEach((child) => {
        const li = document.createElement('li');
        li.textContent = child.pseudo || child.type;
        pseudoList.appendChild(li);
      });
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const hidden = pseudoList.style.display === 'none';
        pseudoList.style.display = hidden ? 'block' : 'none';
        toggle.textContent = hidden
          ? 'Hide pseudo-classes'
          : `Show pseudo-classes (${pseudoItems.length})`;
      });
      container.appendChild(toggle);
      container.appendChild(pseudoList);
    }

    // --- Back ---
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to component';
    backBtn.addEventListener('click', () =>
      this.router.navigate(
        `/project/${this.projectId}/components/${this.compId}/edit`,
      ),
    );
    container.appendChild(backBtn);

    return container;
  }
}
