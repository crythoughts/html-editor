import { getProjectById, saveProject } from '../storage.js';
import { Variable } from '../models/Variable.js';

/**
 * ComponentEditView — edit a component's name, variables, and items.
 */
export class ComponentEditView {
  constructor(router, projectId, compId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.compId = parseInt(compId, 10);
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);
    const comp = project ? project.components[this.compId] : null;

    if (!project || !comp) {
      container.appendChild(document.createTextNode('Component not found.'));
      return container;
    }

    const heading = document.createElement('h3');
    heading.textContent = `Edit — ${comp.name}`;
    container.appendChild(heading);

    // --- Name ---
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Component name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = comp.name;
    container.appendChild(nameLabel);
    container.appendChild(nameInput);

    // --- Variables ---
    const varsHeading = document.createElement('h4');
    varsHeading.textContent = 'Variables';
    container.appendChild(varsHeading);

    const varsContainer = document.createElement('div');

    const addVarRow = (v) => {
      const row = document.createElement('div');

      const nameInp = document.createElement('input');
      nameInp.type = 'text';
      nameInp.placeholder = 'Variable name';
      nameInp.value = v ? v.name : '';
      row.appendChild(nameInp);

      const typeSel = document.createElement('select');
      ['str', 'int'].forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (v && v.type === t) opt.selected = true;
        typeSel.appendChild(opt);
      });
      row.appendChild(typeSel);

      const defInp = document.createElement('input');
      defInp.type = 'text';
      defInp.placeholder = 'Default value';
      defInp.value = v ? v.default : '';
      row.appendChild(defInp);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2212';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      varsContainer.appendChild(row);
    };

    comp.variables.forEach((v) => addVarRow(v));

    container.appendChild(varsContainer);

    const addVarBtn = document.createElement('button');
    addVarBtn.textContent = '+ Add variable';
    addVarBtn.addEventListener('click', () => addVarRow(null));
    container.appendChild(addVarBtn);

    // --- Items ---
    const itemsHeading = document.createElement('h4');
    itemsHeading.textContent = `Items (${comp.items.length})`;
    container.appendChild(itemsHeading);

    const createLink = document.createElement('a');
    createLink.href =
      `#/project/${this.projectId}/components/${this.compId}/node/create`;
    createLink.textContent = '+ Create node';
    container.appendChild(createLink);

    if (comp.items.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No items yet.';
      container.appendChild(empty);
    } else {
      const itemList = document.createElement('ul');
      const renderItem = (node) => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.href =
          `#/project/${this.projectId}/components/${this.compId}/node/${node.id}`;
        link.textContent =
          node.type === 'component'
            ? `[Component: ${node.component_name}] — ${node.items.length} children`
            : `<${node.tagName}> — ${node.items.length} children`;
        li.appendChild(link);

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          comp.removeNodeById(node.id);
          project.edited_at = Date.now();
          saveProject(this.projectId, project);
          this.router.resolve();
        });
        li.appendChild(delBtn);

        itemList.appendChild(li);
      };
      comp.items.forEach(renderItem);
      container.appendChild(itemList);
    }

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save changes';
    saveBtn.addEventListener('click', () => {
      comp.name = nameInput.value.trim() || 'Untitled';

      const newVars = [];
      for (const row of varsContainer.children) {
        const [nameInp, typeSel, defInp] = row.querySelectorAll('input, select');
        const vName = nameInp.value.trim();
        if (vName) {
          newVars.push(new Variable(vName, typeSel.value, defInp.value));
        }
      }
      comp.variables = newVars;
      project.edited_at = Date.now();
      saveProject(this.projectId, project);

      this.router.navigate(
        `/project/${this.projectId}/components/${this.compId}`,
      );
    });
    container.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () =>
      this.router.navigate(
        `/project/${this.projectId}/components/${this.compId}`,
      ),
    );
    container.appendChild(cancelBtn);

    return container;
  }
}
