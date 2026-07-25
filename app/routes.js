import ProjectListPage from './pages/ProjectListPage.js';
import ProjectPage from './pages/ProjectPage.js';
import ProjectEditPage from './pages/ProjectEditPage.js';
import PageEditPage from './pages/PageEditPage.js';
import PageInfoPage from './pages/PageInfoPage.js';
import NodeViewPage from './pages/NodeViewPage.js';
import NodeEditPage from './pages/NodeEditPage.js';

const routes = [
    { path: '/',                                        component: ProjectListPage },
    { path: '/project/new',                             component: ProjectEditPage },
    { path: '/project/:id',                             component: ProjectPage },
    { path: '/project/:id/edit',                        component: ProjectEditPage },
    { path: '/project/:projectId/page/:pageId',          component: PageInfoPage },
    { path: '/project/:projectId/page/:pageId/node/:nodeId',     component: NodeViewPage },
    { path: '/project/:projectId/page/:pageId/node/:nodeId/edit', component: NodeEditPage },
];

export default routes;
