import { getPageById, getProjectById } from '../storage.js';

/**
 * NodeDetailView — shows a single node's properties and its children.
 * Works for both page nodes and component nodes (when componentId is given).
 */
export class NodeDetailView {
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
    let containerObj = null; // Page or Component
    let node = null;
    let project = null;

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

      const back = document.createElement('button');
      back.textContent = isComp ? 'Back to component' : 'Back to page';
      back.addEventListener('click', () =>
        this.router.navigate(
          isComp
            ? `/project/${this.projectId}/components/${this.componentId}/edit`
            : `/project/${this.projectId}/${this.pageId}`,
        ),
      );
      container.appendChild(back);
      return container;
    }

    const base = isComp
      ? `#/project/${this.projectId}/components/${this.componentId}`
      : `#/project/${this.projectId}/${this.pageId}`;

    // --- Breadcrumb ---
    const breadcrumb = document.createElement('div');
    const parentLink = document.createElement('a');
    parentLink.href = isComp ? `${base}/edit` : base;
    parentLink.textContent = isComp
      ? (containerObj.name || 'Component')
      : 'Page';
    breadcrumb.appendChild(parentLink);
    breadcrumb.appendChild(
      document.createTextNode(
        node.type === 'include' ? ' / [Include slot]' :
        node.type === 'component'
          ? ` / [Component: ${node.component_name}]`
          : ` / <${node.tagName}>`,
      ),
    );
    container.appendChild(breadcrumb);

    // --- Type / tag / component info ---
    const infoRow = document.createElement('div');
    if (node.type === 'include') {
      infoRow.textContent = 'Include slot';
    } else if (node.type === 'component') {
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

    // --- Actions ---
    const actions = document.createElement('div');

    const createChildLink = document.createElement('a');
    createChildLink.href = `${base}/node/${node.id}/create`;
    createChildLink.textContent = '+ Create child node';
    actions.appendChild(createChildLink);

    const editLink = document.createElement('a');
    editLink.href = `${base}/node/${node.id}/edit`;
    editLink.textContent = 'Edit node';
    actions.appendChild(editLink);

    container.appendChild(actions);

    // --- Children ---
    const realItems = node.items.filter(
      (c) => c.type === 'node' || c.type === 'component' || c.type === 'include',
    );
    const pseudoItems = node.items.filter(
      (c) => c.type !== 'node' && c.type !== 'component' && c.type !== 'include',
    );

    const childrenHeading = document.createElement('h4');
    childrenHeading.textContent = `Children (${realItems.length})`;
    container.appendChild(childrenHeading);

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
        link.href = `${base}/node/${child.id}`;
        link.textContent =
          child.type === 'include' ? '[Include slot]' :
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
      const pseudoToggle = document.createElement('a');
      pseudoToggle.href = '#';
      pseudoToggle.textContent = `Show pseudo-classes (${pseudoItems.length})`;

      const pseudoList = document.createElement('ul');
      pseudoList.style.display = 'none';
      pseudoItems.forEach((child) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `${base}/node/${child.id}`;
        link.textContent = child.pseudo || child.type;
        li.appendChild(link);
        pseudoList.appendChild(li);
      });

      pseudoToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const hidden = pseudoList.style.display === 'none';
        pseudoList.style.display = hidden ? 'block' : 'none';
        pseudoToggle.textContent = hidden
          ? 'Hide pseudo-classes'
          : `Show pseudo-classes (${pseudoItems.length})`;
      });

      container.appendChild(pseudoToggle);
      container.appendChild(pseudoList);
    }

    // --- Back ---
    const backBtn = document.createElement('button');
    backBtn.textContent = isComp ? 'Back to component' : 'Back to page';
    backBtn.addEventListener('click', () =>
      this.router.navigate(isComp ? `${base}/edit` : base),
    );
    container.appendChild(backBtn);

    return container;
  }
}
