import { getProjectById, saveProject } from '../storage.js';
import { Palette } from '../models/Palette.js';
import { Color } from '../models/Color.js';

/**
 * PaletteCreateView — create a new palette with a name and optional colours.
 */
export class PaletteCreateView {
  constructor(router, projectId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);
    if (!project) {
      container.appendChild(document.createTextNode('Project not found.'));
      return container;
    }

    const heading = document.createElement('h3');
    heading.textContent = 'Create Palette';
    container.appendChild(heading);

    // --- Name ---
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Palette name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'e.g. Primary';
    container.appendChild(nameLabel);
    container.appendChild(nameInput);

    // --- Colours ---
    const colHeading = document.createElement('h4');
    colHeading.textContent = 'Colours';
    container.appendChild(colHeading);

    const colContainer = document.createElement('div');

    const addColorRow = (name = '', value = '#000000') => {
      const row = document.createElement('div');

      const nameInp = document.createElement('input');
      nameInp.type = 'text';
      nameInp.placeholder = 'Colour name';
      nameInp.value = name;
      row.appendChild(nameInp);

      const valInp = document.createElement('input');
      valInp.type = 'color';
      valInp.value = value;
      row.appendChild(valInp);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2212';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(removeBtn);

      colContainer.appendChild(row);
    };

    container.appendChild(colContainer);

    const addColBtn = document.createElement('button');
    addColBtn.textContent = '+ Add colour';
    addColBtn.addEventListener('click', () => addColorRow());
    container.appendChild(addColBtn);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Create';
    saveBtn.addEventListener('click', () => {
      const pal = new Palette(nameInput.value.trim() || 'Untitled');

      for (const row of colContainer.children) {
        const [nameInp, valInp] = row.querySelectorAll('input');
        const cName = nameInp.value.trim();
        if (cName) {
          pal.colors.push(new Color(cName, valInp.value));
        }
      }

      if (!project.palettes) {
          project.palettes = [];
      }

      project.palettes.push(pal);
      project.edited_at = Date.now();
      saveProject(this.projectId, project);
      this.router.navigate(`/project/${this.projectId}/palettes`);
    });
    container.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () =>
      this.router.navigate(`/project/${this.projectId}/palettes`),
    );
    container.appendChild(cancelBtn);

    return container;
  }
}
