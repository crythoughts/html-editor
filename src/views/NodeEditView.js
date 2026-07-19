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

    const isPseudo = node.type !== 'node';

    // --- Heading ---
    const heading = document.createElement('h3');
    heading.textContent = isPseudo
      ? `Edit ${node.pseudo || node.type}`
      : `Edit <${node.tagName}>`;
    container.appendChild(heading);

    // --- Type (read-only display) ---
    const typeRow = document.createElement('div');
    typeRow.textContent = `Type: ${node.type}`;
    container.appendChild(typeRow);

    // --- Pseudo field (only for pseudo types) ---
    const pseudoRow = document.createElement('div');
    const pseudoLabel = document.createElement('label');
    pseudoLabel.textContent = 'Pseudo';
    const pseudoInput = document.createElement('input');
    pseudoInput.type = 'text';
    pseudoInput.placeholder = 'e.g. :hover or ::before';
    pseudoInput.value = node.pseudo;
    pseudoRow.appendChild(pseudoLabel);
    pseudoRow.appendChild(pseudoInput);
    if (!isPseudo) pseudoRow.style.display = 'none';
    container.appendChild(pseudoRow);

    // --- Tag name (hidden for pseudo types) ---
    const tagRow = document.createElement('div');
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag name';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = node.tagName;
    tagRow.appendChild(tagLabel);
    tagRow.appendChild(tagInput);
    if (isPseudo) tagRow.style.display = 'none';
    container.appendChild(tagRow);

    // --- innerHTML (hidden for pseudo types) ---
    const htmlRow = document.createElement('div');
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'innerHTML';
    const htmlInput = document.createElement('textarea');
    htmlInput.value = node.attrs.textContent || '';
    htmlRow.appendChild(htmlLabel);
    htmlRow.appendChild(htmlInput);
    if (isPseudo) htmlRow.style.display = 'none';
    container.appendChild(htmlRow);

    // --- Attributes (hidden for pseudo types) ---
    const attrsSection = document.createElement('div');
    if (isPseudo) attrsSection.style.display = 'none';

    const attrsHeading = document.createElement('h4');
    attrsHeading.textContent = 'Attributes';
    attrsSection.appendChild(attrsHeading);

    const attrsContainer = document.createElement('div');

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
      removeBtn.textContent = '−';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      attrsContainer.appendChild(row);
    };

    for (const [key, value] of Object.entries(node.attrs)) {
      if (key !== 'textContent') {
        addAttrRow(key, value);
      }
    }

    attrsSection.appendChild(attrsContainer);

    const addAttrBtn = document.createElement('button');
    addAttrBtn.textContent = '+';
    addAttrBtn.addEventListener('click', () => addAttrRow('', ''));
    attrsSection.appendChild(addAttrBtn);

    container.appendChild(attrsSection);

    // --- Sub-editor links ---
    const subLinks = document.createElement('div');

    const stylesLink = document.createElement('a');
    stylesLink.href =
      `#/project/${this.projectId}/${this.pageId}/node/${this.nodeId}/edit/styles`;
    stylesLink.textContent = isPseudo ? 'Edit styles' : 'Edit styles';
    subLinks.appendChild(stylesLink);

    if (!isPseudo) {
      const idLink = document.createElement('a');
      idLink.href =
        `#/project/${this.projectId}/${this.pageId}/node/${this.nodeId}/edit/id`;
      idLink.textContent = 'Edit id';
      subLinks.appendChild(idLink);

      const classesLink = document.createElement('a');
      classesLink.href =
        `#/project/${this.projectId}/${this.pageId}/node/${this.nodeId}/edit/classes`;
      classesLink.textContent = 'Edit classes';
      subLinks.appendChild(classesLink);
    }

    container.appendChild(subLinks);

    // --- Save changes ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save changes';
    saveBtn.addEventListener('click', () => {
      node.pseudo = pseudoInput.value.trim();
      node.tagName = tagInput.value.trim() || 'div';

      const newAttrs = {};
      for (const row of attrsContainer.children) {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        if (key) {
          newAttrs[key] = inputs[1].value;
        }
      }

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
