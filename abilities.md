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
  creation / edit timestamps (unix ms), an ordered list of `Page` objects,
  and an array of reusable `Component` templates. Components support
  **variable interpolation**: when a node's attribute value is an object
  `{ type: "variable", value: "varName" }`, the renderer resolves it
  using the component's variable definitions and any overrides provided
  by the referencing node.
- **`Component`** — a reusable template (`src/models/Component.js`) with a
  `name`, `id` (UUID), `items` (Node tree), and `variables` (array of
  `Variable`). Stored inside `Project.components`.
- **`Variable`** — a typed parameter (`src/models/Variable.js`) with `name`,
  `type` (`'str'` or `'int'`), and `default` value.
- **`Head`** — shared `<head>` content (`src/models/Head.js`) with `meta`
  (array of `MetaTag`) and `links` (array of `LinkTag`). Applied to every
  page during rendering (`RenderView` injects into `document.head`;
  `PageExportHtmlView` serialises them into the export).
- **`MetaTag`** — a `<meta>` element (`src/models/MetaTag.js`) with a
  flexible `attrs` dictionary. Provides `toDOM()`.
- **`LinkTag`** — a `<link>` element (`src/models/LinkTag.js`) with a
  flexible `attrs` dictionary. Provides `toDOM()`.
- **`Palette`** — a named collection of colours (`src/models/Palette.js`)
  with an immutable `id` (slug), `name`, `colors` (array of `Color`), and
  `enabled` flag. When enabled, its colours are emitted as CSS custom
  properties (`--color-id`) in a `:root { }` block during rendering.
- **`Color`** — a single colour entry (`src/models/Color.js`) with
  immutable `id` (slug), `name`, and `value` (hex string).
- **`Page`** — a single "document" with a `title` and a flat list of top-level
  `Node` items. Provides a `render()` method that returns a `DocumentFragment`.
- **`Node`** — a tree node representing an HTML element. Carries a unique
  `type` (`'node'`, `'pseudo_class'`, `'pseudo_element'`, `'component'`, or
  or `'component'` or `'include'`), `pseudo` (CSS pseudo notation), `component_name`
  (referenced Component name), `variables` (key/value overrides for
  Component variables), `tagName`, `attrs`, `styles`, and recursive `items`.
  Provides `toDOM(components, depth, varValues, styleRules, slotItems)` which resolves
  component references, enforces a max recursion depth of 100, resolves
  variable references in attribute values, handles CSS styles,
  and supports the **include slot** mechanism: when `type === 'include'`,
  the node renders `slotItems` (the child nodes of the parent component
  reference) at its position, enabling slot-based content projection.
  contextually: in regular (page) context styles are applied inline; in
  component context, nodes with a class or id get their styles emitted
  as a `<style>` tag with proper CSS selectors instead of inline styles.
  Pseudo-type children are skipped during DOM generation.

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
| `#/project/:pid/palettes`                   | PaletteListView     | List colour palettes                    |
| `#/project/:pid/palettes/create`            | PaletteCreateView   | Create a new palette                    |
| `#/project/:pid/palettes/:palId`            | PaletteEditView     | Edit palette name, colours, toggle      |
| `#/project/:pid/head`                       | HeadView            | Edit shared <head> (meta & link tags)   |
| `#/project/:pid/components`                 | ComponentListView   | List project components                 |
| `#/project/:pid/components/create`          | ComponentCreateView | Create a new component                 |
| `#/project/:pid/components/:cid`            | ComponentDetailView | View component details                 |
| `#/project/:pid/components/:cid/edit`       | ComponentEditView   | Edit component name, variables & items  |
| `#/.../components/:cid/node/create`          | NodeCreateView      | Create a node in a component           |
| `#/.../components/:cid/node/:nid/create`     | NodeCreateView      | Create a child node under :nid         |
| `#/.../components/:cid/node/:nid`            | NodeDetailView      | View a node inside a component         |
| `#/.../components/:cid/node/:nid/edit`       | NodeEditView        | Edit node inside a component           |
| `#/.../components/:cid/node/:nid/edit/styles` | NodeStylesView      | Edit styles of a component node        |
| `#/.../components/:cid/node/:nid/edit/id`     | NodeIdView          | Edit id of a component node            |
| `#/.../components/:cid/node/:nid/edit/classes`| NodeClassesView     | Edit classes of a component node       |
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
  timestamps, page count, component count). Lists pages as clickable links to
  the page detail. Provides **Components** (navigates to component list),
  **Export to JSON**, **Export to file**, **Back to list**, and **Delete**
  actions.
- **ProjectExportJsonView** — displays the serialised project as
  pretty-printed JSON inside a `<pre>` block. Provides a **Download as file**
  button that triggers a `.json` file download.
- **PageDetailView** — displays a single page. Provides an editable title
  field with a **Save title** button, a **+ Create node** link to add a
  top-level node, a list of top-level nodes as clickable links to their node
  detail view, and **Render page** / **Export to HTML** buttons.
- **NodeDetailView** — displays a node's properties: type, tag / pseudo /
  component name, ID, attributes, a **+ Create child node** link, an **Edit
  node** link, and a recursive list of child nodes. Pseudo children are
  hidden behind a **Show pseudo-classes** toggle. Works for both page nodes
  (`pageId` context) and component nodes (`componentId` context) — links,
  breadcrumbs, and back button adapt automatically.
- **NodeCreateView** — form to create a new node with a type selector
  (Node / Pseudo-class / Pseudo-element / Component). Works for both page
  items and component items. Supports pseudo, tag+innerHTML, and component
  reference fields depending on the selected type.
- **NodeEditView** — form to edit a node. Works for both page and component
  contexts. Shows type (read-only), and adapts fields: pseudo name for
  pseudo types, component name + variable overrides for component
  references, and tag + innerHTML + attributes + sub-editor links for
  regular nodes.
