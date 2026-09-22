/* TTC crew app — the badge catalog.
   CONTENT layer: what badges exist. Public, and contains no person's name.
   Who holds what lives in the records backend (backend/certifications-seed.json), never here.
   Adding a badge is an edit to this file and nothing else. */
window.TTC_CERTS = {
  version: "2026-09-22.1",
  groups: [
    {
      id: "isa", title: "ISA credentials", blurb: "International Society of Arboriculture.",
      badges: [
        { id: "isa-arborist",  name: "ISA Certified Arborist",              tier: "gold",   renews: 3,
          about: "The industry's core credential. Three years, then CEUs to renew." },
        { id: "isa-bcma",      name: "ISA Board Certified Master Arborist", tier: "legend", renews: 3,
          about: "The highest ISA credential. Few arborists hold it.", requires: ["isa-arborist"] },
        { id: "isa-climber",   name: "ISA Certified Tree Climber",          tier: "gold",   renews: 3,
          about: "Climbing skill, assessed on rope in a tree." },
        { id: "isa-traq",      name: "ISA Tree Risk Assessment Qualified",  tier: "gold",   renews: 5,
          about: "Qualified to assess and document tree risk. Five years." },
        { id: "isa-municipal", name: "ISA Municipal Specialist",            tier: "gold",   renews: 3,
          about: "Urban forestry specialisation.", requires: ["isa-arborist"] }
      ]
    },
    {
      id: "safety", title: "Safety and licences", blurb: "What keeps the crew and the public safe.",
      badges: [
        { id: "tcia-ctsp",  name: "TCIA Certified Treecare Safety Professional", tier: "legend", renews: 3,
          about: "Runs the safety programme. TCIA's safety credential." },
        { id: "pesticide",  name: "Licensed Pesticide Applicator (Utah)",        tier: "gold",   renews: 3,
          about: "Required to apply plant health care treatments." },
        { id: "first-aid",  name: "First Aid and CPR",                            tier: "silver", renews: 2,
          about: "Everyone on a crew should hold this." },
        { id: "emt",        name: "Licensed EMT",                                 tier: "legend", renews: 2,
          about: "Emergency medical technician." },
        { id: "cdl",        name: "Commercial Driver's Licence",                  tier: "gold",   renews: 4,
          about: "For the big trucks and the chipper." },
        { id: "aerial-rescue", name: "Aerial Rescue",                             tier: "gold",   renews: 1,
          about: "Getting a climber out of a tree. Practised every year." }
      ]
    },
    {
      id: "tca", title: "Tree Care Academy", blurb:
        "TCIA's module ladder, the way the handbook lays it out: read the manual, pass the open-book test, then on-the-job competency. One module at a time.",
      badges: [
        { id: "tca-apprentice", name: "Tree Care Apprentice",        tier: "bronze", orientation: true,
          about: "One of the first three. Read before a first day in the field." },
        { id: "tca-ground",     name: "Ground Operations Specialist", tier: "bronze", orientation: true,
          about: "One of the first three. Read before a first day in the field." },
        { id: "tca-chipper",    name: "Chipper Operator Specialist",  tier: "bronze", orientation: true,
          about: "One of the first three. Read before a first day in the field." },
        { id: "tca-chainsaw",   name: "Chainsaw Specialist",          tier: "silver" },
        { id: "tca-climber",    name: "Tree Climber Specialist",      tier: "silver" },
        { id: "tca-srt",        name: "SRT Climber",                  tier: "silver" },
        { id: "tca-aerial-lift",name: "Aerial Lift Specialist",       tier: "silver" },
        { id: "tca-crane",      name: "Crane Operations Specialist",  tier: "gold" },
        { id: "tca-phc",        name: "Plant Health Care Technician", tier: "gold" },
        { id: "tca-safety",     name: "Tree Care Safety Specialist",  tier: "gold" },
        { id: "tca-aerial-rescue", name: "Aerial Rescue Training Program", tier: "gold" }
      ]
    },
    {
      id: "honours", title: "Honours", blurb: "Earned once. Never expires.",
      badges: [
        { id: "utah-aoty", name: "Utah Arborist of the Year", tier: "legend", once: true,
          about: "Named by the Utah Community Forest Council." }
      ]
    }
  ],
  states: ["none", "in_progress", "earned"],
  tiers: {
    bronze: { label: "Bronze" }, silver: { label: "Silver" },
    gold:   { label: "Gold"   }, legend: { label: "Standout" }
  }
};
