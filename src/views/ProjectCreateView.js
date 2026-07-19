import { Project } from '../models/Project.js';
import { Page } from '../models/Page.js';
import { Node } from '../models/Node.js';
import { addProject } from '../storage.js';

/**
 * ProjectCreateView — simple form to create a new project with an initial page.
 */
export class ProjectCreateView {
  constructor(router) {
    this.router = router;
  }

  render() {
    const container = document.createElement('div');

    const heading = document.createElement('h2');
    heading.textContent = 'Create Project';
    container.appendChild(heading);

    // --- Name ---
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'My Project';
    container.appendChild(nameLabel);
    container.appendChild(nameInput);

    // --- Description ---
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    const descInput = document.createElement('textarea');
    descInput.placeholder = 'Optional description…';
    container.appendChild(descLabel);
    container.appendChild(descInput);

    // --- Author ---
    const authorLabel = document.createElement('label');
    authorLabel.textContent = 'Author';
    const authorInput = document.createElement('input');
    authorInput.type = 'text';
    authorInput.placeholder = 'Your name';
    container.appendChild(authorLabel);
    container.appendChild(authorInput);

    // --- Initial page title ---
    const pageLabel = document.createElement('label');
    pageLabel.textContent = 'Initial page title';
    const pageInput = document.createElement('input');
    pageInput.type = 'text';
    pageInput.placeholder = 'Home';
    pageInput.value = 'Home';
    container.appendChild(pageLabel);
    container.appendChild(pageInput);

    // --- Submit ---
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Save';
    submitBtn.addEventListener('click', () => {
      const project = new Project(
        nameInput.value.trim() || 'Untitled',
        descInput.value.trim(),
        authorInput.value.trim(),
      );

      // Create an initial page with a demo heading node
      const page = new Page(pageInput.value.trim() || 'Home');
      const h1 = new Node('h1', { textContent: 'Hello, World!' });
      page.items.push(h1);
      project.addPage(page);

      const id = addProject(project);
      this.router.navigate(`/project/${id}`);
    });
    container.appendChild(submitBtn);

    // --- Cancel ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.router.navigate('/');
    });
    container.appendChild(cancelBtn);

    return container;
  }
}