- **NodeEditView** — form to edit a node's tag name, innerHTML, and
  arbitrary attributes (key/value rows with +/- buttons). Provides links
  to dedicated sub-editors for **styles**, **id**, and **classes**.
  Also provides a **Save changes** button and a **Delete node** button.
- **NodeStylesView** — editor for a node's inline `styles` dictionary
  (CSS property / value rows with +/-). Works for both page and component
  contexts.
- **NodeIdView** — editor for the node's `id` HTML attribute. Works for
  both page and component contexts.
- **NodeClassesView** — editor for the node's `class` HTML attribute
  (space-separated class names). Works for both page and component
  contexts.
- **PaletteListView** — lists all palettes with their colour count and
  enabled/disabled status. Each palette has an **Enable / Disable** toggle
  that updates immediately via `saveProject()`.
- **PaletteCreateView** — form to create a new palette: name input and
  colour rows (name + `<input type="color">`) with +/- buttons.
- **PaletteEditView** — edit a palette: immutable CSS variable prefix,
  enabled checkbox, name input, colour rows with immutable ID labels and
  colour pickers. Provides **Save**, **Delete palette**, and **Cancel**.
- **HeadView** — editor for the project's shared `<head>` content. Two
  sections: **Meta tags** and **Link tags**, each rendered as a list of
  tags where every tag has dynamic attribute key/value rows with +/-.
  Provides **Save head** which rebuilds `MetaTag` / `LinkTag` instances.
- **ComponentListView** — lists all components in a project with links to
  view / edit each.
- **ComponentCreateView** — form to create a new component with a name,
  initial variables (name/type/default rows with +/-), and initial items
  (tag/text rows with +/-).
- **ComponentDetailView** — displays component metadata (name, ID),
  variables list, and an inline tree of its items. Provides **Edit** and
  **Back** buttons.
- **ComponentEditView** — edits a component's name, variables
  (add / remove / change name, type, default), and **items**. Items are
  shown as a list with links to the **ComponentNodeDetailView** for each
  item, a **Delete** button per item, and a **+ Create node** link that
  opens the full `NodeCreateView` (with type selector, pseudo, component
  support).

- **NodeCreateView** — form to create a new node (works for both page
  items and component items). Supports **Node**, **Pseudo-class**,
  **Pseudo-element**, and **Component** types. Component type shows a
  dropdown of project components.
- **NodeEditView** — form to edit a node. For **component** type nodes,
  shows the component name field and variable overrides (key/value rows
  with +/-) instead of tag, innerHTML, attributes, id, or classes.
- **PageExportHtmlView** — serialises a page's rendered DOM into an HTML
  string (via `Page.render()` + `innerHTML`), displayed inside a `<pre>`
  block. Provides a **Download as file** button that triggers a `.html`
  file download.
- **RenderView** — renders a specific page of a project as real DOM elements
  (using `Page.render()` internals). Designed to be opened in a separate tab
  for a clean, unstyled preview.

## 6. Modular architecture

All source files are ES modules (`type="module"`). Each class lives in its own
file under `src/models/`. Views are separated in `src/views/`. The router,
storage, and history layers are independent modules. No bundler required.

## 7. Undo / Redo history (`src/history.js`)

Per-project history stored in localStorage with a 15-step ring buffer.
Every call to `saveProject()` automatically pushes a snapshot of the
previous state before overwriting. Undo restores the previous snapshot;
redo moves forward. History is cleared when a project is deleted.

## 8. Global toolbar

A persistent toolbar rendered outside the router in `#toolbar`. Contains:
- **Undo** / **Redo** buttons (disabled when no history available)
- **Save** button (visual feedback only — data is saved automatically)
- **Render** button (visible when a project route is active; opens the
  current project/page in a new tab)

Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Shift+Z` (redo), `Ctrl+S` (save).
The render button parses the current hash to extract project and page IDs.

## 9. Editor layout

The page is split into a **left editing panel** (`#app`) and a **right live
preview** (`#preview`). The preview automatically updates on every project
save via a `project-saved` custom event dispatched from `storage.js`. On the
`/render/:pid/:pageId` route, the layout switches to full-screen (no toolbar,
no panels).

## 10. Tool system

Three tool buttons (disabled placeholders for now):
- **CURSOR** — default, no interaction
- **INFO** — (stub) navigate to node info
- **SELECT** — select and highlight nodes; click opens node settings, shift-click
  additive; yellow outline; hover shows `<tagname>` label above element
- **TEXT** — click an element in the preview to edit its text content inline.
  The element becomes editable (`contentEditable`), text is saved on blur.
  A green outline indicates the element being edited.
- **TRANSFORM** — drag to transform elements. Default: move element (free if
  `position: absolute/fixed`, constrained via `translate` otherwise). Ctrl:
  resize width/height. Shift: rotate. Changes are persisted to the node's
  `styles` dictionary on mouseup. Right-click opens a **context menu** with a
  scrollable preset list. Clicking a preset opens its settings dialog and
  inserts the result into the right-clicked node.
- Nodes created by presets store `presetName` and display it in the edit view.

## 11. Preset system (`src/presets/`, `src/dialogs.js`)

A **Dialog** modal overlay (`Dialog` class) shows preset templates. The **+**
button next to the Projects button opens a preset picker. Available presets:
- **Text** — configurable tag (span/p), font size, text content
- **Flex block** — flex container with direction, gap, justify-content,
  align-items
- **Image** — `<img>` with src and alt

Each preset extends `Preset` and implements `getSettingsWindow()` (returns a
form DOM element) and `getTemplate(parentNode, settings)` (creates child
nodes inside the target). The target is the currently open node (from the
hash route), or the page itself if no node is open.
