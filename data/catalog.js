// =====================================================================
//  data/catalog.js  —  EDIT THIS FILE TO MANAGE YOUR SHOP
//  Visitors cannot change this file. Only you (in your code editor).
//  (All other website wording, English + Khmer, is in data/translations.js)
//
//  HOW TO ADD AN ITEM
//  1. Put a SQUARE picture (e.g. 800 x 800) in that section's own folder:
//         Shop   -> assets/shop/
//         Pin    -> assets/pin/
//         Badge  -> assets/badge/
//         Woggle -> assets/woggle/
//  2. Copy one line inside the right section below, paste it under the
//     last line, and change the 3 things:
//         name   = what customers see (English)
//         nameKh = the Khmer name, shown when the site is in Khmer
//                  (leave "" to show the English name)
//         price  = price in US dollars (numbers only, no $ sign)
//         image  = just the picture file name (e.g. "mug.jpg"), not the folder
//  3. Keep the commas and quotes exactly as in the other lines.
//
//  ITEMS WITH A CHOICE MENU (colors, classes...): add  options: [ ... ]  to the
//  line and the "+" button opens a menu with a square picture on top.
//     main picture   = image: "rank-badge.jpg"
//     picture of each choice = the same section folder, named
//         <item name>-<choice>.jpg   all lowercase, spaces become "-"
//         e.g. assets/badge/rank-badge-star-class.jpg
//              assets/woggle/round-lis-woggle-red.jpg
//              assets/woggle/square-lis-woggle-white-red.jpg
//     If a choice picture is missing, the main picture is shown instead.
//     optionsTitle: "class"  changes the menu wording (default is "color").
//
//  HOW TO REMOVE AN ITEM: delete its whole line.
//  If the picture is missing, an icon is shown instead (nothing breaks).
// =====================================================================


// ---------------------------------------------------------------------
//  GENERAL SETTINGS
// ---------------------------------------------------------------------
export const SETTINGS = {
    USD_TO_KHR: 4000,            // 1 US dollar = 4000៛  (used when the site is in Khmer)
    SENDER_PHONE: "070 90 98 96" // printed on every PDF receipt as the sender's number
};


// ---------------------------------------------------------------------
//  DELIVERY FEES (in US dollars, added to the total)
//     fee  = one fixed price
//     fees = the customer picks one of these prices
//  pickup is free. Example: 1.625 dollars = 6500 riel.
// ---------------------------------------------------------------------
export const DELIVERY = {
    vet:      { fee: 1.50 },
    jt:       { fee: 1.625 },
    delivery: { fees: [1.00, 1.50, 2.00] },
    pickup:   { fee: 0 },
};


// ---------------------------------------------------------------------
//  SECTION: SHOP
// ---------------------------------------------------------------------
export const SHOP_ITEMS = [
    { name: "Custom T-Shirt", nameKh: "អាវយឺតតាមបំណង", price: 15.00, image: "tshirt.jpg"   },
    { name: "Scout Keychain", nameKh: "ខ្សែសោស្ក៊ូត",   price: 3.50,  image: "keychain.jpg" },
    { name: "Coffee Mug",     nameKh: "កែវកាហ្វេ",       price: 12.00, image: "mug.jpg"      },
    { name: "Custom Cap",     nameKh: "មួកតាមបំណង",     price: 10.00, image: "cap.jpg"      },

    // TODO: scarf prices below are placeholders. Change them to your real prices.
    { name: "Purple Scarf",  nameKh: "កន្សែង",          price: 5.00, image: "purple-scarf.jpg"  },
    { name: "Red Scarf",     nameKh: "កន្សែងក្រហម",     price: 5.00, image: "red-scarf.jpg"     },
    { name: "Green Scarf",   nameKh: "កន្សែងបៃតង",      price: 5.00, image: "green-scarf.jpg"   },
    { name: "Yellow Scarf",  nameKh: "កន្សេងលឿង",       price: 5.00, image: "yellow-scarf.jpg"  },
    { name: "3 Color Scarf", nameKh: "កន្សែង ៣ឆ្នូត",    price: 5.00, image: "3-color-scarf.jpg" },
];


// ---------------------------------------------------------------------
//  SECTION: PIN
// ---------------------------------------------------------------------
export const PIN_ITEMS = [
    { name: "National Scout Pin", nameKh: "ម្ជុលស្ក៊ូតជាតិ",           price: 2.50, image: "pin-national.jpg"  },
    { name: "Wood Badge Pin",     nameKh: "ម្ជុលវូដបាដ្ជ",              price: 4.00, image: "pin-woodbadge.jpg" },
    { name: "Scout Promise Pin",  nameKh: "ម្ជុលសេចក្តីសន្យាស្ក៊ូត",   price: 3.00, image: "pin-promise.jpg"   },
];


