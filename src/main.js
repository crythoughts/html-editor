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
import { ProjectDetailView } from './views/ProjectDetailView.js';
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

router.add('/project/:id', (params) => {
  const view = new ProjectDetailView(router, params.id);
  app.innerHTML = '';
  app.appendChild(view.render());
});

router.add('/render/:id', (params) => {
  const view = new RenderView(params.id);
  app.innerHTML = '';
  app.appendChild(view.render());
});

// Resolve the initial route
router.resolve();
