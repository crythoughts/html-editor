/**
 * Main application class for the HTML Visual Editor.
 */
class App {
  constructor() {
    this.currentProject = null;
    this.currentPage = null;
    this.currentPageIndex = -1;
    this.selectedTagUid = null;
    this.activeTool = "cursor";
    this.sidebarCollapsed = false;
    this.currentView = "projects";
    this.currentPageTab = "insert"; // Insert first
    this.showElementEditor = false;
    this.viewMode = false;
    this.pseudoState = "";

    this.els = {};
    this._dirty = false;
    this._hoveredUid = null;
    this._currentStyleTab = "all";
    this._presets = this._loadPresets();
    this._history = [];
    this._historyIndex = -1;
    this._maxHistory = 50;
    this._isResizing = false;
    this._resizeStart = null;
    this._noHistory = false;
  }

  // ==================== INIT ====================

  async init() {
    this.els.sidebar = document.getElementById("sidebar");
    this.els.sidebarContent = document.getElementById("sidebar-content");
    this.els.sidebarTabs = document.getElementById("sidebar-tabs");
    this.els.editorContent = document.getElementById("editor-content");
    this.els.hoverHighlight = document.getElementById("hover-highlight");
    this.els.selectedHighlight = document.getElementById("selected-highlight");
    this.els.editorArea = document.getElementById("editor-area");
    this.els.editorCanvas = document.getElementById("editor-canvas");
    this.els.statusBar = document.getElementById("status-bar");
    this.els.modalOverlay = document.getElementById("modal-overlay");
    this.els.modalContent = document.getElementById("modal-content");
    this.els.fileInput = document.getElementById("file-input");
    this.els.expandBtn = document.getElementById("sidebar-expand");

    this.bindEvents();
    this.setTool("cursor");
    this.restoreFromHash();

    if (!this.currentProject) this.showProjectsList();

    this.setStatus("Ready");
    return this;
  }

