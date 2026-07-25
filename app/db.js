import Project from './models/Project.js';
import Page from './models/Page.js';
import Node from './models/Node.js';

const STORAGE_KEY = 'editor_projects';
const COUNTER_KEY = 'editor_next_project_id';

/* ── helpers ─────────────────────────────────────── */

function nextProjectId() {
    const id = Number(localStorage.getItem(COUNTER_KEY)) || 1;
    localStorage.setItem(COUNTER_KEY, String(id + 1));
    return id;
}

/** Deep-reconstruct a plain JSON tree into Node instances. */
function reviveNode(raw) {
    if (!raw) return raw;
    return new Node({
        id: raw.id,
        tagName: raw.tagName,
        textContent: raw.textContent,
        items: (raw.items || []).map(reviveNode),
        attrs: { ...(raw.attrs || {}) },
    });
}

/** Deep-reconstruct a plain JSON page into a Page instance. */
function revivePage(raw) {
    if (!raw) return raw;
    return new Page({
        title: raw.title,
        id: raw.id,
        items: (raw.items || []).map(reviveNode),
    });
}

/** Deep-reconstruct a plain JSON project into a Project instance. */
function reviveProject(raw) {
    if (!raw) return raw;
    return new Project({
        name: raw.name,
        id: raw.id,
        description: raw.description,
        author: raw.author,
        created_at: raw.created_at,
        edited_at: raw.edited_at,
        pages: (raw.pages || []).map(revivePage),
    });
}

/* ── public API ──────────────────────────────────── */

/**
 * Load all projects from localStorage.
 * @returns {Project[]}
 */
export function loadProjects() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return arr.map(reviveProject);
    } catch (e) {
        console.error('db.loadProjects error:', e);
        return [];
    }
}

/**
 * Save all projects to localStorage.
 * @param {Project[]} projects
 */
export function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/**
 * Create a new project with a generated ID and return it.
 * Does NOT persist — call saveProjects() afterwards.
 */
export function createProject(data = {}) {
    return new Project({ id: nextProjectId(), ...data });
}

/**
 * Find a project by ID.
 * @param {number} id
 * @returns {Project | undefined}
 */
export function findProject(id) {
    const projects = loadProjects();
    return projects.find(p => p.id === Number(id));
}

/**
 * Find a page by ID within a project.
 * @param {Project} project
 * @param {number} pageId
 * @returns {Page | undefined}
 */
export function findPage(project, pageId) {
    return project.pages.find(p => p.id === Number(pageId));
}

/**
 * Find a node by its random ID within a page (recursive).
 * @param {Page} page
 * @param {string} nodeId
 * @returns {{ node: Node, parent: Node|null } | undefined}
 */
export function findNode(page, nodeId) {
    function walk(nodes, parent) {
        for (const n of nodes) {
            if (n.id === nodeId) return { node: n, parent };
            const found = walk(n.items, n);
            if (found) return found;
        }
        return undefined;
    }
    return walk(page.items, null);
}

/**
 * Generate a unique page ID within a project.
 * @param {Project} project
 * @returns {number}
 */
export function nextPageId(project) {
    const max = project.pages.reduce((m, p) => Math.max(m, p.id || 0), 0);
    return max + 1;
}

/** Format a unix timestamp for display. */
export function fmtTime(unixSec) {
    if (!unixSec) return '—';
    return new Date(unixSec * 1000).toLocaleString();
}
