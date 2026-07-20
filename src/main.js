/**
 * main.js — application entry point.
 *
 * Sets up the hash router and mounts views into the #app container.
 * All models are imported here so their registerType() side-effects fire.
 */
import './models/Project.js';
import './models/Page.js';
import './models/Node.js';
import './models/Variable.js';
import './models/Component.js';
import './models/Color.js';
import './models/Palette.js';
import './models/MetaTag.js';
import './models/LinkTag.js';
import './models/Head.js';

import { Router } from './router.js';
import { ProjectListView } from './views/ProjectListView.js';
import { ProjectCreateView } from './views/ProjectCreateView.js';
import { ProjectImportView } from './views/ProjectImportView.js';
import { ProjectDetailView } from './views/ProjectDetailView.js';
import { ProjectExportJsonView } from './views/ProjectExportJsonView.js';
import { ProjectImportHtmlView } from './views/ProjectImportHtmlView.js';
import { PageDetailView } from './views/PageDetailView.js';
import { PageExportHtmlView } from './views/PageExportHtmlView.js';
import { NodeDetailView } from './views/NodeDetailView.js';
import { NodeCreateView } from './views/NodeCreateView.js';
import { NodeEditView } from './views/NodeEditView.js';
import { NodeStylesView } from './views/NodeStylesView.js';
import { NodeIdView } from './views/NodeIdView.js';
import { NodeClassesView } from './views/NodeClassesView.js';
import { ComponentListView } from './views/ComponentListView.js';
import { ComponentCreateView } from './views/ComponentCreateView.js';
import { ComponentDetailView } from './views/ComponentDetailView.js';
import { ComponentEditView } from './views/ComponentEditView.js';
import { PaletteListView } from './views/PaletteListView.js';
import { PaletteCreateView } from './views/PaletteCreateView.js';
import { PaletteEditView } from './views/PaletteEditView.js';
import { HeadView } from './views/HeadView.js';
import { RenderView } from './views/RenderView.js';
import { PageEditor } from './PageEditor.js';
import { Dialog } from './dialogs.js';
import { presets } from './presets/index.js';
import { collectSettings } from './presets/Preset.js';
import {
  canUndo, canRedo, undo as histUndo, redo as histRedo,
} from './history.js';
import {
  getProjectById, getProjects, saveProjects, saveProject, restoreInstance,
} from './storage.js';

const app = document.getElementById('app');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const renderRoot = document.getElementById('render-root');
const toolbar = document.getElementById('toolbar');

if (!app) throw new Error('Mount point #app not found.');

// ---------------------------------------------------------------------------
// Preset dialog
// ---------------------------------------------------------------------------

const dialog = new Dialog();

function getContext() {
  // Parse current hash and return { ctx, project, pid }
  // ctx = the currently open node, or the page itself if no node is open.
  const { pid, pg } = parseRoute();
  if (pid == null || pg == null) return null;
  const project = getProjectById(pid);
  if (!project) return null;
  const page = project.pages[pg];
  if (!page) return null;

  const m = window.location.hash.match(/\/node\/([^/]+)/);
  const ctx = m
    ? (page.findNodeById(m[1].split(',')[0]) || page)
    : page;
  return { ctx, project, pid };
}

function applyPreset(preset) {
  const win = preset.getSettingsWindow();

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    const settings = collectSettings(win);
    const context = getContext();
    if (!context) return;
    const newNode = preset.getTemplate(context.ctx, settings);
    saveProject(context.pid, context.project);
    dialog.hide();
    if (newNode && newNode.id) {
      const { pg } = parseRoute();
      if (pg != null) {
        const hash = `/project/${context.pid}/${pg}/node/${newNode.id}`;
        window.location.hash = hash;
      }
    }
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => dialog.hide());

  const footer = document.createElement('div');
  footer.style.marginTop = '12px';
  footer.appendChild(saveBtn);
  footer.appendChild(cancelBtn);
  win.appendChild(footer);

  dialog.show(win);
}

