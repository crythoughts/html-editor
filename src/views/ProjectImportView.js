import { addProject, validateProjectJson, restoreInstance } from '../storage.js';

/**
 * ProjectImportView — paste a project JSON into a textarea, validate it,
 * and add it to the project list on success.
 */
export class ProjectImportView {
  constructor(router) {
    this.router = router;
  }

  render() {
    const container = document.createElement('div');

    // --- Heading ---
    const heading = document.createElement('h2');
    heading.textContent = 'Import Project from JSON';
    container.appendChild(heading);

    // --- Textarea ---
    const textarea = document.createElement('textarea');
    textarea.rows = 20;
    textarea.cols = 80;
    textarea.placeholder = 'Paste project JSON here…';
    container.appendChild(textarea);

    // --- Validation message area ---
    const msgArea = document.createElement('div');
    container.appendChild(msgArea);

    // --- Import button ---
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Add';
    importBtn.addEventListener('click', () => {
      msgArea.innerHTML = '';
      const raw = textarea.value.trim();
      if (!raw) {
        const err = document.createElement('p');
        err.textContent = 'Please paste JSON first.';
        msgArea.appendChild(err);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        const err = document.createElement('p');
        err.textContent = `Invalid JSON: ${e.message}`;
        msgArea.appendChild(err);
        return;
      }

      const { valid, errors } = validateProjectJson(parsed);
      if (!valid) {
        const errHeading = document.createElement('p');
        errHeading.textContent = 'Validation failed:';
        msgArea.appendChild(errHeading);
        const list = document.createElement('ul');
        errors.forEach((e) => {
          const li = document.createElement('li');
          li.textContent = e;
          list.appendChild(li);
        });
        msgArea.appendChild(list);
        return;
      }

      // Restore the plain object into proper Project / Page / Node instances
      const project = restoreInstance(parsed);

      // Ensure fresh timestamps and reset ids so they don't collide
      project.created_at = Date.now();
      project.edited_at = Date.now();

      const id = addProject(project);
      this.router.navigate(`/project/${id}`);
    });
    container.appendChild(importBtn);

    // --- Cancel ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.router.navigate('/'));
    container.appendChild(cancelBtn);

    return container;
  }
}
