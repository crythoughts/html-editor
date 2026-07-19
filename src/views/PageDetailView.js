import { getProjectById, savePage, getPageById, saveProject, restoreInstance } from '../storage.js';

/**
 * PageDetailView — shows page metadata, allows editing the title,
 * lists top-level nodes with links to drill into each node's hierarchy,
 * and provides a Render button that opens the result in a new tab.
 */
export class PageDetailView {
  constructor(router, projectId, pageId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = parseInt(pageId, 10);
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

    // --- Breadcrumb ---
    const breadcrumb = document.createElement('div');
    const projectLink = document.createElement('a');
    projectLink.href = `#/project/${this.projectId}`;
    projectLink.textContent = project.name;
    breadcrumb.appendChild(projectLink);
    breadcrumb.appendChild(document.createTextNode(' / Page'));
    container.appendChild(breadcrumb);

    // --- Editable title ---
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

    const titleRow = document.createElement('div');
    titleRow.appendChild(titleLabel);
    titleRow.appendChild(titleInput);
    titleRow.appendChild(saveTitleBtn);
    container.appendChild(titleRow);

    // --- Node hierarchy ---
    const realItems = page.items.filter(
      (n) => n.type === 'node' || n.type === 'component' || n.type === 'include',
    );
    const pseudoItems = page.items.filter(
      (n) => n.type !== 'node' && n.type !== 'component' && n.type !== 'include',
    );

    const nodesHeading = document.createElement('h3');
    nodesHeading.textContent = `Top-level nodes (${realItems.length})`;
    container.appendChild(nodesHeading);

    const createNodeLink = document.createElement('a');
    createNodeLink.href = `#/project/${this.projectId}/${this.pageId}/node/create`;
    createNodeLink.textContent = '+ Create node';
    container.appendChild(createNodeLink);

    if (realItems.length === 0 && pseudoItems.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No nodes yet.';
      container.appendChild(empty);
    } else {
      if (realItems.length > 0) {
        const nodeList = document.createElement('ul');
        realItems.forEach((node) => {
          const li = document.createElement('li');

          const link = document.createElement('a');
          link.href = `#/project/${this.projectId}/${this.pageId}/node/${node.id}`;
          link.textContent =
            node.type === 'include' ? '[Include slot]' :
            node.type === 'component'
              ? `[Component: ${node.component_name}] — ${node.items.length} children`
              : `<${node.tagName}> — ${node.items.length} children`;
          li.appendChild(link);

          nodeList.appendChild(li);
        });
        container.appendChild(nodeList);
      }

      // Toggle pseudo items
      if (pseudoItems.length > 0) {
        const pseudoToggle = document.createElement('a');
        pseudoToggle.href = '#';
        pseudoToggle.textContent = `Show pseudo-classes (${pseudoItems.length})`;

        const pseudoList = document.createElement('ul');
        pseudoList.style.display = 'none';
        pseudoItems.forEach((child) => {
          const li = document.createElement('li');
          const link = document.createElement('a');
          link.href =
            `#/project/${this.projectId}/${this.pageId}/node/${child.id}`;
          link.textContent = `${child.pseudo || child.type}`;
          li.appendChild(link);
          pseudoList.appendChild(li);
        });

        pseudoToggle.addEventListener('click', (e) => {
          e.preventDefault();
          const hidden = pseudoList.style.display === 'none';
          pseudoList.style.display = hidden ? 'block' : 'none';
          pseudoToggle.textContent = hidden
            ? 'Hide pseudo-classes'
            : `Show pseudo-classes (${pseudoItems.length})`;
        });

        container.appendChild(pseudoToggle);
        container.appendChild(pseudoList);
      }
    }

    // --- Actions ---
    const actRow = document.createElement('div');

    const renderBtn = document.createElement('button');
    renderBtn.textContent = 'Render page';
    renderBtn.addEventListener('click', () => {
      const url =
        `${window.location.origin}${window.location.pathname}` +
        `#/render/${this.projectId}/${this.pageId}`;
      window.open(url, '_blank');
    });
    actRow.appendChild(renderBtn);

    const exportHtmlBtn = document.createElement('button');
    exportHtmlBtn.textContent = 'Export to HTML';
    exportHtmlBtn.addEventListener('click', () => {
      this.router.navigate(
        `/project/${this.projectId}/${this.pageId}/export-html`,
      );
    });
    actRow.appendChild(exportHtmlBtn);

    const cloneBtn = document.createElement('button');
    cloneBtn.textContent = 'Clone page';
    cloneBtn.addEventListener('click', () => {
      const project = getProjectById(this.projectId);
      if (!project) return;
      // Deep-clone via serialization to get an independent copy
      const clone = restoreInstance(page.toJSON());
      clone.title = `${page.title} (copy)`;
      // Insert after the current page
      const insertAt = this.pageId + 1;
      project.pages.splice(insertAt, 0, clone);
      project.edited_at = Date.now();
      saveProject(this.projectId, project);
      this.router.navigate(`/project/${this.projectId}/${insertAt}`);
    });
    actRow.appendChild(cloneBtn);

    const deletePageBtn = document.createElement('button');
    deletePageBtn.textContent = 'Delete page';
    deletePageBtn.addEventListener('click', () => {
      const project = getProjectById(this.projectId);
      if (!project) return;
      project.pages.splice(this.pageId, 1);
      project.edited_at = Date.now();
      saveProject(this.projectId, project);
      this.router.navigate(`/project/${this.projectId}`);
    });
    actRow.appendChild(deletePageBtn);

    container.appendChild(actRow);

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
