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
    this._project = project;
    this._page = page;

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
    this._renderTree(treeEl, page.items, 0, base, null);

    // Drag & drop support in the tree
    let _dragId = null;

    treeEl.addEventListener('dragstart', (e) => {
      const row = e.target.closest('[data-drag-id]');
      if (!row) return;
      _dragId = row.getAttribute('data-drag-id');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', _dragId);
      row.style.opacity = '0.4';
    });

    treeEl.addEventListener('dragend', (e) => {
      const row = e.target.closest('[data-drag-id]');
      if (row) row.style.opacity = '';
      treeEl.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
    });

    treeEl.addEventListener('dragover', (e) => {
      // Determine drop position: show indicator above/below the closest row
      const row = e.target.closest('[data-drag-id]');
      if (!row || row.getAttribute('data-drag-id') === _dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Show drop indicator
      treeEl.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const ind = document.createElement('div');
      ind.className = 'drop-indicator';
      ind.style.cssText = 'height:2px; background:#3b82f6; position:relative;';
      if (e.clientY < midY) {
        row.parentNode.insertBefore(ind, row);
      } else {
        row.parentNode.insertBefore(ind, row.nextSibling);
      }
    });

    treeEl.addEventListener('dragleave', (e) => {
      const related = e.relatedTarget;
      if (!related || !treeEl.contains(related)) {
        treeEl.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
      }
    });

    treeEl.addEventListener('drop', (e) => {
      e.preventDefault();
      treeEl.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
      const dragId = e.dataTransfer.getData('text/plain');
      if (!dragId) return;

      // Find the dragged node and its parent
      const dragResult = this._findNodeAndParent(page, dragId);
      if (!dragResult) return;
      const { node: draggedNode, parent: oldParent, index: oldIdx } = dragResult;

      // Determine target
      const row = e.target.closest('[data-drag-id]');
      let newParent = page;
      let insertIdx = page.items.length;

      if (row) {
        const targetId = row.getAttribute('data-drag-id');
        const parentId = row.getAttribute('data-parent-id');
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY < midY) {
          // Above the row → insert before it in its parent
          newParent = parentId ? page.findNodeById(parentId) || page : page;
          const siblings = newParent === page ? newParent.items : newParent.items;
          insertIdx = siblings.findIndex((n) => n.id === targetId);
          if (insertIdx < 0) insertIdx = 0;
        } else {
          // Below the row → make it a child of the target row (append)
          newParent = page.findNodeById(targetId) || page;
          insertIdx = newParent.items.length;
        }
      }

      // Prevent no-op (same parent, same position, same node)
      if (oldParent === newParent) {
        const sibs = newParent === page ? newParent.items : newParent.items;
        const currentIdx = sibs.indexOf(draggedNode);
        if (currentIdx >= 0 && currentIdx < insertIdx) insertIdx--;
        if (currentIdx === insertIdx) return;
      }

      // Remove from old position
      oldParent.items.splice(oldIdx, 1);

      // Insert at new position
      newParent.items.splice(insertIdx, 0, draggedNode);

      // Persist
      if (this._project) {
        this._project.edited_at = Date.now();
        saveProject(this.projectId, this._project);
      }

      // Re-render tree
      treeEl.innerHTML = '';
      this._renderTree(treeEl, page.items, 0, base, null);
    });

    const detailPanel = document.createElement('div');
    detailPanel.id = 'detail-panel';

    treeAndDetail.appendChild(treeEl);
    treeAndDetail.appendChild(detailPanel);

    // Intercept tree clicks to show detail instead of navigating
    treeEl.addEventListener('click', (e) => {
      const row = e.target.closest('[data-drag-id]');
      if (!row) return;
      const nodeId = row.getAttribute('data-drag-id');
      const found = page.findNodeById(nodeId);
      if (!found) return;

      // Toggle: clicking the same node closes the panel
      if (this._detailNode && this._detailNode.id === found.id) {
        this._detailNode = null;
        detailPanel.innerHTML = '';
        container.dispatchEvent(new CustomEvent('node-selected', { detail: { nodeId: '' }, bubbles: true }));
        return;
      }

      this._detailNode = found;
      this._renderDetail(detailPanel, found, base);
      container.dispatchEvent(new CustomEvent('node-selected', { detail: { nodeId: found.id }, bubbles: true }));
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
  _renderTree(parentEl, items, depth, base, parentId) {
    for (const node of items) {
      const row = document.createElement('div');
      row.classList.add("row-item")
      row.style.paddingLeft = `${(depth + 1) * 10}px`;
      row.style.cursor = 'pointer';
      row.draggable = true;
      row.setAttribute('data-drag-id', node.id);
      row.setAttribute('data-node-id', node.id);
      if (parentId) row.setAttribute('data-parent-id', parentId);

      const hasChildren =
        node.items.filter(
          (c) =>
            c.type === 'node' ||
            c.type === 'component' ||
            c.type === 'include',
        ).length > 0;

      let label;
      if (node.label) {
        label = node.label;
      } else if (node.type === 'include') label = '[Include slot]';
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
        this._renderTree(parentEl, realKids, depth + 1, base, node.id);
      }
    }
  }

  /** Find a node in the page tree and return { node, parent, index }. */
  _findNodeAndParent(page, nodeId) {
    for (let i = 0; i < page.items.length; i++) {
      const item = page.items[i];
      if (item.id === nodeId) return { node: item, parent: page, index: i };
      const found = this._findInNested(item, nodeId);
      if (found) return found;
    }
    return null;
  }

  _findInNested(parentNode, nodeId) {
    for (let i = 0; i < parentNode.items.length; i++) {
      const child = parentNode.items[i];
      if (child.id === nodeId) return { node: child, parent: parentNode, index: i };
      const found = this._findInNested(child, nodeId);
      if (found) return found;
    }
    return null;
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

    if (node.label) {
      const lr = document.createElement('div');
      lr.textContent = `Label: ${node.label}`;
      box.appendChild(lr);
    }

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
