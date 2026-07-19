import { getPageById } from '../storage.js';

/**
 * NodeDetailView — shows a single node's properties (tagName, attrs, id)
 * and lists its children with links to drill further into the hierarchy.
 */
export class NodeDetailView {
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

      const back = document.createElement('button');
      back.textContent = 'Back to page';
      back.addEventListener('click', () =>
        this.router.navigate(`/project/${this.projectId}/${this.pageId}`),
      );
      container.appendChild(back);

      return container;
    }

    // --- Breadcrumb ---
    const breadcrumb = document.createElement('div');
    const pageLink = document.createElement('a');
    pageLink.href = `#/project/${this.projectId}/${this.pageId}`;
    pageLink.textContent = 'Page';
    breadcrumb.appendChild(pageLink);
    breadcrumb.appendChild(document.createTextNode(` / <${node.tagName}>`));
    container.appendChild(breadcrumb);

    // --- Type / pseudo / component info ---
    const typeRow = document.createElement('div');
    if (node.type === 'component') {
      typeRow.textContent = `Component: ${node.component_name}`;
    } else if (node.type !== 'node') {
      typeRow.textContent = `Type: ${node.type} — ${node.pseudo}`;
    } else {
      typeRow.textContent = `Tag: <${node.tagName}>`;
    }
    container.appendChild(typeRow);

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
    createChildLink.href =
      `#/project/${this.projectId}/${this.pageId}/node/${node.id}/create`;
    createChildLink.textContent = '+ Create child node';
    actions.appendChild(createChildLink);

    const editLink = document.createElement('a');
    editLink.href =
      `#/project/${this.projectId}/${this.pageId}/node/${node.id}/edit`;
    editLink.textContent = 'Edit node';
    actions.appendChild(editLink);

    container.appendChild(actions);

    // --- Children (items) ---
    const realItems = node.items.filter((c) => c.type === 'node' || c.type === 'component');
    const pseudoItems = node.items.filter((c) => c.type !== 'node' && c.type !== 'component');

    const childrenHeading = document.createElement('h4');
    childrenHeading.textContent = `Children (${realItems.length})`;
    container.appendChild(childrenHeading);

    // --- Regular node list ---
    if (realItems.length === 0) {
      const none = document.createElement('p');
      none.textContent = '(no children)';
      container.appendChild(none);
    } else {
      const childList = document.createElement('ul');
      realItems.forEach((child) => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.href =
          `#/project/${this.projectId}/${this.pageId}/node/${child.id}`;
        link.textContent =
          child.type === 'component'
            ? `[Component: ${child.component_name}] — ${child.items.length} children`
            : `<${child.tagName}> — ${child.items.length} children`;
        li.appendChild(link);

        childList.appendChild(li);
      });
      container.appendChild(childList);
    }

    // --- Toggle pseudo items ---
    if (pseudoItems.length > 0) {
      const pseudoToggle = document.createElement('a');
      pseudoToggle.href = '#';
      pseudoToggle.textContent = `Show pseudo-classes (${pseudoItems.length})`;

      const pseudoList = document.createElement('ul');
      pseudoList.style.display = 'none';
      pseudoItems.forEach((child) => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.href =
          `#/project/${this.projectId}/${this.pageId}/node/${child.id}`;
        link.textContent = `${child.pseudo || child.type}`;
        li.appendChild(link);

        pseudoList.appendChild(li);
      });

      pseudoToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const hidden = pseudoList.style.display === 'none';
        pseudoList.style.display = hidden ? 'block' : 'none';
        pseudoToggle.textContent = hidden
          ? `Hide pseudo-classes`
          : `Show pseudo-classes (${pseudoItems.length})`;
      });

      container.appendChild(pseudoToggle);
      container.appendChild(pseudoList);
    }

    // --- Back ---
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to page';
    backBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}/${this.pageId}`),
    );
    container.appendChild(backBtn);

    return container;
  }
}
