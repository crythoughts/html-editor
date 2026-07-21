import { getPageById, savePage, getProjectById, saveProject } from '../storage.js';

/**
 * NodeEditView — edit a node's tag, innerHTML, attributes, or delete it.
 * Works for both page nodes and component nodes (when componentId is given).
 */
export class NodeEditView {
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
            ? `#/project/${this.projectId}/components/${this.componentId}/edit`
            : `#/project/${this.projectId}/${this.pageId}`,
        ),
      );
      container.appendChild(back);
      return container;
    }

    const base = isComp
      ? `#/project/${this.projectId}/components/${this.componentId}`
      : `#/project/${this.projectId}/${this.pageId}`;

    const type = node.type;
    const isRegular = type === 'node';
    const isPseudo = type === 'pseudo_class' || type === 'pseudo_element';
    const isCompType = type === 'component';
    const isInclude = type === 'include';

    // --- Heading ---
    const heading = document.createElement('h3');
    heading.textContent = isPseudo
      ? `Edit ${node.pseudo || type}`
      : isCompType
        ? `Edit component reference: ${node.component_name}`
        : isInclude
          ? 'Edit include slot'
          : `Edit <${node.tagName}>`;
    container.appendChild(heading);

    // --- Type (read-only) ---
    const typeRow = document.createElement('div');
    typeRow.textContent = `Type: ${type}`;
    container.appendChild(typeRow);

    // --- Label ---
    const labelRow = document.createElement('div');
    const labelLabel = document.createElement('label');
    labelLabel.textContent = 'Label: ';
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = node.label || '';
    labelInput.placeholder = 'Auto';
    labelRow.appendChild(labelLabel);
    labelRow.appendChild(labelInput);
    container.appendChild(labelRow);

    // --- Preset name (if any) ---
    if (node.presetName) {
      const presetRow = document.createElement('div');
      presetRow.textContent = `Preset: ${node.presetName}`;
      container.appendChild(presetRow);
    }

    // --- Pseudo field ---
    const pseudoRow = document.createElement('div');
    pseudoRow.style.display = isPseudo ? 'block' : 'none';
    const pseudoLabel = document.createElement('label');
    pseudoLabel.textContent = 'Pseudo';
    const pseudoInput = document.createElement('input');
    pseudoInput.type = 'text';
    pseudoInput.placeholder = 'e.g. :hover or ::before';
    pseudoInput.value = node.pseudo;
    pseudoRow.appendChild(pseudoLabel);
    pseudoRow.appendChild(pseudoInput);
    container.appendChild(pseudoRow);

    // --- Component name field ---
    const compRow = document.createElement('div');
    compRow.style.display = isCompType ? 'block' : 'none';
    const compLabel = document.createElement('label');
    compLabel.textContent = 'Component name';
    const compInput = document.createElement('input');
    compInput.type = 'text';
    compInput.value = node.component_name;
    compRow.appendChild(compLabel);
    compRow.appendChild(compInput);
    container.appendChild(compRow);

    // --- Component variable overrides ---
    const varsSection = document.createElement('div');
    varsSection.style.display = isCompType ? 'block' : 'none';
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

    // --- Tag name ---
    const tagRow = document.createElement('div');
    tagRow.style.display = isRegular ? 'block' : 'none';
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag name';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = node.tagName;
    tagRow.appendChild(tagLabel);
    tagRow.appendChild(tagInput);
    container.appendChild(tagRow);

    // --- innerHTML ---
    const htmlRow = document.createElement('div');
    htmlRow.style.display = isRegular ? 'block' : 'none';
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'innerHTML';
    const htmlInput = document.createElement('textarea');
    htmlInput.value = node.attrs.textContent || '';
    htmlRow.appendChild(htmlLabel);
    htmlRow.appendChild(htmlInput);
    container.appendChild(htmlRow);

    // --- Attributes ---
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
      removeBtn.textContent = '\u2212';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);
      attrsContainer.appendChild(row);
    };
    for (const [key, value] of Object.entries(node.attrs)) {
      if (key !== 'textContent') addAttrRow(key, value);
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
    stylesLink.href = `${base}/node/${this.nodeId}/edit/styles`;
    stylesLink.textContent = 'Edit styles';
    subLinks.appendChild(stylesLink);

    if (isRegular) {
      const idLink = document.createElement('a');
      idLink.href = `${base}/node/${this.nodeId}/edit/id`;
      idLink.textContent = 'Edit id';
      subLinks.appendChild(idLink);

      const classesLink = document.createElement('a');
      classesLink.href = `${base}/node/${this.nodeId}/edit/classes`;
      classesLink.textContent = 'Edit classes';
      subLinks.appendChild(classesLink);
    }

    container.appendChild(subLinks);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save changes';
    saveBtn.addEventListener('click', () => {
      node.pseudo = pseudoInput.value.trim();
      node.component_name = compInput.value.trim();
      node.label = labelInput.value.trim();
      node.tagName = tagInput.value.trim() || 'div';

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
        if (key) newAttrs[key] = inputs[1].value;
      }
      const html = htmlInput.value;
      if (html) newAttrs.textContent = html;
      node.attrs = newAttrs;

      if (isComp) {
        project.edited_at = Date.now();
        saveProject(this.projectId, project);
      } else {
        savePage(this.projectId, this.pageId, containerObj);
      }

      this.router.navigate(`${base}/node/${this.nodeId}`);
    });
    container.appendChild(saveBtn);

    // --- Delete ---
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete node';
    deleteBtn.addEventListener('click', () => {
      containerObj.removeNodeById(this.nodeId);
      if (isComp) {
        project.edited_at = Date.now();
        saveProject(this.projectId, project);
      } else {
        savePage(this.projectId, this.pageId, containerObj);
      }
      this.router.navigate(isComp ? `${base}/edit` : base);
    });
    container.appendChild(deleteBtn);

    // --- Cancel ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.router.navigate(`${base}/node/${this.nodeId}`);
    });
    container.appendChild(cancelBtn);

    return container;
  }
}
