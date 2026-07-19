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

    // --- Attributes ---
    const attrsHeading = document.createElement('h4');
    attrsHeading.textContent = 'Attributes';
    container.appendChild(attrsHeading);

    const attrsContainer = document.createElement('div');

    /**
     * Create a single attribute row: key input + value input + remove button.
     * @param {string} key
     * @param {string} value
     */
    const addAttrRow = (key, value) => {
      const row = document.createElement('div');

      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.placeholder = 'Attribute name';
      keyInput.value = key;
      row.appendChild(keyInput);

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.placeholder = 'Value';
      valueInput.value = value;
      row.appendChild(valueInput);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2212'; // minus sign
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      attrsContainer.appendChild(row);
    };

    // Populate rows from existing attrs (skip textContent — handled by innerHTML)
    for (const [key, value] of Object.entries(node.attrs)) {
      if (key !== 'textContent') {
        addAttrRow(key, value);
      }
    }

    container.appendChild(attrsContainer);

    const addAttrBtn = document.createElement('button');
    addAttrBtn.textContent = '+';
    addAttrBtn.addEventListener('click', () => addAttrRow('', ''));
    container.appendChild(addAttrBtn);

    // --- Save changes ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save changes';
    saveBtn.addEventListener('click', () => {
      node.tagName = tagInput.value.trim() || 'div';

      // Collect attributes from rows
      const newAttrs = {};
      for (const row of attrsContainer.children) {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        if (key) {
          newAttrs[key] = inputs[1].value;
        }
      }

      // innerHTML maps to textContent
      const html = htmlInput.value;
      if (html) {
        newAttrs.textContent = html;
      }

      node.attrs = newAttrs;
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
