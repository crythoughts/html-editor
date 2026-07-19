import { getPageById, savePage, getProjectById, saveProject } from '../storage.js';
import { Node } from '../models/Node.js';

/**
 * NodeCreateView — form to create a new node.
 * Works with both page items and component items (when componentId is given).
 *
 * Route patterns:
 *   /project/:pid/:pageId/node/create            → top-level page item
 *   /project/:pid/:pageId/node/:nid/create       → child of :nid in page
 *   /project/:pid/components/:cid/node/create    → top-level component item
 *   /project/:pid/components/:cid/node/:nid/create → child of :nid in component
 */
export class NodeCreateView {
  constructor(router, projectId, pageId, parentNodeId, componentId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = pageId != null ? parseInt(pageId, 10) : null;
    this.parentNodeId = parentNodeId ?? null;
    this.componentId = componentId != null ? parseInt(componentId, 10) : null;
  }

  render() {
    const container = document.createElement('div');

    const project = getProjectById(this.projectId);
    const components = project ? project.components : [];
    let containerObj = null; // Page or Component
    let parentNode = null;

    if (this.componentId != null) {
      // --- Working with a component ---
      containerObj = project ? project.components[this.componentId] : null;
      if (!containerObj) {
        container.appendChild(document.createTextNode('Component not found.'));
        return container;
      }
      if (this.parentNodeId) {
        parentNode = containerObj.findNodeById(this.parentNodeId);
        if (!parentNode) {
          container.appendChild(document.createTextNode('Parent node not found.'));
          return container;
        }
      }
    } else {
      // --- Working with a page ---
      containerObj = getPageById(this.projectId, this.pageId);
      if (!containerObj) {
        container.appendChild(document.createTextNode('Page not found.'));
        return container;
      }
      if (this.parentNodeId) {
        parentNode = containerObj.findNodeById(this.parentNodeId);
        if (!parentNode) {
          container.appendChild(document.createTextNode('Parent node not found.'));
          return container;
        }
      }
    }

    // --- Heading ---
    const heading = document.createElement('h3');
    heading.textContent = this.parentNodeId
      ? `Create child under <${parentNode.tagName}>`
      : 'Create top-level node';
    container.appendChild(heading);

    // --- Type selector ---
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type';
    const typeSelect = document.createElement('select');
    ['node', 'pseudo_class', 'pseudo_element', 'component', 'include'].forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent =
        t === 'node' ? 'Node' :
        t === 'pseudo_class' ? 'Pseudo-class' :
        t === 'pseudo_element' ? 'Pseudo-element' :
        t === 'component' ? 'Component' :
        'Include slot';
      typeSelect.appendChild(opt);
    });
    container.appendChild(typeLabel);
    container.appendChild(typeSelect);

    // --- Pseudo field (hidden when type = node or component) ---
    const pseudoRow = document.createElement('div');
    pseudoRow.style.display = 'none';
    const pseudoLabel = document.createElement('label');
    pseudoLabel.textContent = 'Pseudo';
    const pseudoInput = document.createElement('input');
    pseudoInput.type = 'text';
    pseudoInput.placeholder = 'e.g. :hover or ::before';
    pseudoRow.appendChild(pseudoLabel);
    pseudoRow.appendChild(pseudoInput);
    container.appendChild(pseudoRow);

    // --- Component selector (hidden when type != component) ---
    const compRow = document.createElement('div');
    compRow.style.display = 'none';
    const compLabel = document.createElement('label');
    compLabel.textContent = 'Component';
    const compSelect = document.createElement('select');
    if (components.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(no components)';
      compSelect.appendChild(opt);
    } else {
      components.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        compSelect.appendChild(opt);
      });
    }
    compRow.appendChild(compLabel);
    compRow.appendChild(compSelect);
    container.appendChild(compRow);

    // --- Tag name (hidden for pseudo/component types) ---
    const tagRow = document.createElement('div');
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag name';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = 'div';
    tagRow.appendChild(tagLabel);
    tagRow.appendChild(tagInput);
    container.appendChild(tagRow);

    // --- innerHTML (hidden for pseudo/component types) ---
    const htmlRow = document.createElement('div');
    const htmlLabel = document.createElement('label');
    htmlLabel.textContent = 'innerHTML';
    const htmlInput = document.createElement('textarea');
    htmlInput.placeholder = 'Optional text content…';
    htmlRow.appendChild(htmlLabel);
    htmlRow.appendChild(htmlInput);
    container.appendChild(htmlRow);

    // Toggle visibility based on type
    const updateVisibility = () => {
      const t = typeSelect.value;
      const showPseudo = t === 'pseudo_class' || t === 'pseudo_element';
      const showComp = t === 'component';
      const showNode = t === 'node';
      const showSimple = t === 'include';
      pseudoRow.style.display = showPseudo ? 'block' : 'none';
      compRow.style.display = showComp ? 'block' : 'none';
      tagRow.style.display = showNode ? 'block' : 'none';
      htmlRow.style.display = showNode ? 'block' : 'none';
      // include type shows nothing extra
    };
    typeSelect.addEventListener('change', updateVisibility);

    // --- Save ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Create';
    saveBtn.addEventListener('click', () => {
      const type = typeSelect.value;

      let newNode;
      if (type === 'node') {
        const tag = tagInput.value.trim() || 'div';
        const innerHTML = htmlInput.value;
        const attrs = innerHTML ? { textContent: innerHTML } : {};
        newNode = new Node(tag, attrs);
      } else if (type === 'component') {
        newNode = new Node('div', {});
        newNode.type = 'component';
        newNode.component_name = compSelect.value;
        newNode.tagName = '[component]';
      } else if (type === 'include') {
        newNode = new Node('div', {});
        newNode.type = 'include';
        newNode.tagName = '[include]';
      } else {
        // Pseudo — only pseudo marker matters
        newNode = new Node('div', {});
        newNode.type = type;
        newNode.pseudo = pseudoInput.value.trim();
        newNode.tagName = type === 'pseudo_class' ? ':pseudo-class' : '::pseudo-element';
      }

      if (parentNode) {
        parentNode.items.push(newNode);
      } else {
        containerObj.items.push(newNode);
      }

      if (this.componentId != null) {
        project.edited_at = Date.now();
        saveProject(this.projectId, project);
      } else {
        savePage(this.projectId, this.pageId, containerObj);
      }

      const prefix = this.componentId != null
        ? `/project/${this.projectId}/components/${this.componentId}`
        : `/project/${this.projectId}/${this.pageId}`;

      if (this.parentNodeId) {
        this.router.navigate(`${prefix}/node/${this.parentNodeId}`);
      } else {
        this.router.navigate(prefix);
      }
    });
    container.appendChild(saveBtn);

    // --- Cancel ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      const prefix = this.componentId != null
        ? `/project/${this.projectId}/components/${this.componentId}`
        : `/project/${this.projectId}/${this.pageId}`;

      if (this.parentNodeId) {
        this.router.navigate(`${prefix}/node/${this.parentNodeId}`);
      } else {
        this.router.navigate(prefix);
      }
    });
    container.appendChild(cancelBtn);

    return container;
  }
}
