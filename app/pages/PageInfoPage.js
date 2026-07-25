import { findProject, findPage, fmtTime } from '../db.js';

/**
 * Страница с информацией о Page и списком её корневых Node.
 * Маршрут: /project/:projectId/page/:pageId
 */
class PageInfoPage {
    render(container, { params, router }) {
        const project = findProject(params.projectId);
        const page = project ? findPage(project, params.pageId) : null;

        if (!project || !page) {
            container.innerHTML = `
                <div class="page-info">
                    <p style="color:#888;font-size:13px;">Page not found.</p>
                    <a href="#editor/project/${params.projectId}" class="back-link" style="color:#4a9eff;">← Project</a>
                </div>
            `;
            return;
        }

        const renderItems = (items, level = 0) => {
            if (!items.length) return '<p class="empty-nodes">No nodes yet.</p>';
            return items.map(n => `
                <div class="node-card" style="margin-left:${level * 16}px;">
                    <a href="#editor/project/${project.id}/page/${page.id}/node/${n.id}" class="node-card-link">
                        <span class="node-tag">&lt;${n.tagName}&gt;</span>
                        <span class="node-preview">${(n.textContent || '').slice(0, 40)}</span>
                        <span class="node-meta">
                            ${n.items.length} child · ${Object.keys(n.attrs).length} attr
                        </span>
                        <span class="node-id">${n.id.slice(0, 12)}…</span>
                    </a>
                </div>
            `).join('');
        };

        container.innerHTML = `
            <div class="page-info">
                <div class="toolbar-line">
                    <a href="#editor/project/${project.id}" class="back-link" style="color:#4a9eff;">← Project</a>
                </div>

                <h2>${page.title}</h2>
                <p class="meta">Page #${page.id} · ${page.items.length} root node(s)</p>

                <h3 class="subtitle">Root Nodes</h3>
                <div class="node-list">
                    ${renderItems(page.items)}
                </div>

                <button class="btn-preview" id="btn-render-preview">▶ Render preview</button>
            </div>
        `;

        container.querySelector('#btn-render-preview').addEventListener('click', () => {
            const url = `render.html?project_id=${project.id}&page_id=${page.id}`;
            window.open(url, '_blank');
        });
    }

    destroy() {}
}

export default PageInfoPage;
