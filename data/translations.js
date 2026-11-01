// =====================================================================
//  data/translations.js  —  ALL WORDING OF THE WEBSITE (English + Khmer)
//  Edit this file in your code editor. Visitors cannot change it.
//
//  HOW IT WORKS
//  Each line looks like:
//      nav_home: { en: "Home", kh: "ទំព័រដើម" },
//  - Do not change the word on the left (nav_home). The website uses it.
//  - Change the text inside the quotes after  en:  and  kh:
//  - If you leave kh: "" (empty), the English text is shown in Khmer mode.
//  - {style}, {color}, {name}, {qty}, {total} are blanks the website fills in.
//    Keep them exactly as written (you can move them around the sentence).
//
//  NOTE: the Khmer below is a first DRAFT. Please check and correct it.
//
//  PRODUCT NAMES are NOT here: add the Khmer name of each product in
//  data/catalog.js (the  nameKh:  next to  name: ).
// =====================================================================

export const TRANSLATIONS = {

    // ----- Top header -----
    app_name:            { en: "Nimet Scout Shop",                      kh: "និម្មិត ហាងលក់សម្ភារៈកាយរឹទ្ធិ" },
    app_tagline:         { en: "Quality at affordable price",        kh: "គុណភាពក្នុងតម្លៃសមរម្យ" },

    // ----- Bottom menu -----
    nav_home:            { en: "Home",                                  kh: "ទំព័រដើម" },
    nav_shop:            { en: "Shop",                                  kh: "ទំនិញផ្សេង" },
    nav_woggle:          { en: "Woggle",                                kh: "កងកន្សែង" },
    nav_pin:             { en: "Pin",                                   kh: "កន្លាស់" },
    nav_badge:           { en: "Badge",                                 kh: "បេជ" },

    // ----- Home page -----
    home_title:          { en: "Latest Updates",                        kh: "ព័ត៌មានថ្មីៗ" },
    home_subtitle:       { en: "News & Announcements",                  kh: "ព័ត៌មាន និងសេចក្តីជូនដំណឹង" },
    home_empty:          { en: "No updates yet.",                       kh: "មិនមានព័ត៌មានថ្មីទេ" },

    // ----- Section headings -----
    woggle_title:        { en: "Scout Woggles Collection",              kh: "ម៉ូតផ្សេងៗនៃកងកន្សែង" },
    woggle_subtitle:     { en: "Normal & Custom Woggles",               kh: "កងធម្មតា និងកងដាក់ឈ្មោះ" },
    shop_title:          { en: "General Scout Gear",                    kh: "សម្ភារៈកាយរឹទ្ធិទូទៅ" },
    shop_subtitle:       { en: "Standard Accessories",                  kh: "គ្រឿងប្រើប្រាស់ទូទៅ" },
    pin_title:           { en: "Scout Pins",                            kh: "កន្លាស់" },
    pin_subtitle:        { en: "Scout and Normal Pins",                 kh: "កន្លាស់ទូទៅ និងកាយរឹទ្ធ" },
    badge_title:         { en: "Scout Badges",                          kh: "បេជ" },
    badge_subtitle:      { en: "Patches & Insignia",                    kh: "បេជទូទៅ និងកាយរឹទ្ធ" },

    // ----- Search boxes -----
    search_woggle:       { en: "Search woggle...",                      kh: "ស្វែងរកម៉ូតកង..." },
    search_shop:         { en: "Search shop...",                        kh: "ស្វែងរកទំនិញ..." },
    search_pin:          { en: "Search pin...",                         kh: "ស្វែងរកម៉ូតកន្លាស់..." },
    search_badge:        { en: "Search badge...",                       kh: "ស្វែងរកម៉ូតបេជ..." },
    search_no_match:     { en: "No matching items.",                    kh: "មិនមានទំនិញទេ" },
    section_empty:       { en: "No items yet.",                         kh: "មិនទាន់មានទំនិញទេ។" },

    // ----- Product cards -----
    tag_custom:          { en: "Custom",                                kh: "កងឈ្មោះកុម្មង់" },
    // Names of the automatic woggle cards. {style} = Scout / Romdoul / Angkor / Red Cross
    woggle_name_title:   { en: "{style} Woggle Name",                   kh: "កងឈ្មោះ {style}" },
    woggle_normal_title: { en: "Normal {style} Woggle",                 kh: "កង {style} ធម្មតា" },

    // ----- Woggle menu (the pop-up) -----
    // Heading of the option list + "selected" line. A product picks one with  optionsTitle: "color" | "class"
    optiontitle_color:      { en: "1. Color",                           kh: "1. ពណ៌" },
    optionselected_color:   { en: "Selected color",                     kh: "ពណ៌ដែលបានជ្រើស" },
    optiontitle_class:      { en: "1. Class",                           kh: "1. ថ្នាក់" },
    optionselected_class:   { en: "Selected class",                     kh: "ថ្នាក់ដែលបានជ្រើស" },
    modal_name_label:    { en: "2. Name",                               kh: "2. ឈ្មោះ" },
    modal_name_placeholder: { en: "Enter name",                         kh: "សូមសរសេរឈ្មោះលើកង" },
    modal_add_to_cart:   { en: "Add to Cart",                           kh: "ដាក់ចូលកន្ត្រកទំនិញ" },

    // ----- Cart -----
    cart_title:          { en: "Cart & Receipt",                        kh: "កន្ត្រកទំនិញ និងវិក្កយបត្រ" },
    cart_empty_items:    { en: "No items in your cart yet.",            kh: "មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ។" },
    cart_name_label:     { en: "Name:",                                 kh: "ឈ្មោះ:" },
    // How a woggle is written in the cart and receipt
    woggle_cart_label:        { en: "{style} Woggle ({color})",         kh: "កងឈ្មោះ {style} ({color})" },
    woggle_normal_cart_label: { en: "Normal {style} Woggle ({color})",  kh: "កង {style} ធម្មតា ({color})" },
    cart_copy_receipt:   { en: "Copy Receipt",                          kh: "ចម្លងវិក្កយបត្រ" },
    cart_export_pdf:     { en: "Export PDF",                            kh: "ទាញយកជា PDF" },
    cart_clear:          { en: "Clear Cart",                            kh: "សម្អាតកន្ត្រក" },

    // ----- Cart: receiver details -----
    cart_receiver_title:   { en: "Receiver Details",                    kh: "ព័ត៌មានអ្នកទទួល" },
    cart_receiver_name:    { en: "Receiver Name",                       kh: "ឈ្មោះអ្នកទទួល" },
    cart_receiver_phone:   { en: "Receiver Phone Number",               kh: "លេខទូរស័ព្ទអ្នកទទួល" },
    cart_receiver_address: { en: "Receiver Address",                    kh: "អាសយដ្ឋានអ្នកទទួល" },
    cart_delivery_title:   { en: "Delivery Method",                     kh: "វិធីសាស្ត្រដឹកជញ្ជូន" },
    delivery_vet:          { en: "VET",                                 kh: "VET" },
    delivery_jt:           { en: "J&T",                                 kh: "J&T" },
    delivery_delivery:     { en: "Delivery",                            kh: "ដឹកជូន" },
    delivery_pickup:       { en: "Pick up",                             kh: "មកយកផ្ទាល់" },
    delivery_free:         { en: "Free",                                kh: "ឥតគិតថ្លៃ" },
    delivery_choose_fee:   { en: "Please choose a delivery fee",        kh: "សូមជ្រើសរើសតម្លៃដឹកជូន" },
    // Line added to the cart, receipt and PDF when the delivery costs money: "Delivery fee (VET)"
    delivery_fee_label:    { en: "Delivery fee",                        kh: "ថ្លៃដឹកជញ្ជូន" },

    // ----- Small pop-up messages -----
    toast_added:         { en: "Item added to cart!",                   kh: "ទំនិញបានដាក់ចូលកន្ត្រកទំនិញ!" },
    toast_added_named:   { en: "{qty}x {name} added!",                  kh: "បានបន្ថែម {qty}x {name}!" },
    toast_cart_empty:    { en: "Cart is empty!",                        kh: "កន្ត្រកទទេ!" },
    toast_copied:        { en: "Receipt copied!",                       kh: "បានចម្លងវិក្កយបត្រ!" },
    toast_copy_failed:   { en: "Copy failed",                           kh: "ចម្លងមិនបាន" },
    toast_cleared:       { en: "Cart cleared",                          kh: "បានសម្អាតកន្ត្រក" },
    toast_pdf_done:      { en: "PDF saved!",                            kh: "បានរក្សាទុក PDF!" },
    toast_pdf_failed:    { en: "Could not create PDF",                  kh: "បង្កើត PDF មិនបាន" },

    // ----- Receipt (the text customers copy and send you) -----
    // Tip: if you always want the receipt in English, make the kh: the same as en:
    receipt_title:       { en: "📋 CUSTOMER ORDER SUMMARY (@nimet_giftshop)", kh: "📋 សេចក្តីសង្ខេបការបញ្ជាទិញ (Telegram @nimet_giftshop)" },
    receipt_empty:       { en: "Cart is empty.",                        kh: "កន្ត្រកទទេ។" },
    receipt_name:        { en: "[Name: {name}]",                        kh: "[ឈ្មោះ: {name}]" },
    receipt_total:       { en: "💵 Total Due: {total}",                 kh: "💵 សរុបត្រូវបង់: {total}" },
    receipt_thanks:      { en: "Thank you for ordering with Nimet Scout Shop!", kh: "អរគុណដែលបានបញ្ជាទិញជាមួយហាងនិម្មិត" },
    // Receiver lines at the top of the copied receipt
    receipt_receiver:    { en: "Receiver",                              kh: "អ្នកទទួល" },
    receipt_phone:       { en: "Phone",                                 kh: "ទូរស័ព្ទ" },
    receipt_address:     { en: "Address",                               kh: "អាសយដ្ឋាន" },
    receipt_delivery:    { en: "Delivery",                              kh: "ដឹកជញ្ជូន" },

    // ----- PDF receipt (thermal printer). The PDF is ALWAYS printed in Khmer,
    //       so only the kh: text below is used. Top line "Nimet Scout Shop" comes from app_name (en),
    //       the Khmer shop name line comes from app_name (kh).
    pdf_sender_phone:    { en: "Sender phone",                          kh: "លេខអ្នកផ្ញើ" },
    pdf_receiver_phone:  { en: "Receiver phone",                        kh: "លេខអ្នកទទួល" },
    pdf_address:         { en: "Address",                               kh: "អាសយដ្ឋាន" },
    pdf_delivery:        { en: "Delivery",                              kh: "ដឹកជញ្ជូន" },
    pdf_total:           { en: "Total",                                 kh: "សរុប" },
    pdf_footer:          { en: "Thank you for supporting our little shop. Please visit again.", kh: "សូមអរគុណដែលបានគាំទ្រហាងតូចរបស់យើងខ្ញុំ សូមអញ្ជើញមកម្តងទៀត" },
};


