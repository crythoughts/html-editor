import { Preset, collectSettings } from './Preset.js';
import { Node } from '../models/Node.js';

/**
 * ShapesPreset — inserts an SVG element with a geometric shape.
 * Settings: shape type, fill colour, stroke colour, stroke width.
 */
export class ShapesPreset extends Preset {
  get name() { return 'Shape'; }

  getSettingsWindow() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
    div.innerHTML = '<h3>Shape settings</h3>';

    const field = (label) => {
      const r = document.createElement('label');
      r.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
      r.innerHTML = `<span>${label}</span>`;
      return r;
    };

    // Shape type
    const shapeRow = field('Shape');
    const shapeSel = document.createElement('select');
    shapeSel.setAttribute('data-key', 'shape');
    ['circle', 'square', 'triangle', 'star'].forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      shapeSel.appendChild(o);
    });
    shapeRow.appendChild(shapeSel);
    div.appendChild(shapeRow);

    // Fill
    const fillRow = field('Fill');
    const fillInp = document.createElement('input');
    fillInp.type = 'color';
    fillInp.setAttribute('data-key', 'fill');
    fillInp.value = '#3b82f6';
    fillRow.appendChild(fillInp);
    div.appendChild(fillRow);

    // Stroke colour
    const scRow = field('Stroke');
    const scInp = document.createElement('input');
    scInp.type = 'color';
    scInp.setAttribute('data-key', 'stroke');
    scInp.value = '#1e3a5f';
    scRow.appendChild(scInp);
    div.appendChild(scRow);

    // Stroke width
    const swRow = field('Stroke width');
    const swInp = document.createElement('input');
    swInp.type = 'number';
    swInp.setAttribute('data-key', 'strokeWidth');
    swInp.value = '2';
    swInp.min = '0';
    swInp.style.width = '80px';
    swRow.appendChild(swInp);
    div.appendChild(swRow);

    return div;
  }

  getTemplate(parentNode, settings) {
    const fill = settings.fill || '#3b82f6';
    const stroke = settings.stroke || '#1e3a5f';
    const sw = settings.strokeWidth || '2';
    const shape = settings.shape || 'circle';

    // Build the SVG node
    const svg = new Node('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 100 100',
      width: '100',
      height: '100',
    });
    svg.presetName = this.name;
    svg.styles.display = 'block';

    // Shape definitions
    const shapes = {
      circle: { tag: 'circle', attrs: { cx: '50', cy: '50', r: '40' } },
      square: { tag: 'rect', attrs: { x: '10', y: '10', width: '80', height: '80' } },
      triangle: { tag: 'polygon', attrs: { points: '50,10 90,90 10,90' } },
      star: {
        tag: 'polygon',
        attrs: {
          points:
            '50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35',
        },
      },
    };

    const def = shapes[shape] || shapes.circle;
    const shapeNode = new Node(def.tag, {
      ...def.attrs,
      fill,
      stroke,
      'stroke-width': sw,
    });
    shapeNode.presetName = this.name;
    shapeNode.undraggable = true;
    svg.items.push(shapeNode);

    parentNode.items.push(svg);
    return svg;
  }
}
