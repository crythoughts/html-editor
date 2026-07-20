import { getProjectById, savePage, getPageById, saveProject, restoreInstance } from '../storage.js';

/**
 * PageDetailView — shows page metadata, a tree of all nodes,
 * and an inline detail panel for the selected node.
 */
export class PageDetailView {
  constructor(router, projectId, pageId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = parseInt(pageId, 10);
    this._detailNode = null; // the node currently shown in the detail panel
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);
    const page = project ? project.pages[this.pageId] : null;

    if (!project || !page) {
      const msg = document.createElement('p');
      msg.textContent = 'Project or page not found.';
      container.appendChild(msg);
      const back = document.createElement('button');
      back.textContent = 'Back to project';
      back.addEventListener('click', () =>
        this.router.navigate(`/project/${this.projectId}`),
      );
      container.appendChild(back);
      return container;
    }

    const base = `#/project/${this.projectId}/${this.pageId}`;

    // --- Breadcrumb ---
    const bc = document.createElement('div');
    const pl = document.createElement('a');
    pl.href = `#/project/${this.projectId}`;
    pl.textContent = project.name;
    bc.appendChild(pl);
    bc.appendChild(document.createTextNode(' / Page'));
    container.appendChild(bc);

    // --- Title ---
    const titleRow = document.createElement('div');
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Page title: ';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = page.title;
    const saveTitleBtn = document.createElement('button');
    saveTitleBtn.textContent = 'Save title';
    saveTitleBtn.addEventListener('click', () => {
      page.title = titleInput.value.trim() || 'Untitled';
      savePage(this.projectId, this.pageId, page);
      titleInput.value = page.title;
    });
    titleRow.appendChild(titleLabel);
    titleRow.appendChild(titleInput);
    titleRow.appendChild(saveTitleBtn);
    container.appendChild(titleRow);

    // --- Actions ---
    const actRow = document.createElement('div');
    const renderBtn = document.createElement('button');
    renderBtn.textContent = 'Render page';
    renderBtn.addEventListener('click', () => {
      window.open(
        `${window.location.origin}${window.location.pathname}#/render/${this.projectId}/${this.pageId}`,
        '_blank',
      );
    });
    actRow.appendChild(renderBtn);

    const exportHtmlBtn = document.createElement('button');
    exportHtmlBtn.textContent = 'Export to HTML';
    exportHtmlBtn.addEventListener('click', () =>
      this.router.navigate(`${base}/export-html`),
    );
    actRow.appendChild(exportHtmlBtn);

