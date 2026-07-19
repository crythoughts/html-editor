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
import {
  canUndo, canRedo, undo as histUndo, redo as histRedo,
} from './history.js';
import {
  getProjectById, getProjects, saveProjects, restoreInstance,
} from './storage.js';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Mount point #app not found in the document.');
}

const toolbar = document.getElementById('toolbar');

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

/** Refresh toolbar button states based on current route and history. */
function updateToolbar() {
  const { pid } = parseRoute();
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
  app.innerHTML = '';
  app.appendChild(view.render());
});

// Keep toolbar in sync after every route change
const origResolve = router.resolve.bind(router);
router.resolve = function () {
  origResolve();
  updateToolbar();
};
window.addEventListener('hashchange', updateToolbar);

// Resolve the initial route
router.resolve();