/** Apply a preset to a specific target node (used from context menu). */
function applyPresetTo(preset, target, pid, project) {
  const win = preset.getSettingsWindow();
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    const settings = collectSettings(win);
    preset.getTemplate(target, settings);
    saveProject(pid, project);
    dialog.hide();
  });
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => dialog.hide());
  const footer = document.createElement('div');
  footer.style.marginTop = '12px';
  footer.appendChild(saveBtn);
  footer.appendChild(cancelBtn);
  win.appendChild(footer);
  dialog.show(win);
}

function showPresetList() {
  const wrapper = document.createElement('div');

  const h = document.createElement('h2');
  h.textContent = 'Presets';
  wrapper.appendChild(h);

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.textContent = p.name;
    btn.style.cssText = 'padding:8px 12px; text-align:left;';
    btn.addEventListener('click', () => applyPreset(p));
    list.appendChild(btn);
  });

  wrapper.appendChild(list);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cancel';
  closeBtn.addEventListener('click', () => dialog.hide());
  wrapper.appendChild(closeBtn);

  dialog.show(wrapper);
}

const presetAddBtn = document.getElementById('preset-add');
if (presetAddBtn) {
  presetAddBtn.addEventListener('click', showPresetList);
}

// ---------------------------------------------------------------------------
// Preview — live right-side render that updates on every save
// ---------------------------------------------------------------------------

function updatePreview() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  if (hash.startsWith('/render/')) return; // full-screen render, no side preview
  const { pid, pg } = parseRoute();
  if (pid == null) { preview.innerHTML = ''; return; }
  const project = getProjectById(pid);
  const pageId = pg ?? 0;
  if (!project || !project.pages[pageId]) { preview.innerHTML = ''; return; }
  const view = new RenderView(pid, pageId);
  preview.innerHTML = '';
  const el = view.render();
  while (el.firstChild) preview.appendChild(el.firstChild);
}

window.addEventListener('project-saved', updatePreview);

// ---------------------------------------------------------------------------
// Page Editor — mode & selection
// ---------------------------------------------------------------------------
const _ctxHandler = (nodeId, presetName) => {
  const { pid, pg } = parseRoute();
  if (pid == null || pg == null) return;
  const project = getProjectById(pid);
  if (!project) return;
  const page = project.pages[pg];
  if (!page) return;
  const target = page.findNodeById(nodeId) || page;
  const p = presets.find(pr => pr.name === presetName);
  if (!p) return;
  // Show settings dialog then apply
  applyPresetTo(p, target, pid, project);
};

const pageEditor = new PageEditor(
  preview,
  // onNavigate: open node settings for selected nodes
  (nodeIds) => {
    const { pid, pg } = parseRoute();
    if (pid != null && pg != null) {
      window.location.hash = `/project/${pid}/${pg}/node/${nodeIds}`;
    }
  },
  // onSaveStyles: persist transform changes to the data model
  (nodeId, styles) => {
    const { pid, pg } = parseRoute();
    if (pid == null || pg == null) return;
    const project = getProjectById(pid);
    if (!project) return;
    const page = project.pages[pg];
    if (!page) return;
    const node = page.findNodeById(nodeId);
    if (!node) return;
    for (const [prop, val] of Object.entries(styles)) {
      node.styles[prop] = val;
    }
    saveProject(pid, project);
  },
  // onContextPreset
  _ctxHandler,
  // onEditText: save inline text edits
  (nodeId, text) => {
    const { pid, pg } = parseRoute();
    if (pid == null || pg == null) return;
    const project = getProjectById(pid);
    if (!project) return;
    const page = project.pages[pg];
    if (!page) return;
    const node = page.findNodeById(nodeId);
    if (!node) return;
    node.attrs.textContent = text;
    saveProject(pid, project);
  },
);

window.addEventListener('editor-context', (e) => {
  const { nodeId, x, y } = e.detail;
  const menuPresets = presets.map(p => ({ name: p.name }));
  pageEditor.showCtxMenu(nodeId, menuPresets, x, y);
});

const toolCursor = document.getElementById('tool-cursor');
const toolInfo = document.getElementById('tool-info');
const toolSelect = document.getElementById('tool-select');
const toolTransform = document.getElementById('tool-transform');
const toolText = document.getElementById('tool-text');

