import { findProject, findPage, findNode } from '../db.js';

/**
 * Страница просмотра Node — свойства и вложенные ноды.
 * Маршрут: /project/:projectId/page/:pageId/node/:nodeId
 */
class NodeViewPage {
    render(container, { params, router }) {
        const project = findProject(params.projectId);
        const page = project ? findPage(project, params.pageId) : null;
        const found = page ? findNode(page, params.nodeId) : null;

        if (!project || !page || !found) {
            container.innerHTML = `
                <div class="node-view">
                    <p style="color:#888;font-size:13px;">Node not found.</p>
                    <a href="#editor/project/${params.projectId}/page/${params.pageId}" class="back-link" style="color:#4a9eff;">← Page</a>
                </div>
            `;
            return;
        }

        const { node, parent } = found;

        const attrsHtml = Object.keys(node.attrs).length === 0
            ? '<span class="empty-nodes">No attributes</span>'
            : Object.entries(node.attrs).map(([k, v]) =>
                `<div class="attr-row"><span class="attr-key">${k}</span>="<span class="attr-val">${v}</span>"</div>`
            ).join('');

        const childrenHtml = node.items.length === 0
            ? '<p class="empty-nodes">No child nodes.</p>'
            : node.items.map(child => `
                <div class="node-card">
                    <a href="#editor/project/${project.id}/page/${page.id}/node/${child.id}" class="node-card-link">
                        <span class="node-tag">&lt;${child.tagName}&gt;</span>
                        <span class="node-preview">${(child.textContent || '').slice(0, 40)}</span>
                        <span class="node-meta">
                            ${child.items.length} child · ${Object.keys(child.attrs).length} attr
                        </span>
                        <span class="node-id">${child.id.slice(0, 12)}…</span>
                    </a>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="node-view">
                <div class="toolbar-line">
                    <a href="#editor/project/${project.id}/page/${page.id}" class="back-link" style="color:#4a9eff;">← Page</a>
                </div>

                <h2>&lt;${node.tagName}&gt;</h2>
                <p class="meta">Node ID: ${node.id}</p>

                <div class="props-section">
                    <h3 class="subtitle">Properties</h3>
                    <div class="prop-row"><span class="prop-label">Tag</span><span class="prop-value">${node.tagName}</span></div>
                    <div class="prop-row">
                        <span class="prop-label">innerHTML</span>
                        <span class="prop-value">${node.textContent || '(empty)'}</span>
                    </div>
                </div>

                <div class="props-section">
                    <h3 class="subtitle">Attributes (${Object.keys(node.attrs).length})</h3>
                    <div class="attrs-list">${attrsHtml}</div>
                </div>

                <div class="props-section">
                    <h3 class="subtitle">Children (${node.items.length})</h3>
                    <div class="node-list">${childrenHtml}</div>
                </div>

                <div class="form-actions" style="margin-top:12px;">
                    <a href="#editor/project/${project.id}/page/${page.id}/node/${node.id}/edit" class="btn-save" style="background:#4a9eff;color:#fff;text-decoration:none;display:inline-block;">
                        ✎ Edit node
                    </a>
                </div>
            </div>
        `;
    }

    destroy() {}
}

export default NodeViewPage;
