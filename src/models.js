/**
 * Data model classes for the HTML Visual Editor.
 * All classes support serialization via toJSON/fromJSON.
 */

// ========== Head sub-models ==========

class Meta {
  constructor(data = {}) {
    this.name = data.name || "";
    this.content = data.content || "";
    this.httpEquiv = data.httpEquiv || "";
    this.charset = data.charset || "";
    this.property = data.property || "";
  }

  toJSON() {
    const obj = {};
    if (this.name) obj.name = this.name;
    if (this.content) obj.content = this.content;
    if (this.httpEquiv) obj.httpEquiv = this.httpEquiv;
    if (this.charset) obj.charset = this.charset;
    if (this.property) obj.property = this.property;
    return obj;
  }

  static fromJSON(data) {
    return new Meta(data);
  }

  toHtml() {
    const attrs = [];
    if (this.charset) attrs.push(`charset="${this.charset}"`);
    if (this.name) attrs.push(`name="${this.name}"`);
    if (this.content) attrs.push(`content="${this.content}"`);
    if (this.httpEquiv) attrs.push(`http-equiv="${this.httpEquiv}"`);
    if (this.property) attrs.push(`property="${this.property}"`);
    if (attrs.length === 0) return "";
    return `<meta ${attrs.join(" ")}>`;
  }
}

class Link {
  constructor(data = {}) {
    this.href = data.href || "";
    this.rel = data.rel || "";
    this.type = data.type || "";
    this.hreflang = data.hreflang || "";
    this.media = data.media || "";
    this.integrity = data.integrity || "";
    this.crossorigin = data.crossorigin || "";
    this.as = data.as || "";
  }

  toJSON() {
    const obj = {};
    if (this.href) obj.href = this.href;
    if (this.rel) obj.rel = this.rel;
    if (this.type) obj.type = this.type;
    if (this.hreflang) obj.hreflang = this.hreflang;
    if (this.media) obj.media = this.media;
    if (this.integrity) obj.integrity = this.integrity;
    if (this.crossorigin) obj.crossorigin = this.crossorigin;
    if (this.as) obj.as = this.as;
    return obj;
  }

  static fromJSON(data) {
    return new Link(data);
  }

  toHtml() {
    const parts = ["<link"];
    if (this.href) parts.push(`href="${this.href}"`);
    if (this.rel) parts.push(`rel="${this.rel}"`);
    if (this.type) parts.push(`type="${this.type}"`);
    if (this.hreflang) parts.push(`hreflang="${this.hreflang}"`);
    if (this.media) parts.push(`media="${this.media}"`);
    if (this.integrity) parts.push(`integrity="${this.integrity}"`);
    if (this.crossorigin) parts.push(`crossorigin="${this.crossorigin}"`);
    if (this.as) parts.push(`as="${this.as}"`);
    parts.push(">");
    return parts.join(" ");
  }
}

class Favicon {
  constructor(data = {}) {
    this.href = data.href || "";
    this.rel = data.rel || "icon";
    this.type = data.type || "";
    this.sizes = data.sizes || "";
  }

  toJSON() {
    const obj = { href: this.href };
    if (this.rel !== "icon") obj.rel = this.rel;
    if (this.type) obj.type = this.type;
    if (this.sizes) obj.sizes = this.sizes;
    return obj;
  }

  static fromJSON(data) {
    return new Favicon(data);
  }

  toHtml() {
    const parts = ["<link"];
    parts.push(`rel="${this.rel}"`);
    if (this.href) parts.push(`href="${this.href}"`);
    if (this.type) parts.push(`type="${this.type}"`);
    if (this.sizes) parts.push(`sizes="${this.sizes}"`);
    parts.push(">");
    return parts.join(" ");
  }
}

class Head {
  constructor(data = {}) {
    this.meta = (data.meta || []).map((m) =>
      m instanceof Meta ? m : Meta.fromJSON(m),
    );
    this.link = (data.link || []).map((l) =>
      l instanceof Link ? l : Link.fromJSON(l),
    );
    this.favicons = (data.favicons || []).map((f) =>
      f instanceof Favicon ? f : Favicon.fromJSON(f),
    );
  }