function setToolMode(mode) {
  pageEditor.setMode(mode);
}

[toolCursor, toolInfo, toolSelect, toolTransform, toolText].forEach((btn) => {
  if (btn) btn.disabled = false;
});

if (toolCursor) {
  toolCursor.addEventListener('click', () => setToolMode('cursor'));
}
if (toolInfo) {
  toolInfo.addEventListener('click', () => setToolMode('selection'));
}
if (toolSelect) {
  toolSelect.addEventListener('click', () => setToolMode('selection'));
}
if (toolTransform) {
  toolTransform.addEventListener('click', () => setToolMode('transform'));
}
if (toolText) {
  toolText.addEventListener('click', () => setToolMode('text'));
}

// Default to cursor mode
setToolMode('cursor');

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

const undoBtn = document.createElement('button');
undoBtn.textContent = 'Undo';
undoBtn.title = 'Undo (Ctrl+Z)';
undoBtn.disabled = true;

const redoBtn = document.createElement('button');
redoBtn.textContent = 'Redo';
redoBtn.title = 'Redo (Ctrl+Shift+Z)';
redoBtn.disabled = true;

const saveBtn = document.createElement('button');
saveBtn.textContent = 'Save';

const renderBtn = document.createElement('button');
renderBtn.textContent = 'Render';
renderBtn.style.display = 'none';

if (toolbar) {
  toolbar.appendChild(undoBtn);
  toolbar.appendChild(redoBtn);
  toolbar.appendChild(saveBtn);
  toolbar.appendChild(renderBtn);
}

/** Extract projectId and pageId from the current hash. */
function parseRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const m1 = hash.match(/^\/project\/(\d+)(?:\/(\d+))?/);
  const m2 = hash.match(/^\/render\/(\d+)\/(\d+)/);
  const pid = m1 ? parseInt(m1[1], 10) : (m2 ? parseInt(m2[1], 10) : null);
  const pg = m1 && m1[2] ? parseInt(m1[2], 10) : (m2 ? parseInt(m2[2], 10) : null);
  return { pid, pg };
}

/** Refresh toolbar button states and layout visibility based on route. */
function updateToolbar() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const isRender = hash.startsWith('/render/');
  const { pid } = parseRoute();

  // Toggle layout containers
  if (toolbar) toolbar.style.display = isRender ? 'none' : 'flex';
  if (editor) editor.style.display = isRender ? 'none' : 'flex';
  if (renderRoot) renderRoot.style.display = isRender ? 'block' : 'none';

  undoBtn.disabled = pid == null || !canUndo(pid);
  redoBtn.disabled = pid == null || !canRedo(pid);
  renderBtn.style.display = pid != null ? 'inline' : 'none';
}

undoBtn.addEventListener('click', () => {
  const { pid } = parseRoute();
  if (pid == null || !canUndo(pid)) return;
  const snap = histUndo(pid);
  if (snap) {
    const projects = getProjects();
    projects[pid] = restoreInstance(snap);
    saveProjects(projects);
    router.resolve();
  }
  updateToolbar();
});

redoBtn.addEventListener('click', () => {
  const { pid } = parseRoute();
  if (pid == null || !canRedo(pid)) return;
  const snap = histRedo(pid);
  if (snap) {
    const projects = getProjects();
    projects[pid] = restoreInstance(snap);
    saveProjects(projects);
    router.resolve();
  }
  updateToolbar();
});

saveBtn.addEventListener('click', () => {
  saveBtn.textContent = 'Saved!';
  setTimeout(() => { saveBtn.textContent = 'Save'; }, 1500);
});

