class App {
  constructor() {
    this.currentProject = null;
    this.currentPage = null;
    this.currentPageIndex = -1;
    this.selectedTagUid = null;
    this.activeTool = "cursor";
    this.sidebarCollapsed = false;
    this.currentView = "projects";
    this.currentPageTab = "insert";
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
    this._contextTagUid = null;
    this.ctxOrigins = {
      tool: "cursor",
      view: "projects",
      proj: null,
      page: null,
      pageIdx: -1,
      sel: null,
      showElem: false,
      pageTab: "insert",
    };
  }

  async init() {
    this.els.sidebar = document.getElementById("sidebar");
    this.els.sidebarContent = document.getElementById("sidebar-content");
    this.els.sidebarTabs = document.getElementById("sidebar-tabs");
    this.els.editorContent = document.getElementById("editor-content");
    this.els.hoverHighlight = document.getElementById("hover-highlight");
    this.els.selectedHighlight = document.getElementById("selected-highlight");
    this.els.resizeHighlight = document.getElementById("resize-highlight");
    this.els.editorArea = document.getElementById("editor-area");
    this.els.editorCanvas = document.getElementById("editor-canvas");
    this.els.statusBar = document.getElementById("status-bar");
    this.els.modalOverlay = document.getElementById("modal-overlay");
    this.els.modalContent = document.getElementById("modal-content");
    this.els.fileInput = document.getElementById("file-input");
    this.els.expandBtn = document.getElementById("sidebar-expand");
    this.els.contextMenu = document.getElementById("context-menu");

    this.bindEvents();
    this.setTool("cursor");
    this.restoreFromHash();
    if (!this.currentProject) this.showProjectsList();
    this.setStatus("Ready");
    return this;
  }

