import { loadProjects, fmtTime } from '../db.js';

class ProjectListPage {
    render(container, { router }) {
        const projects = loadProjects();

        container.innerHTML = `
            <div class="project-list">
                <h2>Projects</h2>

                <button class="btn-new" id="btn-new-project">＋ New Project</button>

                <div id="project-list">
                    ${projects.length === 0
                        ? '<p class="empty">No projects yet.</p>'
                        : projects.map(p => `
                            <div class="card">
                                <div>
                                    <span class="card-name">${p.name}</span>
                                    <span class="card-id">#${p.id}</span>
                                    <span class="card-desc">${p.description || 'No description'}</span>
                                    <span class="card-meta">
                                        ${p.pages.length} page(s) · ${p.author || 'Unknown'} · ${fmtTime(p.edited_at)}
                                    </span>
                                </div>
                                <div class="card-actions">
                                    <a href="#editor/project/${p.id}" style="color:#4a9eff;">Open</a>
                                    <a href="#editor/project/${p.id}/edit" style="color:#aaa;">Edit</a>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;

        container.querySelector('#btn-new-project').addEventListener('click', () => {
            router.navigate('/project/new');
        });
    }

    destroy() {}
}

export default ProjectListPage;
