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

        const page = project.pages[this.pageId];

        document.title = page.title;

        // Inject palette CSS variables from enabled palettes
        const cssVars = this._paletteCSS(project.palettes);
        if (cssVars) {
          const style = document.createElement('style');
          style.textContent = cssVars;
          container.appendChild(style);
        }

        const fragment = page.render(project.components);
        container.appendChild(fragment);

        return container;
  }

  /** Generate :root CSS custom-property block from enabled palettes. */
  _paletteCSS(palettes) {
    const enabled = palettes.filter((p) => p.enabled);
    if (enabled.length === 0) return '';
    const lines = [];
    for (const pal of enabled) {
      for (const col of pal.colors) {
        lines.push(`  --${col.id}: ${col.value};`);
      }
    }
    return `:root {\n${lines.join('\n')}\n}`;
  }
}
