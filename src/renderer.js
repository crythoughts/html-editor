/**
 * HTML Renderer - converts Page models to actual HTML for preview/export.
 */

class HtmlRenderer {
  /**
   * Render a Page to a complete HTML document string.
   */
  static renderPage(page) {
    const paletteCss = this.renderPalettesCss(page.palettes);
    const stylesCss = page.styles
      .map((s) => s.toCss())
      .filter(Boolean)
      .join("\n\n");
    const bodyHtml = page.body.map((tag) => this.renderTag(tag)).join("\n");
    const headHtml = page.head.toHtml();

    let styleBlock = "";
    if (paletteCss || stylesCss) {
      styleBlock =
        "  <style>\n" +
        (paletteCss ? paletteCss + "\n\n" : "") +
        (stylesCss ? stylesCss : "") +
        "\n  </style>";
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(page.title)}</title>
${headHtml}
${styleBlock}
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }

  /**
   * Render a single Tag to HTML string (recursive).
   */
  static renderTag(tag, indent = "  ") {
    const selfClosing = [
      "br",
      "hr",
      "img",
      "input",
      "meta",
      "link",
      "area",
      "base",
      "col",
      "embed",
      "source",
      "track",
      "wbr",
    ];

    const isSelfClosing = selfClosing.includes(tag.tagName);
    const attrs = this.renderAttrs(tag);

    if (isSelfClosing) {
      return `${indent}<${tag.tagName}${attrs}>`;
    }

    const openTag = `${indent}<${tag.tagName}${attrs}>`;
    const inner = [];

    if (tag.textContent) {
      inner.push(`${indent}  ${this.escapeHtml(tag.textContent)}`);
    }

    for (const child of tag.children) {
      inner.push(this.renderTag(child, indent + "  "));
    }

    const closeTag = `${indent}</${tag.tagName}>`;

    if (inner.length === 0) {
      return `${indent}<${tag.tagName}${attrs}></${tag.tagName}>`;
    }

    return [openTag, ...inner, closeTag].join("\n");
  }

  /**
   * Render attributes and inline styles for a tag.
   */
  static renderAttrs(tag) {
    const parts = [];

    if (tag.id) parts.push(`id="${this.escapeHtml(tag.id)}"`);
    if (tag.class && tag.class.length > 0) {
      parts.push(`class="${this.escapeHtml(tag.class.join(" "))}"`);
    }

    const inlineStyle = tag.getInlineStyles();
    if (inlineStyle) parts.push(`style="${this.escapeHtml(inlineStyle)}"`);

    for (const [key, value] of Object.entries(tag.attrs)) {
      if (key && value !== undefined && value !== null) {
        parts.push(
          `${this.escapeHtml(key)}="${this.escapeHtml(String(value))}"`,
        );
      }
    }

    return parts.length > 0 ? " " + parts.join(" ") : "";
  }

  /**
   * Render CSS variables from palettes.
   */
  static renderPalettesCss(palettes) {
    if (!palettes || palettes.length === 0) return "";
    const rules = [];

    for (const palette of palettes) {
      if (!palette.colors || palette.colors.length === 0) continue;
      const vars = palette.colors.map(([name, value]) => {
        const varName = name.replace(/\s+/g, "-").toLowerCase();
        return `  --${varName}: ${value};`;
      });
      if (vars.length > 0) {
        rules.push(`/* ${palette.name} */\n:root {\n${vars.join("\n")}\n}`);
      }
    }

    return rules.join("\n\n");
  }

  static escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Render the page body for in-editor preview.
   * Returns DOM elements that can be attached to the editor canvas.
   */
  static renderPreview(page, container) {
    if (!container) return;
    container.innerHTML = ""; // Clear

    const bodyWrapper = document.createElement("div");
    bodyWrapper.id = "body";

    for (const tag of page.body) {
      const el = this.createDomElement(tag);
      if (el) bodyWrapper.appendChild(el);
    }

    container.appendChild(bodyWrapper);

    // Apply styles
    this.applyPreviewStyles(page, container);
  }

  static createDomElement(tag) {
    const el = document.createElement(tag.tagName);

    // Set dataset uid for identification
    el.dataset.uid = tag._uid;

    if (tag.id) el.id = tag.id;
    if (tag.class && tag.class.length > 0) el.className = tag.class.join(" ");

    // Apply inline styles
    if (tag.styles.length > 0) {
      el.style.cssText = tag.getInlineStyles();
    }

    // Set attributes
    for (const [key, value] of Object.entries(tag.attrs)) {
      if (key && value !== undefined && value !== null) {
        el.setAttribute(key, String(value));
      }
    }

    // Set text content
    if (tag.textContent) {
      el.textContent = tag.textContent;
    }

    // Render children
    for (const child of tag.children) {
      const childEl = this.createDomElement(child);
      if (childEl) el.appendChild(childEl);
    }

    return el;
  }

  static applyPreviewStyles(page, container) {
    // Remove old style elements
    const oldStyles = container.querySelectorAll("[data-editor-style]");
    oldStyles.forEach((s) => s.remove());

    // Apply palette CSS variables
    if (page.palettes && page.palettes.length > 0) {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-editor-style", "palettes");
      let css = ":root {\n";
      for (const palette of page.palettes) {
        if (palette.colors) {
          for (const [name, value] of palette.colors) {
            const varName = name.replace(/\s+/g, "-").toLowerCase();
            css += `  --${varName}: ${value};\n`;
          }
        }
      }
      css += "}";
      styleEl.textContent = css;
      container.prepend(styleEl);
    }

    // Apply StyleSet rules
    if (page.styles && page.styles.length > 0) {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-editor-style", "stylesets");
      styleEl.textContent = page.styles
        .map((s) => s.toCss())
        .filter(Boolean)
        .join("\n");
      container.prepend(styleEl);
    }
  }

  /**
   * Build a tree data structure for the body tree view.
   */
  static buildTagTree(tags, depth = 0) {
    const items = [];
    for (const tag of tags) {
      items.push({ tag, depth });
      if (tag.children && tag.children.length > 0) {
        items.push(...this.buildTagTree(tag.children, depth + 1));
      }
    }
    return items;
  }
}

window.HtmlRenderer = HtmlRenderer;
