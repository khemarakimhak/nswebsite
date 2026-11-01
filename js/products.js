// js/products.js - Product catalogs & Woggle Customization Options

// Color name -> swatch hex (used for the color buttons and the fallback preview)
export const COLOR_HEX = {
    "Red": "#DC2626",
    "Green": "#16A34A",
    "Purple": "#7414DC",
    "Gold": "#F4A81E",
    "Pink": "#EC4899",
    "Dark Blue": "#1E3A8A",
    "Light Blue": "#5BC0EB",
    "Wood Brown": "#8B5A2B",
    "Wood White": "#F2E8D5",
    "Normal Red Cross": "#D71920"
};

const STANDARD_COLORS = [
    "Red", "Green", "Purple", "Gold", "Pink",
    "Dark Blue", "Light Blue", "Wood Brown", "Wood White"
];

const REDCROSS_COLORS = ["Normal Red Cross", "Wood White", "Wood Brown"];

// Each style is a standalone customizer with its own image, colors and price.
// Style image:  assets/images/woggle-<id>.jpg
// Optional per-color image: assets/images/woggles/<id>-<color-slug>.jpg  (e.g. scout-dark-blue.jpg)
export const WOGGLE_STYLES = [
    { id: 'scout',    name: 'Scout',     price: 5.00, image: 'assets/images/woggle-scout.jpg',    colors: STANDARD_COLORS },
    { id: 'romdoul',  name: 'Romdoul',   price: 5.00, image: 'assets/images/woggle-romdoul.jpg',  colors: STANDARD_COLORS },
    { id: 'angkor',   name: 'Angkor',    price: 5.00, image: 'assets/images/woggle-angkor.jpg',   colors: STANDARD_COLORS },
    { id: 'redcross', name: 'Red Cross', price: 5.00, image: 'assets/images/woggle-redcross.jpg', colors: REDCROSS_COLORS }
];

export function colorSlug(color) {
    return color.toLowerCase().replace(/\s+/g, '-');
}

export const WOGGLE_PRODUCTS = [
    // One custom card per style
    ...WOGGLE_STYLES.map(s => ({
        id: `wc-${s.id}`,
        styleId: s.id,
        name: `${s.name} Woggle Name`,
        price: s.price,
        image: s.image,
        svgIcon: 'woggle',
        isCustom: true
    })),
    // Normal (non-custom) woggles
    { id: 'w2', name: 'Normal Lis Woggle', price: 3.50, image: 'assets/images/lis-woggle.jpg', svgIcon: 'woggle', isCustom: false },
    { id: 'w3', name: 'Normal Romdoul Woggle', price: 3.50, image: 'assets/images/romdoul-woggle.jpg', svgIcon: 'woggle', isCustom: false },
    { id: 'w4', name: 'Normal Angkor Woggle', price: 3.50, image: 'assets/images/angkor-woggle.jpg', svgIcon: 'woggle', isCustom: false }
];

export const SHOP_PRODUCTS = [
    { id: 's1', name: 'Custom T-Shirt', price: 15.00, image: 'assets/images/tshirt.jpg', icon: 'fa-shirt', isCustom: false },
    { id: 's2', name: 'Scout Keychain', price: 3.50, image: 'assets/images/keychain.jpg', icon: 'fa-key', isCustom: false },
    { id: 's3', name: 'Coffee Mug', price: 12.00, image: 'assets/images/mug.jpg', icon: 'fa-mug-hot', isCustom: false },
    { id: 's4', name: 'Custom Cap', price: 10.00, image: 'assets/images/cap.jpg', icon: 'fa-hat-cowboy', isCustom: false }
];

export const PIN_PRODUCTS = [
    { id: 'p1', name: 'National Scout Pin', price: 2.50, image: 'assets/images/pin-national.jpg', svgIcon: 'pin', isCustom: false },
    { id: 'p2', name: 'Wood Badge Pin', price: 4.00, image: 'assets/images/pin-woodbadge.jpg', svgIcon: 'pin', isCustom: false },
    { id: 'p3', name: 'Scout Promise Pin', price: 3.00, image: 'assets/images/pin-promise.jpg', svgIcon: 'pin', isCustom: false }
];

export const BADGE_PRODUCTS = [
    { id: 'b1', name: 'Membership Badge', price: 2.00, image: 'assets/images/badge-membership.jpg', icon: 'fa-shield-halved', isCustom: false },
    { id: 'b2', name: 'First Aid Badge', price: 2.50, image: 'assets/images/badge-firstaid.jpg', icon: 'fa-kit-medical', isCustom: false },
    { id: 'b3', name: 'Campcraft Badge', price: 2.50, image: 'assets/images/badge-campcraft.jpg', icon: 'fa-tent', isCustom: false }
];
