import { getPageById, savePage } from '../storage.js';

/**
 * NodeClassesView — edit the node's class attribute (space-separated list).
 */
export class NodeClassesView {
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
    heading.textContent = `Classes — <${node.tagName}>`;
    container.appendChild(heading);

    const hint = document.createElement('p');
    hint.textContent = 'Separate multiple class names with spaces.';
    container.appendChild(hint);

    // --- Class input ---
    const label = document.createElement('label');
    label.textContent = 'class';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'foo bar baz';
    input.value = node.attrs.class || '';
    container.appendChild(label);
    container.appendChild(input);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save classes';
    saveBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (val) {
        node.attrs.class = val;
      } else {
        delete node.attrs.class;
      }
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
