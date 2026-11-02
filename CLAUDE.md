# Nimet Scout Shop (nswebsite)

Mobile-first shop website for a Scout gear shop in Cambodia. Customers browse products, build a
cart, fill in receiver details, then copy the receipt text or export a PDF for a 55 mm thermal
printer. There is no checkout or server: the owner receives the copied receipt (Telegram
@nimet_giftshop) and prints the PDF.

The owner is not a developer. Anything the owner edits regularly must stay simple (plain lists in
`data/`), and explanations should be in plain language.

## Tech stack

- Plain static site: `index.html` + ES modules (`<script type="module">`). No build step, no npm.
- Tailwind CSS via CDN (`cdn.tailwindcss.com`) and Font Awesome 6 via CDN.
- Hosted on GitHub Pages, branch `master`. Paths are case-sensitive: keep file and folder names lowercase.
- Must be served over HTTP (GitHub Pages or a local server such as VS Code Live Server). Opening
  `index.html` by double-click breaks the ES-module imports. `index.html` shows a red banner if a
  module file is missing.
- State is kept in `localStorage`: cart (`nimet_scout_cart`) and receiver details (`nimet_scout_receiver`).

## Folder structure

```
index.html              page shell: header, 5 tabs, bottom nav, woggle menu modal, cart modal, toast
css/
  styles.css            brand colors, K5 Khmer font (@font-face), small helpers
  k5.woff2              Khmer font (loaded only for Khmer letters via unicode-range)
data/                   <- files the OWNER edits (no code knowledge needed)
  catalog.js            all products, prices, Khmer names, colors, woggle styles, exchange rate, sender phone
  news.js               home-page newsfeed posts
  translations.js       all website wording, English + Khmer, side by side
js/                     <- code; the owner normally does not edit these
  app.js                UI controller: rendering, events, search, choice menu, cart UI, language toggle
  cart.js               cart + receiver state, localStorage, receipt text
  products.js           builds product lists from data/catalog.js
  i18n.js               language state, t(), name/option translation helpers
  currency.js           formatPrice(): USD in English, riel in Khmer
  pdf.js                55 mm thermal receipt PDF (canvas -> PDF, no library)
  saved-orders.js       saved customers + carts (localStorage), one per receiver name
  print.js              OPTIONAL Bluetooth print of the receipt (separate feature, see "Printing")
  icons.js              the Scout logo as inline icon paths (used for every woggle icon)
assets/                 pictures, one folder per section (see below)
  logo/                 nimet-scout-store-logo.svg (header), scout-logo.svg (source of the woggle icon)
  shop/ pin/ badge/ woggle/ news/
```

## How the app works

- **Tabs:** Home (newsfeed), Shop, Woggle, Pin, Badge. Every product tab has a live search box
  (matches English name, Khmer name and the name shown right now).
- **Products** come from `data/catalog.js` through `js/products.js`. IDs are generated: `<section>-<slug of name>`
  (`shop-coffee-mug`). Woggle style cards are `wn-<style>` (woggle with a name) and `wp-<style>` (normal woggle).
  Renaming an item changes its ID, so carts saved on customers' phones will drop it. This is harmless.
- **Product pop-up:** tapping anywhere on a product card (there are no "+" buttons on the cards) opens one shared pop-up
  (`openProductModal()` in `js/app.js`, markup `#woggle-customizer-modal`): big square picture on top, quantity stepper, price on the
  Add to Cart button. Cards are `role="button"`; Enter / Space also open them. A product WITHOUT `options` shows only the picture
  (bigger, 56vh), quantity and Add to Cart, and adds to `cart.standardItems`. A product WITH `options: [...]` also shows the
  option buttons and adds to `cart.customWoggles` (see Choice menu below). The picture area is the only place that needs a photo;
  without one an icon is shown.
- **Choice menu:** a product with `options: [...]` shows these extra parts in the pop-up: option buttons and, for "Woggle Name"
  cards, the name field.
  - Name field is shown only for `kind: 'custom'` (the "Woggle Name" cards). Every other product hides it.
  - Two-color options are written `"White-Red"`; the app splits on `-` and draws a two-tone swatch.
  - Non-color options (e.g. Rank Badge classes) have no swatch. `optionsTitle: "class"` changes the menu wording.
- **Cart:** plain items live in `cart.standardItems` (id -> qty). Choice-menu items live in `cart.customWoggles`
  (the name is historical; it holds every choice-menu item). Its field `color` holds the chosen option. Identical
  items merge into one line with a quantity. Items removed from the catalog are ignored.
- **Receiver details:** name, phone, address and delivery method (VET / J&T / Delivery / Pick up) in the cart. Saved on the
  phone, included in the copied receipt and the PDF. "Clear Cart" empties items only.
