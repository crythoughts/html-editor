import { getProjectById } from '../storage.js';

/**
 * ProjectExportJsonView — shows the serialised project as pretty-printed JSON
 * inside a <pre> block. Provides a "Download as file" button too.
 */
export class ProjectExportJsonView {
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
      return container;
    }

    // --- Heading ---
    const heading = document.createElement('h2');
    heading.textContent = `JSON export — ${project.name}`;
    container.appendChild(heading);

    // --- JSON block ---
    const jsonStr = JSON.stringify(project.toJSON(), null, 2);
    const pre = document.createElement('pre');
    pre.textContent = jsonStr;
    container.appendChild(pre);

    // --- Download button ---
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download as file';
    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    container.appendChild(downloadBtn);

    // --- Back ---
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to project';
    backBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}`),
    );
    container.appendChild(backBtn);

    return container;
  }
}
