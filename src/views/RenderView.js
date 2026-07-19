import { getProjectById } from '../storage.js';

/**
 * RenderView — fully renders a project's first page as real DOM elements.
 * Intended to be opened in a separate tab for a clean preview.
 */
export class RenderView {
  constructor(projectId) {
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

    if (project.pages.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = 'This project has no pages.';
      container.appendChild(msg);
      return container;
    }

    // Render the first page's items into the container
    const heading = document.createElement('h1');
    heading.textContent = project.pages[0].title;
    container.appendChild(heading);

    const fragment = project.pages[0].render();
    container.appendChild(fragment);

    return container;
  }
}