renderBtn.addEventListener('click', () => {
  const { pid, pg } = parseRoute();
  if (pid != null && pg != null) {
    const url = `${window.location.origin}${window.location.pathname}#/render/${pid}/${pg}`;
    window.open(url, '_blank');
  }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undoBtn.click();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
    e.preventDefault();
    redoBtn.click();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveBtn.click();
  }
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = new Router();

router.add('/', (params) => {
  const view = new ProjectListView(router);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/create', (params) => {
  const view = new ProjectCreateView(router);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/import', (params) => {
  const view = new ProjectImportView(router);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:id', (params) => {
  const view = new ProjectDetailView(router, params.id);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// Literal route must be registered BEFORE the parameterised :pageId route
// (both have 3 segments, so order decides which matches first).
router.add('/project/:pid/export-json', (params) => {
  const view = new ProjectExportJsonView(router, params.pid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/import-html', (params) => {
  const view = new ProjectImportHtmlView(router, params.pid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// --- Component routes ---
router.add('/project/:pid/components', (params) => {
  const view = new ComponentListView(router, params.pid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// Literal must come before :cid (same segment count)
router.add('/project/:pid/components/create', (params) => {
  const view = new ComponentCreateView(router, params.pid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid', (params) => {
  const view = new ComponentDetailView(router, params.pid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid/edit', (params) => {
  const view = new ComponentEditView(router, params.pid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// --- Palette routes ---
router.add('/project/:pid/palettes', (params) => {
  const view = new PaletteListView(router, params.pid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/palettes/create', (params) => {
  const view = new PaletteCreateView(router, params.pid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/palettes/:palId', (params) => {
  const view = new PaletteEditView(router, params.pid, params.palId);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// --- Head route ---
router.add('/project/:pid/head', (params) => {
  const view = new HeadView(router, params.pid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// Component node routes (create before :nid — same segment count)
router.add('/project/:pid/components/:cid/node/create', (params) => {
  const view = new NodeCreateView(router, params.pid, null, null, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid/node/:nid/create', (params) => {
  const view = new NodeCreateView(router, params.pid, null, params.nid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid/node/:nid/edit', (params) => {
  const view = new NodeEditView(router, params.pid, null, params.nid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid/node/:nid/edit/styles', (params) => {
  const view = new NodeStylesView(router, params.pid, null, params.nid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid/node/:nid/edit/id', (params) => {
  const view = new NodeIdView(router, params.pid, null, params.nid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid/node/:nid/edit/classes', (params) => {
  const view = new NodeClassesView(router, params.pid, null, params.nid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/components/:cid/node/:nid', (params) => {
  const view = new NodeDetailView(router, params.pid, null, params.nid, params.cid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId', (params) => {
  const view = new PageDetailView(router, params.pid, params.pageId);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId/export-html', (params) => {
  const view = new PageExportHtmlView(router, params.pid, params.pageId);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// IMPORTANT: literal routes (create, edit) must be registered BEFORE
// the parameterised :nid route so they match first.

router.add('/project/:pid/:pageId/node/create', (params) => {
  const view = new NodeCreateView(router, params.pid, params.pageId);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId/node/:nid/create', (params) => {
  const view = new NodeCreateView(router, params.pid, params.pageId, params.nid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId/node/:nid/edit', (params) => {
  const view = new NodeEditView(router, params.pid, params.pageId, params.nid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId/node/:nid/edit/styles', (params) => {
  const view = new NodeStylesView(router, params.pid, params.pageId, params.nid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId/node/:nid/edit/id', (params) => {
  const view = new NodeIdView(router, params.pid, params.pageId, params.nid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId/node/:nid/edit/classes', (params) => {
  const view = new NodeClassesView(router, params.pid, params.pageId, params.nid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/project/:pid/:pageId/node/:nid', (params) => {
  const view = new NodeDetailView(router, params.pid, params.pageId, params.nid);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/render/:pid/:pageId', (params) => {
  const view = new RenderView(params.pid, params.pageId);
  renderRoot.innerHTML = '';
  renderRoot.appendChild(view.render());

  setTimeout(() => { document.getElementById("editable-side").style.display = "none"; }, 1)
});

// Keep toolbar in sync after every route change
const origResolve = router.resolve.bind(router);
router.resolve = function () {
  origResolve();
  updateToolbar();
  updatePreview();
};
window.addEventListener('hashchange', updateToolbar);

// Resolve the initial route
router.resolve();
