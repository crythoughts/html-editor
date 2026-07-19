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

    const type = node.type;
    const isRegular = type === 'node';
    const isPseudo = type === 'pseudo_class' || type === 'pseudo_element';
    const isComp = type === 'component';

    // --- Heading ---
    const heading = document.createElement('h3');
    heading.textContent = isPseudo
      ? `Edit ${node.pseudo || type}`
      : isComp
        ? `Edit component reference: ${node.component_name}`
        : `Edit <${node.tagName}>`;
    container.appendChild(heading);

    // --- Type (read-only display) ---
    const typeRow = document.createElement('div');
    typeRow.textContent = `Type: ${type}`;
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
    pseudoRow.style.display = isPseudo ? 'block' : 'none';
    container.appendChild(pseudoRow);

    // --- Component name field (only for component type) ---
    const compRow = document.createElement('div');
    const compLabel = document.createElement('label');
    compLabel.textContent = 'Component name';
    const compInput = document.createElement('input');
    compInput.type = 'text';
    compInput.value = node.component_name;
    compRow.appendChild(compLabel);
    compRow.appendChild(compInput);
    compRow.style.display = isComp ? 'block' : 'none';
    container.appendChild(compRow);

    // --- Component variables overrides (only for component type) ---
    const varsSection = document.createElement('div');
    varsSection.style.display = isComp ? 'block' : 'none';
    const varsHeading = document.createElement('h4');
    varsHeading.textContent = 'Variable overrides';
    varsSection.appendChild(varsHeading);
    const varsContainer = document.createElement('div');
    const addVarOverride = (key, val) => {
      const row = document.createElement('div');
      const kInp = document.createElement('input');
      kInp.type = 'text';
      kInp.placeholder = 'Variable name';
      kInp.value = key;
      row.appendChild(kInp);
      const vInp = document.createElement('input');
      vInp.type = 'text';
      vInp.placeholder = 'Override value';
      vInp.value = val;
      row.appendChild(vInp);
      const rmBtn = document.createElement('button');
      rmBtn.textContent = '\u2212';
      rmBtn.addEventListener('click', () => row.remove());
      row.appendChild(rmBtn);
      varsContainer.appendChild(row);
    };
    for (const [k, v] of Object.entries(node.variables ?? [])) {
      addVarOverride(k, v);
    }
    varsSection.appendChild(varsContainer);
    const addVarBtn = document.createElement('button');
    addVarBtn.textContent = '+';
    addVarBtn.addEventListener('click', () => addVarOverride('', ''));
    varsSection.appendChild(addVarBtn);
    container.appendChild(varsSection);

    // --- Tag name (hidden for pseudo / component types) ---
    const tagRow = document.createElement('div');
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag name';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = node.tagName;
    tagRow.appendChild(tagLabel);
    tagRow.appendChild(tagInput);
    tagRow.style.display = isRegular ? 'block' : 'none';
    container.appendChild(tagRow);

    // --- innerHTML (hidden for pseudo / component types) ---
    const htmlRow = document.createElement('div');
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'innerHTML';
    const htmlInput = document.createElement('textarea');
    htmlInput.value = node.attrs.textContent || '';
    htmlRow.appendChild(htmlLabel);
    htmlRow.appendChild(htmlInput);
    htmlRow.style.display = isRegular ? 'block' : 'none';
    container.appendChild(htmlRow);

    // --- Attributes (hidden for pseudo / component types) ---
    const attrsSection = document.createElement('div');
    attrsSection.style.display = isRegular ? 'block' : 'none';

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
    stylesLink.textContent = 'Edit styles';
    subLinks.appendChild(stylesLink);

    if (isRegular) {
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
      node.component_name = compInput.value.trim();
      node.tagName = tagInput.value.trim() || 'div';

      // Collect component variable overrides
      const newVars = {};
      for (const row of varsContainer.children) {
        const inputs = row.querySelectorAll('input');
        const k = inputs[0].value.trim();
        if (k) newVars[k] = inputs[1].value;
      }
      node.variables = newVars;

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
