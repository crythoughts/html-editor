import { getProjects, deleteProject } from '../storage.js';

/**
 * ProjectListView — shows all saved projects with links to view/edit each.
 */
export class ProjectListView {
  constructor(router) {
    this.router = router;
  }

  render() {
    const container = document.createElement('div');

    const heading = document.createElement('h2');
    heading.textContent = 'Projects';
    container.appendChild(heading);

    const createLink = document.createElement('button');
    createLink.textContent = '+ New Project';
    createLink.addEventListener('click', () => {
      this.router.navigate('/create');
    });
    container.appendChild(createLink);

    const importLink = document.createElement('button');
    importLink.textContent = 'Import from JSON';
    importLink.addEventListener('click', () => {
      this.router.navigate('/import');
    });
    container.appendChild(importLink);

    const projects = getProjects();

    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No projects yet. Create one!';
      container.appendChild(empty);
      return container;
    }

    const list = document.createElement('ul');
    projects.forEach((project, index) => {
      const item = document.createElement('li');

      const link = document.createElement('a');
      link.href = `#/project/${index}`;
      link.textContent = `${project.name} (${project.pages.length} pages)`;
      item.appendChild(link);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        deleteProject(index);
        this.router.resolve();
      });
      item.appendChild(deleteBtn);

      list.appendChild(item);
    });
    container.appendChild(list);

    return container;
  }
}
