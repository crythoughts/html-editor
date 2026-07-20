import { Node } from '../models/Node.js';
import { Page } from '../models/Page.js';
import { getProjectById, saveProject } from '../storage.js';

/**
 * ProjectImportHtmlView — paste HTML text, convert it to app Nodes,
 * and add them as a new page in the project.
 */
export class ProjectImportHtmlView {
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
    heading.textContent = 'Import HTML — ' + project.name;
    container.appendChild(heading);

    // Page title
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'New page title: ';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = 'Imported';
    container.appendChild(titleLabel);
    container.appendChild(titleInput);

    // HTML textarea
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'HTML:';
    const textarea = document.createElement('textarea');
    textarea.rows = 20;
    textarea.style.width = '100%';
    textarea.style.fontFamily = 'monospace';
    textarea.placeholder = 'Paste HTML here...';
    container.appendChild(htmlLabel);
    container.appendChild(textarea);

    // Result message area
    const msgArea = document.createElement('div');

    // Import button
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Import';
    importBtn.addEventListener('click', () => {
      msgArea.innerHTML = '';
      const raw = textarea.value.trim();
      if (!raw) {
        msgArea.textContent = 'Please paste HTML first.';
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(raw, 'text/html');

      // Check for parse errors
      const parseErrors = doc.querySelector('parsererror');
      if (parseErrors) {
        msgArea.textContent = 'Invalid HTML: ' + parseErrors.textContent;
        return;
      }

      const items = [];
      for (const child of doc.body.children) {
        const n = this._domToNode(child);
        if (n) items.push(n);
      }

      if (items.length === 0) {
        msgArea.textContent = 'No elements found in the HTML.';
        return;
      }

      const page = new Page(titleInput.value.trim() || 'Imported');
      page.items = items;
      project.pages.push(page);
      project.edited_at = Date.now();
      saveProject(this.projectId, project);

      // Navigate to the new page
      const newPageIdx = project.pages.length - 1;
      this.router.navigate(`/project/${this.projectId}/${newPageIdx}`);
    });
    container.appendChild(importBtn);

    container.appendChild(msgArea);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}`),
    );
    container.appendChild(cancelBtn);

    return container;
  }

  /** Convert a DOM element to a model Node recursively. */
  _domToNode(el) {
    if (!el || el.nodeType !== 1) return null; // skip non-element nodes

    const tag = el.tagName.toLowerCase();
    const node = new Node(tag);

    // Attributes
    for (const attr of el.attributes) {
      const name = attr.name;
      const val = attr.value;
      if (name === 'style') {
        // Parse inline styles
        const styleText = attr.value.trim();
        if (styleText) {
          styleText.split(';').forEach((decl) => {
            const colonIdx = decl.indexOf(':');
            if (colonIdx > 0) {
              const prop = decl.slice(0, colonIdx).trim();
              const value = decl.slice(colonIdx + 1).trim();
              if (prop && value) node.styles[prop] = value;
            }
          });
        }
      } else if (name === 'class') {
        node.attrs['class'] = val;
      } else if (name === 'id') {
        node.attrs['id'] = val;
      } else {
        node.attrs[name] = val;
      }
    }

    // Children — check for single text node vs element children
    const childNodes = [];
    for (const child of el.childNodes) {
      if (child.nodeType === 1) childNodes.push(child);
    }

    const textNodes = [];
    for (const child of el.childNodes) {
      if (child.nodeType === 3 && child.textContent.trim()) {
        textNodes.push(child.textContent.trim());
      }
    }

    if (childNodes.length === 0 && textNodes.length > 0) {
      // Leaf node with text content
      node.attrs.textContent = textNodes.join(' ');
    } else {
      // Has element children — recurse
      for (const child of childNodes) {
        const childNode = this._domToNode(child);
        if (childNode) node.items.push(childNode);
      }
    }

    return node;
  }
}
