/**
 * Элемент DOM-дерева страницы.
 *
 * Поля:
 *   id          — случайный ID (строка)
 *   tagName     — имя тега (например "div", "p")
 *   textContent — внутреннее содержимое (innerHTML)
 *   items       — массив вложенных Node
 *   attrs       — словарь атрибутов { key: value }
 */

let _nodeCounter = 0;

function randomNodeId() {
    _nodeCounter++;
    return `n_${Date.now().toString(36)}_${_nodeCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

class Node {
    constructor({ id, tagName = 'div', textContent = '', items = [], attrs = {} }) {
        this.id = id || randomNodeId();
        this.tagName = tagName;
        this.textContent = textContent;
        this.items = items;
        this.attrs = attrs;
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

        for (const child of this.items) {
            el.appendChild(child.toDOM());
        }

        return el;
    }
}

export default Node;
