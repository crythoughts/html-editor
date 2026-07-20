import { getPageById, getProjectById } from '../storage.js';

/**
 * NodeDetailView — shows a single node's properties and its children.
 * Works for both page nodes and component nodes (when componentId is given).
 */
export class NodeDetailView {
  constructor(router, projectId, pageId, nodeId, componentId) {
    this.router = router;
    this.projectId = parseInt(projectId, 10);
    this.pageId = pageId != null ? parseInt(pageId, 10) : null;
    this.nodeIds = nodeId ? nodeId.split(',') : [];
    this.componentId = componentId != null ? parseInt(componentId, 10) : null;
  }

  render() {
    const container = document.createElement('div');

    const isComp = this.componentId != null;
    let containerObj = null;
    let project = null;

    if (isComp) {
      project = getProjectById(this.projectId);
      containerObj = project ? project.components[this.componentId] : null;
    } else {
      const page = getPageById(this.projectId, this.pageId);
      containerObj = page;
    }

    // Resolve all requested nodes
    const nodes = [];
    for (const id of this.nodeIds) {
      const n = containerObj ? containerObj.findNodeById(id.trim()) : null;
      if (n) nodes.push(n);
    }

    if (nodes.length === 0) {
      container.appendChild(document.createTextNode('Node(s) not found.'));

      const back = document.createElement('button');
      back.textContent = isComp ? 'Back to component' : 'Back to page';
      back.addEventListener('click', () =>
        this.router.navigate(
          isComp
            ? `/project/${this.projectId}/components/${this.componentId}/edit`
            : `/project/${this.projectId}/${this.pageId}`,
        ),
      );
      container.appendChild(back);
      return container;
    }

    const base = isComp
      ? `#/project/${this.projectId}/components/${this.componentId}`
      : `#/project/${this.projectId}/${this.pageId}`;

    // --- Render each selected node ---
    nodes.forEach((node, idx) => {
      if (idx > 0) {
        const sep = document.createElement('hr');
        container.appendChild(sep);
      }

      // Breadcrumb
      const bc = document.createElement('div');
      const pl = document.createElement('a');
      pl.href = isComp ? `${base}/edit` : base;
      pl.textContent = isComp ? (containerObj.name || 'Component') : 'Page';
      bc.appendChild(pl);
      bc.appendChild(
        document.createTextNode(
          node.type === 'include' ? ' / [Include slot]' :
          node.type === 'component'
            ? ` / [Component: ${node.component_name}]`
            : ` / <${node.tagName}>`,
        ),
      );
      container.appendChild(bc);

      // Info
      const info = document.createElement('div');
      if (node.type === 'include') info.textContent = 'Include slot';
      else if (node.type === 'component') info.textContent = `Component: ${node.component_name}`;
      else if (node.type !== 'node') info.textContent = `Type: ${node.type} \u2014 ${node.pseudo}`;
      else info.textContent = `Tag: <${node.tagName}>`;
      container.appendChild(info);

      // ID
      const idR = document.createElement('div');
      idR.textContent = `ID: ${node.id}`;
      container.appendChild(idR);

      // Attributes
      const ah = document.createElement('h4');
      ah.textContent = 'Attributes';
      container.appendChild(ah);
      const aKeys = Object.keys(node.attrs);
      if (aKeys.length === 0) {
        const n = document.createElement('p');
        n.textContent = '(none)';
        container.appendChild(n);
      } else {
        const al = document.createElement('ul');
        for (const [k, v] of Object.entries(node.attrs)) {
          const li = document.createElement('li');
          li.textContent = `${k} = "${v}"`;
          al.appendChild(li);
        }
        container.appendChild(al);
      }

      // Actions
      const act = document.createElement('div');
      const ccl = document.createElement('a');
      ccl.href = `${base}/node/${node.id}/create`;
      ccl.textContent = '+ Create child node';
      act.appendChild(ccl);
      const elink = document.createElement('a');
      elink.href = `${base}/node/${node.id}/edit`;
      elink.textContent = 'Edit node';
      act.appendChild(elink);
      container.appendChild(act);

      // Children
      const rItems = node.items.filter(
        (c) => c.type === 'node' || c.type === 'component' || c.type === 'include',
      );
      const pItems = node.items.filter(
        (c) => c.type !== 'node' && c.type !== 'component' && c.type !== 'include',
      );
      const ch = document.createElement('h4');
      ch.textContent = `Children (${rItems.length})`;
      container.appendChild(ch);
      if (rItems.length === 0 && pItems.length === 0) {
        const n = document.createElement('p');
        n.textContent = '(no children)';
        container.appendChild(n);
      }
      if (rItems.length > 0) {
        const cl = document.createElement('ul');
        rItems.forEach((child) => {
          const li = document.createElement('li');
          const lk = document.createElement('a');
          lk.href = `${base}/node/${child.id}`;
          lk.textContent =
            child.type === 'include' ? '[Include slot]' :
            child.type === 'component'
              ? `[Component: ${child.component_name}] \u2014 ${child.items.length} children`
              : `<${child.tagName}> \u2014 ${child.items.length} children`;
          li.appendChild(lk);
          cl.appendChild(li);
        });
        container.appendChild(cl);
      }
      if (pItems.length > 0) {
        const pt = document.createElement('a');
        pt.href = '#';
        pt.textContent = `Show pseudo-classes (${pItems.length})`;
        const pl = document.createElement('ul');
        pl.style.display = 'none';
        pItems.forEach((child) => {
          const li = document.createElement('li');
          const lk = document.createElement('a');
          lk.href = `${base}/node/${child.id}`;
          lk.textContent = child.pseudo || child.type;
          li.appendChild(lk);
          pl.appendChild(li);
        });
        pt.addEventListener('click', (e) => {
          e.preventDefault();
          const hidden = pl.style.display === 'none';
          pl.style.display = hidden ? 'block' : 'none';
          pt.textContent = hidden ? 'Hide pseudo-classes' : `Show pseudo-classes (${pItems.length})`;
        });
        container.appendChild(pt);
        container.appendChild(pl);
      }
    });

    // --- Back ---
    const backBtn = document.createElement('button');
    backBtn.textContent = isComp ? 'Back to component' : 'Back to page';
    backBtn.addEventListener('click', () =>
      this.router.navigate(isComp ? `${base}/edit` : base),
    );
    container.appendChild(backBtn);

    return container;
  }
}