  toJSON() {
    return {
      meta: this.meta.map((m) => m.toJSON()),
      link: this.link.map((l) => l.toJSON()),
      favicons: this.favicons.map((f) => f.toJSON()),
    };
  }

  static fromJSON(data) {
    return new Head(data);
  }

  toHtml(indent = "    ") {
    const parts = [];
    for (const m of this.meta) {
      const h = m.toHtml();
      if (h) parts.push(indent + h);
    }
    for (const l of this.link) {
      parts.push(indent + l.toHtml());
    }
    for (const f of this.favicons) {
      parts.push(indent + f.toHtml());
    }
    return parts.join("\n");
  }
}

// ========== Palette ==========

class Palette {
  constructor(data = {}) {
    this.name = data.name || "Untitled Palette";
    this.colors = (data.colors || []).map((c) =>
      Array.isArray(c) ? c : [c.name || "", c.value || "#000000"],
    );
  }

  toJSON() {
    return {
      name: this.name,
      colors: this.colors.map((c) => [c[0], c[1]]),
    };
  }

  static fromJSON(data) {
    return new Palette(data);
  }
}

// ========== Style ==========

class StyleSet {
  constructor(data = {}) {
    this.selector = data.selector || "";
    this.styles = data.styles || [];
  }

  toJSON() {
    return {
      selector: this.selector,
      styles: [...this.styles],
    };
  }

  static fromJSON(data) {
    return new StyleSet(data);
  }

  toCss() {
    if (!this.selector || this.styles.length === 0) return "";
    const rules = this.styles.map((s) => {
      if (s.endsWith(";")) return s;
      const match = s.match(/^(.+?):\s*(.+)/);
      if (match) {
        const val = match[2].replace(/!important\s*$/, "").trim();
        const important = match[2].includes("!important");
        return `${match[1]}: ${val}${important ? " !important" : ""};`;
      }
      return s + ";";
    });
    return `${this.selector} {\n  ${rules.join("\n  ")}\n}`;
  }
}

// ========== Tag (Page element) ==========

let _tagCounter = 0;

class Tag {
  constructor(data = {}) {
    this._uid = data._uid || `tag_${++_tagCounter}_${Date.now()}`;
    this.tagName = (data.tagName || "div").toLowerCase();
    this.styles = data.styles || [];
    this.id = data.id || "";
    this.class = data.class || [];
    this.textContent = data.textContent || "";
    this.rawHtml = data.rawHtml || false;
    this.attrs = data.attrs || {};
    this.children = (data.children || []).map((c) =>
      c instanceof Tag ? c : Tag.fromJSON(c),
    );
  }

  toJSON() {
    return {
      _uid: this._uid,
      tagName: this.tagName,
      styles: [...this.styles],
      id: this.id,
      class: [...this.class],
      textContent: this.textContent,
      rawHtml: this.rawHtml,
      attrs: { ...this.attrs },
      children: this.children.map((c) => c.toJSON()),
    };
  }

  static fromJSON(data) {
    return new Tag(data);
  }

  getStyle(key) {
    const prefix = `${key}:`;
    for (const s of this.styles) {
      if (s.startsWith(prefix)) {
        const val = s.slice(prefix.length).trim();
        return val.replace(/\s*!important\s*$/, "").trim();
      }
    }
    return "";
  }

  setStyle(key, value, important = false) {
    const prefix = `${key}:`;
    const existing = this.styles.findIndex((s) => {
      const trimmed = s.replace(/\s*!important\s*$/, "").trim();
      return trimmed.startsWith(prefix);
    });
    const newStyle = value
      ? `${key}: ${value}${important ? " !important" : ""}`
      : "";
    if (existing >= 0) {
      if (newStyle) {
        this.styles[existing] = newStyle;
      } else {
        this.styles.splice(existing, 1);
      }
    } else if (newStyle) {
      this.styles.push(newStyle);
    }
  }

  removeStyle(key) {
    const prefix = `${key}:`;
    this.styles = this.styles.filter((s) => {
      const trimmed = s.replace(/\s*!important\s*$/, "").trim();
      return !trimmed.startsWith(prefix);
    });
  }

