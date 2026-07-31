import { getProjectById, saveProject } from '../storage.js';

/**
 * PaletteListView — lists all palettes in a project with enable/disable toggles.
 */
export class PaletteListView {
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
    heading.textContent = `Palettes — ${project.name}`;
    container.appendChild(heading);

    const createLink = document.createElement('a');
    createLink.href = `#/project/${this.projectId}/palettes/create`;
    createLink.textContent = '+ Create palette';
    container.appendChild(createLink);

    if (!project.palettes) {
        project.palettes = [];
    }

    if (project.palettes.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No palettes yet.';
      container.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      project.palettes.forEach((pal, idx) => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.href = `#/project/${this.projectId}/palettes/${idx}`;
        link.textContent = `${pal.name} (${pal.colors.length} colours)`;
        li.appendChild(link);

        const statusSpan = document.createElement('span');
        statusSpan.textContent = pal.enabled ? ' [enabled]' : ' [disabled]';
        li.appendChild(statusSpan);

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = pal.enabled ? 'Disable' : 'Enable';
        toggleBtn.addEventListener('click', () => {
          pal.enabled = !pal.enabled;
          project.edited_at = Date.now();
          saveProject(this.projectId, project);
          this.router.resolve();
        });
        li.appendChild(toggleBtn);

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
