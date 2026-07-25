/**
 * Элемент DOM-дерева страницы.
 *
 * Поля:
 *   id          — случайный ID (строка)
 *   type        — тип ноды ("node" по умолчанию)
 *   tagName     — имя тега (например "div", "p")
 *   textContent — внутреннее содержимое (innerHTML)
 *   items       — массив вложенных Node
 *   attrs       — словарь атрибутов { key: value }
 *   styles      — словарь CSS-стилей { property: value }
 */

let _nodeCounter = 0;

function randomNodeId() {
    _nodeCounter++;
    return `n_${Date.now().toString(36)}_${_nodeCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

class Node {
    constructor({ id, type, tagName = 'div', textContent = '', items = [], attrs = {}, styles = {} }) {
        this.id = id || randomNodeId();
        this.type = type || 'node';
        this.tagName = tagName;
        this.textContent = textContent;
        this.items = items;
        this.attrs = attrs;
        this.styles = styles;
    }

    /** Преобразовать ноду и всех потомков в DOM-элемент. */
    toDOM() {
        const el = document.createElement(this.tagName);

        if (this.textContent) {
            el.innerHTML = this.textContent;
        }

        for (const [key, value] of Object.entries(this.attrs)) {
            el.setAttribute(key, value);
        }

        // Merge styles into the style attribute
        const styleKeys = Object.keys(this.styles);
        if (styleKeys.length > 0) {
            const styleStr = styleKeys.map(k => `${k}:${this.styles[k]}`).join(';');
            const existing = el.getAttribute('style');
            el.setAttribute('style', existing ? existing + ';' + styleStr : styleStr);
        }

        for (const child of this.items) {
            el.appendChild(child.toDOM());
        }

        return el;
    }
}

export default Node;
