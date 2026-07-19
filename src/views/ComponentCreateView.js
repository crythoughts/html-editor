import { getProjectById, saveProject } from '../storage.js';
import { Component } from '../models/Component.js';
import { Variable } from '../models/Variable.js';
import { Node } from '../models/Node.js';

/**
 * ComponentCreateView — creates a new component with name and optional
 * initial items / variables.
 */
export class ComponentCreateView {
  constructor(router, projectId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);
    if (!project) {
      container.appendChild(document.createTextNode('Project not found.'));
      return container;
    }

    const heading = document.createElement('h3');
    heading.textContent = 'Create Component';
    container.appendChild(heading);

    // --- Name ---
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Component name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'my-component';
    container.appendChild(nameLabel);
    container.appendChild(nameInput);

    // --- Variables section ---
    const varsHeading = document.createElement('h4');
    varsHeading.textContent = 'Variables';
    container.appendChild(varsHeading);

    const varsContainer = document.createElement('div');

    const addVarRow = (name = '', type = 'str', defaultVal = '') => {
      const row = document.createElement('div');

      const nameInp = document.createElement('input');
      nameInp.type = 'text';
      nameInp.placeholder = 'Variable name';
      nameInp.value = name;
      row.appendChild(nameInp);

      const typeSel = document.createElement('select');
      ['str', 'int'].forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === type) opt.selected = true;
        typeSel.appendChild(opt);
      });
      row.appendChild(typeSel);

      const defInp = document.createElement('input');
      defInp.type = 'text';
      defInp.placeholder = 'Default value';
      defInp.value = defaultVal;
      row.appendChild(defInp);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2212';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      varsContainer.appendChild(row);
    };

    container.appendChild(varsContainer);

    const addVarBtn = document.createElement('button');
    addVarBtn.textContent = '+ Add variable';
    addVarBtn.addEventListener('click', () => addVarRow());
    container.appendChild(addVarBtn);

    // --- Initial items section ---
    const itemsHeading = document.createElement('h4');
    itemsHeading.textContent = 'Initial items';
    container.appendChild(itemsHeading);

    const itemsContainer = document.createElement('div');

    const addItemRow = (tag = 'div', text = '') => {
      const row = document.createElement('div');

      const tagInp = document.createElement('input');
      tagInp.type = 'text';
      tagInp.placeholder = 'Tag name';
      tagInp.value = tag;
      row.appendChild(tagInp);

      const textInp = document.createElement('input');
      textInp.type = 'text';
      textInp.placeholder = 'Text content';
      textInp.value = text;
      row.appendChild(textInp);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2212';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      itemsContainer.appendChild(row);
    };

    container.appendChild(itemsContainer);

    const addItemBtn = document.createElement('button');
    addItemBtn.textContent = '+ Add item';
    addItemBtn.addEventListener('click', () => addItemRow());
    container.appendChild(addItemBtn);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Create';
    saveBtn.addEventListener('click', () => {
      const comp = new Component(nameInput.value.trim() || 'Untitled');

      // Collect variables
      for (const row of varsContainer.children) {
        const [nameInp, typeSel, defInp] = row.querySelectorAll('input, select');
        const vName = nameInp.value.trim();
        if (vName) {
          comp.variables.push(new Variable(vName, typeSel.value, defInp.value));
        }
      }

      // Collect items
      for (const row of itemsContainer.children) {
        const [tagInp, textInp] = row.querySelectorAll('input');
        const tag = tagInp.value.trim() || 'div';
        const text = textInp.value.trim();
        const attrs = text ? { textContent: text } : {};
        comp.items.push(new Node(tag, attrs));
      }

      if (!project.components) {
          project.components = [];
      }

      project.components.push(comp);
      project.edited_at = Date.now();
      saveProject(this.projectId, project);
      this.router.navigate(`/project/${this.projectId}/components`);
    });
    container.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}/components`),
    );
    container.appendChild(cancelBtn);

    return container;
  }
}
