import { getPageById, savePage } from '../storage.js';

/**
 * NodeEditView — edit a node's tag and innerHTML, or delete it entirely.
 */
export class NodeEditView {
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

    // --- Heading ---
    const heading = document.createElement('h3');
    heading.textContent = `Edit <${node.tagName}>`;
    container.appendChild(heading);

    // --- Tag name ---
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag name';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = node.tagName;
    container.appendChild(tagLabel);
    container.appendChild(tagInput);

    // --- innerHTML ---
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'innerHTML';
    const htmlInput = document.createElement('textarea');
    htmlInput.value = node.attrs.textContent || '';
    container.appendChild(htmlLabel);
    container.appendChild(htmlInput);

    // --- Save changes ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save changes';
    saveBtn.addEventListener('click', () => {
      node.tagName = tagInput.value.trim() || 'div';
      const html = htmlInput.value;
      if (html) {
        node.attrs.textContent = html;
      } else {
        delete node.attrs.textContent;
      }
      savePage(this.projectId, this.pageId, page);
      this.router.navigate(
        `/project/${this.projectId}/${this.pageId}/node/${this.nodeId}`,
      );
    });
    container.appendChild(saveBtn);

    // --- Delete node ---
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete node';
    deleteBtn.addEventListener('click', () => {
      page.removeNodeById(this.nodeId);
      savePage(this.projectId, this.pageId, page);
      this.router.navigate(
        `/project/${this.projectId}/${this.pageId}`,
      );
    });
    container.appendChild(deleteBtn);

    // --- Cancel ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.router.navigate(
        `/project/${this.projectId}/${this.pageId}/node/${this.nodeId}`,
      );
    });
    container.appendChild(cancelBtn);

    return container;
  }
}
