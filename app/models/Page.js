import Node from './Node.js';

/**
 * Страница внутри проекта.
 *
 * Поля:
 *   title — заголовок страницы
 *   id    — автоинкрементный ID в рамках проекта
 *   head  — массив (заголовочные элементы, пока пустой)
 *   items — массив элементов Node (корневые ноды)
 */
class Page {
    constructor({ title = 'Untitled', id, head = [], items = [] }) {
        this.title = title;
        this.id = id;
        this.head = head;
        this.items = items;
    }
}

export default Page;
