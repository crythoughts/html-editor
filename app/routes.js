import ProjectListPage from './pages/ProjectListPage.js';
import ProjectPage from './pages/ProjectPage.js';
import ProjectEditPage from './pages/ProjectEditPage.js';

const routes = [
    { path: '/',                   component: ProjectListPage },
    { path: '/project/:id',        component: ProjectEditPage },
    { path: '/project/:id',        component: ProjectPage },
    { path: '/project/:id/edit',   component: ProjectEditPage },
];

export default routes;
