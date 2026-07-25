import { findProject, findPage, findNode, moveNode, removeNode, loadProjects, saveProjects } from '../db.js';
import NodeViewPage from './NodeViewPage.js';
import NodeEditPage from './NodeEditPage.js';
import PageEditPage from './PageEditPage.js';
import CreateNodePage from './CreateNodePage.js';

/**
 * Recursively render a node tree as nested cards with indentation.
 */
function renderTree(projectId, pageId, nodes, selectedId, depth = 0) {
    if (!nodes.length) return '';
    const pad = depth * 14;
    return nodes.map(n => `
        <div class="tree-node" data-node-id="${n.id}" style="padding-left:${pad}px;">
            <a href="#editor/project/${projectId}/page/${pageId}/node/${n.id}"
               class="node-card-link ${n.id === selectedId ? 'selected' : ''}"
               draggable="true"
               data-node-id="${n.id}">
                <span class="node-drag-handle">⠿</span>
                <span class="node-tag">&lt;${n.tagName}&gt;</span>
                <span class="node-preview">${(n.textContent || '').slice(0, 40)}</span>
                <span class="node-meta">
                    ${n.items.length} child · ${Object.keys(n.attrs).length} attr
                </span>
                <span class="node-id">${n.id.slice(0, 10)}…</span>
            </a>
        </div>
        ${renderTree(projectId, pageId, n.items, selectedId, depth + 1)}
    `).join('');
}

/**
 * Страница с информацией о Page, деревом Node (с drag-and-drop),
 * и кнопками создания/редактирования нод.
 */
class PageInfoPage {
    constructor() {
        this._embedComponent = null;
        this._overlayComponent = null;
        this._overlayContent = null;
    }

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

        this._router = router;
        this._projectId = project.id;
        this._pageId = page.id;
        this._container = container;

        container.innerHTML = `
            <div class="page-info">
                <div class="toolbar-line">
                    <a href="#editor/project/${project.id}" class="back-link" style="color:#4a9eff;">← Project</a>
                    <button class="btn-preview" id="btn-render-preview">▶ Preview</button>
                    <button class="edit-btn" id="btn-edit-page" style="background:#4a9eff;color:#fff;border:none;cursor:pointer;font-size:12px;padding:3px 10px;border-radius:4px;">✎ Page</button>
                </div>

                <h2>${page.title}</h2>
                <p class="meta">Page #${page.id} · ${page.items.length} root node(s)</p>

                <h3 class="subtitle">Node tree</h3>
                <div class="tree-list" id="tree-list">
                    ${renderTree(project.id, page.id, page.items, null)}
                    ${page.items.length === 0 ? '<p class="empty-nodes">No nodes yet.</p>' : ''}
                </div>

                <button class="btn-add-page" id="btn-create-node" style="margin-top:8px;">＋ Create node</button>

                <div id="node-detail-panel" class="node-detail-panel" style="display:none;"></div>
            </div>

            <div class="overlay" id="page-overlay" style="display:none;">
                <div class="overlay-content" id="page-overlay-content"></div>
            </div>
        `;

        this._overlay = container.querySelector('#page-overlay');
        this._overlayContent = container.querySelector('#page-overlay-content');

        // Preview button
        container.querySelector('#btn-render-preview').addEventListener('click', () => {
            window.open(`render.html?project_id=${project.id}&page_id=${page.id}`, '_blank');
        });

        // Edit page → overlay
        container.querySelector('#btn-edit-page').addEventListener('click', () => {
            this._openPageEdit(project.id, page.id);
        });

        // Create node → overlay
        container.querySelector('#btn-create-node').addEventListener('click', () => {
            const selectedLink = container.querySelector('#tree-list .node-card-link.selected');
            const parentNodeId = selectedLink ? selectedLink.dataset.nodeId : null;
            this._openCreateNode(project.id, page.id, parentNodeId);
        });

