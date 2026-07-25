import Node from './Node.js';

/**
 * Страница внутри проекта.
 *
 * Поля:
 *   title — заголовок
 *   id    — автоинкрементный ID в рамках проекта
 *   items — массив корневых Node
 */
class Page {
    constructor({ title = 'Untitled', id, items = [] }) {
        this.title = title;
        this.id = id;
        this.items = items;
    }

    /** Отрендерить все корневые ноды в переданный контейнер. */
    render(container) {
        container.innerHTML = '';
        for (const item of this.items) {
            container.appendChild(item.toDOM());
        }
    }
}

export default Page;