  bindEvents() {
    // History
    document.getElementById("tool-undo").addEventListener("click", (e) => {
      e.stopPropagation();
      this.undo();
    });
    document.getElementById("tool-redo").addEventListener("click", (e) => {
      e.stopPropagation();
      this.redo();
    });
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
    document.getElementById("tool-move").addEventListener("click", (e) => {
      e.stopPropagation();
      this.setTool("move");
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
      this.showCopyHtmlModal();
    });
    document.getElementById("tool-export").addEventListener("click", (e) => {
      e.stopPropagation();
      this.exportProject();
    });

    this.els.fileInput.addEventListener("change", (e) =>
      this.handleFileImport(e),
    );
    this.els.editorArea.addEventListener("mousemove", (e) =>
      this.onEditorMouseMove(e),
    );
    this.els.editorArea.addEventListener("mousedown", (e) =>
      this.onEditorMouseDown(e),
    );
    this.els.editorArea.addEventListener("mouseup", (e) =>
      this.onEditorMouseUp(e),
    );
    this.els.editorArea.addEventListener("mouseleave", () => {
      this.clearHoverHighlight();
      this._isResizing = false;
    });
    this.els.editorArea.addEventListener("scroll", () =>
      this.highlightSelectedElement(),
    );
    this.els.editorArea.addEventListener("contextmenu", (e) =>
      this.onContextMenu(e),
    );
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#context-menu")) this.hideContextMenu();
    });
    this.els.editorArea.addEventListener("dragstart", (e) => {
      if (this.activeTool === "move") e.preventDefault();
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
        this.hideContextMenu();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        this.saveProject();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        this.redo();
      }
      if (e.key === "Delete" && this.selectedTagUid)
        this._deleteSelectedElement();
    });
    window.addEventListener("popstate", () => this.restoreFromHash());
  }

  // ==================== HISTORY ====================
  _saveSnapshot() {
    if (this._noHistory || !this.currentProject) return;
    const snap = JSON.stringify(this.currentProject.toJSON());
    if (this._historyIndex < this._history.length - 1)
      this._history = this._history.slice(0, this._historyIndex + 1);
    this._history.push(snap);
    if (this._history.length > this._maxHistory) this._history.shift();
    this._historyIndex = this._history.length - 1;
  }

  _restoreSnapshot(snap) {
    if (!snap) return;
    const data = JSON.parse(snap);
    const proj = Project.fromJSON(data);
    this._noHistory = true;
    this.currentProject = proj;
    if (
      this.currentPage &&
      this.currentPageIndex >= 0 &&
      this.currentPageIndex < proj.pages.length
    ) {
      this.currentPage = proj.pages[this.currentPageIndex];
    } else {
      this.currentPageIndex = 0;
      this.currentPage = proj.pages[0] || null;
    }
    this._noHistory = false;
    this.markDirty();
    this.refreshUI();
    this.renderPreview();
  }

  undo() {
    if (this._historyIndex <= 0) return;
    this._historyIndex--;
    this._restoreSnapshot(this._history[this._historyIndex]);
  }

  redo() {
    if (this._historyIndex >= this._history.length - 1) return;
    this._historyIndex++;
    this._restoreSnapshot(this._history[this._historyIndex]);
  }

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
    document
      .getElementById("tool-cursor")
      .classList.toggle("active", tool === "cursor");
    document
      .getElementById("tool-select")
      .classList.toggle("active", tool === "select");
    document
      .getElementById("tool-move")
      .classList.toggle("active", tool === "move");
    const cursors = { cursor: "default", select: "crosshair", move: "grab" };
    this.els.editorArea.style.cursor = cursors[tool] || "default";
  }

  clearSelection() {
    this.selectedTagUid = null;
    this.showElementEditor = false;
    this.els.selectedHighlight.style.display = "none";
    this.els.resizeHighlight.classList.add("hidden");
    this.refreshUI();
  }

  clearHoverHighlight() {
    this._hoveredUid = null;
    this.els.hoverHighlight.style.display = "none";
  }
  hideContextMenu() {
    this.els.contextMenu.classList.add("hidden");
    this._contextTagUid = null;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.els.sidebar.classList.toggle("collapsed", this.sidebarCollapsed);
    this.els.expandBtn.classList.toggle("hidden", !this.sidebarCollapsed);
    document.getElementById("btn-collapse").textContent = this.sidebarCollapsed
      ? "▶"
      : "◀";
  }

  toggleViewMode() {
    this.viewMode = !this.viewMode;
    this.els.editorCanvas.classList.toggle("view-mode", this.viewMode);
    this.els.editorContent.classList.toggle("view-mode", this.viewMode);
    document
      .getElementById("tool-viewmode")
      .classList.toggle("active", this.viewMode);
  }

  // ==================== COPY / EXPORT ====================
  showCopyHtmlModal() {
    if (!this.currentPage) {
      this.setStatus("No page to copy");
      return;
    }
    const html = HtmlRenderer.renderPage(this.currentPage);
    this._showModalContent(`
      <h2>📋 Copy HTML</h2>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0">Full HTML of "${this.currentPage.title}"</p>
      <textarea class="input" id="copy-html-text" style="width:100%;height:250px;font-family:monospace;font-size:11px;resize:vertical" readonly>${html.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary" id="copy-html-btn">📋 Copy to Clipboard</button>
        <button class="btn" id="copy-close-btn">Close</button>
      </div>`);
    document.getElementById("copy-html-btn").addEventListener("click", () => {
      navigator.clipboard
        .writeText(html)
        .then(() => {
          this.setStatus("HTML copied");
          this.closeModal();
        })
        .catch(() => {
          const ta = document.getElementById("copy-html-text");
          ta.select();
          document.execCommand("copy");
          this.setStatus("HTML copied");
          this.closeModal();
        });
    });
    document
      .getElementById("copy-close-btn")
      .addEventListener("click", () => this.closeModal());
  }

  exportProject() {
    if (!this.currentProject) {
      this.setStatus("No project to export");
      return;
    }
    ProjectStorage.download(this.currentProject);
    this.setStatus("Project exported");
  }

  _copyHtmlNoInline() {
    if (!this.currentPage) {
      this.setStatus("No page to copy");
      return;
    }
    // Strip inline styles from body tags, use only classes/page styles
    const copy = Page.fromJSON(this.currentPage.toJSON());
    const stripStyles = (tag) => {
      tag.styles = [];
      for (const child of tag.children) stripStyles(child);
    };
    for (const tag of copy.body) stripStyles(tag);
    const html = HtmlRenderer.renderPage(copy);
    navigator.clipboard
      .writeText(html)
      .then(() => this.setStatus("HTML (no inline) copied"))
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = html;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        this.setStatus("HTML copied");
      });
  }

  // ==================== HASH ====================
  saveToHash() {
    if (
      this.currentProject &&
      this.currentView === "page" &&
      this.currentPageIndex >= 0
    )
      window.location.hash = `#project=${this.currentProject._id}&page=${this.currentPageIndex}`;
    else if (this.currentProject)
      window.location.hash = `#project=${this.currentProject._id}`;
    else window.location.hash = "";
  }

  restoreFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const p = new URLSearchParams(hash);
    const pid = p.get("project"),
      pi = p.get("page");
    if (!pid) return;
    const proj = ProjectStorage.load(pid);
    if (!proj) return;
    this.currentProject = proj;
    this.currentPageIndex =
      pi !== null ? parseInt(pi, 10) : proj.pages.length > 0 ? 0 : -1;
    this.currentPage =
      this.currentPageIndex >= 0 && this.currentPageIndex < proj.pages.length
        ? proj.pages[this.currentPageIndex]
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
    this._history = [];
    this._historyIndex = -1;
    this._saveSnapshot();
    this.refreshUI();
  }

  // ==================== PROJECTS ====================
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
    const c = this.els.sidebarContent;
    c.innerHTML = "";
    const ctr = document.createElement("div");
    ctr.className = "projects-list";
    const h = document.createElement("h2");
    h.textContent = window.i18n.t("project.title");
    ctr.appendChild(h);
    const a = document.createElement("div");
    a.className = "project-actions-bar";
    const nb = document.createElement("button");
    nb.className = "btn btn-primary";
    nb.textContent = "+ " + window.i18n.t("project.newProjectBtn");
    nb.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showNewProjectModal();
    });
    a.appendChild(nb);
    const ib = document.createElement("button");
    ib.className = "btn";
    ib.textContent = window.i18n.t("project.loadFile");
    ib.addEventListener("click", (e) => {
      e.stopPropagation();
      this.els.fileInput.click();
    });
    a.appendChild(ib);
    ctr.appendChild(a);
    const lh = document.createElement("h3");
    lh.textContent = window.i18n.t("project.pages");
    ctr.appendChild(lh);
    const le = document.createElement("div");
    le.className = "project-cards";
    const projects = ProjectStorage.listAll();
    if (projects.length === 0) {
      const e = document.createElement("p");
      e.className = "empty-state";
      e.textContent = window.i18n.t("project.noProjects");
      le.appendChild(e);
    } else {
      projects.sort((a, b) => b.editedAt - a.editedAt);
      for (const pd of projects) le.appendChild(this._createProjectCard(pd));
    }
    ctr.appendChild(le);
    c.appendChild(ctr);
  }

  showNewProjectModal() {
    this._showModalContent(`
      <h2>${window.i18n.t("project.newProject")}</h2>
      <div class="form" style="margin-top:12px">
        <div class="form-group"><label class="form-label">${window.i18n.t("project.name")}</label><input type="text" class="input" id="modal-project-name" value="My Project"></div>
        <div class="form-group"><label class="form-label">${window.i18n.t("project.author")}</label><input type="text" class="input" id="modal-project-author"></div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><button class="btn btn-small" id="modal-paste-html">📋 Paste HTML to create page</button></div>
        <div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-primary" id="modal-create-btn">${window.i18n.t("common.create")}</button><button class="btn" id="modal-cancel-btn">${window.i18n.t("common.cancel")}</button></div>
      </div>`);
    document
      .getElementById("modal-create-btn")
      .addEventListener("click", () => {
        const n =
          document.getElementById("modal-project-name").value.trim() ||
          window.i18n.t("common.unnamed");
        const a =
          document.getElementById("modal-project-author").value.trim() ||
          window.i18n.t("common.unknownAuthor");
        const p = new Project({ name: n, author: a });
        p.addPage(new Page({ title: "Home" }));
        ProjectStorage.save(p);
        this.closeModal();
        this.openProject(p._id);
      });
    document
      .getElementById("modal-cancel-btn")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("modal-paste-html")
      .addEventListener("click", () => {
        const n =
          document.getElementById("modal-project-name").value.trim() ||
          "Imported HTML";
        const a =
          document.getElementById("modal-project-author").value.trim() || "";
        this.closeModal();
        this._showImportHtmlModal(n, a);
      });
    setTimeout(() => document.getElementById("modal-project-name").focus(), 50);
  }

  _showImportHtmlModal(pn, a) {
    this._showModalContent(
      `<h2>Import HTML</h2><p style="color:var(--text-muted);font-size:12px;margin:8px 0">Paste HTML below.</p><div class="form-group"><label class="form-label">HTML</label><textarea class="input" id="modal-html-input" rows="8" style="resize:vertical;font-family:monospace;font-size:11px"></textarea></div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-primary" id="modal-import-html-btn">Import</button><button class="btn" id="modal-cancel-btn2">Cancel</button></div>`,
    );
    document
      .getElementById("modal-import-html-btn")
      .addEventListener("click", () => {
        const s = document.getElementById("modal-html-input").value.trim();
        if (!s) return;
        const pr = new Project({ name: pn, author: a });
        const pg = new Page({ title: "Imported Page" });
        const doc = new DOMParser().parseFromString(s, "text/html");
        const tags = [];
        for (const el of doc.body.children) {
          const t = this._domToTag(el);
          if (t) tags.push(t);
        }
        if (tags.length === 0) {
          const w = document.createElement("div");
          w.innerHTML = s;
          for (const el of w.children) {
            const t = this._domToTag(el);
            if (t) tags.push(t);
          }
        }
        pg.body = tags;
        pr.addPage(pg);
        ProjectStorage.save(pr);
        this.closeModal();
        this.openProject(pr._id);
      });
    document
      .getElementById("modal-cancel-btn2")
      .addEventListener("click", () => this.closeModal());
  }

  _domToTag(el) {
    if (!el || !el.tagName) return null;
    const t = new Tag({ tagName: el.tagName.toLowerCase() });
    if (el.id) t.id = el.id;
    if (el.className && typeof el.className === "string")
      t.class = el.className.split(/\s+/).filter(Boolean);
    for (const at of el.attributes) {
      if (at.name === "id" || at.name === "class" || at.name === "style")
        continue;
      t.attrs[at.name] = at.value;
    }
    if (el.getAttribute("style"))
      t.styles = el
        .getAttribute("style")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3)
      t.textContent = el.textContent;
    else {
      for (const ch of el.children) {
        const ct = this._domToTag(ch);
        if (ct) t.children.push(ct);
      }
      let txt = "";
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) txt += n.textContent;
      }
      if (txt && t.children.length === 0) t.textContent = txt;
    }
    return t;
  }

  _createProjectCard(pd) {
    const card = document.createElement("div");
    card.className = "project-card";
    const ne = document.createElement("div");
    ne.className = "project-card-name";
    ne.textContent = pd.name || window.i18n.t("common.unnamed");
    card.appendChild(ne);
    const ae = document.createElement("div");
    ae.className = "project-card-author";
    ae.textContent = pd.author || window.i18n.t("common.unknownAuthor");
    card.appendChild(ae);
    const de = document.createElement("div");
    de.className = "project-card-dates";
    de.textContent = `${window.i18n.t("project.created")}: ${new Date(pd.createdAt).toLocaleString()} | ${window.i18n.t("project.edited")}: ${new Date(pd.editedAt).toLocaleString()}`;
    card.appendChild(de);
    const ax = document.createElement("div");
    ax.className = "project-card-actions";
    const ob = document.createElement("button");
    ob.className = "btn btn-primary btn-small";
    ob.textContent = window.i18n.t("common.edit");
    ob.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openProject(pd._id);
    });
    ax.appendChild(ob);
    const db = document.createElement("button");
    db.className = "btn btn-small";
    db.textContent = window.i18n.t("project.download");
    db.addEventListener("click", (e) => {
      e.stopPropagation();
      const p = ProjectStorage.load(pd._id);
      if (p) ProjectStorage.download(p);
    });
    ax.appendChild(db);
    const dl = document.createElement("button");
    dl.className = "btn btn-danger btn-small";
    dl.textContent = window.i18n.t("common.delete");
    dl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(window.i18n.t("project.deleteConfirm"))) {
        ProjectStorage.delete(pd._id);
        this.renderProjectsList();
      }
    });
    ax.appendChild(dl);
    card.appendChild(ax);
    return card;
  }

  // ==================== OPEN / SAVE ====================
  openProject(id) {
    const p = ProjectStorage.load(id);
    if (!p) {
      this.setStatus("Error loading project");
      return;
    }
    this.currentProject = p;
    this.currentPageIndex = p.pages.length > 0 ? 0 : -1;
    this.currentPage = p.pages.length > 0 ? p.pages[0] : null;
    this.selectedTagUid = null;
    this.showElementEditor = false;
    this.currentView = "project";
    this.currentPageTab = "meta";
    this.clearDirty();
    this._history = [];
    this._historyIndex = -1;
    this._saveSnapshot();
    this.saveToHash();
    this.refreshUI();
  }

  saveProject() {
    if (!this.currentProject) return;
    if (ProjectStorage.save(this.currentProject)) {
      this.clearDirty();
      this.setStatus(window.i18n.t("project.saveSuccess"));
      this.saveToHash();
    } else this.setStatus(window.i18n.t("project.saveError"));
  }

  handleFileImport(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const p = ProjectStorage.import(ev.target.result);
      if (p) {
        this.setStatus(`Imported: ${p.name}`);
        this.showProjectsList();
      } else this.setStatus("Failed to import");
    };
    r.readAsText(f);
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
    const t = this.els.sidebarTabs;
    t.style.display = "flex";
    t.innerHTML = "";
    const mt = this._tab(
      "meta",
      window.i18n.t("page.metadata"),
      this.currentPageTab === "meta",
    );
    mt.addEventListener("click", () => {
      this.currentPageTab = "meta";
      this.renderProjectView();
    });
    t.appendChild(mt);
    const pt = this._tab(
      "pages",
      window.i18n.t("project.pages"),
      this.currentPageTab === "pages",
    );
    pt.addEventListener("click", () => {
      this.currentPageTab = "pages";
      this.renderProjectView();
    });
    t.appendChild(pt);
  }

  _renderProjectContent() {
    const c = this.els.sidebarContent;
    c.innerHTML = "";
    if (this.currentPageTab === "meta") this._renderProjectMeta(c);
    else if (this.currentPageTab === "pages") this._renderProjectPagesList(c);
  }

  _renderProjectMeta(container) {
    const p = this.currentProject;
    const f = document.createElement("div");
    f.className = "form";
    f.appendChild(
      this._fg(window.i18n.t("project.name"), "text", p.name, (v) => {
        p.name = v;
        this.markDirty();
      }),
    );
    f.appendChild(
      this._fg(window.i18n.t("project.author"), "text", p.author, (v) => {
        p.author = v;
        this.markDirty();
      }),
    );
    container.appendChild(f);
  }

  _renderProjectPagesList(container) {
    const p = this.currentProject;
    const h = document.createElement("div");
    h.className = "pages-header";
    const nb = document.createElement("button");
    nb.className = "btn btn-primary";
    nb.textContent = "+ " + window.i18n.t("page.newPage");
    nb.addEventListener("click", (e) => {
      e.stopPropagation();
      this._saveSnapshot();
      const pg = new Page({ title: `Page ${p.pages.length + 1}` });
      p.addPage(pg);
      ProjectStorage.save(p);
      this.currentPageIndex = p.pages.length - 1;
      this.currentPage = pg;
      this.currentView = "page";
      this.currentPageTab = "insert";
      this.selectedTagUid = null;
      this.showElementEditor = false;
      this.saveToHash();
      this.refreshUI();
    });
    h.appendChild(nb);
    container.appendChild(h);
    if (p.pages.length === 0) {
      const e = document.createElement("p");
      e.className = "empty-state";
      e.textContent = window.i18n.t("project.noProjects");
      container.appendChild(e);
      return;
    }
    const pl = document.createElement("div");
    pl.className = "page-cards";
    p.pages.forEach((pg, idx) => {
      const c = document.createElement("div");
      c.className = "page-card";
      const te = document.createElement("div");
      te.className = "page-card-title";
      te.textContent = pg.title || `Page ${idx + 1}`;
      c.appendChild(te);
      const a = document.createElement("div");
      a.className = "page-card-actions";
      const ob = document.createElement("button");
      ob.className = "btn btn-primary btn-small";
      ob.textContent = window.i18n.t("common.edit");
      ob.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentPageIndex = idx;
        this.currentPage = pg;
        this.currentView = "page";
        this.currentPageTab = "insert";
        this.selectedTagUid = null;
        this.showElementEditor = false;
        this.saveToHash();
        this._saveSnapshot();
        this.refreshUI();
      });
      a.appendChild(ob);
      const db = document.createElement("button");
      db.className = "btn btn-danger btn-small";
      db.textContent = window.i18n.t("common.delete");
      db.addEventListener("click", (e) => {
        e.stopPropagation();
        p.removePage(idx);
        ProjectStorage.save(p);
        if (this.currentPageIndex === idx) {
          this.currentPageIndex = Math.max(0, idx - 1);
          this.currentPage = p.pages[this.currentPageIndex] || null;
        }
        this.renderProjectView();
      });
      a.appendChild(db);
      c.appendChild(a);
      pl.appendChild(c);
    });
    container.appendChild(pl);
  }

  // ==================== PAGE EDITOR ====================
  renderPageEditor() {
    if (!this.currentPage) return;
    this._renderPageTabs();
    this._renderPageContent();
    this.renderPreview();
  }

  _renderPageTabs() {
    const t = this.els.sidebarTabs;
    t.style.display = "flex";
    t.innerHTML = "";
    const bb = document.createElement("button");
    bb.className = "tab back-tab";
    bb.textContent = "← " + window.i18n.t("page.backToProject");
    bb.addEventListener("click", () => this.showProjectView());
    t.appendChild(bb);
    const tabs = [
      { k: "insert", l: "📦 " + window.i18n.t("page.insert") },
      { k: "meta", l: "📄 Page" },
      { k: "head", l: "📋 Meta" },
      { k: "palettes", l: "🎨 " + window.i18n.t("page.palettes") },
      { k: "body", l: "🔧 " + window.i18n.t("page.body") },
      { k: "styles", l: "✏️ Styles" },
    ];
    for (const ti of tabs) {
      const tab = this._tab(
        ti.k,
        ti.l,
        this.currentPageTab === ti.k && !this.showElementEditor,
      );
      tab.addEventListener("click", () => {
        this.currentPageTab = ti.k;
        this.showElementEditor = false;
        this.refreshUI();
      });
      t.appendChild(tab);
    }
    if (this.showElementEditor) {
      const et = this._tab("element", "✏️ Element", true);
      et.addEventListener("click", () => {});
      t.appendChild(et);
    }
  }

  _renderPageContent() {
    if (!this.currentPage) return;
    const c = this.els.sidebarContent;
    c.innerHTML = "";
    switch (this.currentPageTab) {
      case "insert":
        this._renderInsertPanel(c);
        break;
      case "meta":
        this._renderPageMeta(c);
        break;
      case "head":
        this._renderPageHead(c);
        break;
      case "palettes":
        this._renderPagePalettes(c);
        break;
      case "body":
        this._renderPageBody(c);
        break;
      case "styles":
        this._renderPageStyles(c);
        break;
      case "element":
        this._renderElementEditor(c);
        break;
    }
  }

  _renderPageMeta(container) {
    const p = this.currentPage;
    const f = document.createElement("div");
    f.className = "form";
    f.appendChild(
      this._fg(window.i18n.t("page.pageTitle"), "text", p.title, (v) => {
        p.title = v;
        this.markDirty();
        this.renderPreview();
      }),
    );
    f.appendChild(
      this._fg(window.i18n.t("page.width"), "text", p.width, (v) => {
        p.width = v;
        this.markDirty();
        this.renderPreview();
      }),
    );
    f.appendChild(
      this._fg(window.i18n.t("page.height"), "text", p.height, (v) => {
        p.height = v;
        this.markDirty();
        this.renderPreview();
      }),
    );
    container.appendChild(f);

    // Action buttons
    const actions = document.createElement("div");
    actions.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;padding-top:8px;border-top:1px solid var(--border)";
    const vmBtn = document.createElement("button");
    vmBtn.className = "btn btn-small";
    vmBtn.textContent = "👁 View Mode";
    vmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleViewMode();
    });
    actions.appendChild(vmBtn);
    const chBtn = document.createElement("button");
    chBtn.className = "btn btn-small";
    chBtn.textContent = "📋 Copy HTML";
    chBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showCopyHtmlModal();
    });
    actions.appendChild(chBtn);
    const chcBtn = document.createElement("button");
    chcBtn.className = "btn btn-small";
    chcBtn.textContent = "📋 Copy (No Inline)";
    chcBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._copyHtmlNoInline();
    });
    actions.appendChild(chcBtn);
    const exBtn = document.createElement("button");
    exBtn.className = "btn btn-small";
    exBtn.textContent = "💾 Save JSON";
    exBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.exportProject();
    });
    actions.appendChild(exBtn);
    container.appendChild(actions);

    // Assets section
    const ah = document.createElement("h3");
    ah.textContent = "📎 Assets";
    ah.style.cssText =
      "font-size:13px;color:var(--accent);margin-top:12px;margin-bottom:4px";
    container.appendChild(ah);
    if (!this.currentProject._assets) this.currentProject._assets = [];
    const assets = this.currentProject._assets;
    for (let i = 0; i < assets.length; i++) {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;gap:4px;align-items:center;margin-bottom:4px";
      const ni = document.createElement("input");
      ni.type = "text";
      ni.className = "input input-small";
      ni.style.flex = "1";
      ni.value = assets[i].name || "";
      ni.placeholder = "Name";
      ni.addEventListener("input", () => {
        assets[i].name = ni.value;
        this.markDirty();
      });
      row.appendChild(ni);
      const ui = document.createElement("input");
      ui.type = "text";
      ui.className = "input input-small";
      ui.style.flex = "2";
      ui.value = assets[i].url || "";
      ui.placeholder = "URL";
      ui.addEventListener("input", () => {
        assets[i].url = ui.value;
        this.markDirty();
      });
      row.appendChild(ui);
      const db = document.createElement("button");
      db.className = "btn btn-danger btn-small";
      db.textContent = "✕";
      db.addEventListener("click", (e) => {
        e.stopPropagation();
        assets.splice(i, 1);
        this._rerender(container, this._renderPageMeta.bind(this));
      });
      row.appendChild(db);
      container.appendChild(row);
    }
    const ab = document.createElement("button");
    ab.className = "btn btn-small";
    ab.textContent = "+ Add Asset";
    ab.addEventListener("click", (e) => {
      e.stopPropagation();
      assets.push({ name: "", url: "" });
      this.markDirty();
      this._rerender(container, this._renderPageMeta.bind(this));
    });
    container.appendChild(ab);
  }

  // ——— Head ———
  _renderPageHead(container) {
    container.innerHTML = "";
    const page = this.currentPage;
    const con = document.createElement("div");
    con.className = "head-section";
    con.innerHTML = "<h3>Quick Add</h3>";
    const pr = document.createElement("div");
    pr.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px";
    const presets = [
      [
        "📄 Charset",
        () => {
          page.head.meta.push(new Meta({ charset: "UTF-8" }));
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "📱 Viewport",
        () => {
          page.head.meta.push(
            new Meta({
              name: "viewport",
              content: "width=device-width, initial-scale=1.0",
            }),
          );
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "📝 Description",
        () => {
          page.head.meta.push(new Meta({ name: "description", content: "" }));
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "🔑 Keywords",
        () => {
          page.head.meta.push(new Meta({ name: "keywords", content: "" }));
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "👤 Author",
        () => {
          page.head.meta.push(new Meta({ name: "author", content: "" }));
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "🔄 X-UA",
        () => {
          page.head.meta.push(
            new Meta({ httpEquiv: "X-UA-Compatible", content: "IE=edge" }),
          );
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "🔗 OG Title",
        () => {
          page.head.meta.push(new Meta({ property: "og:title", content: "" }));
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "➕ Manual Meta",
        () => {
          page.head.meta.push(new Meta());
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "📎 CSS Link",
        () => {
          page.head.link.push(new Link({ rel: "stylesheet", href: "" }));
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
      [
        "🔖 Favicon",
        () => {
          page.head.favicons.push(new Favicon({ href: "" }));
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        },
      ],
    ];
    for (const [label, fn] of presets) {
      const b = document.createElement("button");
      b.className = "btn btn-small";
      b.textContent = label;
      b.style.cssText = "font-size:10px;padding:2px 6px";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        fn();
      });
      pr.appendChild(b);
    }
    con.appendChild(pr);
    container.appendChild(con);
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
    for (const s of sections) {
      const se = document.createElement("div");
      se.className = "head-section";
      const sh = document.createElement("h3");
      sh.textContent = s.label;
      se.appendChild(sh);
      for (let i = 0; i < s.items.length; i++) {
        const ie = document.createElement("div");
        ie.className = "head-item";
        for (const f of s.fields)
          ie.appendChild(
            this._fg(
              f.label,
              f.type,
              s.items[i][f.key] || "",
              (v) => {
                s.items[i][f.key] = v;
                this.markDirty();
              },
              { small: true },
            ),
          );
        const db = document.createElement("button");
        db.className = "btn btn-danger btn-small";
        db.textContent = "✕";
        db.addEventListener("click", (e) => {
          e.stopPropagation();
          s.items.splice(i, 1);
          this.markDirty();
          this._rerender(container, this._renderPageHead.bind(this));
        });
        ie.appendChild(db);
        se.appendChild(ie);
      }
      const ab = document.createElement("button");
      ab.className = "btn btn-small";
      ab.textContent = s.addLabel;
      ab.addEventListener("click", (e) => {
        e.stopPropagation();
        s.items.push(s.createItem());
        this.markDirty();
        this._rerender(container, this._renderPageHead.bind(this));
      });
      se.appendChild(ab);
      container.appendChild(se);
    }
  }

  // ——— Styles ———
  _renderPageStyles(container) {
    const page = this.currentPage;
    const ab = document.createElement("button");
    ab.className = "btn btn-primary btn-small";
    ab.textContent = "+ Add Style Rule";
    ab.addEventListener("click", (e) => {
      e.stopPropagation();
      this._saveSnapshot();
      page.styles.push(new StyleSet({ selector: "", styles: [] }));
      this.markDirty();
      this._rerender(container, this._renderPageStyles.bind(this));
    });
    container.appendChild(ab);
    if (page.styles.length === 0) {
      const e = document.createElement("p");
      e.className = "empty-state";
      e.textContent = "No style rules.";
      container.appendChild(e);
      return;
    }
    for (let si = 0; si < page.styles.length; si++) {
      const ss = page.styles[si];
      const sec = document.createElement("div");
      sec.className = "head-section";
      sec.appendChild(
        this._fg(
          "Selector",
          "text",
          ss.selector,
          (v) => {
            ss.selector = v;
            this.markDirty();
            this.renderPreview();
          },
          { small: true },
        ),
      );
      for (let sj = 0; sj < ss.styles.length; sj++) {
        const r = document.createElement("div");
        r.className = "advanced-style-row";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "input input-small";
        inp.value = ss.styles[sj];
        inp.style.flex = "1";
        inp.addEventListener("change", () => {
          ss.styles[sj] = inp.value;
          this.markDirty();
          this.renderPreview();
        });
        const db = document.createElement("button");
        db.className = "btn btn-danger btn-small";
        db.textContent = "✕";
        db.addEventListener("click", (e) => {
          e.stopPropagation();
          ss.styles.splice(sj, 1);
          this.markDirty();
          this._rerender(container, this._renderPageStyles.bind(this));
        });
        r.appendChild(inp);
        r.appendChild(db);
        sec.appendChild(r);
      }
      const rb = document.createElement("button");
      rb.className = "btn btn-small";
      rb.textContent = "+ Rule";
      rb.addEventListener("click", (e) => {
        e.stopPropagation();
        ss.styles.push("");
        this.markDirty();
        this._rerender(container, this._renderPageStyles.bind(this));
      });
      sec.appendChild(rb);
      const ds = document.createElement("button");
      ds.className = "btn btn-danger btn-small";
      ds.textContent = "Delete";
      ds.addEventListener("click", (e) => {
        e.stopPropagation();
        page.styles.splice(si, 1);
        this.markDirty();
        this._rerender(container, this._renderPageStyles.bind(this));
      });
      sec.appendChild(ds);
      container.appendChild(sec);
    }
    this.renderPreview();
  }

  // ——— Palettes ———
  _renderPagePalettes(container) {
    const page = this.currentPage;
    const ab = document.createElement("button");
    ab.className = "btn";
    ab.textContent = "+ " + window.i18n.t("palette.addPalette");
    ab.addEventListener("click", (e) => {
      e.stopPropagation();
      this._saveSnapshot();
      page.palettes.push(
        new Palette({
          name: `Palette ${page.palettes.length + 1}`,
          colors: [["primary", "#007bff"]],
        }),
      );
      this.markDirty();
      this._rerender(container, this._renderPagePalettes.bind(this));
    });
    container.appendChild(ab);
    for (let pi = 0; pi < page.palettes.length; pi++) {
      const pal = page.palettes[pi];
      const pe = document.createElement("div");
      pe.className = "palette-section";
      const hr = document.createElement("div");
      hr.style.cssText = "display:flex;gap:6px;align-items:center";
      const ni = document.createElement("input");
      ni.type = "text";
      ni.className = "input input-small";
      ni.style.flex = "1";
      ni.value = pal.name;
      ni.placeholder = window.i18n.t("palette.name");
      ni.addEventListener("input", () => {
        pal.name = ni.value;
        this.markDirty();
      });
      hr.appendChild(ni);
      const dp = document.createElement("button");
      dp.className = "btn btn-danger btn-small";
      dp.textContent = "✕";
      dp.addEventListener("click", (e) => {
        e.stopPropagation();
        page.palettes.splice(pi, 1);
        this.markDirty();
        this._rerender(container, this._renderPagePalettes.bind(this));
      });
      hr.appendChild(dp);
      pe.appendChild(hr);
      for (let ci = 0; ci < pal.colors.length; ci++) {
        const [cn, cv] = pal.colors[ci];
        const cr = document.createElement("div");
        cr.className = "color-row";
        const cni = document.createElement("input");
        cni.type = "text";
        cni.className = "input input-small";
        cni.value = cn;
        cni.placeholder = window.i18n.t("palette.colorName");
        cni.addEventListener("input", () => {
          pal.colors[ci][0] = cni.value;
          this.markDirty();
          this.renderPreview();
        });
        const cvi = document.createElement("input");
        cvi.type = "color";
        cvi.className = "color-input";
        cvi.value = cv;
        cvi.addEventListener("input", () => {
          pal.colors[ci][1] = cvi.value;
          this.markDirty();
          this.renderPreview();
        });
        const dc = document.createElement("button");
        dc.className = "btn btn-danger btn-small";
        dc.textContent = "✕";
        dc.addEventListener("click", (e) => {
          e.stopPropagation();
          pal.colors.splice(ci, 1);
          this.markDirty();
          this._rerender(container, this._renderPagePalettes.bind(this));
        });
        cr.appendChild(cni);
        cr.appendChild(cvi);
        cr.appendChild(dc);
        pe.appendChild(cr);
      }
      const ac = document.createElement("button");
      ac.className = "btn btn-small";
      ac.textContent = "+ " + window.i18n.t("palette.addColor");
      ac.addEventListener("click", (e) => {
        e.stopPropagation();
        pal.colors.push(["", "#000000"]);
        this.markDirty();
        this._rerender(container, this._renderPagePalettes.bind(this));
      });
      pe.appendChild(ac);
      container.appendChild(pe);
    }
  }

  // ==================== BODY (TREE) ====================
  _renderPageBody(container) {
    const page = this.currentPage;
    const h = document.createElement("div");
    h.className = "body-header";
    const ab = document.createElement("button");
    ab.className = "btn btn-primary";
    ab.textContent = "+ " + window.i18n.t("element.addChild");
    ab.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.selectedTagUid) {
        const tg = page.findTagByUid(this.selectedTagUid);
        if (tg) {
          this._showAddChildModal(tg, false);
          return;
        }
      }
      this._saveSnapshot();
      page.body.push(new Tag({ tagName: "div" }));
      this.markDirty();
      this.renderPreview();
      this._rerender(container, this._renderPageBody.bind(this));
    });
    h.appendChild(ab);
    container.appendChild(h);
    if (page.body.length === 0) {
      const e = document.createElement("p");
      e.className = "empty-state";
      e.textContent = "No elements.";
      container.appendChild(e);
      return;
    }
    const te = document.createElement("div");
    te.className = "body-tree compact";
    for (let i = 0; i < page.body.length; i++)
      this._renderTreeNode(page.body[i], te, 0, page.body, i, page, false);
    container.appendChild(te);
  }

  _showAddChildModal(parentTag, navigateToElement = true) {
    this._showModalContent(`
      <h2>Add Child Element</h2>
      <div class="form" style="margin-top:12px">
        <div class="form-group"><label class="form-label">Tag Name</label><input type="text" class="input" id="modal-child-tag" value="div" list="tag-suggestions">
          <datalist id="tag-suggestions"><option value="div"><option value="span"><option value="p"><option value="h1"><option value="h2"><option value="h3"><option value="a"><option value="img"><option value="ul"><option value="li"><option value="button"><option value="input"><option value="section"></datalist>
        </div>
        <div class="form-group"><label class="form-label">Inner HTML (optional)</label><input type="text" class="input" id="modal-child-html" placeholder="Text content"></div>
        <div style="margin-top:8px"><button class="btn btn-small" id="insert-grid-toggle">📦 Show Insert Grid</button></div>
        <div id="insert-grid-container" style="display:none;margin-top:8px"></div>
        <div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-primary" id="modal-add-child-btn">Add</button><button class="btn" id="modal-cancel-child-btn">Cancel</button></div>
      </div>`);
    const toggleBtn = document.getElementById("insert-grid-toggle");
    const gridContainer = document.getElementById("insert-grid-container");
    toggleBtn.addEventListener("click", () => {
      if (gridContainer.style.display !== "none") {
        gridContainer.style.display = "none";
        return;
      }
      gridContainer.style.display = "block";
      gridContainer.innerHTML = "";
      this._renderInsertGrid(gridContainer, (el) => {
        const tag = new Tag({
          tagName: el.tag,
          textContent: el.defaultContent || "",
          attrs: el.attrs ? { ...el.attrs } : {},
          styles: el.styles ? [...el.styles] : [],
          children: el.children
            ? el.children.map((c) => Tag.fromJSON(c.toJSON()))
            : [],
        });
        this._saveSnapshot();
        parentTag.children.push(tag);
        this.markDirty();
        this.renderPreview();
        this.closeModal();
        if (navigateToElement) {
          this.selectedTagUid = tag._uid;
          this.showElementEditor = true;
          this.currentPageTab = "element";
          this.refreshUI();
        }
      });
    });
    document
      .getElementById("modal-add-child-btn")
      .addEventListener("click", () => {
        const tn =
          document.getElementById("modal-child-tag").value.trim() || "div";
        const inner = document.getElementById("modal-child-html").value.trim();
        const tag = new Tag({ tagName: tn.toLowerCase() });
        if (inner) {
          const w = document.createElement("div");
          w.innerHTML = inner;
          if (w.children.length > 0) {
            for (const el of w.children) {
              const ct = this._domToTag(el);
              if (ct) tag.children.push(ct);
            }
          } else tag.textContent = inner;
        }
        this._saveSnapshot();
        parentTag.children.push(tag);
        this.markDirty();
        this.renderPreview();
        this.closeModal();
        if (navigateToElement) {
          this.selectedTagUid = tag._uid;
          this.showElementEditor = true;
          this.currentPageTab = "element";
          this.refreshUI();
        }
      });
    document
      .getElementById("modal-cancel-child-btn")
      .addEventListener("click", () => this.closeModal());
    setTimeout(() => document.getElementById("modal-child-tag").focus(), 50);
  }

  _renderInsertGrid(container, onInsert) {
    const groups = [
      {
        items: [
          { label: "📦 Div", tag: "div" },
          { label: "🔤 Span", tag: "span" },
          { label: "📝 Paragraph", tag: "p", defaultContent: "Text" },
          {
            label: "🔗 Link",
            tag: "a",
            attrs: { href: "#" },
            defaultContent: "Link",
          },
          { label: "🔘 Button", tag: "button", defaultContent: "Button" },
          { label: "✏️ Input", tag: "input", attrs: { type: "text" } },
          { label: "📄 Textarea", tag: "textarea" },
          { label: "🖼️ Image", tag: "img", attrs: { src: "", alt: "" } },
          {
            label: "📋 List",
            tag: "ul",
            children: [new Tag({ tagName: "li", textContent: "Item" })],
          },
          { label: "H1", tag: "h1", defaultContent: "Heading" },
          { label: "H2", tag: "h2", defaultContent: "Heading" },
          { label: "📐 Section", tag: "section", defaultContent: "Section" },
        ],
      },
    ];
    for (const g of groups) {
      const grid = document.createElement("div");
      grid.className = "insert-grid";
      for (const el of g.items) {
        const btn = document.createElement("button");
        btn.className = "insert-btn";
        btn.textContent = el.label;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          onInsert(el);
        });
        grid.appendChild(btn);
      }
      container.appendChild(grid);
    }
  }

  _renderTreeNode(
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
    node.draggable = true;
    if (tag._uid === this.selectedTagUid) node.classList.add("selected");
    node.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", tag._uid);
      e.dataTransfer.effectAllowed = "move";
    });
    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      node.style.opacity = "0.5";
    });
    node.addEventListener("dragleave", () => {
      node.style.opacity = "";
    });
    node.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      node.style.opacity = "";
      const draggedUid = e.dataTransfer.getData("text/plain");
      if (draggedUid === tag._uid) return;
      const srcTag = page.findTagByUid(draggedUid);
      if (!srcTag) return;
      // Find source parent and remove
      const removeFromParent = (parent) => {
        for (let i = 0; i < parent.length; i++) {
          if (parent[i]._uid === draggedUid) {
            parent.splice(i, 1);
            return true;
          }
          if (this._deleteFromTree(parent[i], draggedUid)) return true;
        }
        return false;
      };
      removeFromParent(page.body);
      // Insert as child of this node
      tag.children.push(srcTag);
      this._saveSnapshot();
      this.markDirty();
      this.refreshUI();
      this.renderPreview();
    });
    const header = document.createElement("div");
    header.className = "tree-node-header";
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectedTagUid = tag._uid;
      this.showElementEditor = true;
      this.currentPageTab = "element";
      this.refreshUI();
      this.renderPreview();
    });
    const tb = document.createElement("span");
    tb.className = "tree-toggle";
    const hc = tag.children.length > 0;
    tb.textContent = hc ? "▶" : "·";
    tb.addEventListener("click", (e) => {
      e.stopPropagation();
      node.classList.toggle("collapsed");
      tb.textContent = node.classList.contains("collapsed") ? "▶" : "▼";
    });
    const ne = document.createElement("span");
    ne.className = "tree-tag-name";
    if (tag.id) ne.textContent = `#${tag.id}`;
    else ne.textContent = tag.tagName;
    const ex = [];
    if (tag.class.length > 0) ex.push("." + tag.class.join("."));
    if (tag.attrs.name) ex.push(`[name="${tag.attrs.name}"]`);
    if (tag.attrs.href) ex.push("[href]");
    if (ex.length > 0) {
      const es = document.createElement("span");
      es.className = "tree-class";
      es.textContent = ex.join("");
      ne.appendChild(es);
    }
    if (hc && !node.classList.contains("collapsed")) {
      const cs = document.createElement("span");
      cs.className = "tree-child-count";
      cs.textContent = ` (${tag.children.length})`;
      ne.appendChild(cs);
    }
    header.appendChild(tb);
    header.appendChild(ne);
    if (!isChildTree) {
      const acts = document.createElement("span");
      acts.className = "tree-actions";
      const ab = document.createElement("button");
      ab.className = "tree-btn";
      ab.textContent = "+";
      ab.title = "Add Child";
      ab.addEventListener("click", (e) => {
        e.stopPropagation();
        this._showAddChildModal(tag, false);
      });
      acts.appendChild(ab);
      if (!compact && siblingIndex !== undefined) {
        const sb = document.createElement("button");
        sb.className = "tree-btn";
        sb.textContent = "◎";
        sb.title = "Select";
        sb.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectedTagUid = tag._uid;
          this.showElementEditor = true;
          this.currentPageTab = "element";
          this.refreshUI();
          this.renderPreview();
        });
        acts.appendChild(sb);
        if (siblingIndex > 0) {
          const ub = document.createElement("button");
          ub.className = "tree-btn";
          ub.textContent = "↑";
          ub.title = "Move Up";
          ub.addEventListener("click", (e) => {
            e.stopPropagation();
            this._saveSnapshot();
            [siblings[siblingIndex - 1], siblings[siblingIndex]] = [
              siblings[siblingIndex],
              siblings[siblingIndex - 1],
            ];
            this.markDirty();
            this.refreshUI();
            this.renderPreview();
          });
          acts.appendChild(ub);
        }
        if (siblings && siblingIndex < siblings.length - 1) {
          const db2 = document.createElement("button");
          db2.className = "tree-btn";
          db2.textContent = "↓";
          db2.title = "Move Down";
          db2.addEventListener("click", (e) => {
            e.stopPropagation();
            this._saveSnapshot();
            [siblings[siblingIndex], siblings[siblingIndex + 1]] = [
              siblings[siblingIndex + 1],
              siblings[siblingIndex],
            ];
            this.markDirty();
            this.refreshUI();
            this.renderPreview();
          });
          acts.appendChild(db2);
        }
        const dp = document.createElement("button");
        dp.className = "tree-btn";
        dp.textContent = "⧉";
        dp.title = "Duplicate";
        dp.addEventListener("click", (e) => {
          e.stopPropagation();
          this._saveSnapshot();
          const c = tag.duplicate();
          siblings.splice(siblingIndex + 1, 0, c);
          this.markDirty();
          this.refreshUI();
          this.renderPreview();
        });
        acts.appendChild(dp);
        const sv = document.createElement("button");
        sv.className = "tree-btn";
        sv.textContent = "💾";
        sv.title = "Save as Preset";
        sv.addEventListener("click", (e) => {
          e.stopPropagation();
          this._saveAsPreset(tag);
        });
        acts.appendChild(sv);
        const dl = document.createElement("button");
        dl.className = "tree-btn tree-btn-danger";
        dl.textContent = "✕";
        dl.title = "Delete";
        dl.addEventListener("click", (e) => {
          e.stopPropagation();
          this._saveSnapshot();
          siblings.splice(siblingIndex, 1);
          this.markDirty();
          if (this.selectedTagUid === tag._uid) {
            this.selectedTagUid = null;
            this.showElementEditor = false;
          }
          this.refreshUI();
          this.renderPreview();
        });
        acts.appendChild(dl);
      }
      header.appendChild(acts);
    }
    node.appendChild(header);
    if (hc) {
      const cc = document.createElement("div");
      cc.className = "tree-children";
      node.classList.add("collapsed");
      for (let ci = 0; ci < tag.children.length; ci++)
        this._renderTreeNode(
          tag.children[ci],
          cc,
          depth + 1,
          tag.children,
          ci,
          page,
          compact,
          isChildTree,
        );
      node.appendChild(cc);
    }
    parentEl.appendChild(node);
  }

  // ==================== INSERT PANEL ====================
  _renderInsertPanel(container) {
    const page = this.currentPage;
    if (this._presets.length > 0) {
      const ps = document.createElement("div");
      ps.className = "insert-section";
      const pt = document.createElement("h3");
      pt.style.cssText =
        "font-size:12px;color:var(--highlight);margin-bottom:4px";
      pt.textContent = "⭐ Presets";
      ps.appendChild(pt);
      const pg = document.createElement("div");
      pg.className = "insert-grid";
      for (const p of this._presets) {
        const b = document.createElement("button");
        b.className = "insert-btn";
        b.textContent = "⭐ " + p.name;
        b.title = p.tagName + (p.class.length ? "." + p.class.join(".") : "");
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          this._insertPreset(p, page);
        });
        pg.appendChild(b);
      }
      ps.appendChild(pg);
      container.appendChild(ps);
    }
    const groups = [
      {
        title: "📝 Text & Links",
        items: [
          {
            label: "🔤 Span",
            tag: "span",
            modal: (t) => {
              const v = prompt("Text:", "Text");
              if (v === null) return false;
              t.textContent = v;
              return true;
            },
          },
          {
            label: "🔗 Link",
            tag: "a",
            modal: (t) => {
              const h = prompt("Href:", "#");
              if (h === null) return false;
              t.attrs.href = h;
              t.textContent = prompt("Link text:", "Link") || "Link";
              return true;
            },
          },
          { label: "¶ Paragraph", tag: "p", defaultContent: "Paragraph text" },
        ],
      },
      {
        title: "🔤 Headings",
        items: [
          { label: "H1", tag: "h1", defaultContent: "Heading 1" },
          { label: "H2", tag: "h2", defaultContent: "Heading 2" },
          { label: "H3", tag: "h3", defaultContent: "Heading 3" },
          { label: "H4", tag: "h4", defaultContent: "Heading 4" },
        ],
      },
      {
        title: "🖼️ Media",
        items: [
          {
            label: "🖼️ Image",
            tag: "img",
            modal: (t) => {
              t.attrs.src = prompt("URL:", "") || "";
              t.attrs.alt = prompt("Alt:", "") || "";
              return true;
            },
          },
          { label: "🎬 Video", tag: "video", attrs: { controls: "" } },
          { label: "🎵 Audio", tag: "audio", attrs: { controls: "" } },
          {
            label: "📺 Iframe",
            tag: "iframe",
            modal: (t) => {
              t.attrs.src = prompt("URL:", "about:blank") || "about:blank";
              return true;
            },
          },
        ],
      },
      {
        title: "📋 Lists",
        items: [
          {
            label: "📋 UL",
            tag: "ul",
            modal: (t) => {
              const v = prompt("Items (comma):", "Item 1, Item 2");
              if (v) {
                for (const s of v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean))
                  t.children.push(new Tag({ tagName: "li", textContent: s }));
              }
              return true;
            },
          },
          {
            label: "🔢 OL",
            tag: "ol",
            modal: (t) => {
              const v = prompt("Items (comma):", "Item 1, Item 2");
              if (v) {
                for (const s of v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean))
                  t.children.push(new Tag({ tagName: "li", textContent: s }));
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
          { label: "✏️ Input", tag: "input", attrs: { type: "text" } },
          { label: "📄 Textarea", tag: "textarea" },
          {
            label: "📋 Select",
            tag: "select",
            modal: (t) => {
              const v = prompt("Options:", "Option 1, Option 2");
              if (v) {
                for (const s of v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean))
                  t.children.push(
                    new Tag({ tagName: "option", textContent: s }),
                  );
              }
              return true;
            },
          },
        ],
      },
      {
        title: "📦 Layout",
        items: [
          { label: "📦 Div", tag: "div" },
          { label: "🧭 Nav", tag: "nav", defaultContent: "Nav" },
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
            styles: ["display:flex"],
            defaultContent: "Flex",
          },
          {
            label: "🔲 Grid",
            tag: "div",
            styles: ["display:grid", "grid-template-columns: 1fr 1fr"],
            defaultContent: "Grid",
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
          { label: "⏱️ Time", tag: "time", defaultContent: "2024" },
        ],
      },
    ];
    for (const g of groups) {
      const s = document.createElement("div");
      s.className = "insert-section";
      const t = document.createElement("h3");
      t.style.cssText = "font-size:12px;color:var(--accent);margin:6px 0 4px";
      t.textContent = g.title;
      s.appendChild(t);
      const gr = document.createElement("div");
      gr.className = "insert-grid";
      for (const it of g.items) {
        const b = document.createElement("button");
        b.className = "insert-btn";
        b.textContent = it.label;
        b.title = it.tag;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          const tag = new Tag({
            tagName: it.tag,
            textContent: it.defaultContent || "",
            attrs: it.attrs ? { ...it.attrs } : {},
            styles: it.styles ? [...it.styles] : [],
            children: it.children
              ? it.children.map((c) => Tag.fromJSON(c.toJSON()))
              : [],
          });
          if (it.modal) {
            if (!it.modal(tag)) return;
          }
          this._saveSnapshot();
          if (this.selectedTagUid) {
            const st = page.findTagByUid(this.selectedTagUid);
            if (st) st.children.push(tag);
          } else page.body.push(tag);
          this.markDirty();
          this.renderPreview();
          this.selectedTagUid = tag._uid;
          this.showElementEditor = true;
          this.currentPageTab = "element";
          this.refreshUI();
        });
        gr.appendChild(b);
      }
      s.appendChild(gr);
      container.appendChild(s);
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
    this._saveSnapshot();
    if (this.selectedTagUid) {
      const st = page.findTagByUid(this.selectedTagUid);
      if (st) st.children.push(tag);
    } else page.body.push(tag);
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
    const bs = document.createElement("div");
    bs.className = "editor-section";

    bs.appendChild(
      this._fg(
        window.i18n.t("element.tagName"),
        "text",
        tag.tagName,
        (v) => {
          this._saveSnapshot();
          tag.tagName = v.toLowerCase();
          this.markDirty();
          this.renderPreview();
        },
        { small: true },
      ),
    );

    // Text content: textarea + no-escape checkbox
    const tcGroup = document.createElement("div");
    tcGroup.className = "form-group form-group-small";
    const tcLabel = document.createElement("label");
    tcLabel.className = "form-label";
    tcLabel.textContent = window.i18n.t("element.textContent");
    tcGroup.appendChild(tcLabel);
    const ta = document.createElement("textarea");
    ta.className = "input";
    ta.style.cssText =
      "width:100%;min-height:40px;resize:vertical;font-size:11px";
    ta.value = tag.textContent;
    ta.addEventListener("input", () => {
      tag.textContent = ta.value;
      this.markDirty();
      this.renderPreview();
    });
    tcGroup.appendChild(ta);
    const rawRow = document.createElement("div");
    rawRow.style.cssText =
      "display:flex;align-items:center;gap:6px;margin-top:2px";
    const rawChk = document.createElement("input");
    rawChk.type = "checkbox";
    rawChk.id = "raw-html-chk";
    rawChk.checked = tag.rawHtml;
    rawChk.addEventListener("change", () => {
      tag.rawHtml = rawChk.checked;
      this.markDirty();
      this.renderPreview();
    });
    rawRow.appendChild(rawChk);
    const rawLbl = document.createElement("label");
    rawLbl.htmlFor = "raw-html-chk";
    rawLbl.textContent = "Don't escape HTML";
    rawLbl.style.cssText = "font-size:11px;color:var(--text-muted)";
    rawRow.appendChild(rawLbl);
    tcGroup.appendChild(rawRow);
    bs.appendChild(tcGroup);

    bs.appendChild(
      this._fg(
        window.i18n.t("element.id"),
        "text",
        tag.id,
        (v) => {
          tag.id = v;
          this.markDirty();
          this.renderPreview();
        },
        { small: true },
      ),
    );

    // Pseudo-state
    const pG = document.createElement("div");
    pG.className = "form-group form-group-small";
    const pL = document.createElement("label");
    pL.className = "form-label";
    pL.textContent = "Pseudo-state";
    pG.appendChild(pL);
    const pS = document.createElement("select");
    pS.className = "input input-small";
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
      const o = document.createElement("option");
      o.value = p;
      o.textContent = p || "(none)";
      if (p === this.pseudoState) o.selected = true;
      pS.appendChild(o);
    });
    pS.addEventListener("change", () => {
      this.pseudoState = pS.value;
      this.markDirty();
    });
    pG.appendChild(pS);
    bs.appendChild(pG);

    // Delete & Duplicate after classes
    const actionRow = document.createElement("div");
    actionRow.style.cssText = "display:flex;gap:6px;margin-top:4px";
    const delElBtn2 = document.createElement("button");
    delElBtn2.className = "btn btn-danger btn-small";
    delElBtn2.textContent = window.i18n.t("element.delete");
    delElBtn2.addEventListener("click", (e) => {
      e.stopPropagation();
      this._deleteSelectedElement();
    });
    actionRow.appendChild(delElBtn2);
    const dupBtn2 = document.createElement("button");
    dupBtn2.className = "btn btn-small";
    dupBtn2.textContent = window.i18n.t("element.duplicate");
    dupBtn2.addEventListener("click", (e) => {
      e.stopPropagation();
      this._saveSnapshot();
      const c = tag.duplicate();
      this._insertAfterTag(tag._uid, c);
      this.markDirty();
      this.renderPreview();
      this.refreshUI();
    });
    actionRow.appendChild(dupBtn2);
    bs.appendChild(actionRow);

    // Classes
    const cg = document.createElement("div");
    cg.className = "form-group";
    const cl = document.createElement("label");
    cl.className = "form-label";
    cl.textContent = window.i18n.t("element.classes");
    cg.appendChild(cl);
    const cr = document.createElement("div");
    cr.className = "form-row";
    const ci = document.createElement("input");
    ci.type = "text";
    ci.className = "input input-small";
    ci.placeholder = "class name";
    cr.appendChild(ci);
    const ac = document.createElement("button");
    ac.className = "btn btn-small";
    ac.textContent = "+";
    ac.addEventListener("click", (e) => {
      e.stopPropagation();
      const v = ci.value.trim();
      if (v && !tag.class.includes(v)) {
        this._saveSnapshot();
        tag.class.push(v);
        this.markDirty();
        this.renderPreview();
        this._renderElementEditorSub(container, tag);
      }
      ci.value = "";
    });
    ci.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ac.click();
    });
    cr.appendChild(ac);
    cg.appendChild(cr);
    if (tag.class.length > 0) {
      const cs = document.createElement("div");
      cs.className = "chip-list";
      for (let i = 0; i < tag.class.length; i++) {
        const ch = document.createElement("span");
        ch.className = "chip";
        ch.textContent = tag.class[i] + " ✕";
        ch.addEventListener("click", (e) => {
          e.stopPropagation();
          this._saveSnapshot();
          tag.class.splice(i, 1);
          this.markDirty();
          this.renderPreview();
          this._renderElementEditorSub(container, tag);
        });
        cs.appendChild(ch);
      }
      cg.appendChild(cs);
    }
    bs.appendChild(cg);
    editor.appendChild(bs);

    const pb = document.createElement("button");
    pb.className = "btn btn-small";
    pb.textContent = "💾 Save as Preset";
    pb.addEventListener("click", (e) => {
      e.stopPropagation();
      this._saveAsPreset(tag);
    });
    editor.appendChild(pb);

    // Styles FIRST, then attributes
    editor.appendChild(
      this._collapsible(window.i18n.t("element.styles"), true, () =>
        this._renderStylesContent(tag),
      ),
    );
    editor.appendChild(
      this._collapsible(window.i18n.t("element.attributes"), true, () =>
        this._renderAttrContent(tag),
      ),
    );

    // Children actions at bottom
    const cs2 = document.createElement("div");
    cs2.style.cssText =
      "display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:6px 0";
    const acb = document.createElement("button");
    acb.className = "btn btn-primary btn-small";
    acb.textContent = "+ " + window.i18n.t("element.addChild");
    acb.addEventListener("click", (e) => {
      e.stopPropagation();
      this._showAddChildModal(tag, false);
      // Re-render element editor to update children tree
      setTimeout(() => {
        if (this.selectedTagUid)
          this._renderElementEditorSub(
            container,
            this.currentPage.findTagByUid(this.selectedTagUid),
          );
      }, 100);
    });
    cs2.appendChild(acb);
    editor.appendChild(cs2);

    // Children tree
    const cts = document.createElement("div");
    cts.className = "element-children-tree";
    const ctl = document.createElement("div");
    ctl.className = "element-children-title";
    ctl.textContent =
      window.i18n.t("element.children") + " (" + tag.children.length + ")";
    cts.appendChild(ctl);
    const ct2 = document.createElement("div");
    ct2.style.marginTop = "2px";
    for (let ci = 0; ci < tag.children.length; ci++)
      this._renderTreeNode(
        tag.children[ci],
        ct2,
        0,
        tag.children,
        ci,
        this.currentPage,
        true,
        true,
      );
    cts.appendChild(ct2);
    editor.appendChild(cts);
    container.appendChild(editor);
  }

  // ==================== ATTRIBUTES ====================
  _renderAttrContent(tag) {
    const c = document.createElement("div");
    for (const [k, v] of Object.entries(tag.attrs)) {
      const r = document.createElement("div");
      r.className = "attr-row";
      const ki = document.createElement("input");
      ki.type = "text";
      ki.className = "input input-small";
      ki.value = k;
      ki.addEventListener("input", () => {
        const nk = ki.value.trim();
        if (nk && nk !== k) {
          tag.attrs[nk] = v;
          delete tag.attrs[k];
          this.markDirty();
          this.renderPreview();
        }
      });
      const vi = document.createElement("input");
      vi.type = "text";
      vi.className = "input input-small";
      vi.value = v;
      vi.addEventListener("input", () => {
        tag.attrs[ki.value.trim() || k] = vi.value;
        this.markDirty();
        this.renderPreview();
      });
      const db = document.createElement("button");
      db.className = "btn btn-danger btn-small";
      db.textContent = "✕";
      db.addEventListener("click", (e) => {
        e.stopPropagation();
        delete tag.attrs[k];
        this.markDirty();
        this.renderPreview();
        r.remove();
      });
      r.appendChild(ki);
      r.appendChild(vi);
      r.appendChild(db);
      c.appendChild(r);
    }
    const ar = document.createElement("div");
    ar.className = "attr-row add-attr";
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
        ar.parentElement.insertBefore(this._attrRow(tag, k, nvi.value), ar);
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
    ar.appendChild(nki);
    ar.appendChild(nvi);
    ar.appendChild(ab);
    c.appendChild(ar);
    return c;
  }

  _attrRow(tag, key, value) {
    const r = document.createElement("div");
    r.className = "attr-row";
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
      r.remove();
    });
    r.appendChild(ki);
    r.appendChild(vi);
    r.appendChild(db);
    return r;
  }

  // ==================== STYLES ====================
  _renderStylesContent(tag) {
    const c = document.createElement("div");
    c.className = "styles-editor";
    // Show all style tabs at once
    const allContent = document.createElement("div");
    allContent.appendChild(this._renderVisualStyles(tag));
    allContent.appendChild(this._renderLayoutStyles(tag));
    allContent.appendChild(this._renderSpacingStyles(tag));
    allContent.appendChild(this._renderPositionStyles(tag));
    allContent.appendChild(this._renderAdvancedStyles(tag));
    c.appendChild(allContent);
    return c;
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
    for (const i of items) c.appendChild(this._sg(tag, i));
    return c;
  }

  _renderLayoutStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";
    c.appendChild(
      this._sg(tag, {
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
        c.appendChild(this._sg(tag, p));
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
        c.appendChild(this._sg(tag, p));
    }
    return c;
  }

  _renderSpacingStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";
    c.appendChild(
      this._modelSection(tag, "margin", window.i18n.t("style.margin"), "M"),
    );
    c.appendChild(
      this._modelSection(tag, "padding", window.i18n.t("style.padding"), "P"),
    );
    c.appendChild(
      this._sg(tag, {
        k: "box-sizing",
        l: window.i18n.t("style.boxSizing"),
        t: "select",
        o: ["content-box", "border-box"],
      }),
    );
    c.appendChild(
      this._sg(tag, {
        k: "width",
        l: window.i18n.t("style.width"),
        t: "range",
        min: 0,
        max: 2000,
        step: 10,
      }),
    );
    c.appendChild(
      this._sg(tag, {
        k: "height",
        l: window.i18n.t("style.height"),
        t: "range",
        min: 0,
        max: 2000,
        step: 10,
      }),
    );
    c.appendChild(
      this._sg(tag, {
        k: "overflow",
        l: window.i18n.t("style.overflow"),
        t: "select",
        o: ["visible", "hidden", "scroll", "auto"],
      }),
    );
    return c;
  }

  _modelSection(tag, prefix, label, letter) {
    const c = document.createElement("div");
    const lbl = document.createElement("label");
    lbl.className = "style-section-label";
    lbl.textContent = label;
    c.appendChild(lbl);
    const grid = document.createElement("div");
    grid.className = "box-model-grid";
    const sides = ["top", "left", "center", "right", "bottom"];
    for (const side of sides) {
      if (side === "center") {
        const div = document.createElement("div");
        div.className = "box-model-center";
        div.textContent = letter;
        grid.appendChild(div);
      } else {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "input input-small";
        inp.style.cssText =
          "width:100%;text-align:center;font-size:10px;padding:2px";
        inp.value = tag.getStyle(prefix + "-" + side);
        inp.placeholder = { top: "↑", left: "←", right: "→", bottom: "↓" }[
          side
        ];
        inp.addEventListener("change", () => {
          tag.setStyle(
            prefix + "-" + side,
            inp.value,
            tag.getStyleImportant(prefix + "-" + side),
          );
          this.markDirty();
          this.renderPreview();
        });
        grid.appendChild(inp);
      }
    }
    // Fill remaining cells for grid layout (3x4)
    for (let i = 0; i < 7; i++) grid.appendChild(document.createElement("div"));
    c.appendChild(grid);
    return c;
  }

  _renderPositionStyles(tag) {
    const c = document.createElement("div");
    c.className = "style-form";
    c.appendChild(
      this._sg(tag, {
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
        c.appendChild(this._sg(tag, p));
    }
    c.appendChild(
      this._sg(tag, {
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
      const r = document.createElement("div");
      r.className = "advanced-style-row";
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
      const il = document.createElement("label");
      il.className = "checkbox-label";
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
      il.appendChild(chk);
      il.appendChild(document.createTextNode("!"));
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
      r.appendChild(inp);
      r.appendChild(il);
      r.appendChild(db);
      c.appendChild(r);
    }
    const ar = document.createElement("div");
    ar.className = "advanced-style-row";
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
    ar.appendChild(ni);
    ar.appendChild(ab);
    c.appendChild(ar);
    return c;
  }

  // ==================== STYLE GROUP ====================
  _sg(tag, config) {
    const g = document.createElement("div");
    g.className = `form-group ${config.small ? "form-group-small" : ""}`;
    const lb = document.createElement("label");
    lb.className = "form-label";
    lb.textContent = config.l || config.label;
    g.appendChild(lb);
    const r = document.createElement("div");
    r.className = "form-row";
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
        const op = document.createElement("option");
        op.value = o;
        op.textContent = o;
        if (o === cv) op.selected = true;
        input.appendChild(op);
      }
    } else if (config.t === "color" && config.sp) {
      const wr = document.createElement("div");
      wr.className = "color-style-row";
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
      wr.appendChild(input);
      wr.appendChild(ti);
      r.appendChild(wr);
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
    } else if (config.t === "range") {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display:flex;gap:4px;align-items:center;flex:1";
      input = document.createElement("input");
      input.type = "range";
      input.style.cssText = "flex:1;height:4px";
      const numVal = parseFloat(cv) || 0;
      input.value = numVal;
      if (config.min !== undefined) input.min = config.min;
      if (config.max !== undefined) input.max = config.max;
      if (config.step !== undefined) input.step = config.step;
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.className = "input input-small";
      textInput.style.width = "60px";
      textInput.value = cv;
      const update = (v) => {
        tag.setStyle(config.k, v, imp);
        this.markDirty();
        this.renderPreview();
      };
      input.addEventListener("input", () => {
        textInput.value = input.value;
        update(input.value + "px");
      });
      textInput.addEventListener("change", () => {
        update(textInput.value);
      });
      wrapper.appendChild(input);
      wrapper.appendChild(textInput);
      r.appendChild(wrapper);
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
    if (input) r.appendChild(input);
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
    r.appendChild(il);
    g.appendChild(r);
    return g;
  }

  // ==================== EDITOR MOUSE ====================
  onEditorMouseDown(e) {
    if (this.activeTool === "move" && this.selectedTagUid) {
      const el = this.els.editorContent.querySelector(
        `[data-uid="${this.selectedTagUid}"]`,
      );
      if (el && el.contains(e.target)) {
        this._isResizing = true;
        const tag = this.currentPage.findTagByUid(this.selectedTagUid);
        if (tag && tag.getStyle("position") !== "absolute") {
          tag.setStyle("position", "absolute");
          const rect = el.getBoundingClientRect();
          const parentRect = this.els.editorContent.getBoundingClientRect();
          tag.setStyle("top", rect.top - parentRect.top + "px");
          tag.setStyle("left", rect.left - parentRect.left + "px");
          this.renderPreview();
        }
        this._resizeStart = { x: e.clientX, y: e.clientY, tag };
        this.els.editorArea.style.cursor = "grabbing";
        return;
      }
    }
    // Visual resize: look for resize handles on selected element
    if (
      this.selectedTagUid &&
      (this.activeTool === "cursor" || this.activeTool === "move")
    ) {
      const target = e.target.closest("[data-uid]");
      if (target && target.dataset.uid === this.selectedTagUid) {
        const rect = target.getBoundingClientRect();
        const edge = 8;
        const onRight = e.clientX > rect.right - edge;
        const onBottom = e.clientY > rect.bottom - edge;
        if (onRight || onBottom) {
          this._isResizing = true;
          this._resizeStart = {
            x: e.clientX,
            y: e.clientY,
            tag: this.currentPage.findTagByUid(this.selectedTagUid),
            w: target.offsetWidth,
            h: target.offsetHeight,
            right: onRight,
            bottom: onBottom,
          };
          e.preventDefault();
        }
      }
    }
  }

  onEditorMouseMove(e) {
    this.handleEditorHover(e);
    if (this._isResizing && this._resizeStart) {
      const rs = this._resizeStart;
      if (rs.tag) {
        if (rs.right !== undefined) {
          // Visual resize
          const dx = e.clientX - rs.x;
          const dy = e.clientY - rs.y;
          if (rs.right)
            rs.tag.setStyle("width", Math.max(20, rs.w + dx) + "px");
          if (rs.bottom)
            rs.tag.setStyle("height", Math.max(20, rs.h + dy) + "px");
          this.markDirty();
          this.renderPreview();
          this.highlightSelectedElement();
        } else {
          // Move tool
          const dx = e.clientX - rs.x;
          const dy = e.clientY - rs.y;
          const top = parseFloat(rs.tag.getStyle("top") || "0");
          const left = parseFloat(rs.tag.getStyle("left") || "0");
          rs.tag.setStyle("top", top + dy + "px");
          rs.tag.setStyle("left", left + dx + "px");
          this._resizeStart.x = e.clientX;
          this._resizeStart.y = e.clientY;
          this.markDirty();
          this.renderPreview();
          this.highlightSelectedElement();
        }
      }
      return;
    }
    // Update resize cursor
    if (this.selectedTagUid && this.els.editorContent) {
      const el = this.els.editorContent.querySelector(
        `[data-uid="${this.selectedTagUid}"]`,
      );
      if (el) {
        const rect = el.getBoundingClientRect();
        const edge = 8;
        const onRight = e.clientX > rect.right - edge;
        const onBottom = e.clientY > rect.bottom - edge;
        if (onRight && onBottom) this.els.editorArea.style.cursor = "se-resize";
        else if (onRight) this.els.editorArea.style.cursor = "e-resize";
        else if (onBottom) this.els.editorArea.style.cursor = "s-resize";
        else
          this.els.editorArea.style.cursor =
            this.activeTool === "move"
              ? "grab"
              : this.activeTool === "select"
                ? "crosshair"
                : "default";
      }
    }
  }

  onEditorMouseUp(e) {
    if (this._isResizing) {
      this._isResizing = false;
      this._resizeStart = null;
      this._saveSnapshot();
      if (this.activeTool === "move") this.els.editorArea.style.cursor = "grab";
    }
  }

  // ==================== CONTEXT MENU ====================
  onContextMenu(e) {
    e.preventDefault();
    const target = e.target.closest("[data-uid]");
    if (!target || target === this.els.editorContent) return;
    this._contextTagUid = target.dataset.uid;

    const menu = this.els.contextMenu;
    menu.innerHTML = "";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    menu.classList.remove("hidden");

    const addChild = document.createElement("button");
    addChild.className = "ctx-item";
    addChild.textContent = "+ Add Child";
    addChild.addEventListener("click", () => {
      const tag = this.currentPage.findTagByUid(this._contextTagUid);
      if (tag) this._showAddChildModal(tag, false);
      this.hideContextMenu();
    });
    menu.appendChild(addChild);

    const edit = document.createElement("button");
    edit.className = "ctx-item";
    edit.textContent = "✏️ Edit";
    edit.addEventListener("click", () => {
      this.selectedTagUid = this._contextTagUid;
      this.showElementEditor = true;
      this.currentPageTab = "element";
      this.hideContextMenu();
      this.refreshUI();
      this.renderPreview();
    });
    menu.appendChild(edit);

    const duplicate = document.createElement("button");
    duplicate.className = "ctx-item";
    duplicate.textContent = "⧉ Duplicate";
    duplicate.addEventListener("click", () => {
      const page = this.currentPage;
      const tag = this.currentPage.findTagByUid(this._contextTagUid);
      if (tag) {
        this._saveSnapshot();
        const c = tag.duplicate();
        this._insertAfterTag(this._contextTagUid, c);
        this.markDirty();
        this.renderPreview();
        this.refreshUI();
      }
      this.hideContextMenu();
    });
    menu.appendChild(duplicate);

    const del = document.createElement("button");
    del.className = "ctx-item ctx-danger";
    del.textContent = "✕ Delete";
    del.addEventListener("click", () => {
      this.selectedTagUid = this._contextTagUid;
      this._deleteSelectedElement();
      this.hideContextMenu();
    });
    menu.appendChild(del);

    // Position menu within viewport
    const mr = menu.getBoundingClientRect();
    if (mr.right > window.innerWidth)
      menu.style.left = window.innerWidth - mr.width - 10 + "px";
    if (mr.bottom > window.innerHeight)
      menu.style.top = window.innerHeight - mr.height - 10 + "px";
  }

  // ==================== DELETE / INSERT HELPERS ====================
  _deleteSelectedElement() {
    if (!this.selectedTagUid || !this.currentPage) return;
    const page = this.currentPage;
    for (let i = 0; i < page.body.length; i++) {
      if (page.body[i]._uid === this.selectedTagUid) {
        this._saveSnapshot();
        page.body.splice(i, 1);
        this.selectedTagUid = null;
        this.showElementEditor = false;
        this.markDirty();
        this.renderPreview();
        this.refreshUI();
        return;
      }
      if (this._deleteFromTree(page.body[i], this.selectedTagUid)) {
        this._saveSnapshot();
        this.selectedTagUid = null;
        this.showElementEditor = false;
        this.markDirty();
        this.renderPreview();
        this.refreshUI();
        return;
      }
    }
  }
  _deleteFromTree(p, uid) {
    for (let i = 0; i < p.children.length; i++) {
      if (p.children[i]._uid === uid) {
        p.children.splice(i, 1);
        return true;
      }
      if (this._deleteFromTree(p.children[i], uid)) return true;
    }
    return false;
  }
  _insertAfterTag(uid, nt) {
    for (const bt of this.currentPage.body) {
      if (this._insertAfterTagInTree(bt, uid, nt)) return;
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

  // ==================== PREVIEW ====================
  renderPreview() {
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
    if (!this.els.editorContent || !this.els.editorArea || this.viewMode) {
      if (this.els.selectedHighlight)
        this.els.selectedHighlight.style.display = "none";
      return;
    }
    if (this.selectedTagUid) {
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
        // Show resize handles on selected element
        if (this.els.resizeHighlight) {
          this.els.resizeHighlight.style.display = "block";
          this.els.resizeHighlight.style.left = `${rect.right - er.left - 12}px`;
          this.els.resizeHighlight.style.top = `${rect.bottom - er.top - 12}px`;
        }
      } else {
        this.els.selectedHighlight.style.display = "none";
      }
    } else {
      this.els.selectedHighlight.style.display = "none";
      if (this.els.resizeHighlight)
        this.els.resizeHighlight.classList.add("hidden");
    }
  }

  // ==================== EDITOR HOVER/CLICK ====================
  handleEditorHover(e) {
    if (this._isResizing) return;
    if (this.activeTool !== "select" || this.viewMode) {
      this.els.hoverHighlight.style.display = "none";
      return;
    }
    const target = e.target.closest("[data-uid]");
    if (
      !target ||
      target === this.els.editorContent ||
      (target.closest("#body") === null && target !== this.els.editorContent)
    ) {
      this.els.hoverHighlight.style.display = "none";
      return;
    }
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
  _rerender(c, fn) {
    c.innerHTML = "";
    fn(c);
  }
  _tab(id, label, active) {
    const t = document.createElement("button");
    t.className = `tab ${active ? "active" : ""}`;
    t.dataset.tab = id;
    t.textContent = label;
    return t;
  }

  _fg(label, type, value, onChange, opts = {}) {
    const g = document.createElement("div");
    g.className = `form-group ${opts.small ? "form-group-small" : ""}`;
    const l = document.createElement("label");
    l.className = "form-label";
    l.textContent = label;
    g.appendChild(l);
    const i = document.createElement("input");
    i.type = type;
    i.className = "input";
    i.value = value || "";
    i.addEventListener("change", () => onChange(i.value));
    i.addEventListener("input", () => {
      if (type === "text" || type === "number") onChange(i.value);
    });
    g.appendChild(i);
    return g;
  }

  _collapsible(title, startOpen, renderFn) {
    const s = document.createElement("div");
    s.className = "collapsible-section";
    const h = document.createElement("div");
    h.className = "collapsible-header";
    h.innerHTML = `<span class="collapse-icon">${startOpen ? "▼" : "▶"}</span> ${title}`;
    h.addEventListener("click", (e) => {
      e.stopPropagation();
      const c = s.querySelector(".collapsible-content");
      const ic = h.querySelector(".collapse-icon");
      if (c.style.display === "none") {
        c.style.display = "block";
        ic.textContent = "▼";
      } else {
        c.style.display = "none";
        ic.textContent = "▶";
      }
    });
    s.appendChild(h);
    const c = document.createElement("div");
    c.className = "collapsible-content";
    c.style.display = startOpen ? "block" : "none";
    const inner = renderFn();
    if (inner) c.appendChild(inner);
    s.appendChild(c);
    return s;
  }

  _showModalContent(html) {
    this.els.modalContent.innerHTML = html;
    this.els.modalOverlay.classList.remove("hidden");
  }
  showModal(html) {
    this.els.modalContent.innerHTML = html;
    this.els.modalOverlay.classList.remove("hidden");
  }
  closeModal() {
    this.els.modalOverlay.classList.add("hidden");
  }

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
