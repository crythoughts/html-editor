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
  `id`, a `type` (`'node'` by default, `'pseudo_class'`, or
  `'pseudo_element'`), `pseudo` (CSS notation like `':hover'` or
  `'::before'`), `tagName`, an `attrs` dictionary, a `styles` dictionary
  (CSS property / value pairs), and a recursive `items` array of child `Node`
  objects. Provides `toDOM()` which produces a real `HTMLElement` subtree;
  pseudo-type children are skipped during DOM generation (their styles are
  only relevant for the parent's data model).

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
- **`validateProjectJson(obj)`** — validates a parsed JSON object has the
  required Project fields (`name`, `pages` array, etc.). Returns
  `{ valid, errors[] }`.

## 4. Hash-based router (`src/router.js`)

A zero-dependency client-side router that listens to the `hashchange` event.
Routes are defined as strings with `:param` segments (e.g. `/project/:id`).
The router extracts parameters and dispatches to the registered handler.

Available routes:

| Route                                       | View                | Description                            |
|---------------------------------------------|---------------------|----------------------------------------|
| `#/`                                        | ProjectListView     | List all projects                      |
| `#/create`                                  | ProjectCreateView   | Form to create a new project           |
| `#/import`                                  | ProjectImportView   | Import a project from JSON             |
| `#/project/:pid`                            | ProjectDetailView   | View / manage a single project         |
| `#/project/:pid/export-json`                | ProjectExportJsonView | View / download project as JSON      |
| `#/project/:pid/:pageId`                    | PageDetailView      | View / edit a single page              |
| `#/project/:pid/:pageId/export-html`        | PageExportHtmlView  | View / download page as HTML           |
| `#/project/:pid/:pageId/node/create`        | NodeCreateView      | Create a top-level node                |
| `#/project/:pid/:pageId/node/:nid/create`   | NodeCreateView      | Create a child node under :nid         |
| `#/project/:pid/:pageId/node/:nid/edit`     | NodeEditView        | Edit / delete node :nid                |
| `#/.../node/:nid/edit/styles`               | NodeStylesView      | Edit inline styles (key/value pairs)   |
| `#/.../node/:nid/edit/id`                   | NodeIdView          | Edit the HTML id attribute             |
| `#/.../node/:nid/edit/classes`              | NodeClassesView     | Edit class attribute (space-separated) |
| `#/project/:pid/:pageId/node/:nid`          | NodeDetailView      | Inspect a node and its children        |
| `#/render/:pid/:pageId`                     | RenderView          | Full rendered output preview           |

## 5. View layer (`src/views/`)

Four plain-DOM views that render into the `#app` mount point:

- **ProjectListView** — shows a list of all saved projects with delete buttons,
  a **+ New Project** button, and an **Import from JSON** button.
- **ProjectCreateView** — form with fields for name, description, author, and
  initial page title. On save, creates a `Project` with a demo `Page` and
  navigates to the detail view.
- **ProjectImportView** — textarea to paste a project JSON string, validates
  the required fields (`name`, `pages`, etc.), and on success restores the
  project via `restoreInstance()` and adds it to the project list.
- **ProjectDetailView** — displays project metadata (name, description, author,
  timestamps, page count). Lists pages as clickable links to the page detail.
  Provides **Export to JSON** (navigates to a view with pretty-printed JSON),
  **Export to file** (triggers a `.json` file download directly),
  **Back to list**, and **Delete** actions.
- **ProjectExportJsonView** — displays the serialised project as
  pretty-printed JSON inside a `<pre>` block. Provides a **Download as file**
  button that triggers a `.json` file download.
- **PageDetailView** — displays a single page. Provides an editable title
  field with a **Save title** button, a **+ Create node** link to add a
  top-level node, a list of top-level nodes as clickable links to their node
  detail view, and **Render page** / **Export to HTML** buttons.
- **NodeDetailView** — displays a node's properties: type, tag name / pseudo
  notation, ID, attributes, a **+ Create child node** link, an **Edit node**
  link, and a recursive list of regular child nodes. Pseudo children are
  hidden by default behind a **Show pseudo-classes** toggle link.
  Provides a **Back to page** button.
- **NodeCreateView** — form to create a new node with a type selector
  (Node / Pseudo-class / Pseudo-element). For regular nodes: tag name and
  innerHTML fields. For pseudo types: a pseudo field (`:hover`, `::before`)
  and the tag/innerHTML fields are hidden.
- **NodeEditView** — form to edit a node. Shows type (read-only) and pseudo
  field (only for pseudo types). For regular nodes: tag name, innerHTML,
  attributes (key/value rows with +/-), and links to dedicated sub-editors
  for styles, id, and classes. For pseudo types: only the pseudo field and
  styles link are shown (tag, innerHTML, attributes, id, classes are
  irrelevant).
- **NodeEditView** — form to edit a node's tag name, innerHTML, and
  arbitrary attributes (key/value rows with +/- buttons). Provides links
  to dedicated sub-editors for **styles**, **id**, and **classes**.
  Also provides a **Save changes** button and a **Delete node** button.
- **NodeStylesView** — dedicated editor for a node's inline `styles`
  dictionary. Each style is a row with CSS property and value inputs, plus
  +/- buttons for adding / removing entries.
- **NodeIdView** — dedicated editor for the node's `id` HTML attribute.
  Simple text input that updates `attrs.id`.
- **NodeClassesView** — dedicated editor for the node's `class` HTML
  attribute. A single text input accepts space-separated class names and
  updates `attrs.class`.
- **PageExportHtmlView** — serialises a page's rendered DOM into an HTML
  string (via `Page.render()` + `innerHTML`), displayed inside a `<pre>`
  block. Provides a **Download as file** button that triggers a `.html`
  file download.
- **RenderView** — renders a specific page of a project as real DOM elements
  (using `Page.render()` internals). Designed to be opened in a separate tab
  for a clean, unstyled preview.

## 6. Modular architecture

All source files are ES modules (`type="module"`). Each class lives in its own
file under `src/models/`. Views are separated in `src/views/`. The router and
storage layer are independent modules. No bundler required — the browser loads
modules natively.
