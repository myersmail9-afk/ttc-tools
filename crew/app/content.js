// TTC Crew — content.js
// THIS IS THE FILE YOU EDIT. One tile = one line. Save, copy to ttc-tools/crew/app/, and every
// phone picks it up the next time the app is opened (no reinstall, no new link).
//
// Rules (Joseph, 2026-09-11): never recreate a sheet or a form, link straight to it; never delete a
// resource from this list without saying so; office-only items carry roles: ["office"].
//
// Fields per section:
//   id      short unique slug, used as the route (#/<id>) and for search
//   title   the card / top-bar title
//   icon    one of the names in the ICONS map in index.html: shield, book, wrench, clipboard,
//           truck, star, drop, building
//   blurb   one line shown under the title in the category view
//   roles   who sees the card; "crew" = everyone, "office" = unlocked phones only
//   tiles   the list below
//
// Fields per tile:
//   id      short unique slug (used for search and stable ordering)
//   label   what the button says
//   desc    one line under the label (optional)
//   href    where it goes
//   kind    sheet | form | doc | pdf | app | link | file   (drives the small badge and open behavior)
//   roles   optional; defaults to the section's roles. "crew" = everyone, "office" = unlocked phones only
//   search  optional extra keywords for the search box
//   group   optional sub-heading string; the category view prints it when it differs from the
//           previous tile's group (used today only for the office section's "Hiring paperwork" set)
//
// Emergency: a single "Crew Emergency Contacts" button on the home screen. Personal numbers stay in
// that Google-gated sheet; no other phone numbers belong in this file except the ones already removed.
//
// sheetHref (optional, any tile): use when a tile opens a nice page built on top of a sheet; the sheet
// stays one tap away. Pair with an optional sheetLabel (defaults to "Open the sheet"). Not used on any
// tile yet except the emergency entry below.
//
// Bump meta.version whenever you change this file (shown in the footer, helps you confirm a phone updated).

