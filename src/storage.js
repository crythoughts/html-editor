/**
 * storage.js — localStorage abstraction with a type registry for polymorphic
 * deserialisation of Serializable subclasses (Project, Page, Node).
 *
 * Usage:
 *   saveProjects([project1, project2]);
 *   const projects = getProjects();   // instances restored with correct types
 */

// ---------------------------------------------------------------------------
// Type registry
// ---------------------------------------------------------------------------

const registry = new Map();

/**
 * Register a Serializable subclass so it can be restored from JSON.
 * Normally called as a side-effect of importing the class module.
 *
 * @param {string} name — must match the class's _type marker
 * @param {Function} cls — the class constructor
 */
export function registerType(name, cls) {
  registry.set(name, cls);
}

/**
 * Deep-restore a plain object (or array) tree into proper class instances.
 * Uses the _type marker inserted by Serializable.toJSON() to look up the
 * original constructor.
 *
 * @param {*} data — a parsed JSON value
 * @returns {*} — restored instance(s) or primitive value
 */
export function restoreInstance(data) {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => restoreInstance(item));
  }

  const Cls = registry.get(data._type);
  if (Cls) {
    const instance = Object.create(Cls.prototype);
    for (const [key, value] of Object.entries(data)) {
      if (key !== '_type') {
        instance[key] = restoreInstance(value);
      }
    }
    return instance;
  }

  // Plain object — return as-is
  return data;
}

// ---------------------------------------------------------------------------
// Low-level localStorage helpers
// ---------------------------------------------------------------------------

function saveItem(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadItem(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Project-specific CRUD
// ---------------------------------------------------------------------------

const PROJECTS_KEY = 'html_editor_projects';

/**
 * Retrieve all projects from localStorage, restored as Project instances.
 * @returns {Project[]}
 */
export function getProjects() {
  const data = loadItem(PROJECTS_KEY);
  if (!data) return [];
  return data.map((item) => restoreInstance(item));
}

/**
 * Persist an array of Project instances.
 * @param {Project[]} projects
 */
export function saveProjects(projects) {
  saveItem(PROJECTS_KEY, projects.map((p) => p.toJSON()));
}

/**
 * Get a single project by its index in the stored array.
 * @param {number} id — array index
 * @returns {Project|null}
 */
export function getProjectById(id) {
  const projects = getProjects();
  return projects[id] ?? null;
}

/**
 * Replace (or append) a project at the given index.
 * @param {number} id  — array index; use projects.length to append
 * @param {Project} project
 */
export function saveProject(id, project) {
  const projects = getProjects();
  projects[id] = project;
  saveProjects(projects);
}

/**
 * Append a new project.
 * @param {Project} project
 * @returns {number} the index of the newly added project
 */
export function addProject(project) {
  const projects = getProjects();
  projects.push(project);
  saveProjects(projects);
  return projects.length - 1;
}

/**
 * Delete a project by index.
 * @param {number} id
 */
export function deleteProject(id) {
  const projects = getProjects();
  projects.splice(id, 1);
  saveProjects(projects);
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

/**
 * Get a page by project index and page index.
 * @param {number} projectId
 * @param {number} pageId
 * @returns {Page|null}
 */
export function getPageById(projectId, pageId) {
  const project = getProjectById(projectId);
  if (!project) return null;
  return project.pages[pageId] ?? null;
}

/**
 * Persist a single page in a project.
 * @param {number} projectId
 * @param {number} pageId
 * @param {Page} page
 */
export function savePage(projectId, pageId, page) {
  const project = getProjectById(projectId);
  if (!project) return;
  project.pages[pageId] = page;
  project.edited_at = Date.now();
  saveProject(projectId, project);
}
