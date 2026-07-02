/**
 * Storage module - handles localStorage persistence and file import/export.
 */

class ProjectStorage {
  static STORAGE_KEY = "html_editor_projects";

  /**
   * Save a project to localStorage.
   */
  static save(project) {
    project.touch();
    const projects = this.listAll();
    const idx = projects.findIndex((p) => p._id === project._id);
    const data = project.toJSON();

    if (idx >= 0) {
      projects[idx] = data;
    } else {
      projects.push(data);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
      return true;
    } catch (e) {
      console.error("Failed to save project:", e);
      return false;
    }
  }

  /**
   * Load all projects from localStorage.
   */
  static listAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to load projects:", e);
      return [];
    }
  }

  /**
   * Load a single project by ID.
   */
  static load(id) {
    const projects = this.listAll();
    const data = projects.find((p) => p._id === id);
    return data ? Project.fromJSON(data) : null;
  }

  /**
   * Delete a project by ID.
   */
  static delete(id) {
    const projects = this.listAll();
    const filtered = projects.filter((p) => p._id !== id);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error("Failed to delete project:", e);
      return false;
    }
  }

  /**
   * Export a project as a downloadable JSON file.
   */
  static download(project, filename = null) {
    const ts = Date.now();
    const safeName =
      project.name
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
        .replace(/\.+$/, "")
        .substring(0, 100) || "project";
    const name = filename || `${safeName}_${ts}.json`;
    const json = JSON.stringify(project.toJSON(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Parse a JSON file and return a Project instance.
   */
  static parseJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return Project.fromJSON(data);
    } catch (e) {
      console.error("Failed to parse project JSON:", e);
      return null;
    }
  }

  /**
   * Import a project from a JSON string and save to localStorage.
   */
  static import(jsonString) {
    const project = this.parseJson(jsonString);
    if (project) {
      // Generate a new ID to avoid conflicts
      project._id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      project.createdAt = Date.now();
      project.editedAt = Date.now();
      this.save(project);
      return project;
    }
    return null;
  }
}

window.ProjectStorage = ProjectStorage;