    const cloneBtn = document.createElement('button');
    cloneBtn.textContent = 'Clone page';
    cloneBtn.addEventListener('click', () => {
      const p = getProjectById(this.projectId);
      if (!p) return;
      const clone = restoreInstance(page.toJSON());
      clone.title = `${page.title} (copy)`;
      const insertAt = this.pageId + 1;
      p.pages.splice(insertAt, 0, clone);
      p.edited_at = Date.now();
      saveProject(this.projectId, p);
      this.router.navigate(`/project/${this.projectId}/${insertAt}`);
    });
    actRow.appendChild(cloneBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete page';
    delBtn.addEventListener('click', () => {
      const p = getProjectById(this.projectId);
      if (!p) return;
      p.pages.splice(this.pageId, 1);
      p.edited_at = Date.now();
      saveProject(this.projectId, p);
      this.router.navigate(`/project/${this.projectId}`);
    });
    actRow.appendChild(delBtn);
    container.appendChild(actRow);

    // --- Tree heading ---
    const treeHeading = document.createElement('h3');
    treeHeading.textContent = 'Nodes';
    container.appendChild(treeHeading);

    const createLink = document.createElement('a');
    createLink.href = `${base}/node/create`;
    createLink.textContent = '+ Create node';
    container.appendChild(createLink);

    // --- Recursive tree + detail panel container ---
    const treeAndDetail = document.createElement('div');

    const treeEl = document.createElement('div');
    this._renderTree(treeEl, page.items, 0, base);

    const detailPanel = document.createElement('div');
    detailPanel.id = 'detail-panel';

    treeAndDetail.appendChild(treeEl);
    treeAndDetail.appendChild(detailPanel);

    // Intercept tree clicks to show detail instead of navigating
    treeEl.addEventListener('click', (e) => {
      const row = e.target.closest('[data-node-id]');
      if (!row) return;
      const nodeId = row.getAttribute('data-node-id');
      const found = page.findNodeById(nodeId);
      if (!found) return;

      // Toggle: clicking the same node closes the panel
      if (this._detailNode && this._detailNode.id === found.id) {
        this._detailNode = null;
        detailPanel.innerHTML = '';
        return;
      }

      this._detailNode = found;
      this._renderDetail(detailPanel, found, base);
    });

    container.appendChild(treeAndDetail);

    // --- Back ---
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to project';
    backBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}`),
    );
    container.appendChild(backBtn);

    return container;
  }

  /** Recursively render the node tree into parentEl. */
  _renderTree(parentEl, items, depth, base) {
    for (const node of items) {
      const row = document.createElement('div');
      row.style.paddingLeft = `${depth * 4}px`;
      row.style.cursor = 'pointer';
      row.setAttribute('data-node-id', node.id);

      const hasChildren =
        node.items.filter(
          (c) =>
            c.type === 'node' ||
            c.type === 'component' ||
            c.type === 'include',
        ).length > 0;

      let label;
      if (node.type === 'include') label = '[Include slot]';
      else if (node.type === 'component')
        label = `[Component: ${node.component_name}]`;
      else if (node.type !== 'node') label = `${node.pseudo || node.type}`;
      else label = `<${node.tagName}>`;

      row.textContent = label;
      parentEl.appendChild(row);

      // Recurse into real children
      const realKids = node.items.filter(
        (c) =>
          c.type === 'node' ||
          c.type === 'component' ||
          c.type === 'include',
      );
      if (realKids.length > 0) {
        this._renderTree(parentEl, realKids, depth + 1, base);
      }
    }
  }

  /** Render inline detail for a single node. */
  _renderDetail(panel, node, base) {
    panel.innerHTML = '';

    const box = document.createElement('div');
    box.style.cssText =
      'margin-top:8px; padding:8px; border:1px solid #ccc;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      panel.innerHTML = '';
      this._detailNode = null;
    });
    box.appendChild(closeBtn);

    // Type / tag / etc.
    const info = document.createElement('div');
    if (node.type === 'include') info.textContent = 'Include slot';
    else if (node.type === 'component')
      info.textContent = `Component: ${node.component_name}`;
    else if (node.type !== 'node')
      info.textContent = `Type: ${node.type} — ${node.pseudo}`;
    else info.textContent = `Tag: <${node.tagName}>`;
    box.appendChild(info);

    const idR = document.createElement('div');
    idR.textContent = `ID: ${node.id}`;
    box.appendChild(idR);

    // Attributes
    const ah = document.createElement('h4');
    ah.textContent = 'Attributes';
    box.appendChild(ah);
    const aKeys = Object.keys(node.attrs);
    if (aKeys.length === 0) {
      const n = document.createElement('p');
      n.textContent = '(none)';
      box.appendChild(n);
    } else {
      const al = document.createElement('ul');
      for (const [k, v] of Object.entries(node.attrs)) {
        const li = document.createElement('li');
        li.textContent = `${k} = "${v}"`;
        al.appendChild(li);
      }
      box.appendChild(al);
    }

    // Actions
    const acts = document.createElement('div');
    const ccl = document.createElement('a');
    ccl.href = `${base}/node/${node.id}/create`;
    ccl.textContent = '+ Create child node';
    acts.appendChild(ccl);
    acts.appendChild(document.createTextNode(' '));
    const elink = document.createElement('a');
    elink.href = `${base}/node/${node.id}/edit`;
    elink.textContent = 'Edit node';
    acts.appendChild(elink);
    box.appendChild(acts);

    panel.appendChild(box);
  }
}
