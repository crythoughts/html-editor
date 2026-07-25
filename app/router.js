/**
 * Hash-based SPA router.
 *
 * Routes are matched against the hash fragment after `#editor`.
 * Supports path parameters (`:param`) and query strings (`?key=value`).
 *
 * Usage:
 *
 *   const router = new Router({
 *       container: document.getElementById('editor'),
 *       routes: [
 *           { path: '/', component: HomePage },
 *           { path: '/documents/:id', component: DocumentPage },
 *       ],
 *   });
 *   router.init();
 *
 * A page component must implement:
 *   - render(container, { params, query })  – called when the route is entered
 *   - destroy()                             – called when leaving the route
 *
 * Navigate programmatically:
 *   router.navigate('/documents/42?mode=edit');
 */

class Router {
    constructor({ container, routes }) {
        if (!container) throw new Error('Router: container is required');
        this.container = container;
        this.routes = routes;
        this._currentComponent = null;
        this._boundOnHashChange = this._onHashChange.bind(this);
    }

    /* ── public API ────────────────────────────────── */

    /** Start listening to hash changes and render the initial route. */
    init() {
        window.addEventListener('hashchange', this._boundOnHashChange);
        // render the route for the current hash
        this._resolveAndRender();
    }

    /** Stop listening. */
    destroy() {
        window.removeEventListener('hashchange', this._boundOnHashChange);
        this._destroyCurrentComponent();
    }

    /**
     * Navigate to a path (without the `#editor` prefix).
     *
     * @param {string} path – e.g. `/documents/42?mode=edit`
     */
    navigate(path) {
        window.location.hash = '#editor' + path;
    }

    /** Return the current parsed route info, or null if nothing matched. */
    currentRoute() {
        return this._match(this._hashPath());
    }

    /* ── internals ─────────────────────────────────── */

    _onHashChange() {
        this._resolveAndRender();
    }

    /** Extract the path + query string from the hash after `#editor` */
    _hashPath() {
        const hash = window.location.hash;
        // strip the leading `#editor` prefix
        const prefix = '#editor';
        if (!hash.startsWith(prefix)) return '/';
        const rest = hash.slice(prefix.length);
        // rest can be empty, just `/`, or `/some/path?query`
        return rest || '/';
    }

    /**
     * Parse query string into a plain object.
     * Returns {} when empty.
     */
    _parseQuery(queryString) {
        const query = {};
        if (!queryString) return query;
        // strip leading '?'
        const qs = queryString.startsWith('?') ? queryString.slice(1) : queryString;
        for (const part of qs.split('&')) {
            if (!part) continue;
            const idx = part.indexOf('=');
            let key, value;
            if (idx === -1) {
                key = decodeURIComponent(part);
                value = '';
            } else {
                key = decodeURIComponent(part.slice(0, idx));
                value = decodeURIComponent(part.slice(idx + 1));
            }
            // support multiple values for the same key
            if (Object.prototype.hasOwnProperty.call(query, key)) {
                if (!Array.isArray(query[key])) {
                    query[key] = [query[key]];
                }
                query[key].push(value);
            } else {
                query[key] = value;
            }
        }
        return query;
    }

    /**
     * Try to match `pathString` (e.g. `/documents/42?mode=edit`) against
     * registered routes.
     *
     * @returns {{ route, params, query } | null}
     */
    _match(pathString) {
        // split off query string
        const qIdx = pathString.indexOf('?');
        const pathname = qIdx === -1 ? pathString : pathString.slice(0, qIdx);
        const queryString = qIdx === -1 ? '' : pathString.slice(qIdx);
        const query = this._parseQuery(queryString);

        for (const route of this.routes) {
            const paramNames = [];
            // Build a regex from the route pattern, capturing `:param` segments
            const pattern = route.path.replace(/:([^/]+)/g, (_, name) => {
                paramNames.push(name);
                return '([^/]+)';
            });
            const re = new RegExp('^' + pattern + '$');
            const m = re.exec(pathname);
            if (m) {
                const params = {};
                for (let i = 0; i < paramNames.length; i++) {
                    params[paramNames[i]] = decodeURIComponent(m[i + 1]);
                }
                return { route, params, query };
            }
        }
        return null;
    }

    _destroyCurrentComponent() {
        if (this._currentComponent) {
            try {
                this._currentComponent.destroy();
            } catch (e) {
                console.warn('Router: component.destroy() threw', e);
            }
            this._currentComponent = null;
        }
    }

    _resolveAndRender() {
        const hashPath = this._hashPath();
        const match = this._match(hashPath);

        if (!match) {
            console.warn(`Router: no route matched "${hashPath}"`);
            this._destroyCurrentComponent();
            this.container.innerHTML = '';
            return;
        }

        // If the same component class is already mounted, just re-render it.
        // Otherwise destroy the old one first.
        if (this._currentComponent && this._currentComponent.constructor !== match.route.component) {
            this._destroyCurrentComponent();
        }

        if (!this._currentComponent) {
            this._currentComponent = new match.route.component();
        }

        // Clear and render
        this.container.innerHTML = '';
        this._currentComponent.render(this.container, {
            params: match.params,
            query: match.query,
            router: this,
        });
    }
}

export default Router;
