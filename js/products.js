// js/products.js - Product catalogs & Woggle Customization Options

export const WOGGLE_STYLES = ["Lis", "Romdoul", "Angkor"];
export const WOGGLE_COLORS = ["Red", "Green", "Gold", "Purple", "Pink", "Dark Blue"];

export const WOGGLE_PRODUCTS = [
    { id: 'w1', name: 'Scout Woggle Name', price: 5.00, image: 'assets/images/custom-woggle.jpg', svgIcon: 'woggle', isCustom: true },
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