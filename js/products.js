// js/products.js - Builds the product lists from data/catalog.js
// You normally do NOT need to edit this file. Edit data/catalog.js instead.

import {
    COLORS,
    WOGGLE_NAME_PRICE,
    WOGGLE_NORMAL_PRICE,
    WOGGLE_STYLES as STYLE_DATA,
    WOGGLE_ITEMS,
    SHOP_ITEMS,
    PIN_ITEMS,
    BADGE_ITEMS
} from '../data/catalog.js';

export const COLOR_HEX = COLORS;

export function slugify(text) {
    return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function colorSlug(color) {
    return slugify(color);
}

// Picture of one choice, e.g. assets/badge/rank-badge-star-class.jpg
export function optionImagePath(product, option) {
    return `assets/${product.section}/${product.imageKey}-${slugify(option)}.jpg`;
}

// Each section has its own picture folder:
//   shop -> assets/shop/   woggle -> assets/woggle/   pin -> assets/pin/
//   badge -> assets/badge/  news -> assets/news/
// "tshirt.jpg" + "shop" -> "assets/shop/tshirt.jpg"  (full paths / URLs are left alone)
export function imgPath(file, section) {
    if (!file) return '';
    return /^(https?:|\/|assets\/)/.test(file) ? file : `assets/${section}/${file}`;
}

function makeItems(section, items, fallback) {
    const used = new Set();
    return items.map((it, index) => {
        let id = `${section}-${slugify(it.name) || 'item'}`;
        if (used.has(id)) id = `${id}-${index}`;
        used.add(id);
        const hasOptions = Array.isArray(it.options) && it.options.length > 0;
        return {
            id,
            section,
            name: it.name,
            nameKh: it.nameKh || '',
            price: Number(it.price) || 0,
            image: imgPath(it.image, section),
            isCustom: false,
            tags: Array.isArray(it.tags) ? it.tags : [],      // shop tabs (see SHOP_TABS in data/catalog.js)
            ...(hasOptions ? {
                options: it.options,                        // choice menu (colors, classes...)
                optionsTitle: it.optionsTitle || 'color',
                kind: 'normal',                             // no name field
                imageKey: slugify(it.name)                  // option picture: <imageKey>-<option>.jpg
            } : {}),
            ...fallback
        };
    });
}

export const WOGGLE_STYLES = STYLE_DATA.map(s => ({
    id: slugify(s.name),
    name: s.name,
    nameKh: s.nameKh || '',
    image: imgPath(s.image, 'woggle'),
    normalImage: imgPath(s.normalImage, 'woggle'),
    colors: s.colors
}));

const woggleNameCards = WOGGLE_STYLES.map(s => ({
    id: `wn-${s.id}`,
    section: 'woggle',
    styleId: s.id,
    options: s.colors,
    optionsTitle: 'color',
    imageKey: s.id,
    kind: 'custom',
    styleName: s.name,
    titleKey: 'woggle_name_title',
    name: `${s.name} Woggle Name`,
    price: WOGGLE_NAME_PRICE,
    image: s.image,
    svgIcon: 'woggle',
    isCustom: true
}));

const woggleNormalCards = WOGGLE_STYLES.map(s => ({
    id: `wp-${s.id}`,
    section: 'woggle',
    styleId: s.id,
    options: s.colors,
    optionsTitle: 'color',
    imageKey: `normal-${s.id}`,
    kind: 'normal',
    styleName: s.name,
    titleKey: 'woggle_normal_title',
    name: `Normal ${s.name} Woggle`,
    price: WOGGLE_NORMAL_PRICE,
    image: s.normalImage,
    svgIcon: 'woggle',
    isCustom: false
}));

export const WOGGLE_PRODUCTS = [
    ...woggleNameCards,
    ...woggleNormalCards,
    ...makeItems('woggle', WOGGLE_ITEMS, { svgIcon: 'woggle' })
];

export const SHOP_PRODUCTS = makeItems('shop', SHOP_ITEMS, { icon: 'fa-bag-shopping' });
export const PIN_PRODUCTS = makeItems('pin', PIN_ITEMS, { svgIcon: 'pin' });
export const BADGE_PRODUCTS = makeItems('badge', BADGE_ITEMS, { icon: 'fa-shield-halved' });
