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
//  line and tapping the item opens a menu with a square picture on top.
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
    SENDER_PHONE: "070 90 98 96", // printed on every PDF receipt as the sender's number
    PRINTER_DOTS: 384,            // printer width in dots: 384 = 58 mm paper, 576 = 80 mm paper

    // Bluetooth printing (js/print.js). Only needed if you use the Print button with Bluefy / Chrome.
    // "ios" is used on iPhone / iPad (slow and careful), "other" on Mac / PC / Android (fast).
    // If printing works on the iPhone, you can try a bigger chunkBytes for ios (for example 60, then 100)
    // to make it faster. If the printer beeps and disconnects again, go back to 20.
    PRINT: {
        debug: false,           // true = show a small print log on the screen (set false when printing works)
        testOnly: false,       // true = print only a short test text instead of the receipt
        keepConnected: false,  // false = disconnect after printing, so the WePrint app can use the printer
        connectDelayMs: 600,   // short wait after connecting, before sending anything
        ios:   { chunkBytes: 20,  delayMs: 5,  write: "response",   bandRows: 32 },
        other: { chunkBytes: 100, delayMs: 20, write: "noresponse", bandRows: 96 },
        //   chunkBytes = bytes sent per Bluetooth write      delayMs = pause after each write
        //   write      = "response" (printer confirms each write) or "noresponse" (faster, no confirmation)
        //   bandRows   = picture rows per print command (smaller = gentler on small printer buffers)
    }
};


// ---------------------------------------------------------------------
//  DELIVERY FEES (in US dollars, added to the total)
//     fee   = one fixed price
//     fees  = the customer picks one of these zones. Each zone has a price (fee),
//             an English name and a Khmer name (nameKh). Keep every price different.
//  pickup is free. Example: 1.625 dollars = 6500 riel.
// ---------------------------------------------------------------------
export const DELIVERY = {
    vet:      { fee: 1.50 },
    jt:       { fee: 1.625 },
    delivery: { fees: [
        { fee: 1.00, name: "Near",       nameKh: "ចម្ងាយជិត" },
        { fee: 1.50, name: "Average",    nameKh: "ចម្ងាយល្មម" },
        { fee: 2.00, name: "Outside PP", nameKh: "ជាយក្រុងភ្នំពេញ" },
    ] },
    pickup:   { fee: 0 },
};


// ---------------------------------------------------------------------
//  SECTION: SHOP
// ---------------------------------------------------------------------
export const SHOP_ITEMS = [
    { name: "Leather Cambodia Scout", nameKh: "ផ្លាកស្បែក កាយរឹទ្ធិជាតិ", price: 2.50, image: "leather-cambodia-scout.jpg"   },
    { name: "Leather World Scout", nameKh: "ផ្លាកស្បែក World Scout",   price: 2.50,  image: "leather-world-scout.jpg" },

    //scarf
    { name: "Redcross Scarf",  nameKh: "កន្សែងកាកបាទ",          price: 5.50, image: "redcross-scarf.jpg"  },
    { name: "Purple Scarf",  nameKh: "កន្សែងស្វាយ",          price: 5.50, image: "purple-scarf.jpg"  },
    { name: "Red Scarf",     nameKh: "កន្សែងក្រហម",     price: 5.50, image: "red-scarf.jpg"     },
    { name: "Green Scarf",   nameKh: "កន្សែងបៃតង",      price: 5.50, image: "green-scarf.jpg"   },
    { name: "Yellow Scarf",  nameKh: "កន្សែងលឿង",       price: 5.50, image: "yellow-scarf.jpg"  },
    { name: "3 Color Scarf", nameKh: "កន្សែង ៣ឆ្នូត",    price: 7.50, image: "3-color-scarf.jpg" },
];


// ---------------------------------------------------------------------
//  SECTION: PIN
// ---------------------------------------------------------------------
export const PIN_ITEMS = [
    { name: "Scout wing Pin",     nameKh: "កន្លាស់ស្ទាំង ស្កោត",           price: 3.00, image: "pin-scout-wing.jpg"  },
];


// ---------------------------------------------------------------------
//  SECTION: BADGE
// ---------------------------------------------------------------------
export const BADGE_ITEMS = [
    { name: "Rank Badge", nameKh: "ប័ណ្ឌវឌ្ឍនកម្ម", price: 2.00, image: "rank-badge.jpg", optionsTitle: "class",
    options: ["Beginner Class", "2nd Class", "3rd Class", "Star Class", "Courageous Class", "Angkor Class"] },
    
    { name: "One Scout Badge", nameKh: "គ្រឿង​ឥស្សរិយយយ (មួយ)", price: 1.25, image: "one-scout-badge.jpg", optionsTitle: "badge",
    options: ["Cambodia", "World Scout round", "Flag Badge", "Cambodia Scout Round", "Cambodia Scout rectangle", "Triangle", "Province"] },

    { name: "Scout badge set 1", nameKh: "បេជមួយឈុត ខេត្ត",               price: 6.50, image: "scout-badge-set-1.jpg" },
    { name: "Scout Badge set 2", nameKh: "បេជមួយឈុត កជក",               price: 6.50, image: "scout-badge-set-2.jpg" },
    { name: "Jota Joti 2026 badge", nameKh: "បេជ Jota Joti 2026",    price: 2.00, image: "jota-joti-2026.jpg" },
    { name: "Jota Joti 2025 badge", nameKh: "បេជ Jota Joti 2025",    price: 2.00, image: "jota-joti-2025.jpg" },
    { name: "World Scout badge small", nameKh: "បេជ World scout តូច", price: 2.00, image: "world-scout-small.jpg" },
    { name: "World Scout badge big", nameKh: "បេជ World scout ធំ",  price: 2.50, image: "world-scout-big.jpg" },
    { name: "SfH badge small", nameKh: "បេជ SfH តូច",                 price: 1.50, image: "sfh-small.jpg" },
    { name: "SfH badge Big", nameKh: "បេជ SfH ធំ",                    price: 2.00, image: "sfh-big.jpg" },
    { name: "Founder Day Badge", nameKh: "បេជ Founder Day",          price: 2.00, image: "founder-day.jpg" },
    { name: "MOP Badge", nameKh: "បេជ អ្នកនាំសារសន្តិភាព",                 price: 1.75, image: "mop-badge.jpg" },
    { name: "First Aid Badge",  nameKh: "បេជសង្គ្រោះបឋម",               price: 1.25, image: "badge-firstaid.jpg" },
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
    { name: "Lis",       nameKh: "ផ្កាលីស",          image: "woggle-lis.jpg",    normalImage: "normal-woggle-lis.jpg",    colors: STANDARD_COLORS },
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
