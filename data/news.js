// =====================================================================
//  data/news.js  —  EDIT THIS FILE TO POST UPDATES ON THE HOME PAGE
//  Visitors cannot change this file. Only you (in your code editor).
//
//  HOW TO POST AN UPDATE
//  Copy one block { ... }, paste it ABOVE the others, and change it:
//     date    = "YYYY-MM-DD"  (newest date is shown first automatically)
//     title   = headline
//     text    = the message (you can use \n for a new line)
//     image   = OPTIONAL picture file name from assets/news/  (or "" for none)
//     youtube = OPTIONAL YouTube link. Paste the link exactly as you copy it from YouTube
//               (youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...), or "" for none.
//               The post then shows the video with YouTube's own thumbnail and play button
//               (if a youtube link is set, it is shown instead of the picture).
//     titleKh / textKh = OPTIONAL Khmer version, shown when the site is in
//                        Khmer. Leave as "" to show the English text.
//
//  HOW TO REMOVE AN UPDATE: delete its whole { ... }, block.
// =====================================================================

export const NEWS = [
    // Example post with a YouTube video (remove the two // at the start of each line to use it):
    {
        date: "2026-11-03",
        title: "Watch our new video",
        text: "Short description of the video.",
        image: "",
        youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        titleKh: "",
        textKh: "",
    },

    {
        date: "2026-11-01",
        title: "New: Normal Woggles in 4 styles",
        text: "Normal woggles are now available in Scout, Romdoul, Angkor and Red Cross styles. Just choose your color!",
        image: "",
        titleKh: "",
        textKh: "",
    },
    {
        date: "2026-10-20",
        title: "Welcome to Nimet Scout Shop",
        text: "Order custom woggles with your name, plus pins, badges and more. Add items to your cart and copy the receipt to send us your order.",
        image: "",
        titleKh: "",
        textKh: "",
    },
];
