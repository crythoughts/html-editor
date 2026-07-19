import { getPageById, getProjectById } from '../storage.js';

/**
 * PageExportHtmlView — serialises a page's rendered DOM into an HTML string
 * and displays it inside a <pre> block. Also provides a download button.
 */
export class PageExportHtmlView {
  constructor(router, projectId, pageId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = parseInt(pageId, 10);
  }

  render() {
    const container = document.createElement('div');

    const page = getPageById(this.projectId, this.pageId);
    if (!page) {
      const msg = document.createElement('p');
      msg.textContent = 'Page not found.';
      container.appendChild(msg);
      return container;
    }

    // --- Heading ---
    const heading = document.createElement('h2');
    heading.textContent = `HTML export — ${page.title}`;
    container.appendChild(heading);

    // --- Render page to DOM and serialise to HTML string ---
    const project = getProjectById(this.projectId);
    const components = project ? project.components : [];
    const palettes = project ? project.palettes : [];

    const wrapper = document.createElement('div');

    // Inject palette CSS variables from enabled palettes
    const cssVars = this._paletteCSS(palettes);
    if (cssVars) {
      const style = document.createElement('style');
      style.textContent = cssVars;
      wrapper.appendChild(style);
    }

    const fragment = page.render(components);
    wrapper.appendChild(fragment);
    const htmlStr = wrapper.innerHTML;

    const pre = document.createElement('pre');
    pre.textContent = htmlStr;
    container.appendChild(pre);

    // --- Download button ---
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download as file';
    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([htmlStr], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${page.title.replace(/[^a-z0-9_-]/gi, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    });
    container.appendChild(downloadBtn);

    // --- Back ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.router.navigate(`/project/${this.projectId}/${this.pageId}`);
    });
    container.appendChild(cancelBtn);

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
