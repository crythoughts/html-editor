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

    // --- Tag name ---
    const tagRow = document.createElement('div');
    tagRow.textContent = `Tag: <${node.tagName}>`;
    container.appendChild(tagRow);

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

    // --- Children (items) ---
    const childrenHeading = document.createElement('h4');
    childrenHeading.textContent = `Children (${node.items.length})`;
    container.appendChild(childrenHeading);

    if (node.items.length === 0) {
      const none = document.createElement('p');
      none.textContent = '(no children)';
      container.appendChild(none);
    } else {
      const childList = document.createElement('ul');
      node.items.forEach((child) => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.href =
          `#/project/${this.projectId}/${this.pageId}/node/${child.id}`;
        link.textContent =
          `<${child.tagName}> — ${child.items.length} children`;
        li.appendChild(link);

        childList.appendChild(li);
      });
      container.appendChild(childList);
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
