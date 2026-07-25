import { findProject, findPage, loadProjects, saveProjects } from '../db.js';

/**
 * Page editor.
 *
 * Can be used as a standalone route or rendered inside a modal overlay
 * (see ProjectPage).  When used as a standalone route it shows a back link;
 * when used in a modal the caller hides the back link and manages close/destroy.
 */
class PageEditPage {
    /**
     * @param {HTMLElement} container
     * @param {object} ctx
     * @param {object} ctx.params     - route params (projectId, pageId)
     * @param {object} ctx.query
     * @param {Router} ctx.router
     * @param {boolean} ctx.modal     - if true, hides the back link (for overlay use)
     * @param {Function} [ctx.onClose] - called when user clicks close in modal mode
     */
    render(container, { params, router, modal, onClose }) {
        const project = findProject(params.projectId || params.id);
        const page = project ? findPage(project, params.pageId) : null;

        if (!project || !page) {
            container.innerHTML = `
                <div class="page-edit">
                    <p style="color:#888;font-size:13px;">Page not found.</p>
                    <a href="#editor/" class="back-link" style="color:#4a9eff;">← Back</a>
                </div>
            `;
            return;
        }

        const isModal = modal === true;

        container.innerHTML = `
            <div class="page-edit">
                ${isModal ? '' : `
                    <div style="margin-bottom:10px;">
                        <a href="#editor/project/${project.id}" class="back-link" style="color:#4a9eff;">← Project</a>
                    </div>
                `}

                <h2>Edit Page</h2>

                <div class="field-wrap">
                    <label for="pe-title">Title</label>
                    <input id="pe-title" value="${page.title}">
                </div>

                <div class="field-wrap">
                    <label>Page ID</label>
                    <input value="#${page.id}" disabled style="opacity:0.6;">
                </div>

                <div class="form-actions">
                    <button class="btn-save" id="pe-btn-save" style="background:#4a9eff;color:#fff;">
                        Save
                    </button>
                    <button class="btn-cancel" id="pe-btn-close" style="background:#555;color:#ccc;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        ${isModal ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        `;

        container.querySelector('#pe-btn-save').addEventListener('click', () => {
            const title = container.querySelector('#pe-title').value.trim() || 'Untitled';
            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            const pg = p ? p.pages.find(x => x.id === page.id) : null;
            if (!pg) return;
            pg.title = title;
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            if (isModal && onClose) {
                onClose();
            } else {
                router.navigate(`/project/${project.id}`);
            }
        });

        container.querySelector('#pe-btn-close').addEventListener('click', () => {
            if (isModal && onClose) {
                onClose();
            } else {
                router.navigate(`/project/${project.id}`);
            }
        });
    }

    destroy() {}
}

export default PageEditPage;