        // Click on any node link → show detail below
        container.querySelectorAll('#tree-list .node-card-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const nodeId = link.dataset.nodeId;
                this._showNodeDetail(project.id, page.id, nodeId);
            });
        });

        // Drag-and-drop
        this._initDragAndDrop(container, project.id, page.id);

        // Backdrop closes overlay
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) this._closeOverlay();
        });

        // Listen for node-edit / node-delete events from embedded NodeViewPage
        container.addEventListener('node-edit', (e) => {
            const { projectId, pageId, nodeId } = e.detail;
            this._openNodeEdit(projectId, pageId, nodeId);
        });
        container.addEventListener('node-delete', () => {
            this._showNodeDetail(null, null, null); // hide panel
        });
    }

    /* ── drag-and-drop ───────────────────────────── */

    _initDragAndDrop(container, projectId, pageId) {
        let dragSourceId = null;

        container.addEventListener('dragstart', (e) => {
            const link = e.target.closest('.node-card-link');
            if (!link) return;
            dragSourceId = link.dataset.nodeId;
            e.dataTransfer.effectAllowed = 'move';
            link.classList.add('dragging');
        });

        container.addEventListener('dragend', (e) => {
            const link = e.target.closest('.node-card-link');
            if (link) link.classList.remove('dragging');
            container.querySelectorAll('.node-card-link').forEach(l => l.classList.remove('drop-before', 'drop-after', 'drop-inside'));
            dragSourceId = null;
        });

        container.addEventListener('dragover', (e) => {
            const link = e.target.closest('.node-card-link');
            if (!link || link.dataset.nodeId === dragSourceId) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            // Remove previous marks
            container.querySelectorAll('.node-card-link').forEach(l => l.classList.remove('drop-before', 'drop-after', 'drop-inside'));

            const rect = link.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const h = rect.height;
            if (y < h * 0.25) {
                link.classList.add('drop-before');
            } else if (y > h * 0.75) {
                link.classList.add('drop-after');
            } else {
                link.classList.add('drop-inside');
            }
        });

        container.addEventListener('drop', (e) => {
            const link = e.target.closest('.node-card-link');
            if (!link || !dragSourceId || link.dataset.nodeId === dragSourceId) return;
            e.preventDefault();

            let position;
            if (link.classList.contains('drop-before')) position = 'before';
            else if (link.classList.contains('drop-after')) position = 'after';
            else position = 'inside';

            container.querySelectorAll('.node-card-link').forEach(l => l.classList.remove('drop-before', 'drop-after', 'drop-inside'));

            const all = loadProjects();
            const p = all.find(x => x.id === Number(projectId));
            const pg = p ? p.pages.find(x => x.id === Number(pageId)) : null;
            if (!pg) return;

            const targetId = link.dataset.nodeId;
            moveNode(pg, dragSourceId, targetId, position);
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            // Re-render
            this._container.innerHTML = '';
            this.render(this._container, {
                params: { projectId: String(projectId), pageId: String(pageId) },
                router: this._router,
            });
        });
    }

    /* ── overlay helpers ──────────────────────────── */

    _showOverlay() {
        if (this._overlay) this._overlay.style.display = 'flex';
    }

    _closeOverlay() {
        this._destroyOverlayComponent();
        if (this._overlayContent) this._overlayContent.innerHTML = '';
        if (this._overlay) this._overlay.style.display = 'none';
        // Re-render to reflect changes
        if (this._container && this._router && this._projectId && this._pageId) {
            this.render(this._container, {
                params: { projectId: String(this._projectId), pageId: String(this._pageId) },
                router: this._router,
            });
        }
    }

    _destroyOverlayComponent() {
        if (this._overlayComponent) {
            try { this._overlayComponent.destroy(); } catch (_) {}
            this._overlayComponent = null;
        }
    }

    /* ── page edit modal ──────────────────────────── */

    _openPageEdit(projectId, pageId) {
        this._closeOverlay();
        this._overlayContent.innerHTML = '';

        this._overlayComponent = new PageEditPage();
        this._overlayComponent.render(this._overlayContent, {
            params: { id: projectId, pageId },
            router: this._router,
            modal: true,
            onClose: () => this._closeOverlay(),
        });
        this._showOverlay();
    }

    /* ── create node modal ────────────────────────── */

    _openCreateNode(projectId, pageId, parentNodeId) {
        this._closeOverlay();
        this._overlayContent.innerHTML = '';

        this._overlayComponent = new CreateNodePage();
        this._overlayComponent.render(this._overlayContent, {
            params: { id: projectId, pageId, parentNodeId },
            router: this._router,
            modal: true,
            onClose: () => this._closeOverlay(),
        });
        this._showOverlay();
    }

    /* ── edit node modal ──────────────────────────── */

    _openNodeEdit(projectId, pageId, nodeId) {
        this._closeOverlay();
        this._overlayContent.innerHTML = '';

        this._overlayComponent = new NodeEditPage();
        this._overlayComponent.render(this._overlayContent, {
            params: { id: projectId, pageId, nodeId },
            router: this._router,
            modal: true,
            onClose: () => this._closeOverlay(),
        });
        this._showOverlay();
    }

    /* ── node detail ──────────────────────────────── */

    _showNodeDetail(projectId, pageId, nodeId) {
        const panel = this._container.querySelector('#node-detail-panel');
        if (!panel) return;

        if (!nodeId) {
            panel.style.display = 'none';
            panel.innerHTML = '';
            this._container.querySelectorAll('#tree-list .node-card-link').forEach(l => l.classList.remove('selected'));
            return;
        }

        // Highlight selected node
        this._container.querySelectorAll('#tree-list .node-card-link').forEach(l => l.classList.remove('selected'));
        const sel = this._container.querySelector(`#tree-list .node-card-link[data-node-id="${nodeId}"]`);
        if (sel) sel.classList.add('selected');

        // Destroy previous embedded component
        if (this._embedComponent) {
            try { this._embedComponent.destroy(); } catch (_) {}
            this._embedComponent = null;
        }

        panel.innerHTML = '';
        panel.style.display = 'block';

        this._embedComponent = new NodeViewPage();
        this._embedComponent.render(panel, {
            params: { projectId, pageId, nodeId },
            router: this._router,
            embed: true,
        });
    }

    /* ── lifecycle ────────────────────────────────── */

    destroy() {
        if (this._embedComponent) {
            try { this._embedComponent.destroy(); } catch (_) {}
            this._embedComponent = null;
        }
        this._destroyOverlayComponent();
    }
}

export default PageInfoPage;
