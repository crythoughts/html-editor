import { getProjectById, deleteProject, saveProject } from '../storage.js';
import { Project } from '../models/Project.js';

/**
 * ProjectDetailView — shows project metadata, page tree, and a render button.
 */
export class ProjectDetailView {
  constructor(router, projectId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);

    if (!project) {
      const msg = document.createElement('p');
      msg.textContent = 'Project not found.';
      container.appendChild(msg);

      const back = document.createElement('button');
      back.textContent = 'Back to list';
      back.addEventListener('click', () => this.router.navigate('/'));
      container.appendChild(back);

      return container;
    }

    // --- Heading ---
    const heading = document.createElement('h2');
    heading.textContent = project.name;
    container.appendChild(heading);

    // --- Metadata ---
    const meta = document.createElement('dl');
    const addMeta = (label, value) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      meta.appendChild(dt);
      meta.appendChild(dd);
    };
    if (project.description) addMeta('Description', project.description);
    if (project.author) addMeta('Author', project.author);
    addMeta('Created', new Date(project.created_at).toLocaleString());
    addMeta('Edited', new Date(project.edited_at).toLocaleString());
    addMeta('Pages', String(project.pages.length));
    container.appendChild(meta);

    // --- Pages list ---
    const pagesHeading = document.createElement('h3');
    pagesHeading.textContent = 'Pages';
    container.appendChild(pagesHeading);

    const pageList = document.createElement('ul');
    project.pages.forEach((page, idx) => {
      const li = document.createElement('li');
      li.textContent = `${idx + 1}. ${page.title} (${page.items.length} nodes)`;
      pageList.appendChild(li);
    });
    container.appendChild(pageList);

    // --- Actions ---
    const actions = document.createElement('div');

    const renderBtn = document.createElement('button');
    renderBtn.textContent = 'Render';
    renderBtn.addEventListener('click', () => {
      // Open the rendered result in a new tab
      const url = `${window.location.origin}${window.location.pathname}#/render/${this.projectId}`;
      window.open(url, '_blank');
    });
    actions.appendChild(renderBtn);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Back to list';
    editBtn.addEventListener('click', () => {
      this.router.navigate('/');
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete project';
    deleteBtn.addEventListener('click', () => {
      deleteProject(this.projectId);
      this.router.navigate('/');
    });
    actions.appendChild(deleteBtn);

    container.appendChild(actions);

    return container;
  }
}
