import Page from './Page.js';

/**
 * Проект.
 *
 * Поля:
 *   name        — название
 *   id          — автоинкрементный глобальный ID
 *   description — описание
 *   author      — автор
 *   created_at  — дата создания (ISO)
 *   edited_at   — дата последнего изменения (ISO)
 *   pages       — массив Page
 */
class Project {
    constructor({ name = 'New Project', id, description = '', author = '', created_at, edited_at, pages = [] }) {
        this.name = name;
        this.id = id;
        this.description = description;
        this.author = author;
        this.created_at = created_at || new Date().toISOString();
        this.edited_at = edited_at || this.created_at;
        this.pages = pages;
    }
}

export default Project;