- **Delivery fees** (`DELIVERY` in `data/catalog.js`, in USD): VET $1.50, J&T $1.625 (= 6,500៛), Delivery = customer picks a
  named zone: Near $1.00 (ចម្ងាយជិត), Average $1.50 (ចម្ងាយល្មម), Outside PP $2.00 (ជាយក្រុងភ្នំពេញ) (none preselected;
  a hint shows until one is chosen; zones are `fees: [{ fee, name, nameKh }]`, keep each price different since the price
  identifies the zone). A chosen zone is written "Delivery - Near" in the receipt, fee row and PDF, Pick up is free. The fee is added to the total
  and shown as its own row ("Delivery fee (VET)") in the cart, the copied receipt and the PDF. No fee row for Pick up, and no
  fee is counted while the cart is empty. Tapping a chosen method (or fee) again clears it. Prices like 1.625 are shown
  as `$1.625` in English (`formatPrice` keeps a 3rd decimal only when needed).
- **Order source:** three buttons under the Receiver Name box (Page / Telegram / TikTok, tap again to clear) store
  `receiver.source`. The chosen source is added after the name: "Sophie (TikTok)" in the copied receipt, the PDF name line and
  the saved-orders list (`receiverDisplayName()` in `js/cart.js`). Saved orders are still matched by the plain name only.
- **Order source colors (when selected):** Page `#0866FF`, Telegram `#0088CC`, TikTok black (`SOURCE_ON` in `js/app.js`).
- **Delivery button colors:** the selected VET button is orange, J&T red, the others dark (`DELIVERY_ON` in `js/app.js`).
- **Saved orders:** the clipboard icon button to the right of the Receiver Name box opens a panel listing saved customers.
  "Save current" stores the cart + receiver details under the receiver name (same name = update, name required). Tapping a
  row loads that cart back for adding more products (asks first if the current cart has unsaved items); the trash button
  on the right deletes it (with a confirm) once the order is done. Stored in `localStorage` key `nimet_scout_saved_orders`,
  so the list exists only on that phone/browser and is not shared between devices.
- **Tab titles:** each tab has one big title (`text-xl`) and no gray subtitle line. The old `*_subtitle` wording keys were deleted
  from `translations.js` because nothing uses them.
- **Logos:** the header shows `assets/logo/nimet-scout-store-logo.svg` (falls back to a compass icon if the file is missing).
  Every woggle icon (bottom menu, picture-less product cards, the choice menu) is the Scout logo from `js/icons.js`,
  drawn with `currentColor` so it follows the active/inactive and option colors. Pin and badge icons are unchanged.
  The store logo's "Scout Shop" text is live text; its font was changed from GT Planar (not available on the web) to a
  bold sans-serif. For the exact brand font, export the logo with text converted to outlines.
- **Receipt text:** `generateFormattedReceipt()` follows the current language and currency.
- **PDF:** always Khmer and riel, whatever the site language. Width 55 mm, length grows with the items.
  The Export PDF button is intentionally small and faint (owner tool, so customers do not tap it by accident);
  Copy Receipt is the main button. Do not make the PDF button prominent again.
  Text is drawn on a canvas (so the browser shapes Khmer correctly) and wrapped in a one-page PDF.

## Rules and decisions (keep these)

- **Prices are stored in US dollars.** Khmer mode shows riel: `price * SETTINGS.USD_TO_KHR` (currently 4000),
  formatted like `12,000៛`. English mode shows `$12.00`. Never store riel prices.
- **Default language is Khmer** (`kh`). The EN/KH slider toggles it and re-renders grids, news, cart, open menu and static text.
- **Woggle styles** (in `WOGGLE_STYLES`): Lis, Romdoul, Angkor, Red Cross. Each style makes two cards ("Woggle Name" and "Normal").
- **Standard woggle prices:** woggle with name `WOGGLE_NAME_PRICE` = $3.00; normal woggles `WOGGLE_NORMAL_PRICE` = $1.25.
- **The cart stores English names** (style, option, title) and translates when displaying. Do not store translated text.
- **All wording lives in `data/translations.js`.** Use `t('key')`; do not hard-code English or Khmer strings in JS/HTML.
  In HTML use `data-i18n="key"` and `data-i18n-placeholder="key"`. If `kh:` is empty, English is shown.
  Keep `{style}`, `{color}`, `{name}`, `{qty}`, `{total}` placeholders intact.
- **Product names:** English in `name`, Khmer in `nameKh` (in `data/catalog.js`). Color names in `COLOR_TRANSLATIONS`,
  non-color option names in `OPTION_TRANSLATIONS`, woggle style Khmer names as `nameKh` on each style.
- **Khmer font:** K5 (`css/k5.woff2`) is restricted to Khmer code points with `unicode-range`; English keeps the system font.
  K5 has one weight, so `font-weight: 100 900` is declared to avoid fake bold.
- **PDF receipt layout (do not reorder):** `Nimet Scout Shop` (English) -> Khmer shop name -> receiver name -> line ->
  sender phone (`SETTINGS.SENDER_PHONE`, 070 90 98 96) -> receiver phone -> address -> delivery method -> line ->
  items -> delivery fee row (only if > 0) -> total -> Khmer footer.
- **CSS gotcha:** `css/styles.css` forces every `button`, `input` and `select` to be at least 48 px tall. A small square button
  (for example `w-11 h-11`) must also have the class `min-h-0`, otherwise it turns into a tall rectangle.
