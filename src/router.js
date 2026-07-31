/**
 * Router — minimal hash-based client-side router.
 *
 * Routes are defined with patterns like:
 *   '/'                  — project list
 *   '/create'            — create project
 *   '/project/:id'       — project detail
 *   '/render/:id'        — render result
 *
 * The :id style segments are extracted and passed as a params object
 * to the handler callback.
 */
export class Router {
  constructor() {
    this.routes = [];
    this._onHashChange = () => this.resolve();
    window.addEventListener('hashchange', this._onHashChange);
  }

  /** Unregister the global listener (cleanup). */
  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
  }

  /**
   * Register a route.
   *
   * @param {string}   pattern — e.g. '/project/:id'
   * @param {Function} handler — called with (params) when route matches
   */
  add(pattern, handler) {
    this.routes.push({ pattern, handler });
  }

  /**
   * Resolve the current window.location.hash against registered routes.
   * Calls the first matching handler, if any.
   */
  resolve() {
    const hash = window.location.hash.replace(/^#/, '') || '/';

    for (const route of this.routes) {
      const params = this._match(route.pattern, hash);
      if (params !== null) {
        route.handler(params);
        return;
      }
    }
  }

  /**
   * Compare a route pattern against a hash path.
   * Returns an object of extracted parameters, or null on mismatch.
   *
   * @param {string} pattern — e.g. '/project/:id'
   * @param {string} path    — e.g. '/project/42'
   * @returns {Object|null}
   */
  _match(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      if (pp.startsWith(':')) {
        params[pp.slice(1)] = pathParts[i];
      } else if (pp !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  /**
   * Programmatically navigate to a hash route.
   * @param {string} hash — e.g. '/create'
   */
  navigate(hash) {
    window.location.hash = hash;
  }
}
