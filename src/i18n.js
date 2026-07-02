/**
 * Internationalization system for HTML Visual Editor.
 * Loads translations from JSON files and provides gettext-style translation.
 */
class I18n {
  constructor() {
    this.translations = {};
    this.fallback = {};
    this.currentLang = 'en';
    this.loaded = false;
  }

  async init(lang = 'en') {
    this.currentLang = lang;
    try {
      const enResp = await fetch('src/i18n/en.json');
      this.fallback = await enResp.json();
    } catch (e) {
      console.warn('Could not load en.json, using fallback');
      this.fallback = {};
    }

    if (lang !== 'en') {
      try {
        const resp = await fetch(`src/i18n/${lang}.json`);
        this.translations = await resp.json();
      } catch (e) {
        console.warn(`Could not load ${lang}.json, falling back to en`);
        this.translations = {};
      }
    } else {
      this.translations = {};
    }

    this.loaded = true;
    this.applyTranslations();
    return this;
  }

  t(key, ...args) {
    let str = this.translations[key] || this.fallback[key] || key;
    if (args.length > 0) {
      args.forEach((arg, i) => {
        str = str.replace(`{${i}}`, arg);
      });
    }
    return str;
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
    document.querySelectorAll('[data-i18n-value]').forEach(el => {
      const key = el.getAttribute('data-i18n-value');
      el.value = this.t(key);
    });
  }

  async setLanguage(lang) {
    this.currentLang = lang;
    this.translations = {};
    if (lang !== 'en') {
      try {
        const resp = await fetch(`src/i18n/${lang}.json`);
        this.translations = await resp.json();
      } catch (e) {
        console.warn(`Could not load ${lang}.json`);
      }
    }
    this.applyTranslations();
    // Re-render UI with new language
    if (window.app) {
      window.app.refreshUI();
    }
  }
}

// Global instance
window.i18n = new I18n();