// ---------------------------------------------------------------------
//  SECTION: BADGE
// ---------------------------------------------------------------------
export const BADGE_ITEMS = [
    { name: "Membership Badge", nameKh: "ផ្លាកសមាជិក",           price: 2.00, image: "badge-membership.jpg" },
    { name: "First Aid Badge",  nameKh: "ផ្លាកសង្គ្រោះបឋម",     price: 2.50, image: "badge-firstaid.jpg"   },
    { name: "Campcraft Badge",  nameKh: "ផ្លាកជំនាញបោះជំរំ",   price: 2.50, image: "badge-campcraft.jpg"  },

    // TODO: Rank Badge price is a placeholder. Change it to your real price.
    { name: "Rank Badge", nameKh: "ប័ណ្ឌវឌ្ឍនកម្ម", price: 2.00, image: "rank-badge.jpg", optionsTitle: "class",
      options: ["Beginner Class", "2nd Class", "3rd Class", "Star Class", "Courageous Class", "Angkor Class"] },
];


// ---------------------------------------------------------------------
//  SECTION: WOGGLE
//  Woggles are built automatically from the STYLES list below:
//    - one "Woggle Name" card per style  (customer picks color + types a name)
//    - one "Normal Woggle" card per style (customer picks color only)
// ---------------------------------------------------------------------

// Prices in US dollars
export const WOGGLE_NAME_PRICE   = 3.00;   // woggle with a name
export const WOGGLE_NORMAL_PRICE = 1.25;   // normal woggle (color only)

// Every color name used below must exist in this list (name + swatch color).
export const COLORS = {
    "Red":              "#DC2626",
    "Green":            "#16A34A",
    "Purple":           "#7414DC",
    "Gold":             "#F4A81E",
    "Pink":             "#EC4899",
    "Dark Blue":        "#1E3A8A",
    "Light Blue":       "#5BC0EB",
    "Wood Brown":       "#8B5A2B",
    "Wood White":       "#F2E8D5",
    "White":            "#FFFFFF",
    "Normal Red Cross": "#D71920",
};

const STANDARD_COLORS = [
    "Red", "Green", "Purple", "Gold", "Pink",
    "Dark Blue", "Light Blue", "Wood Brown", "Wood White",
];
const REDCROSS_COLORS = ["Normal Red Cross", "Wood White", "Wood Brown"];

//  name        = style name in English;  nameKh = style name in Khmer
//  image       = picture shown on the "Woggle Name" card   (in assets/woggle/)
//  normalImage = picture shown on the "Normal Woggle" card (in assets/woggle/)
//
//  OPTIONAL: a picture for each color. The menu photo changes when a customer
//  taps a color. Put them in assets/woggle/ (same folder) and name them like:
//     scout-dark-blue.jpg          (Woggle Name, Scout, Dark Blue)
//     normal-scout-dark-blue.jpg   (Normal Woggle, Scout, Dark Blue)
//     red-cross-wood-white.jpg     (style name lowercase, spaces become "-")
//  If a color picture is missing, the style picture is used instead.
export const WOGGLE_STYLES = [
    { name: "Scout",     nameKh: "ស្ក៊ូត",          image: "woggle-scout.jpg",    normalImage: "normal-woggle-scout.jpg",    colors: STANDARD_COLORS },
    { name: "Romdoul",   nameKh: "រំដួល",           image: "woggle-romdoul.jpg",  normalImage: "normal-woggle-romdoul.jpg",  colors: STANDARD_COLORS },
    { name: "Angkor",    nameKh: "អង្គរ",           image: "woggle-angkor.jpg",   normalImage: "normal-woggle-angkor.jpg",   colors: STANDARD_COLORS },
    { name: "Red Cross", nameKh: "កាកបាទក្រហម",    image: "woggle-redcross.jpg", normalImage: "normal-woggle-redcross.jpg", colors: REDCROSS_COLORS },
];

// EXTRA WOGGLES: same format as the other sections. Add  options: [...]  for a choice menu,
// or leave it out for a plain add-to-cart woggle.
export const WOGGLE_ITEMS = [
    // Same colors as the Scout / Romdoul / Angkor woggles. Normal woggle price.
    { name: "Round Lis Woggle", nameKh: "កងផ្លាលីសមូល", price: WOGGLE_NORMAL_PRICE, image: "round-lis-woggle.jpg",
      options: STANDARD_COLORS },

    // Two-color choices, written  "Color1-Color2".  Normal woggle price.
    { name: "Square Lis Woggle", nameKh: "ផ្លាលីលជ្រុង", price: WOGGLE_NORMAL_PRICE, image: "square-lis-woggle.jpg",
      options: [
          "White-Red",        "Red-White",
          "White-Green",      "Green-White",
          "White-Purple",     "Purple-White",
          "White-Gold",       "Gold-White",
          "White-Pink",       "Pink-White",
          "White-Light Blue", "Light Blue-White",
          "White-Dark Blue",  "Dark Blue-White",
      ] },
];
