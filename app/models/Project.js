import Page from './Page.js';

/**
 * Проект.
 *
 * Поля:
 *   name        — название
 *   id          — автоинкрементный глобальный ID
 *   description — описание
 *   author      — автор
 *   created_at  — unix-timestamp (сек)
 *   edited_at   — unix-timestamp (сек)
 *   pages       — массив Page
 */
class Project {
    constructor({ name = 'New Project', id, description = '', author = '', created_at, edited_at, pages = [] }) {
        this.name = name;
        this.id = id;
        this.description = description;
        this.author = author;
        const now = Math.floor(Date.now() / 1000);
        this.created_at = created_at || now;
        this.edited_at = edited_at || now;
        this.pages = pages;
    }
}

export default Project;
