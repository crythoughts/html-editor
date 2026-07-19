import { getProjectById, savePage, getPageById } from '../storage.js';

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
    const nodesHeading = document.createElement('h3');
    nodesHeading.textContent = `Top-level nodes (${page.items.length})`;
    container.appendChild(nodesHeading);

    if (page.items.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No nodes yet.';
      container.appendChild(empty);
    } else {
      const nodeList = document.createElement('ul');
      page.items.forEach((node) => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.href = `#/project/${this.projectId}/${this.pageId}/node/${node.id}`;
        link.textContent = `<${node.tagName}> — ${node.items.length} children`;
        li.appendChild(link);

        nodeList.appendChild(li);
      });
      container.appendChild(nodeList);
    }

    // --- Render button ---
    const renderBtn = document.createElement('button');
    renderBtn.textContent = 'Render page';
    renderBtn.addEventListener('click', () => {
      const url =
        `${window.location.origin}${window.location.pathname}` +
        `#/render/${this.projectId}/${this.pageId}`;
      window.open(url, '_blank');
    });
    container.appendChild(renderBtn);

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
