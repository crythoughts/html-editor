import { findProject, findPage, findNode, removeNode, loadProjects, saveProjects } from '../db.js';

/**
 * Рендерит двухколоночный список для attrs или styles.
 * @param {string} prefix  - "attr" или "style"
 * @param {object} dict    - { key: value, ... }
 */
function dictRowsHtml(prefix, dict) {
    const entries = Object.entries(dict);
    if (entries.length === 0) {
        return `<p class="empty-nodes" id="${prefix}-empty">No entries.</p>`;
    }
    return entries.map(([k, v], i) => `
        <div class="kv-row" data-idx="${i}">
            <input class="kv-key"   value="${k}" placeholder="key">
            <input class="kv-value" value="${v}" placeholder="value">
            <button class="kv-remove" data-idx="${i}">×</button>
        </div>
    `).join('');
}

/**
 * Страница редактирования Node.
 *
 * Работает как standalone-роут и как модальный оверлей (modal=true).
 */
class NodeEditPage {
    render(container, { params, router, modal, onClose }) {
        const project = findProject(params.projectId || params.id);
        const page = project ? findPage(project, params.pageId) : null;
        const found = page ? findNode(page, params.nodeId) : null;

        if (!project || !page || !found) {
            container.innerHTML = `
                <div class="node-edit">
                    <p style="color:#888;font-size:13px;">Node not found.</p>
                </div>
            `;
            return;
        }

        const { node } = found;
        const isModal = modal === true;

        // Build the form
        container.innerHTML = `
            <div class="node-edit">
                ${isModal ? '' : `
                    <div class="toolbar-line">
                        <a href="#editor/project/${project.id}/page/${page.id}/node/${node.id}" class="back-link" style="color:#4a9eff;">← Node view</a>
                    </div>
                `}

                <h2>Edit Node</h2>
                <p class="meta">ID: ${node.id}</p>

                <div class="field-wrap">
                    <label for="ne-type">Type</label>
                    <input id="ne-type" value="${node.type}">
                </div>

                <div class="field-wrap">
                    <label for="ne-tagname">Tag name</label>
                    <input id="ne-tagname" value="${node.tagName}">
                </div>

                <div class="field-wrap">
                    <label for="ne-html">innerHTML</label>
                    <textarea id="ne-html" rows="4">${node.textContent}</textarea>
                </div>

                <div class="field-wrap">
                    <label>Attributes</label>
                    <div class="kv-list" id="attr-list">
                        ${dictRowsHtml('attr', node.attrs)}
                    </div>
                    <button class="kv-add" data-target="attr-list">＋ Add attribute</button>
                </div>

                <div class="field-wrap">
                    <label>Styles</label>
                    <div class="kv-list" id="style-list">
                        ${dictRowsHtml('style', node.styles)}
                    </div>
                    <button class="kv-add" data-target="style-list">＋ Add style</button>
                </div>

                <div class="form-actions">
                    <button class="btn-save" id="ne-btn-save" style="background:#4a9eff;color:#fff;">
                        Save
                    </button>
                    <button class="btn-danger" id="ne-btn-delete" style="background:#c04040;color:#fff;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        Delete node
                    </button>
                    <button class="btn-cancel" id="ne-btn-close" style="background:#555;color:#ccc;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        ${isModal ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        `;

        // ── helpers ────────────────────────────────

        /** Read kv-rows inside a container into a plain object. */
        const readKvList = (listEl) => {
            const obj = {};
            listEl.querySelectorAll('.kv-row').forEach(row => {
                const key = row.querySelector('.kv-key').value.trim();
                const val = row.querySelector('.kv-value').value;
                if (key) obj[key] = val;
            });
            return obj;
        };

        /** Add a key-value row to a list. */
        const addKvRow = (listId) => {
            const list = container.querySelector('#' + listId);
            const empty = list.querySelector('.empty-nodes');
            if (empty) empty.remove();
            const row = document.createElement('div');
            row.className = 'kv-row';
            row.innerHTML = `
                <input class="kv-key" value="" placeholder="key">
                <input class="kv-value" value="" placeholder="value">
                <button class="kv-remove">×</button>
            `;
            row.querySelector('.kv-remove').addEventListener('click', () => row.remove());
            list.appendChild(row);
        };

        // Wire up "＋ Add" buttons
        container.querySelectorAll('.kv-add').forEach(btn => {
            btn.addEventListener('click', () => addKvRow(btn.dataset.target));
        });

        // Wire up existing remove buttons
        container.querySelectorAll('.kv-remove').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.kv-row').remove());
        });

        // ── button handlers ────────────────────────

        const doClose = () => {
            if (isModal && onClose) onClose();
            else router.navigate(`/project/${project.id}/page/${page.id}/node/${node.id}`);
        };

        // Save
        container.querySelector('#ne-btn-save').addEventListener('click', () => {
            const type       = container.querySelector('#ne-type').value.trim() || 'node';
            const tagName    = container.querySelector('#ne-tagname').value.trim() || 'div';
            const textContent = container.querySelector('#ne-html').value;
            const attrs  = readKvList(container.querySelector('#attr-list'));
            const styles = readKvList(container.querySelector('#style-list'));

            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            const pg = p ? p.pages.find(x => x.id === page.id) : null;
            const found2 = pg ? findNode(pg, node.id) : null;
            if (!found2) return;

            found2.node.type = type;
            found2.node.tagName = tagName;
            found2.node.textContent = textContent;
            found2.node.attrs = attrs;
            found2.node.styles = styles;
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            doClose();
        });

        // Delete
        container.querySelector('#ne-btn-delete').addEventListener('click', () => {
            if (!(event.shiftKey || confirm('Delete this node and all its children?'))) return;

            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            const pg = p ? p.pages.find(x => x.id === page.id) : null;
            if (!pg) return;

            removeNode(pg, node.id);
            p.edited_at = Math.floor(Date.now() / 1000);
            saveProjects(all);

            if (isModal && onClose) onClose();
            else router.navigate(`/project/${project.id}/page/${page.id}`);
        });

        // Close / Cancel
        container.querySelector('#ne-btn-close').addEventListener('click', doClose);
    }

    destroy() {}
}

export default NodeEditPage;
