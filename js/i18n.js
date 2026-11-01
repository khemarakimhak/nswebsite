// js/i18n.js - Language handling (English / Khmer). Wording lives in data/translations.js

import { TRANSLATIONS, COLOR_TRANSLATIONS } from '../data/translations.js';
import { WOGGLE_STYLES as STYLE_DATA } from '../data/catalog.js';

let lang = 'kh';

export function setLang(newLang) { lang = newLang; }
export function getLang() { return lang; }

// t('toast_added') or t('woggle_name_title', { style: 'Scout' })
export function t(key, vars = {}) {
    const entry = TRANSLATIONS[key];
    let text = key; // if a key is missing, show the key so it is easy to spot
    if (entry) text = (lang === 'kh' && entry.kh) ? entry.kh : entry.en;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
}

export function styleLabel(englishName) {
    if (lang !== 'kh') return englishName;
    const s = STYLE_DATA.find(x => x.name === englishName);
    return (s && s.nameKh) || englishName;
}

export function colorLabel(englishName) {
    if (lang !== 'kh') return englishName;
    return COLOR_TRANSLATIONS[englishName] || englishName;
}

// Name of a product card in the current language
export function productName(p) {
    if (p.titleKey) return t(p.titleKey, { style: styleLabel(p.styleName) });
    return (lang === 'kh' && p.nameKh) ? p.nameKh : p.name;
}

// Fills every element marked data-i18n="key" / data-i18n-placeholder="key" in index.html
export function applyStaticTranslations() {
    document.documentElement.lang = lang === 'kh' ? 'km' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
}
