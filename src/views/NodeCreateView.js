import { getPageById, savePage } from '../storage.js';
import { Node } from '../models/Node.js';

/**
 * NodeCreateView — form to create a new node.
 *
 * Route pattern determines where the node is added:
 *   /project/:pid/:pageId/node/create       → top-level page item
 *   /project/:pid/:pageId/node/:nid/create  → child of :nid
 */
export class NodeCreateView {
  constructor(router, projectId, pageId, parentNodeId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = parseInt(pageId, 10);
    this.parentNodeId = parentNodeId ?? null; // null = top-level
  }

  render() {
    const container = document.createElement('div');

    const page = getPageById(this.projectId, this.pageId);
    let parentNode = null;

    if (!page) {
      const msg = document.createElement('p');
      msg.textContent = 'Page not found.';
      container.appendChild(msg);
      return container;
    }

    if (this.parentNodeId) {
      parentNode = page.findNodeById(this.parentNodeId);
      if (!parentNode) {
        const msg = document.createElement('p');
        msg.textContent = 'Parent node not found.';
        container.appendChild(msg);
        return container;
      }
    }

    // --- Heading ---
    const heading = document.createElement('h3');
    heading.textContent = this.parentNodeId
      ? `Create child node under <${parentNode.tagName}>`
      : 'Create top-level node';
    container.appendChild(heading);

    // --- Tag name ---
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag name';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = 'div';
    container.appendChild(tagLabel);
    container.appendChild(tagInput);

    // --- innerHTML (stored as attrs.textContent) ---
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'innerHTML';
    const htmlInput = document.createElement('textarea');
    htmlInput.placeholder = 'Optional text content…';
    container.appendChild(htmlLabel);
    container.appendChild(htmlInput);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Create';
    saveBtn.addEventListener('click', () => {
      const tag = tagInput.value.trim() || 'div';
      const innerHTML = htmlInput.value;

      const attrs = innerHTML ? { textContent: innerHTML } : {};
      const newNode = new Node(tag, attrs);

      if (parentNode) {
        parentNode.items.push(newNode);
      } else {
        page.items.push(newNode);
      }

      savePage(this.projectId, this.pageId, page);

      // Navigate back to the node detail view or page view
      if (this.parentNodeId) {
        this.router.navigate(
          `/project/${this.projectId}/${this.pageId}/node/${this.parentNodeId}`,
        );
      } else {
        this.router.navigate(
          `/project/${this.projectId}/${this.pageId}`,
        );
      }
    });
    container.appendChild(saveBtn);

    // --- Cancel ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      if (this.parentNodeId) {
        this.router.navigate(
          `/project/${this.projectId}/${this.pageId}/node/${this.parentNodeId}`,
        );
      } else {
        this.router.navigate(
          `/project/${this.projectId}/${this.pageId}`,
        );
      }
    });
    container.appendChild(cancelBtn);

    return container;
  }
}
