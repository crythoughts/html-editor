import { findProject, saveProjects, loadProjects, nextPageId, fmtTime } from '../db.js';
import PageEditPage from './PageEditPage.js';
import ProjectEditPage from './ProjectEditPage.js';

class ProjectPage {
    constructor() {
        this._pageEditComponent = null;
        this._projectEditComponent = null;
        this._overlay = null;
        this._overlayContent = null;
    }

    render(container, { params, router }) {
        const project = findProject(params.id);

        if (!project) {
            container.innerHTML = `
                <div class="project-view">
                    <h2>Project not found</h2>
                    <p style="color:#888;font-size:13px;">Project #${params.id} does not exist.</p>
                    <a href="#editor/" class="back-link" style="color:#4a9eff;">← Back to projects</a>
                </div>
            `;
            return;
        }

        this._router = router;
        this._projectId = project.id;
        this._container = container;

        container.innerHTML = `
            <div class="project-view">
                <div class="project-toolbar">
                    <a href="#editor/" class="back-link" style="color:#4a9eff;">← Projects</a>
                    <button class="edit-btn" id="btn-project-edit" style="background:#4a9eff;color:#fff;border:none;cursor:pointer;">✎ Edit</button>
                </div>

                <h2>${project.name}</h2>

                <p class="meta">
                    ${project.description || 'No description'} ·
                    Author: ${project.author || 'Unknown'}
                </p>
                <p class="meta" style="margin-top:-10px;">
                    Created: ${fmtTime(project.created_at)} ·
                    Edited: ${fmtTime(project.edited_at)}
                </p>

                <h3 class="subtitle">Pages (${project.pages.length})</h3>

                <div class="page-list" id="page-list">
                    ${project.pages.length === 0
                        ? '<p class="empty-pages">No pages yet.</p>'
                        : project.pages.map(page => `
                            <div class="page-row">
                                <span>
                                    <a href="#editor/project/${project.id}/page/${page.id}" class="page-row-link">
                                        <span class="page-row-title">${page.title}</span>
                                        <span class="page-row-id">#${page.id}</span>
                                    </a>
                                </span>
                                <span class="page-row-info">
                                    ${page.items.length} node(s)
                                    <button class="page-edit-btn" data-page-id="${page.id}" title="Edit page title">✎</button>
                                </span>
                            </div>
                        `).join('')
                    }
                </div>

                <button class="btn-add-page" id="btn-add-page">＋ Add page</button>
            </div>

            <div class="overlay" id="editor-overlay" style="display:none;">
                <div class="overlay-content" id="overlay-content"></div>
            </div>
        `;

        this._overlay = container.querySelector('#editor-overlay');
        this._overlayContent = container.querySelector('#overlay-content');

        // Add page button
        container.querySelector('#btn-add-page').addEventListener('click', () => {
            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            if (!p) return;
            p.pages.push({
                title: 'New Page',
                id: nextPageId(p),
                items: [],
            });
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);
            router.navigate(`/project/${project.id}`);
        });

        // Project edit button → overlay
        container.querySelector('#btn-project-edit').addEventListener('click', () => {
            this._openProjectEdit(project.id);
        });

        // Page edit buttons → overlay (title edit)
        container.querySelectorAll('.page-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pageId = btn.dataset.pageId;
                this._openPageEdit(project.id, pageId);
            });
        });

        // Backdrop click closes overlay
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) this._closeOverlay();
        });
    }

    /* ── overlay helpers ──────────────────────────── */

    _showOverlay() {
        if (this._overlay) this._overlay.style.display = 'flex';
    }

    _closeOverlay() {
        this._destroyPageEdit();
        this._destroyProjectEdit();
        if (this._overlayContent) this._overlayContent.innerHTML = '';
        if (this._overlay) this._overlay.style.display = 'none';
        // Re-render the project page to reflect any data changes
        if (this._container && this._router && this._projectId) {
            this.render(this._container, {
                params: { id: this._projectId },
                router: this._router,
            });
        }
    }

    /* ── page edit ────────────────────────────────── */

    _openPageEdit(projectId, pageId) {
        this._closeOverlay();
        this._overlayContent.innerHTML = '';

        this._pageEditComponent = new PageEditPage();
        this._pageEditComponent.render(this._overlayContent, {
            params: { id: projectId, pageId },
            router: this._router,
            modal: true,
            onClose: () => this._closeOverlay(),
        });
        this._showOverlay();
    }

    _destroyPageEdit() {
        if (this._pageEditComponent) {
            try { this._pageEditComponent.destroy(); } catch (_) {}
            this._pageEditComponent = null;
        }
    }

    /* ── project edit ─────────────────────────────── */

    _openProjectEdit(projectId) {
        this._closeOverlay();
        this._overlayContent.innerHTML = '';

        this._projectEditComponent = new ProjectEditPage();
        this._projectEditComponent.render(this._overlayContent, {
            params: { id: projectId },
            router: this._router,
            modal: true,
            onClose: () => this._closeOverlay(),
        });
        this._showOverlay();
    }

    _destroyProjectEdit() {
        if (this._projectEditComponent) {
            try { this._projectEditComponent.destroy(); } catch (_) {}
            this._projectEditComponent = null;
        }
    }

    /* ── lifecycle ────────────────────────────────── */

    destroy() {
        this._closeOverlay();
    }
}

export default ProjectPage;
