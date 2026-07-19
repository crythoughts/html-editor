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
      ? `Create child under <${parentNode.tagName}>`
      : 'Create top-level node';
    container.appendChild(heading);

    // --- Type selector ---
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type';
    const typeSelect = document.createElement('select');
    ['node', 'pseudo_class', 'pseudo_element'].forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t === 'node' ? 'Node' : t === 'pseudo_class' ? 'Pseudo-class' : 'Pseudo-element';
      typeSelect.appendChild(opt);
    });
    container.appendChild(typeLabel);
    container.appendChild(typeSelect);

    // --- Pseudo field (hidden when type = node) ---
    const pseudoRow = document.createElement('div');
    pseudoRow.style.display = 'none';
    const pseudoLabel = document.createElement('label');
    pseudoLabel.textContent = 'Pseudo';
    const pseudoInput = document.createElement('input');
    pseudoInput.type = 'text';
    pseudoInput.placeholder = 'e.g. :hover or ::before';
    pseudoRow.appendChild(pseudoLabel);
    pseudoRow.appendChild(pseudoInput);
    container.appendChild(pseudoRow);

    typeSelect.addEventListener('change', () => {
      pseudoRow.style.display = typeSelect.value === 'node' ? 'none' : 'block';
    });

    // --- Tag name (hidden for pseudo types) ---
    const tagRow = document.createElement('div');
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag name';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = 'div';
    tagRow.appendChild(tagLabel);
    tagRow.appendChild(tagInput);
    container.appendChild(tagRow);

    // --- innerHTML (hidden for pseudo types) ---
    const htmlRow = document.createElement('div');
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'innerHTML';
    const htmlInput = document.createElement('textarea');
    htmlInput.placeholder = 'Optional text content…';
    htmlRow.appendChild(htmlLabel);
    htmlRow.appendChild(htmlInput);
    container.appendChild(htmlRow);

    // Toggle tag/innerHTML visibility based on type
    const toggleNodeFields = (show) => {
      tagRow.style.display = show ? 'block' : 'none';
      htmlRow.style.display = show ? 'block' : 'none';
    };
    typeSelect.addEventListener('change', () => {
      const isNode = typeSelect.value === 'node';
      toggleNodeFields(isNode);
    });

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Create';
    saveBtn.addEventListener('click', () => {
      const type = typeSelect.value;

      let newNode;
      if (type === 'node') {
        const tag = tagInput.value.trim() || 'div';
        const innerHTML = htmlInput.value;
        const attrs = innerHTML ? { textContent: innerHTML } : {};
        newNode = new Node(tag, attrs);
      } else {
        // Pseudo — only pseudo marker matters
        newNode = new Node('div', {});
        newNode.type = type;
        newNode.pseudo = pseudoInput.value.trim();
        newNode.tagName = type === 'pseudo_class' ? ':pseudo-class' : '::pseudo-element';
      }

      if (parentNode) {
        parentNode.items.push(newNode);
      } else {
        page.items.push(newNode);
      }

      savePage(this.projectId, this.pageId, page);

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
