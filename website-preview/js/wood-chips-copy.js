/* Wood Chips sign-up page — ALL customer-facing wording, in one place.
 *
 * STATUS: DRAFT. Every sentence below is a first draft, not approved copy. David reviews and
 * edits words here before this page goes live for real customers (writing-rules.md applies:
 * plain, short, friendly, no jargon). wood-chips.js only ever reads strings from this object —
 * it never hardcodes customer-facing text — so a wording change is a one-file edit.
 *
 * A few entries are tiny functions instead of plain strings, only where the sentence needs a
 * number filled in (a price, a character count). Everything else is a plain sentence you can
 * edit directly.
 */
window.TTC_CHIP_COPY = {

  // ---------------------------------------------------------------- loading / shared
  loadingText: 'Loading…',
  networkError: 'We couldn’t reach the server. Check your connection and try again.',
  genericError: 'Something went wrong. Please try again in a moment.',
  tooManyError: 'Too many tries. Please wait a few minutes.',
  closedMessage: 'Sign-ups open soon. Call (435) 752-1884 to get on the list.',
  officePhoneLine: 'Questions? Call the office at (435) 752-1884.',

  // ---------------------------------------------------------------- intro (step a)
  introTitle: 'Sign Up for Wood Chips',
  introLead: 'A quick form to get on the Total Tree Care chip drop list.',
  // Intro sections (Joseph, 2026-09-30: the facts from the chip drop Google Form, so people know what
  // they are signing up for). Each section: a heading, then paragraphs and/or bullet points.
  introSections: [
    { title: 'This Is a Waitlist, Not an Order', callout: true, paras: [
      'Signing up puts you in line. It does not reserve a load, book a delivery, or hold a date. We can’t tell you when your turn will come, and we can’t guarantee it will. There are far more people on this list than we have loads to give.',
      'If you need chips by a specific date, we recommend buying from a supplier instead. We’d rather be upfront than leave you waiting on something we can’t promise.'
    ] },
    { title: 'Why We’re Changing Things', paras: [
      'The landfill recently stopped selling chips, so we’re changing how we deliver them. Our goal is to get chips to more people, fairly.'
    ] },
    { title: 'What We Deliver', items: [
      'Dirty, mixed arborist chips only. They are not clean and can include any tree species. They may have small amounts of trash and sticks. You get whatever is coming off our jobs that day.',
      'A good amount per drop, usually up to 1 full load (about 10 to 12 cubic yards). We can’t always promise a full load, because it depends on what comes off the job, but it will always be a good amount.',
      'We can only drop where our truck can reach, usually front yards and driveways. We can’t go under low branches or power lines, or into back yards, unless there is easy, direct access.'
    ] },
    { title: 'Pricing', paras: ['You pay after the chips are delivered. There is no upfront charge.'], items: [
      '$30 per load: VIP, drop anytime, no call ahead. This is the best deal, because it saves us coordination time.',
      '$50 per load: VIP, we call ahead first and set a time before we show up.',
      '$0: free chips, lower priority on the list.'
    ] },
    { title: 'Priority Order', ordered: true, items: [
      'VIP, drop anytime ($30 per load): top of the list',
      'VIP, call ahead first ($50 per load)',
      'Free, drop anytime',
      'Free, call ahead first'
    ] }
  ],
  calcText: 'Need help estimating how many loads you want? Try the free chip calculator at ',
  calcLinkText: 'klsupplies.com/calculator',
  calcUrl: 'https://klsupplies.com/calculator',
  calcNote: ' (we’re not affiliated; it has a photo of what 10 cubic yards looks like).',
  introP3: 'Sign-up takes about five minutes. You sign in with your email: we send a 6-digit code to make sure it’s really you. Your information is saved, so you can come back anytime with your email and a new code to check or change it.',

  // ---------------------------------------------------------------- email + code (step b)
  emailStepTitle: 'Sign In',
  emailLabel: 'Email',
  emailHelp: 'Sign in with just your email. We’ll email you a 6-digit code, and there’s no password to remember. Your sign-up is saved to your email, so next time you only need your email and a new code to see or change it.',
  sendCodeButton: 'Send Me a Code',
  sendingCode: 'Sending…',
  codeSentAlways: 'If that email can sign in, we sent a 6-digit code.',
  codeLabel: '6-Digit Code',
  codeHelp: 'Check your email for the code. It can take a minute to arrive.',
  verifyButton: 'Verify Code',
  verifying: 'Checking…',
  invalidCodeError: 'That code didn’t work. Check it and try again.',
  resendButton: 'Send a New Code',
  changeEmailButton: 'Use a Different Email',
  turnstileFailed: 'Verification didn’t load. Refresh the page and try again.',

  // ---------------------------------------------------------------- shared field errors
  errorRequired: 'This is required.',
  errorZip: 'Enter a 5-digit ZIP code.',
  errorPhone: 'Enter a phone number, like (435) 555-0100.',
  errorPin: 'Drag the circle to your drop spot on the map.',
  errorPhoto: 'Add a photo of the drop spot.',
  errorConsents: 'Check all four boxes to continue.',
  errorPaidConsent: 'Check the box to agree to be billed, or choose a free tier.',
  errorTier: 'Choose a tier.',
  errorLoads: 'Choose how many loads you’d like.',
  errorTruckAccess: 'Answer the truck access question.',
  errorAddressNotFound: 'We couldn’t find that address. Check it, or drag the circle to your spot on the map below.',

  // ---------------------------------------------------------------- sign-up form (step d)
  signupTitle: 'Tell Us About Your Property',
  sectionContact: 'Your Contact Info',
  firstNameLabel: 'First Name',
  lastNameLabel: 'Last Name',
  phoneLabel: 'Phone Number',
  sectionAddress: 'Your Address',
  streetLabel: 'Street Address',
  cityLabel: 'City',
  zipLabel: 'ZIP Code',
  findAddressButton: 'Find My Address on the Map',
  findAddressHelp: 'This moves the map below. Then drag the circle to the exact spot where we should dump the chips.',
  finding: 'Finding…',

  sectionMap: 'Your Drop Spot',
  mapHint: 'Drag the orange circle to the exact spot where you want the chips dumped, not onto your house. We drop the chips right on this spot.',
  mapHintTap: 'You can also tap anywhere on the map to move the circle there.',

  sectionTier: 'Choose Your Tier',
  tierCallFirstNote: 'We call before we drop.',
  tierFreeLabel: 'Free',

  sectionLoads: 'How Many Loads Would You Like?',
  loadsHelp: 'A load is one truckload of chips.',
  loadsOptions: {
    '1': '1 load', '2': '2 loads', '3': '3 loads', '4': '4 loads', '5': '5 loads',
    ten_plus: '10 or more',
    as_many_as_possible: 'As many as you can give me'
  },
  loadsChoosePlaceholder: 'Choose one',

  sectionDropNotes: 'Notes for the Crew',
  dropNotesLabel: 'Anything the crew should know? Pets, gates, where to park, things to avoid, and exactly where the chips go.',
  dropNotesPlaceholder: 'Example: Dog in the backyard, so keep the side gate closed. Park on the street, not the driveway. Dump the chips in the gravel spot left of the driveway.',
  dropNotesHelp: '500 characters max.',
  charsLeft: function (n) { return n + ' characters left.'; },

  sectionPhoto: 'Photo of the Drop Spot',
  photoRequiredHelp: 'Required. This helps the crew find the exact spot — and check truck access before the first drop.',
  photoChooseButton: 'Choose Photo',
  photoRetakeButton: 'Choose a Different Photo',
  photoPreviewAlt: 'Preview of your drop-spot photo',
  photoProcessing: 'Preparing photo…',
  photoUploadFailed: 'That photo didn’t work. Try again, or choose a different photo (a regular JPG or PNG works best).',

  sectionTruck: 'Truck Access',
  truckAccessQuestion: 'Can a truck pulling a chipper trailer (~30 ft total) easily reach your drop spot? (No tight gates, low branches, soft lawn to cross, etc.)',
  truckAccessYes: 'Yes',
  truckAccessNo: 'No',
  truckAccessNotSure: 'Not sure',

  sectionConsents: 'A Few Things to Agree To',
  consentMixedOk: 'I understand these are dirty, mixed arborist chips. They can include any tree species, leaves, and bark, and may have small amounts of trash and sticks.',
  consentStaysOnList: 'I understand that to get off the list, I must take myself off the list. Otherwise I will keep getting chips, and Total Tree Care is not responsible for picking chips back up if I forgot to take myself off.',
  consentPropertyAccess: 'I understand the crew and truck may come onto my property to drop the chips.',
  consentPhotoUse: 'I understand my photo helps the crew find the spot. It’s never posted anywhere.',
  paidConsent: function (price) { return 'I agree to be billed $' + price + ' after each drop.'; },

  submitButton: 'Sign Me Up',
  submitting: 'Sending…',

  // ---------------------------------------------------------------- confirmation
  successTitle: 'You’re On the List',
  successBody1: 'Thanks — we’ve got your spot. Here’s what happens next:',
  successBody2: 'The office checks your details. We can’t give a time frame for this or for drops.',
  successBody3: 'Once you’re active, the crew drops chips at your spot when it’s your turn.',
  successBody4: 'Come back to this page anytime and sign in with your email to update your info, change your tier, pause, or leave the list.',

  // ---------------------------------------------------------------- profile (step e)
  profileTitle: 'Your Wood Chip Profile',
  // Joseph, 2026-09-30: greet the customer by name, then a short line — the page was "pretty basic," this
  // replaces the old wall-of-text profileSavedNote with a friendlier opener. Shown under the "Hi, [name]" heading.
  profileGreeting: function (firstName) { return firstName ? ('Hi, ' + firstName + '.') : 'Hi there.'; },
  profileGreetingSub: 'Here is what we have on file for your wood chip drops.',
  profileSavedNote: 'This is your profile page. Everything you entered is below, grouped into cards. Tap Change on any card to update it, then save. Come back anytime: sign in with your email and a new code.',
  // Same five statuses the office sees, worded for the customer reading their own profile.
  statusLabels: {
    pending: 'New: we’re checking your details',
    active: 'Active: you’re on the list',
    paused: 'Paused',
    inactive: 'Got all your loads',
    left: 'Off the list'
  },
  // One plain-language line per status — what it means, using only facts stated elsewhere on this page
  // (successBody2/3, pausedNote, leftNote). No new promises or timeframes.
  statusHelp: {
    pending: 'We are checking your details. We can’t promise a time frame, and you’ll see your status change here when it’s done.',
    active: 'The crew drops chips at your spot when it’s your turn.',
    paused: 'Your drops are on hold. Call us if you’d like to start again.',
    inactive: 'You already got the loads you asked for. Sign up again anytime for more.',
    left: 'You’re off the list. You can sign up again anytime from this page.'
  },
  viewJobberButton: 'See Your Invoices in Jobber',
  mapLinkText: 'View Your Drop Spot on Google Maps',

  // Card titles for the desktop 2-column layout (phone: same cards, stacked).
  cardDropSpotTitle: 'Your Drop Spot',
  cardPlanTitle: 'Your Plan',
  cardDropsTitle: 'Your Chip Drops',
  cardNotesTitle: 'Notes for the Crew',
  cardContactTitle: 'Your Contact Info',
  changeButton: 'Change',

  // ---- "Your Chip Drops" card (Joseph, 2026-09-30): what the crew has actually delivered so far. Read
  // only — the crew logs a drop, and it shows up here; there is nothing for the customer to change.
  loadsDeliveredCount: function (delivered, wanted) {
    var n = typeof delivered === 'number' ? delivered : 0;
    var word = (n === 1) ? 'load' : 'loads';
    if (typeof wanted === 'number') return n + ' of ' + wanted + ' ' + word + ' delivered';
    return n + ' ' + word + ' delivered';
  },
  loadsDeliveredAsManyNote: 'Your plan is set to as many loads as we can give.',
  dropLineText: function (dateLabel, loads) {
    var word = (loads === 1) ? 'load' : 'loads';
    return dateLabel + ' · ' + loads + ' ' + word;
  },
  noDropsYetText: 'No drops yet.',

  editButton: 'Edit My Information',
  saveButton: 'Save Changes',
  savingButton: 'Saving…',
  cancelButton: 'Cancel',
  saveSuccessMessage: 'Saved.',
  addressChangedNotice: 'We’ll check the new spot before the next drop.',

  pauseButton: 'Pause My Drops',
  pausing: 'Pausing…',
  pausedNote: 'Call (435) 752-1884 if you’d like to start again.',

  leaveButton: 'Leave the List',
  leaveReasonLabel: 'Why are you leaving? (Optional)',
  leaveConfirmTitle: 'Leave the Wood Chip List?',
  leaveConfirmBody: 'You can always sign up again later from this same page.',
  leaveConfirmButton: 'Yes, Take Me Off the List',
  leaveCancelButton: 'Never Mind',
  leavingButton: 'Leaving…',
  leftNote: 'You’re off the list. You can sign up again anytime from this page.',

  photosTitle: 'Your Photos',
  noPhotosText: 'No photos yet.',

  fieldReadLabels: {
    name: 'Name', phone: 'Phone', email: 'Email', address: 'Address', tier: 'Tier',
    loads_wanted: 'Loads Wanted', drop_notes: 'Notes for the Crew',
    truck_access: 'Truck Access', lastDrop: 'Last Drop'
  }
};
