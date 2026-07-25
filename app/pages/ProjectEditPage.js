import { findProject, createProject, loadProjects, saveProjects } from '../db.js';

class ProjectEditPage {
    render(container, { params, router, modal, onClose }) {
        const isNew = params.id === 'new';
        const isModal = modal === true;
        const project = isNew ? null : findProject(params.id);

        const name = project ? project.name : '';
        const description = project ? project.description : '';
        const author = project ? project.author : '';

        container.innerHTML = `
            <div class="project-edit">
                ${isModal ? '' : `
                    <div style="margin-bottom:10px;">
                        <a href="#editor/" class="back-link" style="color:#4a9eff;">← Projects</a>
                    </div>
                `}

                <h2>${isNew ? 'New Project' : 'Edit Project'}</h2>

                <div class="field-wrap">
                    <label for="field-name">Name</label>
                    <input id="field-name" value="${name}">
                </div>

                <div class="field-wrap">
                    <label for="field-description">Description</label>
                    <textarea id="field-description" rows="3">${description}</textarea>
                </div>

                <div class="field-wrap">
                    <label for="field-author">Author</label>
                    <input id="field-author" value="${author}">
                </div>

                <div class="form-actions">
                    <button class="btn-save" id="btn-save" style="background:#4a9eff;color:#fff;">
                        ${isNew ? 'Create' : 'Save'}
                    </button>
                    <button class="btn-cancel" id="btn-cancel" style="background:#555;color:#ccc;border:none;padding:6px 18px;border-radius:4px;cursor:pointer;font-size:13px;">
                        ${isModal ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        `;

        container.querySelector('#btn-save').addEventListener('click', () => {
            const fName = container.querySelector('#field-name').value.trim();
            if (!fName) {
                alert('Project name is required.');
                return;
            }

            const all = loadProjects();

            if (isNew) {
                const created = createProject({
                    name: fName,
                    description: container.querySelector('#field-description').value.trim(),
                    author: container.querySelector('#field-author').value.trim(),
                });
                all.push(created);
                saveProjects(all);
                if (isModal && onClose) {
                    onClose();
                } else {
                    router.navigate(`/project/${created.id}`);
                }
            } else {
                const p = all.find(x => x.id === Number(params.id));
                if (!p) return;
                p.name = fName;
                p.description = container.querySelector('#field-description').value.trim();
                p.author = container.querySelector('#field-author').value.trim();
                p.edited_at = Math.floor(Date.now() / 1000);
                saveProjects(all);
                if (isModal && onClose) {
                    onClose();
                } else {
                    router.navigate(`/project/${p.id}`);
                }
            }
        });

        container.querySelector('#btn-cancel').addEventListener('click', () => {
            if (isModal && onClose) {
                onClose();
            } else {
                router.navigate('/');
            }
        });
    }

    destroy() {}
}

export default ProjectEditPage;