  bindEvents() {
    document.getElementById("btn-save").addEventListener("click", (e) => {
      e.stopPropagation();
      this.saveProject();
    });
    document.getElementById("btn-projects").addEventListener("click", (e) => {
      e.stopPropagation();
      this.showProjectsList();
    });
    document.getElementById("btn-collapse").addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleSidebar();
    });
    this.els.expandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleSidebar();
    });

    document.getElementById("tool-cursor").addEventListener("click", (e) => {
      e.stopPropagation();
      this.setTool("cursor");
    });
    document.getElementById("tool-select").addEventListener("click", (e) => {
      e.stopPropagation();
      this.setTool("select");
    });
    document.getElementById("tool-clear").addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearSelection();
    });
    document.getElementById("tool-viewmode").addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleViewMode();
    });
    document.getElementById("tool-copyhtml").addEventListener("click", (e) => {
      e.stopPropagation();
      this.copyHtml();
    });

    this.els.fileInput.addEventListener("change", (e) =>
      this.handleFileImport(e),
    );
    this.els.editorArea.addEventListener("mousemove", (e) =>
      this.handleEditorHover(e),
    );
    this.els.editorArea.addEventListener("click", (e) =>
      this.handleEditorClick(e),
    );
    this.els.editorArea.addEventListener("mouseleave", () =>
      this.clearHoverHighlight(),
    );
    this.els.editorArea.addEventListener("scroll", () =>
      this.highlightSelectedElement(),
    );

    // Resize handle
    const resizeHandle = document.getElementById("resize-handle");
    let isResizing = false;
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isResizing = true;
      const startX = e.clientX;
      const startWidth = this.els.editorContent.offsetWidth;
      const onMove = (ev) => {
        if (!isResizing) return;
        const newWidth = Math.max(200, startWidth + (ev.clientX - startX));
        this.els.editorContent.style.width = newWidth + "px";
        this.els.editorContent.style.maxWidth = "none";
      };
      const onUp = () => {
        isResizing = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    this.els.modalOverlay.addEventListener("click", (e) => {
      if (e.target === this.els.modalOverlay) this.closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT"
      )
        return;
      if (e.key === "Escape") {
        this.clearSelection();
        this.closeModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        this.saveProject();
      }
      if (e.key === "Delete" && this.selectedTagUid)
        this._deleteSelectedElement();
    });

    window.addEventListener("popstate", () => this.restoreFromHash());
  }

  // ==================== VIEW MODE ====================

  toggleViewMode() {
    this.viewMode = !this.viewMode;
    this.els.editorCanvas.classList.toggle("view-mode", this.viewMode);
    this.els.editorContent.classList.toggle("view-mode", this.viewMode);
    document
      .getElementById("tool-viewmode")
      .classList.toggle("active", this.viewMode);
  }

  // ==================== COPY HTML ====================

  copyHtml() {
    if (!this.currentPage) {
      this.setStatus("No page to copy");
      return;
    }
    const html = HtmlRenderer.renderPage(this.currentPage);
    navigator.clipboard
      .writeText(html)
      .then(() => {
        this.setStatus("HTML copied to clipboard");
      })
      .catch(() => {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = html;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        this.setStatus("HTML copied to clipboard");
      });
  }

  // ==================== HASH ROUTING ====================

  saveToHash() {
    if (
      this.currentProject &&
      this.currentView === "page" &&
      this.currentPageIndex >= 0
    ) {
      window.location.hash = `#project=${this.currentProject._id}&page=${this.currentPageIndex}`;
    } else if (this.currentProject) {
      window.location.hash = `#project=${this.currentProject._id}`;
    } else {
      window.location.hash = "";
    }
  }

  restoreFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const projectId = params.get("project");
    const pageIndex = params.get("page");
    if (!projectId) return;
    const project = ProjectStorage.load(projectId);
    if (!project) return;
    this.currentProject = project;
    this.currentPageIndex =
      pageIndex !== null
        ? parseInt(pageIndex, 10)
        : project.pages.length > 0
          ? 0
          : -1;
    this.currentPage =
      this.currentPageIndex >= 0 && this.currentPageIndex < project.pages.length
        ? project.pages[this.currentPageIndex]
        : null;
    if (this.currentPage) {
      this.currentView = "page";
      this.currentPageTab = "insert";
    } else {
      this.currentView = "project";
      this.currentPageTab = "meta";
    }
    this.selectedTagUid = null;
    this.showElementEditor = false;
    this.clearDirty();
    this.refreshUI();
  }

  // ==================== STATE ====================

  markDirty() {
    this._dirty = true;
    this.setStatus("Unsaved changes");
  }
  clearDirty() {
    this._dirty = false;
  }
  setStatus(msg) {
    this.els.statusBar.textContent = msg;
  }

  // ==================== TOOLS ====================

  setTool(tool) {
    this.activeTool = tool;
    // Only manage cursor/select active state
    document
      .getElementById("tool-cursor")
      .classList.toggle("active", tool === "cursor");
    document
      .getElementById("tool-select")
      .classList.toggle("active", tool === "select");
    this.els.editorArea.style.cursor =
      tool === "select" ? "crosshair" : "default";
  }

  clearSelection() {
    this.selectedTagUid = null;
    this.showElementEditor = false;
    this.els.selectedHighlight.style.display = "none";
    this.refreshUI();
  }

  clearHoverHighlight() {
    this._hoveredUid = null;
    this.els.hoverHighlight.style.display = "none";
  }

  // ==================== SIDEBAR ====================

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.els.sidebar.classList.toggle("collapsed", this.sidebarCollapsed);
    this.els.expandBtn.classList.toggle("hidden", !this.sidebarCollapsed);
    document.getElementById("btn-collapse").textContent = this.sidebarCollapsed
      ? "▶"
      : "◀";
  }

  // ==================== PRESETS ====================

  _loadPresets() {
    try {
      return JSON.parse(localStorage.getItem("html_editor_presets") || "[]");
    } catch {
      return [];
    }
  }

  _savePresets() {
    localStorage.setItem("html_editor_presets", JSON.stringify(this._presets));
  }

  _saveAsPreset(tag) {
    const name = prompt(
      "Preset name:",
      `${tag.tagName}${tag.class.length ? "." + tag.class.join(".") : ""}`,
    );
    if (!name) return;
    this._presets.push({
      name,
      tagName: tag.tagName,
      textContent: tag.textContent,
      attrs: { ...tag.attrs },
      class: [...tag.class],
      styles: [...tag.styles],
      children: tag.children.map((c) => c.toJSON()),
    });
    this._savePresets();
    this.setStatus(`Preset "${name}" saved`);
  }

  // ==================== PROJECTS LIST ====================

  showProjectsList() {
    this.currentView = "projects";
    this.currentProject = null;
    this.currentPage = null;
    this.selectedTagUid = null;
    this.showElementEditor = false;
    this.saveToHash();
    this.renderPreview();
    this.renderProjectsList();
  }

  renderProjectsList() {
    this.els.sidebarTabs.style.display = "none";
    this.els.sidebarTabs.innerHTML = "";
    const content = this.els.sidebarContent;
    content.innerHTML = "";
    const container = document.createElement("div");
    container.className = "projects-list";

    const header = document.createElement("h2");
    header.textContent = window.i18n.t("project.title");
    container.appendChild(header);

    const actions = document.createElement("div");
    actions.className = "project-actions-bar";
    const newBtn = document.createElement("button");
    newBtn.className = "btn btn-primary";
    newBtn.textContent = "+ " + window.i18n.t("project.newProjectBtn");
    newBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showNewProjectModal();
    });
    actions.appendChild(newBtn);
    const importBtn = document.createElement("button");
    importBtn.className = "btn";
    importBtn.textContent = window.i18n.t("project.loadFile");
    importBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.els.fileInput.click();
    });
    actions.appendChild(importBtn);
    container.appendChild(actions);

    const listHeader = document.createElement("h3");
    listHeader.textContent = window.i18n.t("project.pages");
    container.appendChild(listHeader);

    const listEl = document.createElement("div");
    listEl.className = "project-cards";
    const projects = ProjectStorage.listAll();
    if (projects.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = window.i18n.t("project.noProjects");
      listEl.appendChild(empty);
    } else {
      projects.sort((a, b) => b.editedAt - a.editedAt);
      for (const projData of projects)
        listEl.appendChild(this.createProjectCard(projData));
    }
    container.appendChild(listEl);
    content.appendChild(container);
  }

  showNewProjectModal() {
    const html = `
      <h2>${window.i18n.t("project.newProject")}</h2>
      <div class="form" style="margin-top:12px">
        <div class="form-group">
          <label class="form-label">${window.i18n.t("project.name")}</label>
          <input type="text" class="input" id="modal-project-name" value="My Project">
        </div>
        <div class="form-group">
          <label class="form-label">${window.i18n.t("project.author")}</label>
          <input type="text" class="input" id="modal-project-author" value="">
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <button class="btn btn-small" id="modal-paste-html">📋 Paste HTML to create page</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-primary" id="modal-create-btn">${window.i18n.t("common.create")}</button>
          <button class="btn" id="modal-cancel-btn">${window.i18n.t("common.cancel")}</button>
        </div>
      </div>`;
    this.showModal(html);

    document
      .getElementById("modal-create-btn")
      .addEventListener("click", () => {
        const name =
          document.getElementById("modal-project-name").value.trim() ||
          window.i18n.t("common.unnamed");
        const author =
          document.getElementById("modal-project-author").value.trim() ||
          window.i18n.t("common.unknownAuthor");
        const project = new Project({ name, author });
        project.addPage(new Page({ title: "Home" }));
        ProjectStorage.save(project);
        this.closeModal();
        this.openProject(project._id);
      });
    document
      .getElementById("modal-cancel-btn")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("modal-paste-html")
      .addEventListener("click", () => {
        const name =
          document.getElementById("modal-project-name").value.trim() ||
          "Imported HTML";
        const author =
          document.getElementById("modal-project-author").value.trim() || "";
        this.closeModal();
        this.showImportHtmlModal(name, author);
      });
    document
      .getElementById("modal-project-name")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter")
          document.getElementById("modal-create-btn").click();
      });
    setTimeout(() => document.getElementById("modal-project-name").focus(), 50);
  }

  showImportHtmlModal(projectName, author) {
    const html = `
      <h2>Import HTML</h2>
      <p style="color:var(--text-muted);font-size:12px;margin:8px 0">Paste HTML below. A new page will be created with the content parsed.</p>
      <div class="form-group">
        <label class="form-label">HTML content</label>
        <textarea class="input" id="modal-html-input" rows="8" style="resize:vertical;font-family:monospace;font-size:11px"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary" id="modal-import-html-btn">Import</button>
        <button class="btn" id="modal-cancel-btn2">Cancel</button>
      </div>`;
    this.showModal(html);

    document
      .getElementById("modal-import-html-btn")
      .addEventListener("click", () => {
        const htmlStr = document
          .getElementById("modal-html-input")
          .value.trim();
        if (!htmlStr) return;
        const project = new Project({
          name: projectName || "Imported HTML",
          author: author || "",
        });
        const page = new Page({ title: "Imported Page" });

        // Simple HTML to Tag parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlStr, "text/html");
        const bodyChildren = doc.body.children;
        const tags = [];
        for (const el of bodyChildren) {
          const tag = this._domToTag(el);
          if (tag) tags.push(tag);
        }
        if (tags.length === 0) {
          // Try wrapping in div
          const wrapper = document.createElement("div");
          wrapper.innerHTML = htmlStr;
          for (const el of wrapper.children) {
            const tag = this._domToTag(el);
            if (tag) tags.push(tag);
          }
        }
        page.body = tags;
        project.addPage(page);
        ProjectStorage.save(project);
        this.closeModal();
        this.openProject(project._id);
      });
    document
      .getElementById("modal-cancel-btn2")
      .addEventListener("click", () => this.closeModal());
  }

  _domToTag(el) {
    if (!el || !el.tagName) return null;
    const tag = new Tag({ tagName: el.tagName.toLowerCase() });
    if (el.id) tag.id = el.id;
    if (el.className && typeof el.className === "string")
      tag.class = el.className.split(/\s+/).filter(Boolean);
    // Attributes
    for (const attr of el.attributes) {
      if (attr.name === "id" || attr.name === "class" || attr.name === "style")
        continue;
      tag.attrs[attr.name] = attr.value;
    }
    // Style
    if (el.getAttribute("style")) {
      tag.styles = el
        .getAttribute("style")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // Text content
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
      tag.textContent = el.textContent;
    } else {
      for (const child of el.children) {
        const childTag = this._domToTag(child);
        if (childTag) tag.children.push(childTag);
      }
      // Also handle text nodes
      let text = "";
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.textContent.trim())
          text += node.textContent;
      }
      if (text && tag.children.length > 0) {
        // If we have both text and children, put text in a span
        // Actually, we'll just set text content if no meaningful children
      } else if (text) {
        tag.textContent = text;
      }
    }
    return tag;
  }

  createProjectCard(projData) {
    const card = document.createElement("div");
    card.className = "project-card";
    const nameEl = document.createElement("div");
    nameEl.className = "project-card-name";
    nameEl.textContent = projData.name || window.i18n.t("common.unnamed");
    card.appendChild(nameEl);
    const authorEl = document.createElement("div");
    authorEl.className = "project-card-author";
    authorEl.textContent =
      projData.author || window.i18n.t("common.unknownAuthor");
    card.appendChild(authorEl);
    const datesEl = document.createElement("div");
    datesEl.className = "project-card-dates";
    const created = new Date(projData.createdAt || Date.now());
    const edited = new Date(projData.editedAt || Date.now());
    datesEl.textContent = `${window.i18n.t("project.created")}: ${created.toLocaleString()} | ${window.i18n.t("project.edited")}: ${edited.toLocaleString()}`;
    card.appendChild(datesEl);
    const actionsEl = document.createElement("div");
    actionsEl.className = "project-card-actions";
    const openBtn = document.createElement("button");
    openBtn.className = "btn btn-primary btn-small";
    openBtn.textContent = window.i18n.t("common.edit");
    openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openProject(projData._id);
    });
    actionsEl.appendChild(openBtn);
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn btn-small";
    downloadBtn.textContent = window.i18n.t("project.download");
    downloadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const p = ProjectStorage.load(projData._id);
      if (p) ProjectStorage.download(p);
    });
    actionsEl.appendChild(downloadBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger btn-small";
    deleteBtn.textContent = window.i18n.t("common.delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(window.i18n.t("project.deleteConfirm"))) {
        ProjectStorage.delete(projData._id);
        this.renderProjectsList();
      }
    });
    actionsEl.appendChild(deleteBtn);
    card.appendChild(actionsEl);
    return card;
  }

  // ==================== OPEN / SAVE ====================

  openProject(id) {
    const project = ProjectStorage.load(id);
    if (!project) {
      this.setStatus("Error loading project");
      return;
    }
    this.currentProject = project;
    this.currentPageIndex = project.pages.length > 0 ? 0 : -1;
    this.currentPage = project.pages.length > 0 ? project.pages[0] : null;
    this.selectedTagUid = null;
    this.showElementEditor = false;
    this.currentView = "project";
    this.currentPageTab = "meta";
    this.clearDirty();
    this.saveToHash();
    this.refreshUI();
  }

  saveProject() {
    if (!this.currentProject) return;
    if (ProjectStorage.save(this.currentProject)) {
      this.clearDirty();
      this.setStatus(window.i18n.t("project.saveSuccess"));
      this.saveToHash();
    } else {
      this.setStatus(window.i18n.t("project.saveError"));
    }
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const project = ProjectStorage.import(event.target.result);
      if (project) {
        this.setStatus(`Imported: ${project.name}`);
        this.showProjectsList();
      } else {
        this.setStatus("Failed to import project");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ==================== PROJECT VIEW ====================

  showProjectView() {
    if (!this.currentProject) {
      this.showProjectsList();
      return;
    }
    this.currentView = "project";
    this.selectedTagUid = null;
    this.showElementEditor = false;
    this.saveToHash();
    this.refreshUI();
  }

  renderProjectView() {
    if (!this.currentProject) return;
    this._renderProjectTabs();
    this._renderProjectContent();
    this.renderPreview();
  }

  _renderProjectTabs() {
    const tabs = this.els.sidebarTabs;
    tabs.style.display = "flex";
    tabs.innerHTML = "";
    const mt = this._createTab(
      "meta",
      window.i18n.t("page.metadata"),
      this.currentPageTab === "meta",
    );
    mt.addEventListener("click", () => {
      this.currentPageTab = "meta";
      this.renderProjectView();
    });
    tabs.appendChild(mt);
    const pt = this._createTab(
      "pages",
      window.i18n.t("project.pages"),
      this.currentPageTab === "pages",
    );
    pt.addEventListener("click", () => {
      this.currentPageTab = "pages";
      this.renderProjectView();
    });
    tabs.appendChild(pt);
  }

  _renderProjectContent() {
    const content = this.els.sidebarContent;
    content.innerHTML = "";
    if (this.currentPageTab === "meta") this._renderProjectMeta(content);
    else if (this.currentPageTab === "pages")
      this._renderProjectPagesList(content);
  }

  _renderProjectMeta(container) {
    const project = this.currentProject;
    const form = document.createElement("div");
    form.className = "form";
    form.appendChild(
      this._createFormGroup(
        window.i18n.t("project.name"),
        "text",
        project.name,
        (v) => {
          project.name = v;
          this.markDirty();
        },
      ),
    );
    form.appendChild(
      this._createFormGroup(
        window.i18n.t("project.author"),
        "text",
        project.author,
        (v) => {
          project.author = v;
          this.markDirty();
        },
      ),
    );
    container.appendChild(form);
  }

  _renderProjectPagesList(container) {
    const project = this.currentProject;
    const header = document.createElement("div");
    header.className = "pages-header";
    const newBtn = document.createElement("button");
    newBtn.className = "btn btn-primary";
    newBtn.textContent = "+ " + window.i18n.t("page.newPage");
    newBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const page = new Page({ title: `Page ${project.pages.length + 1}` });
      project.addPage(page);
      ProjectStorage.save(project);
      this.currentPageIndex = project.pages.length - 1;
      this.currentPage = page;
      this.currentView = "page";
      this.currentPageTab = "insert";
      this.selectedTagUid = null;
      this.showElementEditor = false;
      this.saveToHash();
      this.refreshUI();
    });
    header.appendChild(newBtn);
    container.appendChild(header);
    if (project.pages.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = window.i18n.t("project.noProjects");
      container.appendChild(empty);
      return;
    }
    const pageList = document.createElement("div");
    pageList.className = "page-cards";
    project.pages.forEach((page, index) => {
      const card = document.createElement("div");
      card.className = "page-card";
      const titleEl = document.createElement("div");
      titleEl.className = "page-card-title";
      titleEl.textContent = page.title || `Page ${index + 1}`;
      card.appendChild(titleEl);
      const actions = document.createElement("div");
      actions.className = "page-card-actions";
      const openBtn = document.createElement("button");
      openBtn.className = "btn btn-primary btn-small";
      openBtn.textContent = window.i18n.t("common.edit");
      openBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentPageIndex = index;
        this.currentPage = page;
        this.currentView = "page";
        this.currentPageTab = "insert";
        this.selectedTagUid = null;
        this.showElementEditor = false;
        this.saveToHash();
        this.refreshUI();
      });
      actions.appendChild(openBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger btn-small";
      deleteBtn.textContent = window.i18n.t("common.delete");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        project.removePage(index);
        ProjectStorage.save(project);
        if (this.currentPageIndex === index) {
          this.currentPageIndex = Math.max(0, index - 1);
          this.currentPage = project.pages[this.currentPageIndex] || null;
        }
        this.renderProjectView();
      });
      actions.appendChild(deleteBtn);
      card.appendChild(actions);
      pageList.appendChild(card);
    });
    container.appendChild(pageList);
  }

  // ==================== PAGE EDITOR ====================

  renderPageEditor() {
    if (!this.currentPage) return;
    this._renderPageTabs();
    this._renderPageContent();
    this.renderPreview();
  }

  _renderPageTabs() {
    const tabs = this.els.sidebarTabs;
    tabs.style.display = "flex";
    tabs.innerHTML = "";

    const backBtn = document.createElement("button");
    backBtn.className = "tab back-tab";
    backBtn.textContent = "← " + window.i18n.t("page.backToProject");
    backBtn.addEventListener("click", () => this.showProjectView());
    tabs.appendChild(backBtn);

    const pageTabs = [
      { key: "insert", label: "📦 " + window.i18n.t("page.insert") },
      { key: "meta", label: "📄 Page" },
      { key: "head", label: "📋 Meta" },
      { key: "palettes", label: "🎨 " + window.i18n.t("page.palettes") },
      { key: "body", label: "🔧 " + window.i18n.t("page.body") },
      { key: "styles", label: "✏️ Styles" },
    ];

    const effectiveTab = this.showElementEditor
      ? "element"
      : this.currentPageTab;
    for (const tabInfo of pageTabs) {
      const tab = this._createTab(
        tabInfo.key,
        tabInfo.label,
        this.currentPageTab === tabInfo.key && !this.showElementEditor,
      );
      tab.addEventListener("click", () => {
        this.currentPageTab = tabInfo.key;
        this.showElementEditor = false;
        this.refreshUI();
      });
      tabs.appendChild(tab);
    }
    if (this.showElementEditor) {
      const elemTab = this._createTab("element", "✏️ Element", true);
      elemTab.addEventListener("click", () => {});
      tabs.appendChild(elemTab);
    }
  }

  _renderPageContent() {
    if (!this.currentPage) return;
    const content = this.els.sidebarContent;
    content.innerHTML = "";
    switch (this.currentPageTab) {
      case "insert":
        this._renderInsertPanel(content);
        break;
      case "meta":
        this._renderPageMeta(content);
        break;
      case "head":
        this._renderPageHead(content);
        break;
      case "palettes":
        this._renderPagePalettes(content);
        break;
      case "body":
        this._renderPageBody(content);
        break;
      case "styles":
        this._renderPageStyles(content);
        break;
      case "element":
        this._renderElementEditor(content);
        break;
    }
  }

  // ——— Page Meta ———

  _renderPageMeta(container) {
    const page = this.currentPage;
    const form = document.createElement("div");
    form.className = "form";
    form.appendChild(
      this._createFormGroup(
        window.i18n.t("page.pageTitle"),
        "text",
        page.title,
        (v) => {
          page.title = v;
          this.markDirty();
          this.renderPreview();
        },
      ),
    );
    form.appendChild(
      this._createFormGroup(
        window.i18n.t("page.width"),
        "text",
        page.width,
        (v) => {
          page.width = v;
          this.markDirty();
          this.renderPreview();
        },
      ),
    );
    form.appendChild(
      this._createFormGroup(
        window.i18n.t("page.height"),
        "text",
        page.height,
        (v) => {
          page.height = v;
          this.markDirty();
          this.renderPreview();
        },
      ),
    );
    container.appendChild(form);
  }

  // ——— Head with Constructor ———

  _renderPageHead(container) {
    container.innerHTML = "";
    const page = this.currentPage;

    // Preset constructor buttons
    const constructor = document.createElement("div");
    constructor.className = "head-section";
    constructor.innerHTML = `<h3>Quick Add</h3>`;
    const presetRow = document.createElement("div");
    presetRow.style.cssText =
      "display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px";

    const presets = [
      {
        label: "📄 Charset",
        fn: () => {
          page.head.meta.push(new Meta({ charset: "UTF-8" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "📱 Viewport",
        fn: () => {
          page.head.meta.push(
            new Meta({
              name: "viewport",
              content: "width=device-width, initial-scale=1.0",
            }),
          );
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "📝 Description",
        fn: () => {
          page.head.meta.push(new Meta({ name: "description", content: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "🔑 Keywords",
        fn: () => {
          page.head.meta.push(new Meta({ name: "keywords", content: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "👤 Author",
        fn: () => {
          page.head.meta.push(new Meta({ name: "author", content: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "🔄 X-UA-Compatible",
        fn: () => {
          page.head.meta.push(
            new Meta({ httpEquiv: "X-UA-Compatible", content: "IE=edge" }),
          );
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "🔗 OG Title",
        fn: () => {
          page.head.meta.push(new Meta({ property: "og:title", content: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "🖼 OG Image",
        fn: () => {
          page.head.meta.push(new Meta({ property: "og:image", content: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "📄 OG Description",
        fn: () => {
          page.head.meta.push(
            new Meta({ property: "og:description", content: "" }),
          );
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "📎 OG URL",
        fn: () => {
          page.head.meta.push(new Meta({ property: "og:url", content: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "➕ Manual Meta",
        fn: () => {
          page.head.meta.push(new Meta());
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "📎 CSS Link",
        fn: () => {
          page.head.link.push(new Link({ rel: "stylesheet", href: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
      {
        label: "🔖 Favicon",
        fn: () => {
          page.head.favicons.push(new Favicon({ href: "" }));
          this.markDirty();
          this._renderPageHead(container);
        },
      },
    ];

    for (const p of presets) {
      const btn = document.createElement("button");
      btn.className = "btn btn-small";
      btn.textContent = p.label;
      btn.style.cssText = "font-size:10px;padding:2px 6px";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        p.fn();
      });
      presetRow.appendChild(btn);
    }
    constructor.appendChild(presetRow);
    container.appendChild(constructor);

    // Manual sections
    const sections = [
      {
        key: "meta",
        label: window.i18n.t("head.meta"),
        items: page.head.meta,
        fields: [
          { key: "charset", label: "Charset", type: "text" },
          { key: "name", label: window.i18n.t("head.name"), type: "text" },
          {
            key: "content",
            label: window.i18n.t("head.content"),
            type: "text",
          },
          {
            key: "httpEquiv",
            label: window.i18n.t("head.httpEquiv"),
            type: "text",
          },
          { key: "property", label: "Property", type: "text" },
        ],
        createItem: () => new Meta(),
        addLabel: "+ Meta",
      },
      {
        key: "link",
        label: window.i18n.t("head.links"),
        items: page.head.link,
        fields: [
          { key: "href", label: window.i18n.t("head.href"), type: "text" },
          { key: "rel", label: window.i18n.t("head.rel"), type: "text" },
          { key: "type", label: window.i18n.t("head.type"), type: "text" },
        ],
        createItem: () => new Link(),
        addLabel: "+ Link",
      },
      {
        key: "favicons",
        label: window.i18n.t("head.favicons"),
        items: page.head.favicons,
        fields: [
          { key: "href", label: window.i18n.t("head.href"), type: "text" },
          { key: "rel", label: window.i18n.t("head.rel"), type: "text" },
          { key: "sizes", label: window.i18n.t("head.sizes"), type: "text" },
        ],
        createItem: () => new Favicon(),
        addLabel: "+ Favicon",
      },
    ];

    for (const section of sections) {
      const sectionEl = document.createElement("div");
      sectionEl.className = "head-section";
      const header = document.createElement("h3");
      header.textContent = section.label;
      sectionEl.appendChild(header);

      for (let i = 0; i < section.items.length; i++) {
        const itemEl = document.createElement("div");
        itemEl.className = "head-item";
        for (const field of section.fields) {
          itemEl.appendChild(
            this._createFormGroup(
              field.label,
              field.type,
              section.items[i][field.key] || "",
              (val) => {
                section.items[i][field.key] = val;
                this.markDirty();
              },
              { small: true },
            ),
          );
        }
        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger btn-small";
        delBtn.textContent = "✕";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          section.items.splice(i, 1);
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        });
        itemEl.appendChild(delBtn);
        sectionEl.appendChild(itemEl);
      }

      const addBtn = document.createElement("button");
      addBtn.className = "btn btn-small";
      addBtn.textContent = section.addLabel;
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        section.items.push(section.createItem());
        this.markDirty();
        this._rerender(container, this._renderPageHead.bind(this));
      });
      sectionEl.appendChild(addBtn);
      container.appendChild(sectionEl);
    }
  }

  // ——— Page Style Sheet ———

  _renderPageStyles(container) {
    const page = this.currentPage;

    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary btn-small";
    addBtn.textContent = "+ Add Style Rule";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      page.styles.push(new StyleSet({ selector: "", styles: [] }));
      this.markDirty();
      this._rerender(container, this._renderPageStyles.bind(this));
    });
    container.appendChild(addBtn);

    if (page.styles.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No style rules. Add one above.";
      container.appendChild(empty);
      return;
    }

    for (let si = 0; si < page.styles.length; si++) {
      const ss = page.styles[si];
      const section = document.createElement("div");
      section.className = "head-section";

      const selGroup = this._createFormGroup(
        "Selector",
        "text",
        ss.selector,
        (v) => {
          ss.selector = v;
          this.markDirty();
          this.renderPreview();
        },
        { small: true },
      );
      section.appendChild(selGroup);

      for (let si2 = 0; si2 < ss.styles.length; si2++) {
        const row = document.createElement("div");
        row.className = "advanced-style-row";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input input-small";
        input.value = ss.styles[si2];
        input.style.flex = "1";
        input.addEventListener("change", () => {
          ss.styles[si2] = input.value;
          this.markDirty();
          this.renderPreview();
        });
        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger btn-small";
        delBtn.textContent = "✕";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          ss.styles.splice(si2, 1);
          this.markDirty();
          this._rerender(container, this._renderPageStyles.bind(this));
        });
        row.appendChild(input);
        row.appendChild(delBtn);
        section.appendChild(row);
      }

      const addRuleBtn = document.createElement("button");
      addRuleBtn.className = "btn btn-small";
      addRuleBtn.textContent = "+ Rule";
      addRuleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        ss.styles.push("");
        this.markDirty();
        this._rerender(container, this._renderPageStyles.bind(this));
      });
      section.appendChild(addRuleBtn);

      const delSecBtn = document.createElement("button");
      delSecBtn.className = "btn btn-danger btn-small";
      delSecBtn.textContent = "Delete Rule";
      delSecBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        page.styles.splice(si, 1);
        this.markDirty();
        this._rerender(container, this._renderPageStyles.bind(this));
      });
      section.appendChild(delSecBtn);

      container.appendChild(section);
    }
    this.renderPreview();
  }

  // ——— Palettes ———

  _renderPagePalettes(container) {
    const page = this.currentPage;

    // Add palette button at top
    const addPalBtn = document.createElement("button");
    addPalBtn.className = "btn";
    addPalBtn.textContent = "+ " + window.i18n.t("palette.addPalette");
    addPalBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      page.palettes.push(
        new Palette({
          name: `Palette ${page.palettes.length + 1}`,
          colors: [["primary", "#007bff"]],
        }),
      );
      this.markDirty();
      this._rerender(container, this._renderPagePalettes.bind(this));
    });
    container.appendChild(addPalBtn);

    for (let pi = 0; pi < page.palettes.length; pi++) {
      const palette = page.palettes[pi];
      const palEl = document.createElement("div");
      palEl.className = "palette-section";

      // Header row with name + delete
      const headerRow = document.createElement("div");
      headerRow.style.cssText = "display:flex;gap:6px;align-items:center";
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "input input-small";
      nameInput.style.flex = "1";
      nameInput.value = palette.name;
      nameInput.placeholder = window.i18n.t("palette.name");
      nameInput.addEventListener("input", () => {
        palette.name = nameInput.value;
        this.markDirty();
      });
      headerRow.appendChild(nameInput);

      const delPalBtn = document.createElement("button");
      delPalBtn.className = "btn btn-danger btn-small";
      delPalBtn.textContent = "✕";
      delPalBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        page.palettes.splice(pi, 1);
        this.markDirty();
        this._rerender(container, this._renderPagePalettes.bind(this));
      });
      headerRow.appendChild(delPalBtn);
      palEl.appendChild(headerRow);

      // Colors
      for (let ci = 0; ci < palette.colors.length; ci++) {
        const [colorName, colorValue] = palette.colors[ci];
        const colorRow = document.createElement("div");
        colorRow.className = "color-row";
        const cnInput = document.createElement("input");
        cnInput.type = "text";
        cnInput.className = "input input-small";
        cnInput.value = colorName;
        cnInput.placeholder = window.i18n.t("palette.colorName");
        cnInput.addEventListener("input", () => {
          palette.colors[ci][0] = cnInput.value;
          this.markDirty();
          this.renderPreview();
        });
        const cvInput = document.createElement("input");
        cvInput.type = "color";
        cvInput.className = "color-input";
        cvInput.value = colorValue;
        cvInput.addEventListener("input", () => {
          palette.colors[ci][1] = cvInput.value;
          this.markDirty();
          this.renderPreview();
        });
        const delColBtn = document.createElement("button");
        delColBtn.className = "btn btn-danger btn-small";
        delColBtn.textContent = "✕";
        delColBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          palette.colors.splice(ci, 1);
          this.markDirty();
          this._rerender(container, this._renderPagePalettes.bind(this));
        });
        colorRow.appendChild(cnInput);
        colorRow.appendChild(cvInput);
        colorRow.appendChild(delColBtn);
        palEl.appendChild(colorRow);
      }

      const addColorBtn = document.createElement("button");
      addColorBtn.className = "btn btn-small";
      addColorBtn.textContent = "+ " + window.i18n.t("palette.addColor");
      addColorBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        palette.colors.push(["", "#000000"]);
        this.markDirty();
        this._rerender(container, this._renderPagePalettes.bind(this));
      });
      palEl.appendChild(addColorBtn);

      container.appendChild(palEl);
    }
  }

  // ——— Body (Elements Tree) ———

  _renderPageBody(container) {
    const page = this.currentPage;

    const bodyHeader = document.createElement("div");
    bodyHeader.className = "body-header";

    const addChildBtn = document.createElement("button");
    addChildBtn.className = "btn btn-primary";
    addChildBtn.textContent = "+ " + window.i18n.t("element.addChild");
    addChildBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.selectedTagUid) {
        const tag = page.findTagByUid(this.selectedTagUid);
        if (tag) {
          this._showAddChildModal(tag);
          return;
        }
      }
      page.body.push(new Tag({ tagName: "div" }));
      this.markDirty();
      this.renderPreview();
      this._rerender(container, this._renderPageBody.bind(this));
    });
    bodyHeader.appendChild(addChildBtn);
    container.appendChild(bodyHeader);

    if (page.body.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No elements. Add one above.";
      container.appendChild(empty);
      return;
    }

    const treeEl = document.createElement("div");
    treeEl.className = "body-tree compact";
    for (let i = 0; i < page.body.length; i++) {
      this._renderTagTreeNode(
        page.body[i],
        treeEl,
        0,
        page.body,
        i,
        page,
        false,
      );
    }
    container.appendChild(treeEl);
  }

  _showAddChildModal(parentTag) {
    const html = `
      <h2>Add Child Element</h2>
      <div class="form" style="margin-top:12px">
        <div class="form-group">
          <label class="form-label">Tag Name</label>
          <input type="text" class="input" id="modal-child-tag" value="div" list="tag-suggestions">
          <datalist id="tag-suggestions">
            <option value="div"><option value="span"><option value="p"><option value="h1"><option value="h2">
            <option value="h3"><option value="a"><option value="img"><option value="ul"><option value="li">
            <option value="button"><option value="input"><option value="section"><option value="header">
            <option value="footer"><option value="nav"><option value="article"><option value="aside">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Inner HTML (optional)</label>
          <input type="text" class="input" id="modal-child-html" placeholder="Text content or inner HTML">
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-primary" id="modal-add-child-btn">Add</button>
          <button class="btn" id="modal-cancel-child-btn">Cancel</button>
        </div>
      </div>`;
    this.showModal(html);

    document
      .getElementById("modal-add-child-btn")
      .addEventListener("click", () => {
        const tagName =
          document.getElementById("modal-child-tag").value.trim() || "div";
        const inner = document.getElementById("modal-child-html").value.trim();
        const tag = new Tag({ tagName: tagName.toLowerCase() });
        if (inner) {
          // Try to parse as HTML
          const wrapper = document.createElement("div");
          wrapper.innerHTML = inner;
          if (wrapper.children.length > 0) {
            for (const el of wrapper.children) {
              const childTag = this._domToTag(el);
              if (childTag) tag.children.push(childTag);
            }
          } else {
            tag.textContent = inner;
          }
        }
        parentTag.children.push(tag);
        this.markDirty();
        this.renderPreview();
        this.closeModal();
        // Select new element
        this.selectedTagUid = tag._uid;
        this.showElementEditor = true;
        this.currentPageTab = "element";
        this.refreshUI();
      });
    document
      .getElementById("modal-cancel-child-btn")
      .addEventListener("click", () => this.closeModal());
    setTimeout(() => document.getElementById("modal-child-tag").focus(), 50);
  }

  _renderTagTreeNode(
    tag,
    parentEl,
    depth,
    siblings,
    siblingIndex,
    page,
    compact,
    isChildTree,
  ) {
    const node = document.createElement("div");
    node.className = "tree-node";
    node.style.paddingLeft = `${depth * 12 + 4}px`;
    node.dataset.uid = tag._uid;
    if (tag._uid === this.selectedTagUid) node.classList.add("selected");

    const header = document.createElement("div");
    header.className = "tree-node-header";

    // Click to select
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectedTagUid = tag._uid;
      this.showElementEditor = true;
      this.currentPageTab = "element";
      this.refreshUI();
      this.renderPreview();
    });

    const toggleBtn = document.createElement("span");
    toggleBtn.className = "tree-toggle";
    const hasChildren = tag.children.length > 0;
    toggleBtn.textContent = hasChildren ? "▶" : "·";
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      node.classList.toggle("collapsed");
      toggleBtn.textContent = node.classList.contains("collapsed") ? "▶" : "▼";
    });

    const nameEl = document.createElement("span");
    nameEl.className = "tree-tag-name";

    // Show ID, or tag name, or class/attrs
    if (tag.id) {
      nameEl.textContent = `#${tag.id}`;
    } else {
      nameEl.textContent = tag.tagName;
    }
    // Add distinguishing attributes
    const extras = [];
    if (tag.class.length > 0) extras.push("." + tag.class.join("."));
    if (tag.attrs.name) extras.push(`[name="${tag.attrs.name}"]`);
    if (tag.attrs.href) extras.push(`[href]`);
    if (extras.length > 0) {
      const extraSpan = document.createElement("span");
      extraSpan.className = "tree-class";
      extraSpan.textContent = extras.join("");
      nameEl.appendChild(extraSpan);
    }
    if (hasChildren && !node.classList.contains("collapsed")) {
      const countSpan = document.createElement("span");
      countSpan.className = "tree-child-count";
      countSpan.textContent = ` (${tag.children.length})`;
      nameEl.appendChild(countSpan);
    }

    header.appendChild(toggleBtn);
    header.appendChild(nameEl);

    if (!isChildTree) {
      const actions = document.createElement("span");
      actions.className = "tree-actions";

      // Add child button for every element
      const addBtn = document.createElement("button");
      addBtn.className = "tree-btn";
      addBtn.textContent = "+";
      addBtn.title = window.i18n.t("element.addChild");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._showAddChildModal(tag);
      });
      actions.appendChild(addBtn);

      if (!compact && siblingIndex !== undefined) {
        const selBtn = document.createElement("button");
        selBtn.className = "tree-btn";
        selBtn.textContent = "◎";
        selBtn.title = "Select";
        selBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectedTagUid = tag._uid;
          this.showElementEditor = true;
          this.currentPageTab = "element";
          this.refreshUI();
          this.renderPreview();
        });
        actions.appendChild(selBtn);

        if (siblingIndex > 0) {
          const upBtn = document.createElement("button");
          upBtn.className = "tree-btn";
          upBtn.textContent = "↑";
          upBtn.title = window.i18n.t("element.moveUp");
          upBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            [siblings[siblingIndex - 1], siblings[siblingIndex]] = [
              siblings[siblingIndex],
              siblings[siblingIndex - 1],
            ];
            this.markDirty();
            this.refreshUI();
            this.renderPreview();
          });
          actions.appendChild(upBtn);
        }
        if (siblings && siblingIndex < siblings.length - 1) {
          const downBtn = document.createElement("button");
          downBtn.className = "tree-btn";
          downBtn.textContent = "↓";
          downBtn.title = window.i18n.t("element.moveDown");
          downBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            [siblings[siblingIndex], siblings[siblingIndex + 1]] = [
              siblings[siblingIndex + 1],
              siblings[siblingIndex],
            ];
            this.markDirty();
            this.refreshUI();
            this.renderPreview();
          });
          actions.appendChild(downBtn);
        }

        const dupBtn = document.createElement("button");
        dupBtn.className = "tree-btn";
        dupBtn.textContent = "⧉";
        dupBtn.title = window.i18n.t("element.duplicate");
        dupBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const c = tag.duplicate();
          siblings.splice(siblingIndex + 1, 0, c);
          this.markDirty();
          this.refreshUI();
          this.renderPreview();
        });
        actions.appendChild(dupBtn);

        const svBtn = document.createElement("button");
        svBtn.className = "tree-btn";
        svBtn.textContent = "💾";
        svBtn.title = "Save as Preset";
        svBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this._saveAsPreset(tag);
        });
        actions.appendChild(svBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "tree-btn tree-btn-danger";
        delBtn.textContent = "✕";
        delBtn.title = window.i18n.t("common.delete");
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          siblings.splice(siblingIndex, 1);
          this.markDirty();
          if (this.selectedTagUid === tag._uid) {
            this.selectedTagUid = null;
            this.showElementEditor = false;
          }
          this.refreshUI();
          this.renderPreview();
        });
        actions.appendChild(delBtn);
      }

      header.appendChild(actions);
    }

    node.appendChild(header);
    if (hasChildren) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "tree-children";
      // Start collapsed
      node.classList.add("collapsed");
      for (let ci = 0; ci < tag.children.length; ci++) {
        this._renderTagTreeNode(
          tag.children[ci],
          childrenContainer,
          depth + 1,
          tag.children,
          ci,
          page,
          compact,
          isChildTree,
        );
      }
      node.appendChild(childrenContainer);
    }
    parentEl.appendChild(node);
  }

  // ——— Insert Panel (Redesigned with groups, emojis, modals) ———

  _renderInsertPanel(container) {
    const page = this.currentPage;

    // Presets section (from localStorage)
    if (this._presets.length > 0) {
      const presetsSection = document.createElement("div");
      presetsSection.className = "insert-section";
      const presetsTitle = document.createElement("h3");
      presetsTitle.textContent = "⭐ Presets";
      presetsTitle.style.cssText =
        "font-size:12px;color:var(--highlight);margin-bottom:4px";
      presetsSection.appendChild(presetsTitle);

      const presetsGrid = document.createElement("div");
      presetsGrid.className = "insert-grid";
      for (let pi = 0; pi < this._presets.length; pi++) {
        const p = this._presets[pi];
        const btn = document.createElement("button");
        btn.className = "insert-btn";
        btn.textContent = "⭐ " + p.name;
        btn.title = p.tagName + (p.class.length ? "." + p.class.join(".") : "");
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this._insertPreset(p, page);
        });
        presetsGrid.appendChild(btn);
      }
      presetsSection.appendChild(presetsGrid);
      container.appendChild(presetsSection);
    }

    // Groups of elements
    const groups = [
      {
        title: "📝 Text & Links",
        items: [
          {
            label: "🔤 Span",
            tag: "span",
            modal: (tag) => {
              const text = prompt("Text content:", "Text");
              if (text) tag.textContent = text;
              return !!text;
            },
          },
          {
            label: "🔗 Link",
            tag: "a",
            modal: (tag) => {
              const href = prompt("Href:", "#");
              if (!href) return false;
              tag.attrs.href = href;
              tag.textContent = prompt("Link text:", "Link") || "Link";
              return true;
            },
          },
          { label: "¶ Paragraph", tag: "p", defaultContent: "Paragraph text" },
          { label: "📋 Inline Code", tag: "code", defaultContent: "code" },
          { label: "🏷️ Label", tag: "label", defaultContent: "Label" },
        ],
      },
      {
        title: "🔤 Headings",
        items: [
          { label: "H1", tag: "h1", defaultContent: "Heading 1" },
          { label: "H2", tag: "h2", defaultContent: "Heading 2" },
          { label: "H3", tag: "h3", defaultContent: "Heading 3" },
          { label: "H4", tag: "h4", defaultContent: "Heading 4" },
          { label: "H5", tag: "h5", defaultContent: "Heading 5" },
          { label: "H6", tag: "h6", defaultContent: "Heading 6" },
        ],
      },
      {
        title: "🖼️ Media",
        items: [
          {
            label: "🖼️ Image",
            tag: "img",
            modal: (tag) => {
              tag.attrs.src =
                prompt("Image URL:", "https://via.placeholder.com/150") ||
                "https://via.placeholder.com/150";
              tag.attrs.alt = prompt("Alt text:", "Image") || "Image";
              return true;
            },
          },
          { label: "🎬 Video", tag: "video", attrs: { controls: "" } },
          { label: "🎵 Audio", tag: "audio", attrs: { controls: "" } },
          {
            label: "🖼️ Figure",
            tag: "figure",
            children: [
              new Tag({
                tagName: "img",
                attrs: { src: "https://via.placeholder.com/150", alt: "" },
              }),
            ],
          },
          {
            label: "📺 Iframe",
            tag: "iframe",
            modal: (tag) => {
              tag.attrs.src =
                prompt("Source URL:", "about:blank") || "about:blank";
              return true;
            },
          },
        ],
      },
      {
        title: "📋 Lists & Dividers",
        items: [
          {
            label: "📋 List (ul)",
            tag: "ul",
            modal: (tag) => {
              const items = prompt(
                "List items (comma-separated):",
                "Item 1, Item 2",
              );
              if (items) {
                for (const item of items
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)) {
                  tag.children.push(
                    new Tag({ tagName: "li", textContent: item }),
                  );
                }
              }
              return true;
            },
          },
          {
            label: "🔢 List (ol)",
            tag: "ol",
            modal: (tag) => {
              const items = prompt(
                "List items (comma-separated):",
                "Item 1, Item 2",
              );
              if (items) {
                for (const item of items
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)) {
                  tag.children.push(
                    new Tag({ tagName: "li", textContent: item }),
                  );
                }
              }
              return true;
            },
          },
          { label: "➖ HR", tag: "hr" },
          { label: "↩ BR", tag: "br" },
        ],
      },
      {
        title: "🔘 Interactive",
        items: [
          { label: "📝 Form", tag: "form", attrs: { action: "#" } },
          { label: "🔘 Button", tag: "button", defaultContent: "Button" },
          {
            label: "✏️ Input",
            tag: "input",
            modal: (tag) => {
              const typeInput = prompt(
                "Input type (text/number/email/password/checkbox/radio/color/date/file):",
                "text",
              );
              if (!typeInput) return false;
              tag.attrs.type = typeInput.toLowerCase();
              if (typeInput !== "checkbox" && typeInput !== "radio") {
                tag.attrs.placeholder =
                  prompt("Placeholder:", "Enter...") || "Enter...";
              }
              if (typeInput === "checkbox" || typeInput === "radio") {
                if (confirm("Checked?")) tag.attrs.checked = "";
              }
              return true;
            },
          },
          { label: "📄 Textarea", tag: "textarea", defaultContent: "" },
          {
            label: "📋 Select",
            tag: "select",
            modal: (tag) => {
              const opts = prompt(
                "Options (comma-separated):",
                "Option 1, Option 2",
              );
              if (opts) {
                for (const opt of opts
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)) {
                  tag.children.push(
                    new Tag({ tagName: "option", textContent: opt }),
                  );
                }
              }
              return true;
            },
          },
        ],
      },
      {
        title: "📦 Layout Blocks",
        items: [
          { label: "📦 Div", tag: "div" },
          { label: "🧭 Nav", tag: "nav", defaultContent: "Navigation" },
          { label: "📐 Section", tag: "section", defaultContent: "Section" },
          { label: "📰 Article", tag: "article", defaultContent: "Article" },
          { label: "📎 Aside", tag: "aside", defaultContent: "Aside" },
          { label: "📌 Header", tag: "header", defaultContent: "Header" },
          { label: "📍 Footer", tag: "footer", defaultContent: "Footer" },
          {
            label: "📊 Table",
            tag: "table",
            children: [
              new Tag({
                tagName: "tr",
                children: [new Tag({ tagName: "td", textContent: "Cell" })],
              }),
            ],
          },
          {
            label: "🧩 Flex",
            tag: "div",
            styles: ["display: flex"],
            defaultContent: "Flex container",
          },
          {
            label: "🔲 Grid",
            tag: "div",
            styles: ["display: grid", "grid-template-columns: 1fr 1fr"],
            defaultContent: "Grid container",
          },
        ],
      },
      {
        title: "🌐 HTML5",
        items: [
          {
            label: "🎨 Canvas",
            tag: "canvas",
            attrs: { width: "200", height: "100" },
          },
          {
            label: "📊 Details",
            tag: "details",
            children: [
              new Tag({ tagName: "summary", textContent: "Details" }),
              new Tag({ tagName: "p", textContent: "Content" }),
            ],
          },
          { label: "📈 Meter", tag: "meter", attrs: { value: "0.5" } },
          {
            label: "📊 Progress",
            tag: "progress",
            attrs: { value: "50", max: "100" },
          },
          { label: "📝 Mark", tag: "mark", defaultContent: "Highlighted" },
          { label: "⏱️ Time", tag: "time", defaultContent: "2024-01-01" },
          {
            label: "💬 Dialog",
            tag: "dialog",
            defaultContent: "Dialog content",
          },
        ],
      },
    ];

    for (const group of groups) {
      const section = document.createElement("div");
      section.className = "insert-section";
      const title = document.createElement("h3");
      title.textContent = group.title;
      title.style.cssText =
        "font-size:12px;color:var(--accent);margin:6px 0 4px";
      section.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "insert-grid";

      for (const item of group.items) {
        const btn = document.createElement("button");
        btn.className = "insert-btn";
        btn.textContent = item.label;
        btn.title = item.tag;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const tag = new Tag({
            tagName: item.tag,
            textContent: item.defaultContent || "",
            attrs: item.attrs || {},
            styles: item.styles || [],
            children: item.children || [],
          });

          // If modal constructor exists, show it
          if (item.modal) {
            if (!item.modal(tag)) return;
          }

          if (this.selectedTagUid) {
            const selectedTag = page.findTagByUid(this.selectedTagUid);
            if (selectedTag) selectedTag.children.push(tag);
          } else {
            page.body.push(tag);
          }
          this.markDirty();
          this.renderPreview();
          // Focus: select the new element
          this.selectedTagUid = tag._uid;
          this.showElementEditor = true;
          this.currentPageTab = "element";
          this.refreshUI();
        });
        grid.appendChild(btn);
      }
      section.appendChild(grid);
      container.appendChild(section);
    }
  }

  _insertPreset(p, page) {
    const tag = Tag.fromJSON({
      tagName: p.tagName,
      textContent: p.textContent || "",
      attrs: p.attrs || {},
      class: p.class || [],
      styles: p.styles || [],
      children: (p.children || []).map((c) => ({ ...c, _uid: undefined })),
    });
    if (this.selectedTagUid) {
      const selectedTag = page.findTagByUid(this.selectedTagUid);
      if (selectedTag) selectedTag.children.push(tag);
    } else {
      page.body.push(tag);
    }
    this.markDirty();
    this.renderPreview();
    this.selectedTagUid = tag._uid;
    this.showElementEditor = true;
    this.currentPageTab = "element";
    this.refreshUI();
  }

  // ==================== ELEMENT EDITOR ====================

  _renderElementEditor(container) {
    if (!this.currentPage || !this.selectedTagUid) {
      this.showElementEditor = false;
      this.selectedTagUid = null;
      this.currentPageTab = "body";
      this.refreshUI();
      return;
    }
    const tag = this.currentPage.findTagByUid(this.selectedTagUid);
    if (!tag) {
      this.showElementEditor = false;
      this.selectedTagUid = null;
      this.currentPageTab = "body";
      this.refreshUI();
      return;
    }
    this._renderElementEditorSub(container, tag);
  }

  _renderElementEditorSub(container, tag) {
    container.innerHTML = "";
    const editor = document.createElement("div");
    editor.className = "element-editor";

    // Basic Info
    const basicSection = document.createElement("div");
    basicSection.className = "editor-section";

    basicSection.appendChild(
      this._createFormGroup(
        window.i18n.t("element.tagName"),
        "text",
        tag.tagName,
        (val) => {
          tag.tagName = val.toLowerCase();
          this.markDirty();
          this.renderPreview();
          this._updateTreeOnly();
        },
        { small: true },
      ),
    );
    basicSection.appendChild(
      this._createFormGroup(
        window.i18n.t("element.textContent"),
        "text",
        tag.textContent,
        (val) => {
          tag.textContent = val;
          this.markDirty();
          this.renderPreview();
        },
        { small: true },
      ),
    );
    basicSection.appendChild(
      this._createFormGroup(
        window.i18n.t("element.id"),
        "text",
        tag.id,
        (val) => {
          tag.id = val;
          this.markDirty();
          this.renderPreview();
          this._updateTreeOnly();
        },
        { small: true },
      ),
    );

    // Pseudo-state selector
    const pseudoGroup = document.createElement("div");
    pseudoGroup.className = "form-group form-group-small";
    const pseudoLabel = document.createElement("label");
    pseudoLabel.className = "form-label";
    pseudoLabel.textContent = "Pseudo-state";
    pseudoGroup.appendChild(pseudoLabel);
    const pseudoSelect = document.createElement("select");
    pseudoSelect.className = "input input-small";
    [
      "",
      ":hover",
      ":active",
      ":focus",
      ":visited",
      ":focus-within",
      ":first-child",
      ":last-child",
      ":nth-child(odd)",
      ":nth-child(even)",
    ].forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p || "(none)";
      if (p === this.pseudoState) opt.selected = true;
      pseudoSelect.appendChild(opt);
    });
    pseudoSelect.addEventListener("change", () => {
      this.pseudoState = pseudoSelect.value;
      this.markDirty();
    });
    pseudoGroup.appendChild(pseudoSelect);
    basicSection.appendChild(pseudoGroup);

    // Classes
    const classGroup = document.createElement("div");
    classGroup.className = "form-group";
    const classLabel = document.createElement("label");
    classLabel.className = "form-label";
    classLabel.textContent = window.i18n.t("element.classes");
    classGroup.appendChild(classLabel);
    const classNameRow = document.createElement("div");
    classNameRow.className = "form-row";
    const classInput = document.createElement("input");
    classInput.type = "text";
    classInput.className = "input input-small";
    classInput.placeholder = "class name";
    classNameRow.appendChild(classInput);
    const addClassBtn = document.createElement("button");
    addClassBtn.className = "btn btn-small";
    addClassBtn.textContent = "+";
    addClassBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const v = classInput.value.trim();
      if (v && !tag.class.includes(v)) {
        tag.class.push(v);
        this.markDirty();
        this.renderPreview();
        this._renderElementEditorSub(container, tag);
      }
      classInput.value = "";
    });
    classInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addClassBtn.click();
    });
    classNameRow.appendChild(addClassBtn);
    classGroup.appendChild(classNameRow);
    if (tag.class.length > 0) {
      const chips = document.createElement("div");
      chips.className = "chip-list";
      for (let i = 0; i < tag.class.length; i++) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = tag.class[i] + " ✕";
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          tag.class.splice(i, 1);
          this.markDirty();
          this.renderPreview();
          this._renderElementEditorSub(container, tag);
        });
        chips.appendChild(chip);
      }
      classGroup.appendChild(chips);
    }
    basicSection.appendChild(classGroup);
    editor.appendChild(basicSection);

    // Save as preset button
    const presetBtn = document.createElement("button");
    presetBtn.className = "btn btn-small";
    presetBtn.textContent = "💾 Save as Preset";
    presetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._saveAsPreset(tag);
    });
    editor.appendChild(presetBtn);

    // Attributes (collapsible)
    editor.appendChild(
      this._createCollapsibleSection(
        window.i18n.t("element.attributes"),
        true,
        () => this._renderAttributesContent(tag),
      ),
    );

    // Styles (collapsible)
    editor.appendChild(
      this._createCollapsibleSection(
        window.i18n.t("element.styles"),
        true,
        () => this._renderStylesContent(tag),
      ),
    );

    // Children at bottom + Add/Delete child
    const childrenSection = document.createElement("div");
    childrenSection.className = "editor-actions";
    childrenSection.style.cssText =
      "display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:6px 0";

    const addChildBtn = document.createElement("button");
    addChildBtn.className = "btn btn-primary btn-small";
    addChildBtn.textContent = "+ " + window.i18n.t("element.addChild");
    addChildBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._showAddChildModal(tag);
    });
    childrenSection.appendChild(addChildBtn);

    const delElBtn = document.createElement("button");
    delElBtn.className = "btn btn-danger btn-small";
    delElBtn.textContent = window.i18n.t("element.delete");
    delElBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._deleteSelectedElement();
    });
    childrenSection.appendChild(delElBtn);

    const dupBtn = document.createElement("button");
    dupBtn.className = "btn btn-small";
    dupBtn.textContent = window.i18n.t("element.duplicate");
    dupBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const c = tag.duplicate();
      this._insertAfterTag(tag._uid, c);
      this.markDirty();
      this.renderPreview();
      this.refreshUI();
    });
    childrenSection.appendChild(dupBtn);

    editor.appendChild(childrenSection);

    // Children mini-tree at the very bottom
    if (tag.children.length > 0) {
      const childTreeSection = document.createElement("div");
      childTreeSection.className = "element-children-tree";
      const childTitle = document.createElement("div");
      childTitle.className = "element-children-title";
      childTitle.textContent =
        window.i18n.t("element.children") + " (" + tag.children.length + ")";
      childTreeSection.appendChild(childTitle);
      const childTree = document.createElement("div");
      childTree.className = "body-tree compact";
      childTree.style.marginTop = "2px";
      for (let ci = 0; ci < tag.children.length; ci++) {
        this._renderTagTreeNode(
          tag.children[ci],
          childTree,
          0,
          tag.children,
          ci,
          this.currentPage,
          true,
          true,
        );
      }
      childTreeSection.appendChild(childTree);
      editor.appendChild(childTreeSection);
    }

    container.appendChild(editor);
  }

  _updateTreeOnly() {
    if (this.currentView === "page") {
      const prevTab = this.currentPageTab;
      this._renderPageTabs();
      this.currentPageTab = prevTab;
    }
  }

  // ==================== ATTRIBUTES ====================

  _renderAttributesContent(tag) {
    const container = document.createElement("div");
    for (const [key, value] of Object.entries(tag.attrs)) {
      const row = document.createElement("div");
      row.className = "attr-row";
      const ki = document.createElement("input");
      ki.type = "text";
      ki.className = "input input-small";
      ki.value = key;
      ki.addEventListener("input", () => {
        const nk = ki.value.trim();
        if (nk && nk !== key) {
          tag.attrs[nk] = value;
          delete tag.attrs[key];
          this.markDirty();
          this.renderPreview();
        }
      });
      const vi = document.createElement("input");
      vi.type = "text";
      vi.className = "input input-small";
      vi.value = value;
      vi.addEventListener("input", () => {
        tag.attrs[ki.value.trim() || key] = vi.value;
        this.markDirty();
        this.renderPreview();
      });
      const db = document.createElement("button");
      db.className = "btn btn-danger btn-small";
      db.textContent = "✕";
      db.addEventListener("click", (e) => {
        e.stopPropagation();
        delete tag.attrs[key];
        this.markDirty();
        this.renderPreview();
        row.remove();
      });
      row.appendChild(ki);
      row.appendChild(vi);
      row.appendChild(db);
      container.appendChild(row);
    }
    // Add new
    const addRow = document.createElement("div");
    addRow.className = "attr-row add-attr";
    const nki = document.createElement("input");
    nki.type = "text";
    nki.className = "input input-small";
    nki.placeholder = window.i18n.t("element.attrName");
    const nvi = document.createElement("input");
    nvi.type = "text";
    nvi.className = "input input-small";
    nvi.placeholder = window.i18n.t("element.attrValue");
    const ab = document.createElement("button");
    ab.className = "btn btn-small";
    ab.textContent = "+";
    ab.addEventListener("click", (e) => {
      e.stopPropagation();
      const k = nki.value.trim();
      if (k) {
        tag.attrs[k] = nvi.value;
        this.markDirty();
        this.renderPreview();
        addRow.parentElement.insertBefore(
          this._createAttrRow(tag, k, nvi.value),
          addRow,
        );
        nki.value = "";
        nvi.value = "";
        nki.focus();
      }
    });
    nki.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ab.click();
    });
    nvi.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ab.click();
    });
    addRow.appendChild(nki);
    addRow.appendChild(nvi);
    addRow.appendChild(ab);
    container.appendChild(addRow);
    return container;
  }

  _createAttrRow(tag, key, value) {
    const row = document.createElement("div");
    row.className = "attr-row";
    const ki = document.createElement("input");
    ki.type = "text";
    ki.className = "input input-small";
    ki.value = key;
    ki.addEventListener("input", () => {
      const nk = ki.value.trim();
      if (nk && nk !== key) {
        tag.attrs[nk] = value;
        delete tag.attrs[key];
        this.markDirty();
        this.renderPreview();
      }
    });
    const vi = document.createElement("input");
    vi.type = "text";
    vi.className = "input input-small";
    vi.value = value;
    vi.addEventListener("input", () => {
      tag.attrs[ki.value.trim() || key] = vi.value;
      this.markDirty();
      this.renderPreview();
    });
    const db = document.createElement("button");
    db.className = "btn btn-danger btn-small";
    db.textContent = "✕";
    db.addEventListener("click", (e) => {
      e.stopPropagation();
      delete tag.attrs[key];
      this.markDirty();
      this.renderPreview();
      row.remove();
    });
    row.appendChild(ki);
    row.appendChild(vi);
    row.appendChild(db);
    return row;
  }

  // ==================== STYLES ====================

  _renderStylesContent(tag) {
    const container = document.createElement("div");
    container.className = "styles-editor";
    const subTabs = document.createElement("div");
    subTabs.className = "sub-tabs";
    const tabs = ["visual", "layout", "spacing", "position", "advanced"];
    const cur = this._currentStyleTab || "visual";

    for (const st of tabs) {
      const btn = document.createElement("button");
      btn.className = `sub-tab ${st === cur ? "active" : ""}`;
      btn.textContent = window.i18n.t(`element.${st}`);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._currentStyleTab = st;
        subTabs
          .querySelectorAll(".sub-tab")
          .forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        const tc = container.querySelector(".style-tab-content");
        if (tc) {
          tc.innerHTML = "";
          tc.appendChild(this._renderStyleSubTab(tag, st));
        }
      });
      subTabs.appendChild(btn);
    }
    container.appendChild(subTabs);
    const tabContent = document.createElement("div");
    tabContent.className = "style-tab-content";
    tabContent.appendChild(this._renderStyleSubTab(tag, cur));
    container.appendChild(tabContent);
    return container;
  }

  _renderStyleSubTab(tag, subTab) {
    switch (subTab) {
      case "visual":
        return this._renderVisualStyles(tag);
      case "layout":
        return this._renderLayoutStyles(tag);
      case "spacing":
        return this._renderSpacingStyles(tag);
      case "position":
        return this._renderPositionStyles(tag);
      case "advanced":
        return this._renderAdvancedStyles(tag);
      default:
        return document.createElement("div");
    }
  }

  _renderVisualStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";
    const items = [
      {
        k: "background",
        l: window.i18n.t("style.background"),
        t: "color",
        sp: true,
      },
      { k: "color", l: window.i18n.t("style.color"), t: "color", sp: true },
      { k: "font-size", l: window.i18n.t("style.fontSize"), t: "text" },
      { k: "font-family", l: window.i18n.t("style.fontFamily"), t: "text" },
      {
        k: "font-weight",
        l: window.i18n.t("style.fontWeight"),
        t: "select",
        o: [
          "normal",
          "bold",
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
        ],
      },
      {
        k: "text-align",
        l: window.i18n.t("style.textAlign"),
        t: "select",
        o: ["left", "center", "right", "justify"],
      },
      { k: "border", l: window.i18n.t("style.border"), t: "text" },
      { k: "border-radius", l: window.i18n.t("style.borderRadius"), t: "text" },
      {
        k: "opacity",
        l: window.i18n.t("style.opacity"),
        t: "number",
        min: 0,
        max: 1,
        step: 0.1,
      },
    ];
    for (const i of items) c.appendChild(this._createStyleGroup(tag, i));
    return c;
  }

  _renderLayoutStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";
    c.appendChild(
      this._createStyleGroup(tag, {
        k: "display",
        l: window.i18n.t("style.display"),
        t: "select",
        o: [
          "block",
          "inline",
          "inline-block",
          "flex",
          "grid",
          "inline-flex",
          "inline-grid",
          "none",
          "contents",
        ],
      }),
    );
    const d = tag.getStyle("display");
    if (d === "flex" || d === "inline-flex") {
      for (const p of [
        {
          k: "flex-direction",
          l: window.i18n.t("style.flexDirection"),
          t: "select",
          o: ["row", "row-reverse", "column", "column-reverse"],
        },
        {
          k: "flex-wrap",
          l: window.i18n.t("style.flexWrap"),
          t: "select",
          o: ["nowrap", "wrap", "wrap-reverse"],
        },
        {
          k: "justify-content",
          l: window.i18n.t("style.justifyContent"),
          t: "select",
          o: [
            "flex-start",
            "flex-end",
            "center",
            "space-between",
            "space-around",
            "space-evenly",
          ],
        },
        {
          k: "align-items",
          l: window.i18n.t("style.alignItems"),
          t: "select",
          o: ["flex-start", "flex-end", "center", "baseline", "stretch"],
        },
        { k: "gap", l: window.i18n.t("style.gap"), t: "text" },
      ])
        c.appendChild(this._createStyleGroup(tag, p));
    }
    if (d === "grid" || d === "inline-grid") {
      for (const p of [
        {
          k: "grid-template-columns",
          l: window.i18n.t("style.gridTemplateColumns"),
          t: "text",
        },
        {
          k: "grid-template-rows",
          l: window.i18n.t("style.gridTemplateRows"),
          t: "text",
        },
        { k: "gap", l: window.i18n.t("style.gap"), t: "text" },
        {
          k: "justify-items",
          l: "Justify Items",
          t: "select",
          o: ["start", "end", "center", "stretch"],
        },
        {
          k: "align-items",
          l: "Align Items",
          t: "select",
          o: ["start", "end", "center", "stretch"],
        },
      ])
        c.appendChild(this._createStyleGroup(tag, p));
    }
    return c;
  }

  _renderSpacingStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";

    // Visual margin/padding layout
    const boxModel = document.createElement("div");
    boxModel.className = "box-model";

    // Margin
    const marginLabel = document.createElement("label");
    marginLabel.className = "style-section-label";
    marginLabel.textContent = window.i18n.t("style.margin");
    c.appendChild(marginLabel);

    const marginGrid = document.createElement("div");
    marginGrid.className = "box-model-grid";
    // top row
    const mTop = this._createSmallInput(tag, "margin-top", "↑");
    // middle row: left, center, right
    const mLeft = this._createSmallInput(tag, "margin-left", "←");
    const mCenter = document.createElement("div");
    mCenter.className = "box-model-center";
    mCenter.textContent = "M";
    const mRight = this._createSmallInput(tag, "margin-right", "→");
    // bottom row
    const mBottom = this._createSmallInput(tag, "margin-bottom", "↓");

    marginGrid.appendChild(mTop);
    marginGrid.appendChild(document.createElement("div"));
    marginGrid.appendChild(document.createElement("div"));
    marginGrid.appendChild(document.createElement("div"));
    marginGrid.appendChild(mLeft);
    marginGrid.appendChild(mCenter);
    marginGrid.appendChild(mRight);
    marginGrid.appendChild(document.createElement("div"));
    marginGrid.appendChild(mBottom);
    marginGrid.appendChild(document.createElement("div"));
    marginGrid.appendChild(document.createElement("div"));
    marginGrid.appendChild(document.createElement("div"));

    c.appendChild(marginGrid);

    // Also add all-margin shortcut
    const allMarginRow = document.createElement("div");
    allMarginRow.className = "form-row";
    const allMInput = document.createElement("input");
    allMInput.type = "text";
    allMInput.className = "input input-small";
    allMInput.value = tag.getStyle("margin");
    allMInput.placeholder = "margin all";
    allMInput.addEventListener("change", () => {
      tag.setStyle("margin", allMInput.value, tag.getStyleImportant("margin"));
      this.markDirty();
      this.renderPreview();
    });
    const allMLabel = document.createElement("label");
    allMLabel.className = "checkbox-label";
    const mChk = document.createElement("input");
    mChk.type = "checkbox";
    mChk.checked = tag.getStyleImportant("margin");
    mChk.addEventListener("change", () => {
      tag.setStyle("margin", tag.getStyle("margin"), mChk.checked);
      this.markDirty();
      this.renderPreview();
    });
    allMLabel.appendChild(mChk);
    allMLabel.appendChild(document.createTextNode("!"));
    allMarginRow.appendChild(allMInput);
    allMarginRow.appendChild(allMLabel);
    c.appendChild(allMarginRow);

    // Padding
    const paddingLabel = document.createElement("label");
    paddingLabel.className = "style-section-label";
    paddingLabel.textContent = window.i18n.t("style.padding");
    c.appendChild(paddingLabel);

    const padGrid = document.createElement("div");
    padGrid.className = "box-model-grid";
    const pTop = this._createSmallInput(tag, "padding-top", "↑");
    const pLeft = this._createSmallInput(tag, "padding-left", "←");
    const pCenter = document.createElement("div");
    pCenter.className = "box-model-center";
    pCenter.textContent = "P";
    const pRight = this._createSmallInput(tag, "padding-right", "→");
    const pBottom = this._createSmallInput(tag, "padding-bottom", "↓");

    padGrid.appendChild(pTop);
    padGrid.appendChild(document.createElement("div"));
    padGrid.appendChild(document.createElement("div"));
    padGrid.appendChild(document.createElement("div"));
    padGrid.appendChild(pLeft);
    padGrid.appendChild(pCenter);
    padGrid.appendChild(pRight);
    padGrid.appendChild(document.createElement("div"));
    padGrid.appendChild(pBottom);
    padGrid.appendChild(document.createElement("div"));
    padGrid.appendChild(document.createElement("div"));
    padGrid.appendChild(document.createElement("div"));

    c.appendChild(padGrid);

    const allPadRow = document.createElement("div");
    allPadRow.className = "form-row";
    const allPInput = document.createElement("input");
    allPInput.type = "text";
    allPInput.className = "input input-small";
    allPInput.value = tag.getStyle("padding");
    allPInput.placeholder = "padding all";
    allPInput.addEventListener("change", () => {
      tag.setStyle(
        "padding",
        allPInput.value,
        tag.getStyleImportant("padding"),
      );
      this.markDirty();
      this.renderPreview();
    });
    const allPLabel = document.createElement("label");
    allPLabel.className = "checkbox-label";
    const pChk = document.createElement("input");
    pChk.type = "checkbox";
    pChk.checked = tag.getStyleImportant("padding");
    pChk.addEventListener("change", () => {
      tag.setStyle("padding", tag.getStyle("padding"), pChk.checked);
      this.markDirty();
      this.renderPreview();
    });
    allPLabel.appendChild(pChk);
    allPLabel.appendChild(document.createTextNode("!"));
    allPadRow.appendChild(allPInput);
    allPadRow.appendChild(allPLabel);
    c.appendChild(allPadRow);

    // box-sizing, width, height, overflow
    c.appendChild(
      this._createStyleGroup(tag, {
        k: "box-sizing",
        l: window.i18n.t("style.boxSizing"),
        t: "select",
        o: ["content-box", "border-box"],
      }),
    );
    c.appendChild(
      this._createStyleGroup(tag, {
        k: "width",
        l: window.i18n.t("style.width"),
        t: "text",
      }),
    );
    c.appendChild(
      this._createStyleGroup(tag, {
        k: "height",
        l: window.i18n.t("style.height"),
        t: "text",
      }),
    );
    c.appendChild(
      this._createStyleGroup(tag, {
        k: "overflow",
        l: window.i18n.t("style.overflow"),
        t: "select",
        o: ["visible", "hidden", "scroll", "auto"],
      }),
    );
    return c;
  }

  _createSmallInput(tag, key, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "input input-small";
    input.style.cssText =
      "width:100%;text-align:center;font-size:10px;padding:2px";
    input.value = tag.getStyle(key);
    input.placeholder = placeholder;
    input.addEventListener("change", () => {
      tag.setStyle(key, input.value, tag.getStyleImportant(key));
      this.markDirty();
      this.renderPreview();
    });
    return input;
  }

  _renderPositionStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";
    c.appendChild(
      this._createStyleGroup(tag, {
        k: "position",
        l: window.i18n.t("style.position"),
        t: "select",
        o: ["static", "relative", "absolute", "fixed", "sticky"],
      }),
    );
    const pos = tag.getStyle("position");
    if (pos && pos !== "static") {
      for (const p of [
        { k: "top", l: window.i18n.t("style.top"), t: "text" },
        { k: "left", l: window.i18n.t("style.left"), t: "text" },
        { k: "right", l: window.i18n.t("style.right"), t: "text" },
        { k: "bottom", l: window.i18n.t("style.bottom"), t: "text" },
        { k: "z-index", l: "Z-Index", t: "number" },
      ])
        c.appendChild(this._createStyleGroup(tag, p));
    }
    c.appendChild(
      this._createStyleGroup(tag, {
        k: "box-shadow",
        l: window.i18n.t("style.boxShadow"),
        t: "text",
      }),
    );
    return c;
  }

  _renderAdvancedStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";
    const lbl = document.createElement("label");
    lbl.className = "style-section-label";
    lbl.textContent = "CSS Rules";
    c.appendChild(lbl);
    for (let i = 0; i < tag.styles.length; i++) {
      const row = document.createElement("div");
      row.className = "advanced-style-row";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "input input-small";
      inp.value = tag.styles[i];
      inp.style.flex = "1";
      inp.addEventListener("change", () => {
        tag.styles[i] = inp.value;
        this.markDirty();
        this.renderPreview();
      });
      const impLabel = document.createElement("label");
      impLabel.className = "checkbox-label";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = tag.styles[i].includes("!important");
      chk.addEventListener("change", () => {
        let v = tag.styles[i].replace(/\s*!important\s*$/, "").trim();
        if (chk.checked) v += " !important";
        tag.styles[i] = v;
        inp.value = v;
        this.markDirty();
        this.renderPreview();
      });
      impLabel.appendChild(chk);
      impLabel.appendChild(document.createTextNode("!"));
      const db = document.createElement("button");
      db.className = "btn btn-danger btn-small";
      db.textContent = "✕";
      db.addEventListener("click", (e) => {
        e.stopPropagation();
        tag.styles.splice(i, 1);
        this.markDirty();
        this.renderPreview();
        const p = c.parentElement;
        if (p) {
          p.innerHTML = "";
          p.appendChild(this._renderAdvancedStyles(tag));
        }
      });
      row.appendChild(inp);
      row.appendChild(impLabel);
      row.appendChild(db);
      c.appendChild(row);
    }
    const addRow = document.createElement("div");
    addRow.className = "advanced-style-row";
    const ni = document.createElement("input");
    ni.type = "text";
    ni.className = "input input-small";
    ni.style.flex = "1";
    ni.placeholder = "property: value";
    const ab = document.createElement("button");
    ab.className = "btn btn-small";
    ab.textContent = "+ " + window.i18n.t("element.addStyle");
    ab.addEventListener("click", (e) => {
      e.stopPropagation();
      const v = ni.value.trim();
      if (v) {
        tag.styles.push(v);
        this.markDirty();
        this.renderPreview();
        const p = c.parentElement;
        if (p) {
          p.innerHTML = "";
          p.appendChild(this._renderAdvancedStyles(tag));
        }
      }
    });
    ni.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ab.click();
    });
    addRow.appendChild(ni);
    addRow.appendChild(ab);
    c.appendChild(addRow);
    return c;
  }

  // ==================== STYLE GROUP HELPER ====================

  _createStyleGroup(tag, config) {
    const group = document.createElement("div");
    group.className = `form-group ${config.small ? "form-group-small" : ""}`;
    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = config.l || config.label;
    group.appendChild(label);
    const row = document.createElement("div");
    row.className = "form-row";
    const cv = tag.getStyle(config.k);
    const imp = tag.getStyleImportant(config.k);

    let input;
    if (config.t === "select") {
      input = document.createElement("select");
      input.className = "input input-small";
      const eo = document.createElement("option");
      eo.value = "";
      eo.textContent = "(none)";
      input.appendChild(eo);
      for (const o of config.o || []) {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        if (o === cv) opt.selected = true;
        input.appendChild(opt);
      }
    } else if (config.t === "color" && config.sp) {
      const wrapper = document.createElement("div");
      wrapper.className = "color-style-row";
      input = document.createElement("input");
      input.type = "color";
      input.className = "color-input";
      input.value = cv && /^#[0-9a-fA-F]{3,8}$/.test(cv) ? cv : "#000000";
      const ti = document.createElement("input");
      ti.type = "text";
      ti.className = "input input-small";
      ti.value = cv;
      ti.placeholder = "#hex, var(--name)";
      input.addEventListener("input", () => {
        tag.setStyle(config.k, input.value, imp);
        ti.value = input.value;
        this.markDirty();
        this.renderPreview();
      });
      ti.addEventListener("change", () => {
        tag.setStyle(config.k, ti.value, imp);
        this.markDirty();
        this.renderPreview();
      });
      wrapper.appendChild(input);
      wrapper.appendChild(ti);
      row.appendChild(wrapper);
    } else if (config.t === "number") {
      input = document.createElement("input");
      input.type = "number";
      input.className = "input input-small";
      input.value = cv;
      if (config.min !== undefined) input.min = config.min;
      if (config.max !== undefined) input.max = config.max;
      if (config.step !== undefined) input.step = config.step;
      input.addEventListener("change", () => {
        tag.setStyle(config.k, input.value, imp);
        this.markDirty();
        this.renderPreview();
      });
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.className = "input input-small";
      input.value = cv;
      input.placeholder = config.k;
      input.addEventListener("change", () => {
        tag.setStyle(config.k, input.value, imp);
        this.markDirty();
        this.renderPreview();
      });
    }

    if (input) row.appendChild(input);

    const il = document.createElement("label");
    il.className = "checkbox-label";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = imp;
    chk.title = window.i18n.t("element.important");
    chk.addEventListener("change", () => {
      tag.setStyle(config.k, tag.getStyle(config.k), chk.checked);
      this.markDirty();
      this.renderPreview();
    });
    il.appendChild(chk);
    il.appendChild(document.createTextNode("!"));
    row.appendChild(il);
    group.appendChild(row);
    return group;
  }

  // ==================== DELETE / INSERT HELPERS ====================

  _deleteSelectedElement() {
    if (!this.selectedTagUid || !this.currentPage) return;
    const page = this.currentPage;
    for (let i = 0; i < page.body.length; i++) {
      if (page.body[i]._uid === this.selectedTagUid) {
        page.body.splice(i, 1);
        this.selectedTagUid = null;
        this.showElementEditor = false;
        this.markDirty();
        this.renderPreview();
        this.refreshUI();
        return;
      }
      if (this._deleteFromTree(page.body[i], this.selectedTagUid)) {
        this.selectedTagUid = null;
        this.showElementEditor = false;
        this.markDirty();
        this.renderPreview();
        this.refreshUI();
        return;
      }
    }
  }

  _deleteFromTree(parent, uid) {
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children[i]._uid === uid) {
        parent.children.splice(i, 1);
        return true;
      }
      if (this._deleteFromTree(parent.children[i], uid)) return true;
    }
    return false;
  }

  _insertAfterTag(uid, newTag) {
    for (const bt of this.currentPage.body) {
      if (this._insertAfterTagInTree(bt, uid, newTag)) return;
    }
  }
  _insertAfterTagInTree(p, uid, nt) {
    for (let i = 0; i < p.children.length; i++) {
      if (p.children[i]._uid === uid) {
        p.children.splice(i + 1, 0, nt);
        return true;
      }
      if (this._insertAfterTagInTree(p.children[i], uid, nt)) return true;
    }
    return false;
  }

  // ==================== PREVIEW ====================

  renderPreview() {
    // Get fresh reference each time
    const container = document.getElementById("editor-content");
    if (!container) {
      this.setStatus("Preview container not found");
      return;
    }
    this.els.editorContent = container;
    if (!this.currentPage) {
      container.innerHTML = "";
      return;
    }
    HtmlRenderer.renderPreview(this.currentPage, container);
    container.style.width = this.currentPage.width;
    container.style.minHeight = this.currentPage.height;
    this.highlightSelectedElement();
  }

  highlightSelectedElement() {
    if (!this.els.editorContent || !this.els.editorArea) return;
    if (this.selectedTagUid && !this.viewMode) {
      const el = this.els.editorContent.querySelector(
        `[data-uid="${this.selectedTagUid}"]`,
      );
      if (el) {
        const rect = el.getBoundingClientRect();
        const er = this.els.editorArea.getBoundingClientRect();
        this.els.selectedHighlight.style.display = "block";
        this.els.selectedHighlight.style.left = `${rect.left - er.left - 2}px`;
        this.els.selectedHighlight.style.top = `${rect.top - er.top - 2}px`;
        this.els.selectedHighlight.style.width = `${rect.width + 4}px`;
        this.els.selectedHighlight.style.height = `${rect.height + 4}px`;
      } else {
        this.els.selectedHighlight.style.display = "none";
      }
    } else {
      this.els.selectedHighlight.style.display = "none";
    }
  }

  // ==================== EDITOR INTERACTION ====================

  handleEditorHover(e) {
    if (this.activeTool !== "select" || this.viewMode) {
      this.els.hoverHighlight.style.display = "none";
      return;
    }
    const target = e.target.closest("[data-uid]");
    if (!target || target === this.els.editorContent) {
      this.els.hoverHighlight.style.display = "none";
      return;
    }
    this._hoveredUid = target.dataset.uid;
    const rect = target.getBoundingClientRect();
    const er = this.els.editorArea.getBoundingClientRect();
    this.els.hoverHighlight.style.display = "block";
    this.els.hoverHighlight.style.left = `${rect.left - er.left - 2}px`;
    this.els.hoverHighlight.style.top = `${rect.top - er.top - 2}px`;
    this.els.hoverHighlight.style.width = `${rect.width + 4}px`;
    this.els.hoverHighlight.style.height = `${rect.height + 4}px`;
  }

  handleEditorClick(e) {
    if (this.activeTool !== "select" || this.viewMode) return;
    const target = e.target.closest("[data-uid]");
    if (!target || target === this.els.editorContent) return;
    this.selectedTagUid = target.dataset.uid;
    this.showElementEditor = true;
    this.currentPageTab = "element";
    this.setTool("cursor");
    this.refreshUI();
    this.renderPreview();
  }

  // ==================== UI HELPERS ====================

  _rerender(container, renderFn) {
    container.innerHTML = "";
    renderFn(container);
  }

  _createTab(id, label, active) {
    const tab = document.createElement("button");
    tab.className = `tab ${active ? "active" : ""}`;
    tab.dataset.tab = id;
    tab.textContent = label;
    return tab;
  }

  _createFormGroup(label, type, value, onChange, opts = {}) {
    const group = document.createElement("div");
    group.className = `form-group ${opts.small ? "form-group-small" : ""}`;
    const lbl = document.createElement("label");
    lbl.className = "form-label";
    lbl.textContent = label;
    group.appendChild(lbl);
    const inp = document.createElement("input");
    inp.type = type;
    inp.className = "input";
    inp.value = value || "";
    inp.addEventListener("change", () => onChange(inp.value));
    inp.addEventListener("input", () => {
      if (type === "text" || type === "number") onChange(inp.value);
    });
    group.appendChild(inp);
    return group;
  }

  _createCollapsibleSection(title, startOpen, contentRenderer) {
    const section = document.createElement("div");
    section.className = "collapsible-section";
    const header = document.createElement("div");
    header.className = "collapsible-header";
    header.innerHTML = `<span class="collapse-icon">${startOpen ? "▼" : "▶"}</span> ${title}`;
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      const c = section.querySelector(".collapsible-content");
      const ic = header.querySelector(".collapse-icon");
      if (c.style.display === "none") {
        c.style.display = "block";
        ic.textContent = "▼";
      } else {
        c.style.display = "none";
        ic.textContent = "▶";
      }
    });
    section.appendChild(header);
    const content = document.createElement("div");
    content.className = "collapsible-content";
    content.style.display = startOpen ? "block" : "none";
    const inner = contentRenderer();
    if (inner) content.appendChild(inner);
    section.appendChild(content);
    return section;
  }

  // ==================== MODAL ====================

  showModal(html) {
    this.els.modalContent.innerHTML = html;
    this.els.modalOverlay.classList.remove("hidden");
  }
  closeModal() {
    this.els.modalOverlay.classList.add("hidden");
  }

  // ==================== REFRESH ====================

  refreshUI() {
    if (!this.currentProject && this.currentView !== "projects") {
      this.showProjectsList();
      return;
    }
    if (this.currentView === "projects") this.renderProjectsList();
    else if (this.currentView === "project") this.renderProjectView();
    else if (this.currentView === "page" && this.currentPage)
      this.renderPageEditor();
    this.highlightSelectedElement();
  }
}

window.app = null;
document.addEventListener("DOMContentLoaded", async () => {
  const lang = navigator.language.startsWith("ru") ? "ru" : "en";
  await window.i18n.init(lang);
  window.app = new App();
  await window.app.init();
});
