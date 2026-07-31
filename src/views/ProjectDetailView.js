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
    addMeta('Created', new Date(project.created_at).toLocaleString(navigator.language));
    addMeta('Edited', new Date(project.edited_at).toLocaleString(navigator.language));
    addMeta('Pages', String(project.pages.length));
    addMeta('Components', String((project.components || []).length));
    addMeta('Palettes', String((project.palettes || []).length));
    container.appendChild(meta);

    // --- Pages list ---
    const pagesHeading = document.createElement('h3');
    pagesHeading.textContent = 'Pages';
    container.appendChild(pagesHeading);

    const pageList = document.createElement('ul');
    project.pages.forEach((page, idx) => {
      const li = document.createElement('li');

      const link = document.createElement('a');
      link.href = `#/project/${this.projectId}/${idx}`;
      link.textContent = `${idx + 1}. ${page.title} (${page.items.length} nodes)`;
      li.appendChild(link);

      pageList.appendChild(li);
    });
    container.appendChild(pageList);

    const actions = document.createElement('div');
    actions.style.display = "flex";
    actions.style.flexDirection = "column";

    const exportJsonBtn = document.createElement('button');
    exportJsonBtn.textContent = 'Export to JSON';
    exportJsonBtn.addEventListener('click', () => {
      this.router.navigate(`/project/${this.projectId}/export-json`);
    });
    actions.appendChild(exportJsonBtn);

    const exportFileBtn = document.createElement('button');
    exportFileBtn.textContent = 'Export to file';
    exportFileBtn.addEventListener('click', () => {
      const jsonStr = JSON.stringify(project.toJSON(), null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    actions.appendChild(exportFileBtn);

const compBtn = document.createElement('button');
    compBtn.textContent = 'Components';
    compBtn.addEventListener('click', () => {
      this.router.navigate(`/project/${this.projectId}/components`);
    });
    actions.appendChild(compBtn);

    const palBtn = document.createElement('button');
    palBtn.textContent = 'Palettes';
    palBtn.addEventListener('click', () => {
      this.router.navigate(`/project/${this.projectId}/palettes`);
    });
    actions.appendChild(palBtn);

    const headBtn = document.createElement('button');
    headBtn.textContent = 'Head';
    headBtn.addEventListener('click', () => {
      this.router.navigate(`/project/${this.projectId}/head`);
    });
    actions.appendChild(headBtn);

    const importHtmlBtn = document.createElement('button');
    importHtmlBtn.textContent = 'Import from HTML';
    importHtmlBtn.addEventListener('click', () => {
      this.router.navigate(`/project/${this.projectId}/import-html`);
    });
    actions.appendChild(importHtmlBtn);

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
