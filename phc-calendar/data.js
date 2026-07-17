// TTC PHC Calendar — live data feed. REWRITTEN by the daily phc-scan run; do not hand-edit.
window.PHC_DATA = {
  as_of: "2026-07-17",
  gdd: {
    value: 1294.2, rate14: 27.7, base: 50, from: "2026-03-01", location: "Logan UT",
    next: [
      { label: "Pine needle scale gen-2 crawlers OPEN", gdd: 1388, date: "2026-07-20" },
      { label: "Oystershell scale gen-2 crawlers OPEN", gdd: 1600, date: "2026-07-28" },
      { label: "Pine needle scale gen-2 CLOSES", gdd: 1917, date: "2026-08-08" },
      { label: "Spruce spider mite fall round OPENS", gdd: 2375, date: "2026-08-25" }
    ]
  },
  worklist: [
    { s: "PAST", job: 7719, client: "Greg Batty", line: "Mectinite micro — lilac/ash borer (green ash)", why: "Window closed ~early Jul (GDD 148–299; now 1294). Verdur + Cambistat lines on this job are still fine.", action: "DAVID: late-treat, roll to spring 2027, or adjust", amt: 361 },
    { s: "PAST", job: 5904, client: "Jason Allen", line: "FerriPlus soil inj — 'spring 2025'", why: "Two springs missed; job status LATE. Brain allows reduced-dose salvage to ~Aug.", action: "DAVID: reduced-dose now or rebid 2027", amt: 224 },
    { s: "PAST", job: 7385, client: "Kelly Wiggington", line: "Myclotect foliar — 'best in spring'", why: "Spring window passed; job priced $0.", action: "DAVID: decide + price", amt: 0 },
    { s: "PAST", job: 6807, client: "Heather Larsen", line: "Fruit insecticides Jul–Aug 2025", why: "The 2025 season is gone; job still action_required.", action: "OFFICE: close or renew as 2026", amt: 200 },
    { s: "PAST", job: 7761, client: "Janice Gladwell", line: "Myclotect — powdery mildew (preventive)", why: "Preventive window = bud break → leaves formed. Aphid + iron lines below still live.", action: "DAVID: skip this year?", amt: 0 },
    { s: "CLOSING", job: 6870, client: "Aurora & Geo Villa", line: "Mectinite — ponderosa bark beetles", why: "Unscheduled 11 months; client called 7/15 asking if mid-July is too late. Window = OPEN GAP #1.", action: "DAVID TODAY: answer + schedule or refund", amt: 323 },
    { s: "CLOSING", job: 7717, client: "Spaulding (Providence)", line: "FerriPlus soil inj — 'apply ASAP (already slightly late)'", why: "Line says ASAP; visit exists 7/21 — protect that date.", action: "ERYN: confirm 7/21 holds", amt: 0 },
    { s: "CLOSING", job: 7771, client: "Rial Chew", line: "FerriPlus — 9 chlorotic trees", why: "Iron after mid-June = already-late/ASAP (Brain). Pair with deep-watering.", action: "ERYN: schedule ≤3 wks", amt: 697.5 },
    { s: "CLOSING", job: 7779, client: "Sher Lisonbee", line: "Chelated iron — hawthorn", why: "Iron ASAP rule; also check sprinkler/vinca note.", action: "ERYN: schedule ≤3 wks", amt: 90 },
    { s: "CLOSING", job: 7761, client: "Janice Gladwell", line: "FerriPlus — hedge maple + magnolia (+ Tengard aphids NOW)", why: "Iron ASAP rule; aphid spray is scout-open.", action: "ERYN: one visit, both lines", amt: 245 },
    { s: "CLOSING", job: 7785, client: "Karen Higley (Preston)", line: "Soil injection + soil analysis", why: "Iron ASAP rule (PHC in Idaho is fine — no dig).", action: "ERYN: schedule ≤3 wks", amt: 288.5 },
    { s: "CLOSING", job: 7786, client: "Nancy Sassano", line: "Soil injection (+ PGR open)", why: "Iron ASAP rule.", action: "ERYN: schedule ≤3 wks", amt: 407 },
    { s: "CLOSING", job: 7731, client: "Debbie Hancey", line: "Soil inj + micro inj + foliar + PGR", why: "Iron ASAP + micro-inj pest unverified — check description.", action: "ERYN sched + DAVID verify micro target", amt: 754.5 },
    { s: "CLOSING", job: 7417, client: "Kami Antriyao", line: "Transtect soil inj — cottony maple scale ('best in spring')", why: "Spring passed; systemic-alternative timing = DAVID call. Cambistat line is OPEN (Mar–Nov).", action: "DAVID: treat now or spring?", amt: 612 },
    { s: "GAP", job: 7788, client: "Shayla Snarr", line: "Mectinite — spruce IPS beetle ×8", why: "Ips window not in windows.md (gap #8) — abstained, not guessed.", action: "DAVID: give the window", amt: 760 },
    { s: "GAP", job: 7745, client: "Roger Cook", line: "Micro injection (target pest unread) + PGR", why: "Micro-inj target needs description read before classifying.", action: "Next scan: pull desc", amt: 536.5 },
    { s: "OPEN", job: 7749, client: "Katie Brinck", line: "Cambistat PGR", why: "Mar–Nov window.", action: "ERYN: schedule anytime", amt: 255 },
    { s: "OPEN", job: 7760, client: "Anna Trappett", line: "Cambistat PGR — Crimson King", why: "Mar–Nov window.", action: "ERYN: schedule anytime", amt: 100 },
    { s: "OPEN", job: 7737, client: "Melanie Kvarfordt", line: "Trimtect PGR — cotoneaster hedge", why: "Event window: apply within 1–2 wks of shearing — schedule WITH the shear (job LATE).", action: "ERYN: pair with topiary shear", amt: 235 },
    { s: "ONTRACK", job: 7559, client: "Rob Levan", line: "Aphid spray 3/3", why: "Visits 6/19 ✓ 7/17 ✓ → 8/14.", action: "none", amt: 55 },
    { s: "ONTRACK", job: 7419, client: "Anna Trappett", line: "Leaf hopper foliar ×3", why: "6/29 ✓ → 7/20 → 8/7.", action: "none", amt: 270 },
    { s: "ONTRACK", job: 7454, client: "Danny Gomez", line: "Fruit program", why: "3 rounds done, next 7/24.", action: "none", amt: 475 },
    { s: "ONTRACK", job: 7466, client: "Joyce Caliendo", line: "Fruit program", why: "3 rounds done, next 7/23.", action: "none", amt: 45 },
    { s: "DORMANT", job: 7024, client: "Joyce Caliendo", line: "Verdur macro — fall", why: "Parked 9/25 ≈ window (Sep 15–Oct 15).", action: "none", amt: 152 },
    { s: "DORMANT", job: 7652, client: "Kelli King", line: "Verdur macro — fall", why: "Parked 9/25 ≈ window.", action: "none", amt: 260 },
    { s: "DORMANT", job: 7660, client: "Amy Billings", line: "Verdur macro — fall", why: "Parked 9/25 ≈ window.", action: "none", amt: 157.5 },
    { s: "DORMANT", job: 7676, client: "Miriam Rich", line: "Verdur macro ×2 — fall", why: "Parked 9/25 ≈ window.", action: "none", amt: 442.5 },
    { s: "DORMANT", job: 7722, client: "Eileen Clements", line: "Winter pruning (dormancy)", why: "Parked 12/1 ≈ window (Dec–Feb).", action: "none", amt: 375 },
    { s: "DORMANT", job: 7774, client: "Kylie Fullmer", line: "Winter structural prunes ×16", why: "Parked 12/1 ≈ window.", action: "none", amt: 160 },
    { s: "TRIAGE", job: 0, client: "Fruit-spray fleet (12 jobs)", line: "action_required mid-season", why: "Rounds likely done but jobs not moved — status hygiene, not biology.", action: "ERYN: sweep statuses", amt: 0 },
    { s: "TRIAGE", job: 7465, client: "Carlo Lemon", line: "Fruit-Complete program (spring 2026)", why: "action_required in July — verify which rounds actually ran.", action: "ERYN/TREVOR: verify", amt: 475 }
  ],
  gaps: [
    "#1 Mectinite/bark-beetle on ponderosa — mid-July too late? (LIVE: #6870, client waiting)",
    "#2 Miticide actual month/window",
    "#3 Honey locust borer window",
    "#4 Lilac/ash borer dates — confirm (hedged)",
    "#5 Cottony maple scale crawler window",
    "#6 Powdery mildew — one or two applications?",
    "#7 Which line items fall under the Mar–Nov PGR window",
    "#8 Spruce ips treatment window (NEW 7/17 — #7788)"
  ]
};
