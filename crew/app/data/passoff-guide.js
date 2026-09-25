// TTC Crew — plain-language notes for the Qualified Estimator Pass-Off (2026-09-25).
//
// The gold standard is David's own document (files/training/qualified-estimator-pass-off.docx). Its
// standards live word for word in data/passoff.js, and they are never reworded. This file only EXPLAINS
// them: what each stage clears you for, what each lettered group is for, and how it gets checked.
// Every note below is read from David's document, not invented; numbers are his.
//
// Keys match the ids in data/passoff.js (levels, sections, appendices). Edit wording here freely;
// nothing here changes a standard or anyone's records.
window.TTC_PASSOFF_GUIDE = {
  version: '2026-09-25.1',

  // Joseph, 2026-09-25: the trainer for everybody is David.
  trainer: { person_id: 'david-thunell', name: 'David Thunell' },

  // From David's "How to Use This Pass-Off".
  how_it_works: [
    'Go in order: Estimator Trainee, then Tier 1, Tier 2 and Tier 3. Plant Health Care and Complex Removals are add-on specialties for later.',
    'A check mark means you showed the standard on real work and David saw it. Being taught it does not count.',
    'Showed one? Tap it and choose “I’ve shown this.” David marks it Passed, or sends it back with a note.',
    'Counts like “9 of 10 visits” come from the two tools at the bottom of the page: the Every-visit checklist and the Job check.',
    'When every standard in a stage is passed, David signs off the stage and you are cleared for more work.'
  ],

  // The four states a standard can be in. Only David can mark one Passed.
  marks: {
    open:     { label: 'Not yet',           help: 'You have not shown this yet.' },
    claimed:  { label: 'Waiting for David', help: 'You marked it shown. David will check it.' },
    verified: { label: 'Passed',            help: 'David saw you meet this standard.' },
    returned: { label: 'Sent back',         help: 'Not yet. Read David’s note, then show it again.' }
  },

  levels: {
    trainee: {
      short: 'Trainee',
      name: 'Estimator Trainee',
      clears: 'Learn the whole estimating job on real appointments. You can measure, photograph and draft estimates, but a Tier 3 estimator (David) approves every estimate before it goes to the client.',
      before: 'Everyone starts here.',
      signoff: 'David decides: ready for the Tier 1 pass-off, or keep training.',
      sections: {
        'trainee-a': {
          short: 'The rules you work under as a trainee.',
          for: 'What you may do on appointments, and what always goes to a Tier 3 estimator first: sending an estimate, uncertain pricing, and anything you are unsure about.',
          how: 'David checks each one off once he has seen you work inside these limits on real appointments.'
        },
        'trainee-b': {
          short: 'The habits every TTC estimate needs.',
          for: 'The client’s goal first, a look at the whole property, the right photos, TTC’s Tree / Objective / Specifications line items, scopes a crew can run with, honest expectations, and basic production thinking.',
          how: 'David checks each one off once he has seen you do it on real appointments. Together they show you are ready for the Tier 1 pass-off.'
        }
      }
    },

    tier1: {
      short: 'Tier 1',
      name: 'Tier 1 · Routine Residential',
      clears: 'Estimate routine pruning, small straightforward removals and familiar residential work on your own, with TTC pricing. Suggested limit: $2,500 a contract unless a senior estimator reviews it.',
      before: 'Trainee stage signed off.',
      signoff: 'David records Pass, Continue training or Reassess.',
      sections: {
        'tier1-a': {
          short: 'What has to be in place first.',
          for: 'Your ISA Certified Arborist credential, TTC’s estimator orientation, 8 appointments watched and 8 led with a qualified estimator, and the knowledge check (80% or better).',
          how: 'One-time items. David checks each one off when it is done.'
        },
        'tier1-b': {
          short: 'How you run the client visit.',
          for: 'Getting the client’s goal first, explaining what you recommend and why, covering every tree they bring up, explaining next steps, and never promising what TTC can’t control.',
          how: 'Counted across 10 scored appointments with the Every-visit checklist.'
        },
        'tier1-c': {
          short: 'Planning the work and the price.',
          for: 'Crew size, crew-hours, equipment, access and disposal limits, and the price math, planned right on each estimate.',
          how: 'Measured on 20 practice or live estimates, compared with a senior estimator’s numbers.'
        },
        'tier1-d': {
          short: 'Complete proposals, on time, on your own.',
          for: 'Proposals with nothing important missing, the right photos attached, sent within 24 hours, written in TTC’s pruning format, and routine appointments you finish without help.',
          how: 'Audited on 20 proposals and your last 20 routine appointments.'
        },
        'tier1-e': {
          short: 'Proof on real jobs.',
          for: 'Once 10 of your sold Tier 1 jobs are done: did the crew’s actual hours, the margin and the crew’s feedback match your estimate?',
          how: 'Measured with the Job check on 10 completed jobs.'
        }
      }
    },

    tier2: {
      short: 'Tier 2',
      name: 'Tier 2 · General Residential',
      clears: 'Multi-tree properties, bigger pruning and removal jobs, routine PHC you are trained for, and larger projects. Suggested limit: $5,000 to $7,500. Complex removals and unusual technical work still need the specialty or a senior review.',
      before: 'Tier 1 passed, plus 60 days or 40 independent appointments.',
      signoff: 'David records Pass, Continue training or Reassess.',
      sections: {
        'tier2-a': {
          short: 'When you can start Tier 2.',
          for: 'Time and appointments since Tier 1, at least 20 completed sold Tier 1 jobs to compare against, and no open pattern of complaints, missed scope or missed escalations.',
          how: 'David checks your record.'
        },
        'tier2-b': {
          short: 'Bigger, harder estimates.',
          for: 'Multi-tree and mixed-work jobs: crew set-up and equipment, site limits (access, rigging, cleanup, haul-off, stumps, traffic, utilities, property protection), and a day-by-day plan for multi-day work.',
          how: 'Measured on 20 Tier 2 estimates, compared with a senior estimator’s numbers.'
        },
        'tier2-c': {
          short: 'Client visits and proposals, at a higher bar.',
          for: 'The client’s goal first, a reason for every recommendation, near-perfect scopes, finishing on your own, escalating the right jobs, and TTC’s prescriptive pruning format.',
          how: 'Counted across 15 scored visits and your last 15 proposals.'
        },
        'tier2-d': {
          short: 'Proof on real Tier 2 jobs.',
          for: 'Actual crew-hours, margin, and the crew’s rating of your scope on jobs you sold.',
          how: 'Measured with the Job check on 15 completed sold jobs.'
        }
      }
    },

    tier3: {
      short: 'Tier 3',
      name: 'Tier 3 · Senior / Complex',
      clears: 'High-value residential and selected commercial work, complex multi-day projects, and broad estimating authority. Advanced PHC and complex removals stay separate specialties.',
      before: 'Tier 2 passed, and 75 independent estimates since Tier 1.',
      signoff: 'David records Pass, Continue training or Reassess.',
      sections: {
        'tier3-a': {
          short: 'When you can start Tier 3.',
          for: 'Tier 2 passed, 75 independent estimates since Tier 1, 30 sold jobs with production data, healthy margins over your last 20 jobs, and a clean record.',
          how: 'David checks your record.'
        },
        'tier3-b': {
          short: 'Planning large and complex jobs.',
          for: 'Hours, crew, equipment and job order on big multi-day work, every third-party cost (crane, lift, traffic control, permits, rentals, disposal, subcontractors), and written production plans.',
          how: 'Measured on 20 senior-level estimates David picks, and 10 written production plans.'
        },
        'tier3-c': {
          short: 'High-value client visits.',
          for: 'Clear communication on big or complex visits. Telling apart what the client wants, what the tree needs, optional extras and production limits. Complete proposals, and escalating anything outside policy or your authority.',
          how: 'Counted across 15 observed or recorded visits and your last 15 proposals.'
        },
        'tier3-d': {
          short: 'Proof on real Tier 3 jobs.',
          for: 'Actual crew-hours, margin, no avoidable losses, and the crew’s rating of your scope.',
          how: 'Measured with the Job check on 20 completed sold jobs.'
        }
      }
    },

    phc: {
      short: 'PHC',
      name: 'Specialty · Plant Health Care',
      clears: 'Diagnose and sell TTC’s Plant Health Care services on your own, without calling another arborist to confirm. It can be limited by treatment type. Product labels and pesticide licensing always come first.',
      before: 'Tier 1 passed.',
      signoff: 'David records Pass, Continue training or Reassess.',
      sections: {
        'phc-a': {
          short: 'What has to be in place first.',
          for: 'Tier 1, the Utah pesticide licensing your role needs, TTC’s PHC service and pricing orientation (with current labels and SDS), and 8 PHC appointments shadowed.',
          how: 'One-time items. David checks each one off when it is done.'
        },
        'phc-b': {
          short: 'Knowing the problems and the treatments.',
          for: 'The PHC exam (85% or better), 20 case scenarios or live diagnoses, spotting when there is not enough evidence yet, the right treatment, timing and price, and staying on label.',
          how: 'The exam, plus 20 reviewed cases.'
        },
        'phc-c': {
          short: 'Selling PHC on your own.',
          for: '20 live PHC appointments, the right scope, measurements and doses, escalating unusual cases, and 10 sold PHC jobs reviewed.',
          how: 'Counted across 20 live appointments and 10 sold jobs.'
        }
      }
    },

    rigging: {
      short: 'Complex Removals',
      name: 'Specialty · Complex Removals & Rigging',
      clears: 'Estimate removals where rigging, access, equipment, property protection or job order change the risk and the price. This is separate from general sales skill.',
      before: 'Tier 2 passed, or experience David documents as equal.',
      signoff: 'David records Pass, Continue training or Reassess.',
      sections: {
        'rigging-a': {
          short: 'What has to be in place first.',
          for: 'Tier 2 (or documented equal experience), field time on 20 removals (10 with rigging or tight access), 8 complex-removal estimates observed, and the planning test (85% or better).',
          how: 'One-time items. David checks each one off when it is done.'
        },
        'rigging-b': {
          short: 'Planning and pricing complex removals.',
          for: 'A written crew, hours, equipment, rigging and access plan, debris plan and special costs. Stopping for senior review on the hazards David names.',
          how: 'Measured on 20 complex-removal estimates, compared with a senior estimator’s numbers.'
        },
        'rigging-c': {
          short: 'Proof on real complex removals.',
          for: 'Actual crew-hours, no missed equipment, rental or haul-off costs, the crew leader’s rating of your plan, and margin.',
          how: 'Measured with the Job check on 15 completed jobs.'
        }
      }
    }
  },

  // David's three appendices are TOOLS, not progress. Named for what they do; his title stays beside it.
  tools: {
    'appendix-a': {
      name: 'Every-visit checklist',
      david: 'Appendix A · Client Visit Scoring Sheet',
      for: 'The 13 things to do on every client visit. David scores the visits he watches, or a recording or transcript: Yes, No or N/A for each. Your score is Yes ÷ the items that apply.',
      not: 'This is not your progress. It is how the “across 10 scored appointments” standards get counted.'
    },
    'appendix-b': {
      name: 'Job check: estimate vs. actual',
      david: 'Appendix B · Estimate / Production Audit',
      for: 'After a job you estimated is done (or next to a senior estimator’s numbers): crew size, hours, days, equipment, costs, price and margin, side by side. The crew rates your scope Good, Tight or Bad.',
      not: 'This is how the “crew-hours within ±20%” standards get measured.'
    },
    'appendix-c': {
      name: 'What you’re cleared for',
      david: 'Appendix C · Authority Record',
      for: 'The estimating authority David has signed you off for. Anything outside it, ask first.'
    }
  }
};
