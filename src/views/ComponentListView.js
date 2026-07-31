import { getProjectById, saveProject } from '../storage.js';

/**
 * ComponentListView — lists all components in a project.
 */
export class ComponentListView {
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

    const heading = document.createElement('h2');
    heading.textContent = `Components — ${project.name}`;
    container.appendChild(heading);

    const createLink = document.createElement('a');
    createLink.href = `#/project/${this.projectId}/components/create`;
    createLink.textContent = '+ Create component';
    container.appendChild(createLink);

    const components = (project.components || []);
    if (components.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No components yet.';
      container.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      components.forEach((comp, idx) => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.href = `#/project/${this.projectId}/components/${idx}`;
        link.textContent = `${comp.name} (${comp.items.length} nodes, ${comp.variables.length} vars)`;
        li.appendChild(link);

        list.appendChild(li);
      });
      container.appendChild(list);
    }

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to project';
    backBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}`),
    );
    container.appendChild(backBtn);

    return container;
  }
}
