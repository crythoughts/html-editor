import { getProjectById } from '../storage.js';

/**
 * ComponentDetailView — shows a component's properties, variables, and
 * an inline tree of its items.
 */
export class ComponentDetailView {
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

    // --- Breadcrumb ---
    const breadcrumb = document.createElement('div');
    const projLink = document.createElement('a');
    projLink.href = `#/project/${this.projectId}/components`;
    projLink.textContent = 'Components';
    breadcrumb.appendChild(projLink);
    breadcrumb.appendChild(document.createTextNode(` / ${comp.name}`));
    container.appendChild(breadcrumb);

    // --- Name ---
    const heading = document.createElement('h2');
    heading.textContent = comp.name;
    container.appendChild(heading);

    // --- ID ---
    const idRow = document.createElement('div');
    idRow.textContent = `ID: ${comp.id}`;
    container.appendChild(idRow);

    // --- Variables ---
    const varsHeading = document.createElement('h4');
    varsHeading.textContent = `Variables (${comp.variables.length})`;
    container.appendChild(varsHeading);

    if (comp.variables.length === 0) {
      const none = document.createElement('p');
      none.textContent = '(none)';
      container.appendChild(none);
    } else {
      const list = document.createElement('ul');
      comp.variables.forEach((v) => {
        const li = document.createElement('li');
        li.textContent = `${v.name}: ${v.type} = "${v.default}"`;
        list.appendChild(li);
      });
      container.appendChild(list);
    }

    // --- Items tree ---
    const itemsHeading = document.createElement('h4');
    itemsHeading.textContent = `Items (${comp.items.length})`;
    container.appendChild(itemsHeading);

    if (comp.items.length === 0) {
      const none = document.createElement('p');
      none.textContent = '(no items)';
      container.appendChild(none);
    } else {
      const list = document.createElement('ul');
      comp.items.forEach((node) => {
        const li = document.createElement('li');
        const tag = node.type === 'component'
          ? `[Component: ${node.component_name}]`
          : `<${node.tagName}>`;
        li.textContent = `${tag} — ${node.items.length} children`;
        list.appendChild(li);
      });
      container.appendChild(list);
    }

    // --- Actions ---
    const actions = document.createElement('div');

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () =>
      this.router.navigate(
        `/project/${this.projectId}/components/${this.compId}/edit`,
      ),
    );
    actions.appendChild(editBtn);

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to components';
    backBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}/components`),
    );
    actions.appendChild(backBtn);

    container.appendChild(actions);

    return container;
  }
}
