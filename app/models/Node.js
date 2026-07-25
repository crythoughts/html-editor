/**
 * Элемент DOM-дерева страницы.
 *
 * Поля:
 *   id          — автоинкрементный ID в рамках страницы
 *   tagName     — имя тега (например "div", "p")
 *   textContent — текстовое содержимое
 *   items       — массив вложенных Node
 *   attrs       — словарь атрибутов { key: value }
 */
class Node {
    constructor({ id, tagName = 'div', textContent = '', items = [], attrs = {} }) {
        this.id = id;
        this.tagName = tagName;
        this.textContent = textContent;
        this.items = items;
        this.attrs = attrs;
    }
}

export default Node;
