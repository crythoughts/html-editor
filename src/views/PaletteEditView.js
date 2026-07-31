import { getProjectById, saveProject } from '../storage.js';
import { Color } from '../models/Color.js';

/**
 * PaletteEditView — edit a palette's name, colours, and enabled state.
 */
export class PaletteEditView {
  constructor(router, projectId, palId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.palId = parseInt(palId, 10);
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);
    const pal = project ? project.palettes[this.palId] : null;

    if (!project || !pal) {
      container.appendChild(document.createTextNode('Palette not found.'));
      return container;
    }

    // --- Breadcrumb ---
    const breadcrumb = document.createElement('div');
    const listLink = document.createElement('a');
    listLink.href = `#/project/${this.projectId}/palettes`;
    listLink.textContent = 'Palettes';
    breadcrumb.appendChild(listLink);
    breadcrumb.appendChild(document.createTextNode(` / ${pal.name}`));
    container.appendChild(breadcrumb);

    const heading = document.createElement('h3');
    heading.textContent = `Edit — ${pal.name}`;
    container.appendChild(heading);

    // --- Immutable ID ---
    const idRow = document.createElement('div');
    idRow.textContent = `CSS variable prefix: --${pal.id}-*  (immutable)`;
    container.appendChild(idRow);

    // --- Enabled toggle ---
    const enabledLabel = document.createElement('label');
    enabledLabel.textContent = 'Enabled';
    const enabledCheck = document.createElement('input');
    enabledCheck.type = 'checkbox';
    enabledCheck.checked = pal.enabled;
    container.appendChild(enabledLabel);
    container.appendChild(enabledCheck);

    // --- Name ---
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Palette name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = pal.name;
    container.appendChild(nameLabel);
    container.appendChild(nameInput);

    // --- Colours ---
    const colHeading = document.createElement('h4');
    colHeading.textContent = 'Colours';
    container.appendChild(colHeading);

    const colContainer = document.createElement('div');

    const addColorRow = (c) => {
      const row = document.createElement('div');

      const nameInp = document.createElement('input');
      nameInp.type = 'text';
      nameInp.placeholder = 'Colour name';
      nameInp.value = c ? c.name : '';
      row.appendChild(nameInp);

      const idSpan = document.createElement('span');
      idSpan.textContent = c ? ` --${c.id}` : '';
      row.appendChild(idSpan);

      const valInp = document.createElement('input');
      valInp.type = 'color';
      valInp.value = c ? c.value : '#000000';
      row.appendChild(valInp);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2212';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      colContainer.appendChild(row);
    };

    pal.colors.forEach((c) => addColorRow(c));

    container.appendChild(colContainer);

    const addColBtn = document.createElement('button');
    addColBtn.textContent = '+ Add colour';
    addColBtn.addEventListener('click', () => addColorRow(null));
    container.appendChild(addColBtn);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save changes';
    saveBtn.addEventListener('click', () => {
      pal.enabled = enabledCheck.checked;
      pal.name = nameInput.value.trim() || 'Untitled';

      const newColors = [];
      for (const row of colContainer.children) {
        const inputs = row.querySelectorAll('input[type="text"], input[type="color"]');
        const cName = inputs[0].value.trim();
        if (cName) {
          // Preserve existing Color.id if name matches, otherwise create new
          const existing = pal.colors.find(
            (oc) => oc.name === cName || Color.slugify(oc.name) === Color.slugify(cName),
          );
          const col = existing
            ? new Color(cName, inputs[1].value)
            : new Color(cName, inputs[1].value);
          if (existing) col.id = existing.id; // keep immutable id
          newColors.push(col);
        }
      }
      pal.colors = newColors;
      project.edited_at = Date.now();
      saveProject(this.projectId, project);
      this.router.navigate(`/project/${this.projectId}/palettes`);
    });
    container.appendChild(saveBtn);

    // --- Delete palette ---
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete palette';
    deleteBtn.addEventListener('click', () => {
      project.palettes.splice(this.palId, 1);
      project.edited_at = Date.now();
      saveProject(this.projectId, project);
      this.router.navigate(`/project/${this.projectId}/palettes`);
    });
    container.appendChild(deleteBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}/palettes`),
    );
    container.appendChild(cancelBtn);

    return container;
  }
}