- Touch targets are at least 48 px and text inputs use 16 px (prevents iOS zoom). Keep it mobile-first (max width `max-w-lg`).
- User-typed text (names, address) must go through `escapeHTML` before being put into `innerHTML`.

## Printing (optional, separate feature)

`js/print.js` + the small "Print" button next to "Export PDF" in the cart. It is self-contained: to remove it, delete
`js/print.js`, the `<button id="print-btn">` in `index.html`, and the `import './print.js';` line in `js/app.js`
(plus the `cart_print` / `print_*` keys in `translations.js` and `PRINTER_DOTS` in `catalog.js` if wanted).

- The printer is a Detonger P1 (58 mm paper). It cannot pair with an iPhone in Settings; the maker's app is WePrint.
  The maker's SDK (Dothantech **LPAPI**, a compiled native iOS library) is NOT usable from a website. From its binary we only know
  it talks Bluetooth Low Energy through these GATT services: `FFE0` (char `FFE1`), `18F0`, `49535343-FE7D-4AE5-8FA9-9FAFD205E455`,
  `E7810A71-73AE-499D-8C15-FAA9AEF0C3F2`, and wraps data in its own packet layer. Whether the P1 also accepts plain ESC/POS is unconfirmed.
- Two paths, chosen automatically in `onPrintClick()`:
  1. `navigator.bluetooth` exists (Bluefy on iPhone, Chrome on Android/PC): connect over BLE (device picker lists all devices),
     find the first writable characteristic in the services above, send an ESC/POS raster image (`GS v 0`) in 100-byte chunks.
  2. No Web Bluetooth (normal iPhone Safari): share sheet with a black/white PNG (`nimet-receipt.png`) so it can be sent to WePrint;
     if sharing is unavailable the PNG is downloaded instead.
- The receipt is the same Khmer receipt as the PDF, drawn by `drawReceipt()` in `js/pdf.js` at the printer width
  (`SETTINGS.PRINTER_DOTS`: 384 for 58 mm, 576 for 80 mm; layout width 480 design units so text is about 22 dots high).
- Verified only with a mock Bluetooth printer (bytes decode to the correct 384-dot image). Not yet confirmed on the real P1.
  If direct Bluetooth printing does not work on the real printer, remove path 1 or the whole feature rather than reverse-engineering LPAPI.

## Pictures

Put square pictures (about 800 x 800) in the section's own folder and type only the file name in `data/catalog.js`.

| Section | Folder | Main picture example |
|---|---|---|
| Shop | `assets/shop/` | `mug.jpg` |
| Pin | `assets/pin/` | `pin-national.jpg` |
| Badge | `assets/badge/` | `rank-badge.jpg` |
| Woggle | `assets/woggle/` | `woggle-lis.jpg`, `normal-woggle-lis.jpg`, `round-lis-woggle.jpg` |
| News | `assets/news/` | any name used in `data/news.js` (shown as a 16:9 banner) |

Picture for one choice (each color, class...) sits in the same folder: `<imageKey>-<option>.jpg`, all lowercase, spaces become `-`.
- Woggle with a name: `lis-dark-blue.jpg`, `red-cross-wood-white.jpg`
- Normal woggle: `normal-lis-dark-blue.jpg`
- Other items (`imageKey` = slug of the item name): `round-lis-woggle-red.jpg`, `square-lis-woggle-white-red.jpg`, `rank-badge-star-class.jpg`

If a choice picture is missing the main picture is used; if that is missing too, an icon is shown. Nothing breaks.

## Common tasks

- **Add a product:** add one line to the right list in `data/catalog.js` (`name`, `nameKh`, `price`, `image`, optional `options`).
- **Post an update:** add a block at the top of `data/news.js` (`date` as `YYYY-MM-DD`, newest shows first).
- **Change wording:** edit the line in `data/translations.js`. Add the Khmer text in `kh:`.
- **Change exchange rate or sender phone:** `SETTINGS` at the top of `data/catalog.js`.
- **Add a woggle style:** add to `WOGGLE_STYLES` in `data/catalog.js` (also its Khmer `nameKh` and a color list).
- **Add a color:** add it to `COLORS` (hex) in `data/catalog.js` and to `COLOR_TRANSLATIONS` in `data/translations.js`.

## Testing

No test suite. Check changes in a browser over HTTP, in both English and Khmer, on a phone-width screen.
After editing, run `node --check` on JS files (copy to `.mjs` if needed) for syntax errors. For the PDF, export one
and confirm the page is 55 mm wide and the Khmer text looks right. Hard-refresh to avoid cached JS and CSS.

## Open items

- Placeholder prices to confirm in `data/catalog.js`: the six scarves ($5.00) are marked `TODO`.
  Round Lis and Square Lis woggles use the normal-woggle price.
- Khmer wording in `data/translations.js` and `data/catalog.js` is partly draft; the owner reviews and corrects it.
- The repo had no `assets/` folder when last checked; pictures must be uploaded for product images to show.
