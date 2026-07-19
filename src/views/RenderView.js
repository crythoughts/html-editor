import { getProjectById } from '../storage.js';

/**
 * RenderView — fully renders a project's first page as real DOM elements.
 * Intended to be opened in a separate tab for a clean preview.
 */
export class RenderView {
  constructor(projectId, pageId) {
    this.projectId = parseInt(projectId, 10);
    this.pageId = parseInt(pageId ?? 0);
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

        if (project.pages.length === 0) {
            const msg = document.createElement('p');
            msg.textContent = 'This project has no pages.';
            container.appendChild(msg);
            return container;
        }

        // Render the page passing project-level components for resolution
        const page = project.pages[this.pageId];

        document.title = page.title;

        const fragment = page.render(project.components);
        container.appendChild(fragment);

        return container;
  }
}
