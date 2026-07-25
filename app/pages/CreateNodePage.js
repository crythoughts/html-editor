import { findProject, findPage, findNode, loadProjects, saveProjects } from '../db.js';
import Node from '../models/Node.js';

/**
 * Оверлей создания новой Node.
 *
 * Если передан parentNodeId — нода создаётся внутри этой родительской ноды.
 * Иначе — добавляется в корень page.items.
 */
class CreateNodePage {
    render(container, { params, router, modal, onClose }) {
        const project = findProject(params.projectId || params.id);
        const page = project ? findPage(project, params.pageId) : null;
        const parentNodeId = params.parentNodeId || null;

        if (!project || !page) {
            container.innerHTML = `<p style="color:#888;font-size:13px;">Page not found.</p>`;
            return;
        }

        container.innerHTML = `
            <div class="node-edit">
                <h2>Create Node</h2>

                <div class="field-wrap">
                    <label for="cn-tagname">Tag name</label>
                    <input id="cn-tagname" value="div">
                </div>

                <div class="field-wrap">
                    <label for="cn-html">innerHTML</label>
                    <textarea id="cn-html" rows="4"></textarea>
                </div>

                <div class="form-actions">
                    <button class="btn-save" id="cn-btn-save" style="background:#4a9eff;color:#fff;">
                        Create
                    </button>
                    <button class="btn-cancel" id="cn-btn-close" style="background:#555;color:#ccc;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        container.querySelector('#cn-btn-save').addEventListener('click', () => {
            const tagName = container.querySelector('#cn-tagname').value.trim() || 'div';
            const textContent = container.querySelector('#cn-html').value;

            const newNode = new Node({ tagName, textContent });

            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            const pg = p ? p.pages.find(x => x.id === page.id) : null;
            if (!pg) return;

            if (parentNodeId) {
                const found = findNode(pg, parentNodeId);
                if (found) {
                    found.node.items.push(newNode);
                } else {
                    pg.items.push(newNode);
                }
            } else {
                pg.items.push(newNode);
            }
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            if (onClose) onClose();
        });

        container.querySelector('#cn-btn-close').addEventListener('click', () => {
            if (onClose) onClose();
        });
    }

    destroy() {}
}

export default CreateNodePage;
