# Abilities

## 1. Serialization system (`src/models/Serializable.js` + `src/storage.js`)

A polymorphic serialization layer that converts class instances to JSON and back,
preserving full type information. Uses a global type registry so that `Project`,
`Page`, and `Node` objects stored in `localStorage` are restored as genuine
instances (with methods and prototype chain intact) rather than plain objects.

- **`Serializable.toJSON()`** — recursively walks own properties and emits a
  `_type` marker alongside the data.
- **`registerType(name, cls)`** — registers a constructor under a marker name.
- **`restoreInstance(data)`** — deep-restores a parsed JSON tree into proper
  class instances by looking up the marker in the registry.

## 2. Data models (`src/models/`)

Three domain classes that mirror the structure of an HTML document:

- **`Project`** — top-level container holding a name, description, author,
  creation / edit timestamps (unix ms), and an ordered list of `Page` objects.
- **`Page`** — a single "document" with a `title` and a flat list of top-level
  `Node` items. Provides a `render()` method that returns a `DocumentFragment`.
- **`Node`** — a tree node representing an HTML element. Carries a unique
  `id` (incremental integer string by default, or UUID v4 when `uuid_type` is
  set to `'uuid'`), `tagName`, an `attrs` dictionary, and a recursive `items`
  array of child `Node` objects. Provides `toDOM()` which produces a real
  `HTMLElement` subtree.

## 3. LocalStorage CRUD (`src/storage.js`)

Read / write / delete helpers scoped to a single `localStorage` key
(`html_editor_projects`). Exports `getProjects`, `saveProjects`,
`getProjectById`, `saveProject`, `addProject`, and `deleteProject`.
All read operations return fully restored class instances.

Additional helpers:
- **`getPageById(projectId, pageId)`** / **`savePage(...)`** — page-level access.
- **`getNextNodeId()`** — generates a node id according to the `uuid_type`
  setting (`'incremental'` or `'uuid'`). The counter for incremental mode is
  persisted in `localStorage` under `node_id_counter`.
- **`getUuidType()`** / **`setUuidType(type)`** — get or set the id strategy.

## 4. Hash-based router (`src/router.js`)

A zero-dependency client-side router that listens to the `hashchange` event.
Routes are defined as strings with `:param` segments (e.g. `/project/:id`).
The router extracts parameters and dispatches to the registered handler.

Available routes:

| Route                               | View               | Description                            |
|-------------------------------------|--------------------|----------------------------------------|
| `#/`                                | ProjectListView    | List all projects                      |
| `#/create`                          | ProjectCreateView  | Form to create a new project           |
| `#/project/:pid`                    | ProjectDetailView  | View / manage a single project         |
| `#/project/:pid/:pageId`            | PageDetailView     | View / edit a single page              |
| `#/project/:pid/:pageId/node/create`       | NodeCreateView     | Create a top-level node                 |
| `#/project/:pid/:pageId/node/:nid/create`  | NodeCreateView     | Create a child node under :nid          |
| `#/project/:pid/:pageId/node/:nid/edit`    | NodeEditView       | Edit / delete node :nid                 |
| `#/project/:pid/:pageId/node/:nid`         | NodeDetailView     | Inspect a node and its children         |
| `#/render/:pid/:pageId`             | RenderView         | Full rendered output preview           |

## 5. View layer (`src/views/`)

Four plain-DOM views that render into the `#app` mount point:

- **ProjectListView** — shows a list of all saved projects with delete buttons
  and a "New Project" button.
- **ProjectCreateView** — form with fields for name, description, author, and
  initial page title. On save, creates a `Project` with a demo `Page` and
  navigates to the detail view.
- **ProjectDetailView** — displays project metadata (name, description, author,
  timestamps, page count). Lists pages as clickable links to the page detail.
  Provides **Back to list** and **Delete** actions.
- **PageDetailView** — displays a single page. Provides an editable title
  field with a **Save title** button, a **+ Create node** link to add a
  top-level node, a list of top-level nodes as clickable links to their node
  detail view, and a **Render page** button that opens the rendered output
  for this specific page in a new tab.
- **NodeDetailView** — displays a node's properties: tag name, ID,
  attributes, a **+ Create child node** link, an **Edit node** link to modify
  or delete the node, and a recursive list of child nodes (each is a
  clickable link deeper into the hierarchy). Provides a **Back to page**
  button.
- **NodeCreateView** — form to create a new node. Fields: tag name and
  innerHTML. The node is added as a top-level page item or as a child of a
  specific parent node, depending on which route triggered the view.
- **NodeEditView** — form to edit a node's tag name and innerHTML.
  Provides a **Save changes** button and a **Delete node** button that
  removes the node from the tree and navigates back to the page.
- **RenderView** — renders a specific page of a project as real DOM elements
  (using `Page.render()` internals). Designed to be opened in a separate tab
  for a clean, unstyled preview.

## 6. Modular architecture

All source files are ES modules (`type="module"`). Each class lives in its own
file under `src/models/`. Views are separated in `src/views/`. The router and
storage layer are independent modules. No bundler required — the browser loads
modules natively.
