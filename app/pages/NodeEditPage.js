import { findProject, findPage, findNode, loadProjects, saveProjects } from '../db.js';

/**
 * Страница редактирования Node.
 * Маршрут: /project/:projectId/page/:pageId/node/:nodeId/edit
 */
class NodeEditPage {
    render(container, { params, router }) {
        const project = findProject(params.projectId);
        const page = project ? findPage(project, params.pageId) : null;
        const found = page ? findNode(page, params.nodeId) : null;

        if (!project || !page || !found) {
            container.innerHTML = `
                <div class="node-edit">
                    <p style="color:#888;font-size:13px;">Node not found.</p>
                    <a href="#editor/project/${params.projectId}/page/${params.pageId}" class="back-link" style="color:#4a9eff;">← Page</a>
                </div>
            `;
            return;
        }

        const { node, parent } = found;

        const attrsStr = Object.keys(node.attrs).length === 0
            ? ''
            : Object.entries(node.attrs).map(([k, v]) => `${k}="${v}"`).join(' ');

        container.innerHTML = `
            <div class="node-edit">
                <div class="toolbar-line">
                    <a href="#editor/project/${project.id}/page/${page.id}/node/${node.id}" class="back-link" style="color:#4a9eff;">← Node view</a>
                </div>

                <h2>Edit Node</h2>
                <p class="meta">ID: ${node.id}</p>

                <div class="field-wrap">
                    <label for="ne-tagname">Tag name</label>
                    <input id="ne-tagname" value="${node.tagName}">
                </div>

                <div class="field-wrap">
                    <label for="ne-html">innerHTML</label>
                    <textarea id="ne-html" rows="4">${node.textContent}</textarea>
                </div>

                <div class="field-wrap">
                    <label for="ne-attrs">Attributes (key="value" space-separated)</label>
                    <input id="ne-attrs" value="${attrsStr}">
                </div>

                <div class="form-actions" style="margin-top:12px;">
                    <button class="btn-save" id="ne-btn-save" style="background:#4a9eff;color:#fff;">
                        Save
                    </button>
                    <button class="btn-danger" id="ne-btn-delete" style="background:#c04040;color:#fff;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        Delete node
                    </button>
                    <a href="#editor/project/${project.id}/page/${page.id}/node/${node.id}" class="btn-cancel" style="background:#555;color:#ccc;text-decoration:none;padding:6px 18px;border-radius:4px;font-size:13px;display:inline-block;">
                        Cancel
                    </a>
                </div>
            </div>
        `;

        // Save
        container.querySelector('#ne-btn-save').addEventListener('click', () => {
            const tagName = container.querySelector('#ne-tagname').value.trim() || 'div';
            const textContent = container.querySelector('#ne-html').value;
            const attrsRaw = container.querySelector('#ne-attrs').value.trim();

            // Parse attributes: key="value" key2="value2"
            const attrs = {};
            const attrRe = /(\S+)\s*=\s*"([^"]*)"/g;
            let m;
            while ((m = attrRe.exec(attrsRaw)) !== null) {
                attrs[m[1]] = m[2];
            }

            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            const pg = p ? p.pages.find(x => x.id === page.id) : null;
            const found2 = pg ? findNode(pg, node.id) : null;
            if (!found2) return;

            found2.node.tagName = tagName;
            found2.node.textContent = textContent;
            found2.node.attrs = attrs;
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            router.navigate(`/project/${project.id}/page/${page.id}/node/${node.id}`);
        });

        // Delete
        container.querySelector('#ne-btn-delete').addEventListener('click', () => {
            if (!confirm('Delete this node and all its children?')) return;

            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            const pg = p ? p.pages.find(x => x.id === page.id) : null;
            const found2 = pg ? findNode(pg, node.id) : null;
            if (!found2) return;

            if (found2.parent) {
                // Remove from parent's items
                const idx = found2.parent.items.findIndex(n => n.id === node.id);
                if (idx !== -1) found2.parent.items.splice(idx, 1);
            } else {
                // Remove from page root items
                const idx = pg.items.findIndex(n => n.id === node.id);
                if (idx !== -1) pg.items.splice(idx, 1);
            }

            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            router.navigate(`/project/${project.id}/page/${page.id}`);
        });
    }

    destroy() {}
}

export default NodeEditPage;
