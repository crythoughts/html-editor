import { findProject, saveProjects, loadProjects, nextPageId } from '../db.js';

class ProjectPage {
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

        container.innerHTML = `
            <div class="project-view">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <a href="#editor/" class="back-link" style="color:#4a9eff;">← Projects</a>
                    <a href="#editor/project/${project.id}/edit" class="edit-btn" style="background:#4a9eff;color:#fff;">✎ Edit</a>
                </div>

                <h2>${project.name}</h2>
                <p class="meta">
                    ${project.description || 'No description'} ·
                    Author: ${project.author || 'Unknown'} ·
                    Created: ${new Date(project.created_at).toLocaleDateString()} ·
                    Edited: ${new Date(project.edited_at).toLocaleDateString()}
                </p>

                <h3 class="subtitle">Pages (${project.pages.length})</h3>

                <div id="page-list">
                    ${project.pages.length === 0
                        ? '<p class="empty-pages">No pages yet.</p>'
                        : project.pages.map(page => `
                            <div class="page-row">
                                <span>
                                    <span class="page-row-title">${page.title}</span>
                                    <span class="page-row-id">#${page.id}</span>
                                </span>
                                <span class="page-row-info">${page.items.length} node(s)</span>
                            </div>
                        `).join('')
                    }
                </div>

                <button class="btn-add-page" id="btn-add-page">＋ Add page</button>
            </div>
        `;

        container.querySelector('#btn-add-page').addEventListener('click', () => {
            const all = loadProjects();
            const p = all.find(x => x.id === project.id);
            if (!p) return;
            p.pages.push({
                title: 'New Page',
                id: nextPageId(p),
                head: [],
                items: [],
            });
            p.edited_at = new Date().toISOString();
            saveProjects(all);
            router.navigate(`/project/${project.id}`);
        });
    }

    destroy() {}
}

export default ProjectPage;
