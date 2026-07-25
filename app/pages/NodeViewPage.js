import { findProject, findPage, findNode, removeNode, loadProjects, saveProjects } from '../db.js';
import NodeEditPage from './NodeEditPage.js';

/**
 * Recursively render a node tree as nested cards with indentation.
 */
function renderTree(projectId, pageId, nodes, depth = 0) {
    if (!nodes.length) return '';
    const pad = depth * 14;
    return nodes.map(n => `
        <div class="tree-node" style="padding-left:${pad}px;">
            <a href="#editor/project/${projectId}/page/${pageId}/node/${n.id}"
               class="node-card-link" data-node-id="${n.id}">
                <span class="node-tag">&lt;${n.tagName}&gt;</span>
                <span class="node-preview">${(n.textContent || '').slice(0, 40)}</span>
                <span class="node-meta">
                    ${n.items.length} child · ${Object.keys(n.attrs).length} attr
                </span>
                <span class="node-id">${n.id.slice(0, 10)}…</span>
            </a>
        </div>
        ${renderTree(projectId, pageId, n.items, depth + 1)}
    `).join('');
}

/**
 * Страница просмотра Node.
 *
 * Маршрут: /project/:projectId/page/:pageId/node/:nodeId
 *
 * В embed-режиме — только свойства, без дерева детей.
 */
class NodeViewPage {
    constructor() {
        this._overlay = null;
        this._overlayContent = null;
        this._editComponent = null;
    }

    render(container, { params, router, embed }) {
        const project = findProject(params.projectId);
        const page = project ? findPage(project, params.pageId) : null;
        const found = page ? findNode(page, params.nodeId) : null;

        if (!project || !page || !found) {
            container.innerHTML = `
                <div class="node-view">
                    <p style="color:#888;font-size:13px;">Node not found.</p>
                    ${embed ? '' : `<a href="#editor/project/${params.projectId}/page/${params.pageId}" class="back-link" style="color:#4a9eff;">← Page</a>`}
                </div>
            `;
            return;
        }

        const { node } = found;
        const isEmbed = embed === true;

        const attrsHtml = Object.keys(node.attrs).length === 0
            ? '<span class="empty-nodes">No attributes</span>'
            : Object.entries(node.attrs).map(([k, v]) =>
                `<div class="attr-row"><span class="attr-key">${k}</span>="<span class="attr-val">${v}</span>"</div>`
            ).join('');

        const stylesHtml = Object.keys(node.styles).length === 0
            ? '<span class="empty-nodes">No styles</span>'
            : Object.entries(node.styles).map(([k, v]) =>
                `<div class="attr-row"><span class="attr-key">${k}</span>: <span class="attr-val">${v}</span></div>`
            ).join('');

        // Children tree (only in standalone mode)
        const treeHtml = isEmbed ? '' : `
            <div class="props-section">
                <h3 class="subtitle">Children (${node.items.length})</h3>
                <div class="tree-list">
                    ${renderTree(project.id, page.id, node.items)}
                    ${node.items.length === 0 ? '<p class="empty-nodes">No child nodes.</p>' : ''}
                </div>
            </div>
        `;

        const backHtml = isEmbed ? '' : `
            <div class="toolbar-line">
                <a href="#editor/project/${project.id}/page/${page.id}" class="back-link" style="color:#4a9eff;">← Page</a>
            </div>
        `;

        container.innerHTML = `
            <div class="node-view">
                ${backHtml}

                <h2>&lt;${node.tagName}&gt;</h2>
                <p class="meta">
                    Node ID: ${node.id} · Type: ${node.type}
                    ${node.parent ? '' : ''}
                </p>

                <div class="props-section">
                    <h3 class="subtitle">Properties</h3>
                    <div class="prop-row"><span class="prop-label">Tag</span><span class="prop-value">${node.tagName}</span></div>
                    <div class="prop-row"><span class="prop-label">Type</span><span class="prop-value">${node.type}</span></div>
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
                    <h3 class="subtitle">Styles (${Object.keys(node.styles).length})</h3>
                    <div class="attrs-list">${stylesHtml}</div>
                </div>

                ${treeHtml}

                <div class="form-actions" style="margin-top:12px;display:flex;gap:8px;">
                    <button class="btn-save" id="nv-btn-edit" style="background:#4a9eff;color:#fff;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        ✎ Edit node
                    </button>
                    <button class="btn-danger" id="nv-btn-delete" style="background:#c04040;color:#fff;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        Delete
                    </button>
                </div>
            </div>
        `;

        // ── Edit button → overlay ──────────────────

        container.querySelector('#nv-btn-edit').addEventListener('click', () => {
            if (isEmbed) {
                // In embed mode, delegate to the parent
                const ev = new CustomEvent('node-edit', {
                    bubbles: true,
                    detail: { projectId: project.id, pageId: page.id, nodeId: node.id },
                });
                container.dispatchEvent(ev);
            } else {
                this._openEditOverlay(container, project.id, page.id, node.id, router);
            }
        });

        // ── Delete button ──────────────────────────

        container.querySelector('#nv-btn-delete').addEventListener('click', (e) => {
            if (!(e.shiftKey || confirm('Delete this node and all its children?'))) return;

            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            const pg = p ? p.pages.find(x => x.id === page.id) : null;
            if (!pg) return;

            removeNode(pg, node.id);
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            if (isEmbed) {
                const ev = new CustomEvent('node-delete', {
                    bubbles: true,
                    detail: {},
                });
                container.dispatchEvent(ev);
            } else {
                router.navigate(`/project/${project.id}/page/${page.id}`);
            }
        });
    }

    /* ── overlay for standalone mode ──────────────── */

    _openEditOverlay(container, projectId, pageId, nodeId, router) {
        let overlay = container.querySelector('.nv-overlay');
        let overlayContent;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'overlay nv-overlay';
            overlay.style.display = 'none';
            overlayContent = document.createElement('div');
            overlayContent.className = 'overlay-content';
            overlay.appendChild(overlayContent);
            container.appendChild(overlay);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._closeEditOverlay();
            });
        } else {
            overlayContent = overlay.querySelector('.overlay-content');
        }

        overlayContent.innerHTML = '';
        overlay.style.display = 'flex';

        this._editComponent = new NodeEditPage();
        this._editComponent.render(overlayContent, {
            params: { id: projectId, pageId, nodeId },
            router,
            modal: true,
            onClose: () => this._closeEditOverlay(container),
        });

        this._overlay = overlay;
    }

    _closeEditOverlay(container) {
        if (this._editComponent) {
            try { this._editComponent.destroy(); } catch (_) {}
            this._editComponent = null;
        }
        if (this._overlay) this._overlay.style.display = 'none';
    }

    /* ── lifecycle ────────────────────────────────── */

    destroy() {
        this._closeEditOverlay();
    }
}

export default NodeViewPage;
