// TTC Crew app — the people roster used ONLY by the local (offline) sign-in fallback, while
// crew-api.json has no url set yet. Real values taken from backend/people-seed.json (2026-09-22 pull,
// every Jobber user with a timesheet entry in the 21 days before the pull). Once the Apps Script
// backend is deployed, sign-in goes through it (email + one-time code) and this file stops being read
// for identity — see services/records.js.
//
// `test: true` marks the one account that isn't a real person, so a page can label it clearly and
// nobody mistakes it for someone on the crew.
window.TTC_PEOPLE = [
  { person_id: "david-thunell",   display_name: "David Thunell",   email: "david@totaltreecareutah.com",  role: "office"  },
  { person_id: "matthew-gil",     display_name: "Matthew Gil",     email: "matthewbgil@gmail.com",        role: "crew"    },
  { person_id: "braxton-whitney", display_name: "Braxton Whitney", email: "whitneybraxton0@gmail.com",    role: "crew"    },
  { person_id: "joseph-myers",    display_name: "Joseph Myers",    email: "joseph@totaltreecareutah.com", role: "office"  },
  { person_id: "trevor-stevens",  display_name: "Trevor Stevens",  email: "tlstevens.07@gmail.com",       role: "trainer" },
  { person_id: "tyler-montoya",   display_name: "Tyler Montoya",   email: "tylermontoya2015@gmail.com",   role: "crew"    },
  { person_id: "cole-cook",       display_name: "Cole Cook",       email: "colecook0810@gmail.com",       role: "crew"    },
  { person_id: "isaac-baker",     display_name: "Isaac Baker",     email: "baker0isaac@gmail.com",        role: "crew"    },
  { person_id: "ethan-risenmay",  display_name: "Ethan Risenmay",  email: "errisenmay@gmail.com",         role: "crew"    },
  { person_id: "gabriel-dye",     display_name: "Gabriel Dye",     email: "gabe@totaltreecareutah.com",   role: "trainer" },
  { person_id: "dalan-parker",    display_name: "Dalan Parker",    email: "dalanpparker@gmail.com",       role: "crew"    },
  { person_id: "eryn-thunell",    display_name: "Eryn Thunell",    email: "eryn@totaltreecareutah.com",   role: "office"  },
  { person_id: "test-crew",       display_name: "Test Crew Member", email: "test@totaltreecareutah.com",  role: "crew", test: true }
];