  getStyleImportant(key) {
    const prefix = `${key}:`;
    for (const s of this.styles) {
      if (s.startsWith(prefix) && s.includes("!important")) {
        return true;
      }
    }
    return false;
  }

  getInlineStyles() {
    if (this.styles.length === 0) return "";
    const rules = this.styles.map((s) => (s.endsWith(";") ? s : s + ";"));
    return rules.join(" ");
  }

  findTagByUid(uid) {
    if (this._uid === uid) return this;
    for (const child of this.children) {
      const found = child.findTagByUid(uid);
      if (found) return found;
    }
    return null;
  }

  findAllTags() {
    const result = [this];
    for (const child of this.children) {
      result.push(...child.findAllTags());
    }
    return result;
  }

  getParentUid(allTags) {
    // Find parent of this tag in a flat list
    for (const tag of allTags) {
      if (tag._uid === this._uid) continue;
      for (const child of tag.children) {
        if (child._uid === this._uid) return tag._uid;
        const found = child.findTagByUid(this._uid);
        if (found) return tag._uid;
      }
    }
    return null;
  }

  duplicate() {
    const json = this.toJSON();
    json._uid = `tag_${++_tagCounter}_${Date.now()}`;
    const clone = Tag.fromJSON(json);
    // Recursively assign new UIDs
    this._reassignUids(clone);
    return clone;
  }

  _reassignUids(tag) {
    tag._uid = `tag_${++_tagCounter}_${Date.now()}`;
    for (const child of tag.children) {
      this._reassignUids(child);
    }
  }
}

// ========== Page ==========

class Page {
  constructor(data = {}) {
    this.title = data.title || "Untitled Page";
    this.head =
      data.head instanceof Head ? data.head : new Head(data.head || {});
    this.body = (data.body || []).map((t) =>
      t instanceof Tag ? t : Tag.fromJSON(t),
    );
    this.palettes = (data.palettes || []).map((p) =>
      p instanceof Palette ? p : Palette.fromJSON(p),
    );
    this.styles = (data.styles || []).map((s) =>
      s instanceof StyleSet ? s : StyleSet.fromJSON(s),
    );
    this.width = data.width || "100%";
    this.height = data.height || "auto";
  }

  toJSON() {
    return {
      title: this.title,
      head: this.head.toJSON(),
      body: this.body.map((t) => t.toJSON()),
      palettes: this.palettes.map((p) => p.toJSON()),
      styles: this.styles.map((s) => s.toJSON()),
      width: this.width,
      height: this.height,
    };
  }

  static fromJSON(data) {
    return new Page(data);
  }

  findTagByUid(uid) {
    for (const tag of this.body) {
      const found = tag.findTagByUid(uid);
      if (found) return found;
    }
    return null;
  }

  getAllTags() {
    const tags = [];
    for (const tag of this.body) {
      tags.push(...tag.findAllTags());
    }
    return tags;
  }
}

// ========== Project ==========

class Project {
  constructor(data = {}) {
    this.name = data.name || "Untitled Project";
    this.author = data.author || "";
    this.pages = (data.pages || []).map((p) =>
      p instanceof Page ? p : Page.fromJSON(p),
    );
    this.createdAt = data.createdAt || Date.now();
    this.editedAt = data.editedAt || Date.now();
    this._id =
      data._id ||
      `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this._assets = data._assets || [];
  }

  toJSON() {
    return {
      name: this.name,
      author: this.author,
      pages: this.pages.map((p) => p.toJSON()),
      createdAt: this.createdAt,
      editedAt: this.editedAt,
      _id: this._id,
      _assets: this._assets,
    };
  }

  static fromJSON(data) {
    return new Project(data);
  }

  touch() {
    this.editedAt = Date.now();
  }

  addPage(page) {
    this.pages.push(page);
    this.touch();
  }

  removePage(index) {
    if (index >= 0 && index < this.pages.length) {
      this.pages.splice(index, 1);
      this.touch();
    }
  }
}

// Export classes globally
window.Meta = Meta;
window.Link = Link;
window.Favicon = Favicon;
window.Head = Head;
window.Palette = Palette;
window.StyleSet = StyleSet;
window.Tag = Tag;
window.Page = Page;
window.Project = Project;