// ---------------------------------------------------------------------
//  COLOR NAMES in Khmer  (English name on the left must match catalog.js)
//  Leave "" to show the English name.
//  Style names (Scout, Romdoul, Angkor, Red Cross) are set in catalog.js.
// ---------------------------------------------------------------------
export const COLOR_TRANSLATIONS = {
    "Red":              "ក្រហម",
    "Green":            "បៃតង",
    "Purple":           "ស្វាយ",
    "Gold":             "មាស",
    "Pink":             "ផ្កាឈូក",
    "Dark Blue":        "ខៀវចាស់",
    "Light Blue":       "ខៀវខ្ចី",
    "Wood Brown":       "ត្នោតឈើ",
    "Wood White":       "សឈើ",
    "Normal Red Cross": "កាកបាទក្រហមធម្មតា",
    "White":            "ស",
};


// ---------------------------------------------------------------------
//  OPTION NAMES in Khmer (for products with a choice menu that are not colors,
//  e.g. the classes of the Rank Badge). English name must match catalog.js.
//  Two-color options such as "White-Red" are built automatically from the
//  color names above, so you do not need to add them here.
// ---------------------------------------------------------------------
export const OPTION_TRANSLATIONS = {
    "Beginner Class":   "ថ្នាក់ដំបូង",
    "2nd Class":        "ថ្នាក់ទី ២",
    "3rd Class":        "ថ្នាក់ទី ៣",
    "Star Class":       "ថ្នាក់ផ្កាយ",
    "Courageous Class": "ថ្នាក់វីរៈកាយរឹទ្ធិ",
    "Angkor Class":     "ថ្នាក់អង្គរ",
};