window.TTC_CONTENT = {
  meta: {
    version: "2026-09-11.4",
    updated: "September 11, 2026",
    appName: "TTC Crew"
  },

  emergency: {
    contacts: {
      label: "Crew Emergency Contacts",
      // pageHref: the login-gated contacts page (Apps Script web app). Empty until deployed — when empty,
      // the button falls back to sheetHref. Once the web app URL exists, paste it in here.
      pageHref: "https://script.google.com/macros/s/AKfycbwFLYvp9TH35UjColkwFff0ArONQrT_l-WbG8cFBzS-O0wryMX5PzVBFeBlioHvJz0mZw/exec",
      sheetHref: "https://docs.google.com/spreadsheets/u/0/d/1soPoRlkpGhM4rb2Xb3E8e-Q_BiGhDhwpxGSAhSblgvw/edit",
      sheetLabel: "Open the sheet"
    }
  },

  sections: [
    {
      id: "safety", title: "Safety", icon: "shield", roles: ["crew"],
      blurb: "The rules we run every job by, and where to report a problem.",
      tiles: [
        { id: "safety-points", label: "TTC Safety Points", desc: "The safety rules we run every job by", href: "https://docs.google.com/spreadsheets/u/0/d/1ZgI3fT6xXOdHbQXl2KDiQnd4rH3xsATnu0T458Quy-M/edit", kind: "sheet" },
        { id: "sds", label: "SDS", desc: "Safety data sheets for what's on the truck", href: "https://docs.google.com/spreadsheets/d/16qMsPAAIcLdy4QMwRx_YgNPkragbkOtuwEosZVQmvBE/edit", kind: "sheet", search: "chemical msds spray" },
        { id: "vehicle-inspection", label: "Vehicle Inspection", desc: "Daily truck and chipper check", href: "https://docs.google.com/forms/d/e/1FAIpQLScYjkpADn8gAQM34xFBsd9q3PP3La7fPkkILyDL1ypFj4lSxg/viewform", kind: "form", search: "truck dvir pre-trip" },
        { id: "incident", label: "Incidents and Close Calls", desc: "Report it the same day, even if nobody got hurt", href: "https://docs.google.com/forms/d/e/1FAIpQLSdijMRGLmR2iPa-46OTICbbmanxr1vwyz52VgOW4afDplgsRg/viewform", kind: "form", search: "accident injury near miss damage" },
        { id: "cell-phone-policy", label: "Cell Phone Safety Policy", desc: "No phone use while driving, personal or company vehicle", href: "https://drive.google.com/file/d/0B8tiA6chj-h-V1ZDWDdoa2wwY2FDRVhhREtabXJybk56MG1R/view?resourcekey=0-oodsrPvIbCkyjDz3WngXwg", kind: "pdf", search: "driving texting" }
      ]
    },

    {
      id: "handbook", title: "Handbook", icon: "book", roles: ["crew"],
      blurb: "The 2020 book, as written, and what might change next edition.",
      tiles: [
        { id: "handbook-2020", label: "Policies and Procedures Book (2020)", desc: "Read it here, page by page. The PDF is one tap away.", href: "pages/handbook/", kind: "file", search: "handbook rules uniform training schedule compensation knots" },
        { id: "handbook-notes", label: "Notes and Proposed Changes", desc: "David's notes on the printed copy, and anything we agree to change", href: "pages/handbook/notes.html", kind: "file", search: "updates revisions" },
        { id: "dispute-policy", label: "Customer Complaint and Dispute Policy", desc: "What to do when a customer is unhappy", href: "https://docs.google.com/document/d/1eNTcB9_abKSMaJCsqItSOBzv8ysv9pLPO-SFqNqns3A/edit", kind: "doc" },
        { id: "handbook-pdf", label: "Download the PDF", desc: "The 2020 book as a file, behind the Google sign-in", href: "https://drive.google.com/file/d/1bXUEv6epzaC0IyIEe7Tiy2muqugoqmsw/view", kind: "pdf" }
      ]
    },

    {
      id: "equipment", title: "Equipment", icon: "wrench", roles: ["crew"],
      blurb: "Service logs, saws, inventory, and gear, by truck or by person.",
      tiles: [
        { id: "maintenance", label: "Maintenance", desc: "Service log for trucks, chippers, and gear", href: "https://docs.google.com/spreadsheets/d/1OTBG3OBBIpHYFG9p_z5ffJMBr_cquWjMPXkajHuspbY/edit", kind: "sheet", search: "oil repair service" },
        { id: "chainsaws", label: "Chainsaws", desc: "Saw list, bars, and who has what", href: "https://docs.google.com/spreadsheets/d/1ojz4jsVgrAbmWY9GR6rN6cLuvptfB9SY5gbn79iRBg0/edit", kind: "sheet", search: "saw bar chain" },
        { id: "inventory", label: "Company Inventory", desc: "Tools and equipment TTC owns", href: "https://docs.google.com/spreadsheets/d/1rRaMWYj2pwUvR3PZQ1hFb7xowX8inGW7RJGPakeBXLY/edit", kind: "sheet", search: "tools equipment" },
        { id: "gear-issued", label: "Company Gear Issued", desc: "Uniforms and PPE issued to each person", href: "https://docs.google.com/spreadsheets/d/1FG45aUahkvjNONhvFpouQ0vN8etVIV7zsfoy_eTZsYs/edit", kind: "sheet", search: "uniform ppe boots helmet" },
        { id: "sena", label: "Sena Status", desc: "Who has which headset and its condition", href: "https://docs.google.com/spreadsheets/u/0/d/1PVHL-y76gB0JZ9bcjQOPEH0twoZZy2w_NNfbB_T-npM/edit", kind: "sheet", search: "headset radio comms" }
      ]
    },

    {
      id: "forms", title: "Forms", icon: "clipboard", roles: ["crew"],
      blurb: "Time off, reimbursements, receipts, and requests, in one place.",
      tiles: [
        { id: "time-off", label: "Time Off Request", desc: "Ask early, get it on the calendar", href: "https://docs.google.com/forms/d/e/1FAIpQLSchj24P3F9mJi8AepYa0H32GqzXvasdn62mSmp3Ia1RLAKRzA/viewform", kind: "form", search: "vacation pto sick day" },
        { id: "reimbursement", label: "Reimbursement Request", desc: "Money you spent for the company", href: "https://docs.google.com/forms/d/e/1FAIpQLSfGfNFia1u46rwZmI-r9xRzhw-LaIGG4Jwzt5FzLKap0sMEQg/viewform", kind: "form", search: "mileage expense" },
        { id: "cc-receipt", label: "Credit Card Receipt Submission", desc: "Snap the receipt for any company card purchase", href: "https://docs.google.com/forms/d/e/1FAIpQLSf78BDxrzzdgbQSmzCO7o4U4-b2iVfX1rBDevAyw4Wt7-x3Yg/viewform", kind: "form", search: "receipt fuel gas" },
        { id: "out-on-a-limb", label: "Out on a Limb Nomination", desc: "Nominate a crew member who went above and beyond", href: "https://docs.google.com/forms/d/e/1FAIpQLScLKIrEh1T2hg4JfNS8d_Jc1CInuF68HDYojDoSyt9AI4W8jA/viewform", kind: "form", search: "award recognition" },
        { id: "tca-workbook", label: "Tree Care Academy Workbook Request", desc: "Request the next TCIA module", href: "https://docs.google.com/forms/d/e/1FAIpQLScUiq9QOaSN0KZj3mpmhjosU-N2QTURxt8KzzcVf8djlfGmXQ/viewform", kind: "form", search: "training tcia certification" }
      ]
    },

    {
      id: "chip-drop", title: "Chip Drop", icon: "truck", roles: ["crew"],
      blurb: "The app, the customer sign-up form, and what free chips save.",
      tiles: [
        { id: "chip-drop-app", label: "Chip Drop App", desc: "Drops near you, log loads, get to The Lot", href: "https://myersmail9-afk.github.io/ttc-tools/crew/chip-drop/", kind: "app", search: "chips mulch lot" },
        { id: "chip-drop-client-form", label: "Chip Drop Sign-Up (for customers)", desc: "The form a customer fills out to get on the chip list", href: "https://docs.google.com/forms/d/e/1FAIpQLSf6kfeS5jq3MPyNVsNnrjrBppOrsFHcbFBv7woEcsTtB54gBQ/viewform", kind: "form", search: "chips mulch" },
        { id: "chip-drop-calculator", label: "Chip Drop Savings Calculator", desc: "What free chips save versus buying mulch", href: "https://myersmail9-afk.github.io/ttc-tools/chip-drop-calculator/", kind: "app" }
      ]
    },

    {
      id: "reviews", title: "Reviews and Training", icon: "star", roles: ["crew"],
      blurb: "Leaderboard, bonus, the walkthrough, and knots, the stuff that keeps score.",
      tiles: [
        { id: "leaderboard", label: "Crew Leaderboard", desc: "Review points by crew member, live", href: "https://myersmail9-afk.github.io/ttc-tools/crew/leaderboard/", kind: "app", search: "points rank" },
        { id: "reviews-bonus", label: "Google Reviews Bonus", desc: "How the review bonus works and what it pays", href: "https://myersmail9-afk.github.io/ttc-tools/crew/reviews-bonus/", kind: "app", search: "bonus cash five star" },
        { id: "post-job-walkthrough", label: "Post-Job Walkthrough", desc: "The end-of-job customer walkthrough, step by step", href: "https://myersmail9-afk.github.io/ttc-tools/crew/post-job-walkthrough/", kind: "app", search: "cleanup review ask" },
        { id: "knots", label: "Knot Tying", desc: "Climbing Arborist knot guide, with videos", href: "https://www.climbingarborist.com/knot-tying/", kind: "link", search: "rope hitch bowline" }
      ]
    },

    {
      id: "customer", title: "Customer Tools", icon: "drop", roles: ["crew"],
      blurb: "Two things worth sharing with a customer on site.",
      tiles: [
        { id: "tree-watering", label: "Tree Watering Calculator", desc: "How much and how often to water, by tree size and weather", href: "https://myersmail9-afk.github.io/ttc-tools/tree-watering/", kind: "app", search: "water irrigation" },
        { id: "website", label: "totaltreecareutah.com", desc: "The company website", href: "https://www.totaltreecareutah.com/", kind: "link" }
      ]
    },

    {
      id: "office", title: "Office", icon: "building", roles: ["office"],
      blurb: "Dashboards, sheets, and hiring paperwork. Unlocked phones only.",
      tiles: [
        { id: "hub", label: "TTC Tools Hub", desc: "Every dashboard and page in one place", href: "https://myersmail9-afk.github.io/ttc-tools/", kind: "app" },
        { id: "chip-drop-qa", label: "Chip Drop QA", desc: "Check every new pin before setting it Active", href: "https://myersmail9-afk.github.io/ttc-tools/chip-drop-qa/", kind: "app" },
        { id: "phc-calendar", label: "PHC Calendar", desc: "Growing degree days and every open PHC job by window", href: "https://myersmail9-afk.github.io/ttc-tools/phc-calendar/", kind: "app", search: "gdd spray window" },
        { id: "rate-analysis", label: "Rate Analysis", desc: "Net dollars per hour by bidder, refreshed nightly from Jobber", href: "https://myersmail9-afk.github.io/ttc-rate-analysis/", kind: "app", search: "bids win loss" },
        { id: "employee-resources-sheet", label: "Employee Resources Sheet (original)", desc: "The Google Sheet button grid this app replaces. Still the place to edit the underlying sheets.", href: "https://docs.google.com/spreadsheets/d/1XjYf1F-ODZ6Yv4_I_jzocY6d1GdiI6JoNH2dc38WrMQ/edit", kind: "sheet" },
        { id: "chip-drops-sheet", label: "Chip Drops Live (v2)", desc: "The sheet behind the Chip Drop App", href: "https://docs.google.com/spreadsheets/d/1VLwiva5-3ZHEGjLe_coKDKy5cgRAgGHzDHOz4wOsQPA/edit", kind: "sheet" },
        { id: "review-tally-sheet", label: "Crew Review Tally", desc: "The sheet behind the leaderboard", href: "https://docs.google.com/spreadsheets/d/1MGuOKTQkaoeb-USFJnhydKDL311ZpvTf_kchJYuhGeo/edit", kind: "sheet" },
        { id: "cancellation-list", label: "Cancellation List", desc: "Come-anytime clients to slot in when a job cancels", href: "https://docs.google.com/spreadsheets/d/1IsDAergCdmbg6GqjAmH7b88EdH0N4MgcuVhH_7bmYZQ/edit", kind: "sheet", search: "bbt fill in" },
        { id: "sop-checklist", label: "Joseph's Checklist for SOPs", desc: "Working list of procedures to write", href: "https://docs.google.com/document/d/13hx_1N9IlYJB7UI1SLXrD15wD1gXm0kjUWM4-IgVyEc/edit", kind: "doc" },
        { id: "ops-manager", label: "Operations Manager", desc: "Role description", href: "https://docs.google.com/document/d/1IT0qfQkwMmuq1o7s3jNnnnY9U2VaQzb7sBE0rF0MThY/edit", kind: "doc" },
        { id: "daily-shop-plan", label: "Daily Shop Plan", desc: "Shop routine", href: "https://docs.google.com/document/d/1r2uZeb5DYcp6NEowIOBycQmJS78gMg_BwrhJW3k-BUo/edit", kind: "doc" },
        { id: "i9", label: "Form I-9", desc: "Employment eligibility", href: "https://drive.google.com/file/d/1IIeQ1aRXCUvZMZEiMPaKo4PBv9L90LuJ/view", kind: "pdf", group: "Hiring paperwork" },
        { id: "w4", label: "Form W-4", desc: "Federal withholding", href: "https://drive.google.com/file/d/12U4tgBhKB5dzEHxGQQz4bpNLVp6q14Hi/view", kind: "pdf", group: "Hiring paperwork" },
        { id: "direct-deposit", label: "Direct Deposit Authorization", desc: "", href: "https://drive.google.com/file/d/1_PJpv67b-vAPke4sf9Th9eyo5COh-NOe/view", kind: "pdf", group: "Hiring paperwork" },
        { id: "nda", label: "Non-Compete and Non-Disclosure", desc: "Signed at hire", href: "https://drive.google.com/file/d/1SxGoCl13imFcI99ea-KA6W5P0mox2TO8/view", kind: "pdf", group: "Hiring paperwork" },
        { id: "pp-signature", label: "Policies and Procedures Signature Page", desc: "Signed after reading the book", href: "https://drive.google.com/file/d/12QJmejUW2PsTIojJM_hWKGBXZqXuHTSd/view", kind: "pdf", group: "Hiring paperwork" }
      ]
    }
  ]
};
