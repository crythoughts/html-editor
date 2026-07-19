import { getProjectById, saveProject } from '../storage.js';
import { MetaTag } from '../models/MetaTag.js';
import { LinkTag } from '../models/LinkTag.js';

/**
 * HeadView — edit the project's shared <head> content (meta & link tags).
 * Each tag is represented as key/value attribute rows with +/-.
 */
export class HeadView {
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

    if (!project.head) {
        project.head = {};
        project.head.meta = [];
        project.head.links = [];
    }

    const heading = document.createElement('h2');
    heading.textContent = `Head — ${project.name}`;
    container.appendChild(heading);

    const hint = document.createElement('p');
    hint.textContent =
      'These meta and link tags are shared across all pages of this project.';
    container.appendChild(hint);

    // ----- Meta tags -----
    const metaHeading = document.createElement('h3');
    metaHeading.textContent = `Meta tags (${project.head.meta.length})`;
    container.appendChild(metaHeading);

    const metaContainer = document.createElement('div');

    const addMetaRow = (m) => {
      const row = document.createElement('div');

      const attrRows = document.createElement('div');

      const addAttr = (key, val) => {
        const ar = document.createElement('div');

        const kInp = document.createElement('input');
        kInp.type = 'text';
        kInp.placeholder = 'Attribute';
        kInp.value = key;
        ar.appendChild(kInp);

        const vInp = document.createElement('input');
        vInp.type = 'text';
        vInp.placeholder = 'Value';
        vInp.value = val;
        ar.appendChild(vInp);

        const rm = document.createElement('button');
        rm.textContent = '\u2212';
        rm.addEventListener('click', () => ar.remove());
        ar.appendChild(rm);

        attrRows.appendChild(ar);
      };

      for (const [k, v] of Object.entries(m ? m.attrs : {})) {
        addAttr(k, v);
      }

      row.appendChild(attrRows);

      const addAttrBtn = document.createElement('button');
      addAttrBtn.textContent = '+ attr';
      addAttrBtn.addEventListener('click', () => addAttr('', ''));
      row.appendChild(addAttrBtn);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove meta';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      metaContainer.appendChild(row);
    };

    project.head.meta.forEach((m) => addMetaRow(m));

    container.appendChild(metaContainer);

    const addMetaBtn = document.createElement('button');
    addMetaBtn.textContent = '+ Add meta tag';
    addMetaBtn.addEventListener('click', () => addMetaRow(null));
    container.appendChild(addMetaBtn);

    // ----- Link tags -----
    const linkHeading = document.createElement('h3');
    linkHeading.textContent = `Link tags (${project.head.links.length})`;
    container.appendChild(linkHeading);

    const linkContainer = document.createElement('div');

    const addLinkRow = (l) => {
      const row = document.createElement('div');

      const attrRows = document.createElement('div');

      const addAttr = (key, val) => {
        const ar = document.createElement('div');

        const kInp = document.createElement('input');
        kInp.type = 'text';
        kInp.placeholder = 'Attribute';
        kInp.value = key;
        ar.appendChild(kInp);

        const vInp = document.createElement('input');
        vInp.type = 'text';
        vInp.placeholder = 'Value';
        vInp.value = val;
        ar.appendChild(vInp);

        const rm = document.createElement('button');
        rm.textContent = '\u2212';
        rm.addEventListener('click', () => ar.remove());
        ar.appendChild(rm);

        attrRows.appendChild(ar);
      };

      for (const [k, v] of Object.entries(l ? l.attrs : {})) {
        addAttr(k, v);
      }

      row.appendChild(attrRows);

      const addAttrBtn = document.createElement('button');
      addAttrBtn.textContent = '+ attr';
      addAttrBtn.addEventListener('click', () => addAttr('', ''));
      row.appendChild(addAttrBtn);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove link';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      linkContainer.appendChild(row);
    };

    project.head.links.forEach((l) => addLinkRow(l));

    container.appendChild(linkContainer);

    const addLinkBtn = document.createElement('button');
    addLinkBtn.textContent = '+ Add link tag';
    addLinkBtn.addEventListener('click', () => addLinkRow(null));
    container.appendChild(addLinkBtn);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save head';
    saveBtn.addEventListener('click', () => {
      // Collect meta
      const newMeta = [];
      for (const row of metaContainer.children) {
        const attrs = {};
        for (const ar of row.querySelectorAll('div > div')) {
          const inputs = ar.querySelectorAll('input');
          if (inputs.length === 2) {
            const k = inputs[0].value.trim();
            if (k) attrs[k] = inputs[1].value;
          }
        }
        if (Object.keys(attrs).length > 0) {
          newMeta.push(new MetaTag(attrs));
        }
      }
      project.head.meta = newMeta;

      // Collect links
      const newLinks = [];
      for (const row of linkContainer.children) {
        const attrs = {};
        for (const ar of row.querySelectorAll('div > div')) {
          const inputs = ar.querySelectorAll('input');
          if (inputs.length === 2) {
            const k = inputs[0].value.trim();
            if (k) attrs[k] = inputs[1].value;
          }
        }
        if (Object.keys(attrs).length > 0) {
          newLinks.push(new LinkTag(attrs));
        }
      }
      project.head.links = newLinks;

      project.edited_at = Date.now();
      saveProject(this.projectId, project);
      this.router.navigate(`/project/${this.projectId}`);
    });
    container.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}`),
    );
    container.appendChild(cancelBtn);

    return container;
  }
}
