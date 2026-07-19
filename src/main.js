/**
 * main.js — application entry point.
 *
 * Sets up the hash router and mounts views into the #app container.
 * All models are imported here so their registerType() side-effects fire.
 */
import './models/Project.js';
import './models/Page.js';
import './models/Node.js';

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
import { RenderView } from './views/RenderView.js';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Mount point #app not found in the document.');
}

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

// Resolve the initial route
router.resolve();
