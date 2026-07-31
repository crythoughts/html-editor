/**
 * history.js — per-project undo/redo history stored in localStorage.
 *
 * Each project has its own history ring buffer (max 15 snapshots).
 * A snapshot is the JSON-serialised Project object captured *before*
 * a mutation.
 *
 * Keys in localStorage:
 *   html_editor_history_<projectId>       — JSON array of snapshots
 *   html_editor_history_<projectId>_pos   — current position (integer)
 */

const HISTORY_PREFIX = 'html_editor_history_';
const POS_SUFFIX = '_pos';
const MAX_STEPS = 15;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function histKey(id) {
  return `${HISTORY_PREFIX}${id}`;
}

function posKey(id) {
  return `${HISTORY_PREFIX}${id}${POS_SUFFIX}`;
}

function loadHistory(id) {
  const raw = localStorage.getItem(histKey(id));
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(id, arr) {
  localStorage.setItem(histKey(id), JSON.stringify(arr));
}

function loadPos(id) {
  const raw = localStorage.getItem(posKey(id));
  return raw ? parseInt(raw, 10) : -1;
}

function savePos(id, pos) {
  localStorage.setItem(posKey(id), String(pos));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Push a snapshot (plain JSON, already called .toJSON()) onto the history
 * for the given project. Trims to MAX_STEPS.
 */
export function pushSnapshot(projectId, snapshot) {
  const arr = loadHistory(projectId);
  const pos = loadPos(projectId);

  // Discard any states after the current position (redo branch)
  const tail = arr.slice(0, pos + 1);
  tail.push(snapshot);

  // Trim to max
  while (tail.length > MAX_STEPS) tail.shift();

  saveHistory(projectId, tail);
  savePos(projectId, tail.length - 1);
}

/** Returns true if undo is available. */
export function canUndo(projectId) {
  const pos = loadPos(projectId);
  return pos > 0;
}

/** Returns true if redo is available. */
export function canRedo(projectId) {
  const arr = loadHistory(projectId);
  const pos = loadPos(projectId);
  return pos >= 0 && pos < arr.length - 1;
}

/**
 * Undo: move pointer back and return the snapshot at the new position.
 * Returns the snapshot (plain JSON), or null if undo not available.
 */
export function undo(projectId) {
  if (!canUndo(projectId)) return null;
  const pos = loadPos(projectId);
  const arr = loadHistory(projectId);
  const newPos = pos - 1;
  savePos(projectId, newPos);
  return arr[newPos];
}

/**
 * Redo: move pointer forward and return the snapshot at the new position.
 * Returns the snapshot (plain JSON), or null if redo not available.
 */
export function redo(projectId) {
  if (!canRedo(projectId)) return null;
  const pos = loadPos(projectId);
  const arr = loadHistory(projectId);
  const newPos = pos + 1;
  savePos(projectId, newPos);
  return arr[newPos];
}

/**
 * Clear all history for a project (used when deleting a project).
 */
export function clearHistory(projectId) {
  localStorage.removeItem(histKey(projectId));
  localStorage.removeItem(posKey(projectId));
}

/**
 * Seed the initial snapshot for a newly created project.
 */
export function initHistory(projectId, snapshot) {
  saveHistory(projectId, [snapshot]);
  savePos(projectId, 0);
}
