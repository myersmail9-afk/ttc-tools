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
  introLead: 'Get free wood chips for your yard, garden, or landscaping, dropped off by our crew.',
  introP1: 'Wood chips are left over from the tree work we do every day. Free drops happen when a nearby job leaves us with extra chips, so there’s no set schedule — most people on the free list wait anywhere from a few weeks to a couple of months between drops.',
  introP2: 'Want chips sooner, or more often? Our VIP tiers move you up the list for a price per drop. You’re billed after each drop, never before, and you’ll see the exact price for every tier before you choose one.',
  introP3: 'Sign-up takes about five minutes. First we’ll email you a 6-digit code, just to make sure it’s really you.',

  // ---------------------------------------------------------------- email + code (step b)
  emailStepTitle: 'Sign In',
  emailLabel: 'Email',
  emailHelp: 'We’ll email you a 6-digit code to sign in — no password to remember.',
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
  findAddressHelp: 'This moves the map below. You’ll still drag the circle to your exact drop spot.',
  finding: 'Finding…',

  sectionMap: 'Your Drop Spot',
  mapHint: 'Drag the circle to exactly where you want the chips.',
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

  sectionDropNotes: 'Notes for the Crew (Optional)',
  dropNotesLabel: 'Where exactly should we drop the chips?',
  dropNotesPlaceholder: 'Example: In the gravel spot to the left of the driveway.',
  dropNotesHelp: '500 characters max.',
  charsLeft: function (n) { return n + ' characters left.'; },

  sectionPhoto: 'Photo of the Drop Spot',
  photoRequiredHelp: 'Required. This helps the crew find the exact spot — and check truck access before the first drop.',
  photoChooseButton: 'Choose Photo',
  photoRetakeButton: 'Choose a Different Photo',
  photoPreviewAlt: 'Preview of your drop-spot photo',
  photoProcessing: 'Preparing photo…',
  photoUploadFailed: 'That photo didn’t upload. Try again or choose a different one.',

  sectionTruck: 'Truck Access',
  truckAccessQuestion: 'Can a truck pulling a chipper trailer (~30 ft total) easily reach your drop spot? (No tight gates, low branches, soft lawn to cross, etc.)',
  truckAccessYes: 'Yes',
  truckAccessNo: 'No',
  truckAccessNotSure: 'Not sure',

  sectionConsents: 'A Few Things to Agree To',
  consentMixedOk: 'I’m fine with mixed wood chips. Loads may include different kinds of trees, leaves, and bark all together.',
  consentStaysOnList: 'I understand I’ll stay on the list until I ask to come off.',
  consentPropertyAccess: 'I understand the crew and truck may come onto my property to drop the chips.',
  consentPhotoUse: 'I understand my photo helps the crew find the spot. It’s never posted anywhere.',
  paidConsent: function (price) { return 'I agree to be billed $' + price + ' after each drop.'; },

  submitButton: 'Sign Me Up',
  submitting: 'Sending…',

  // ---------------------------------------------------------------- confirmation
  successTitle: 'You’re On the List',
  successBody1: 'Thanks — we’ve got your spot. Here’s what happens next:',
  successBody2: 'The office checks your details, usually within a couple of business days.',
  successBody3: 'Once you’re active, the crew drops chips at your spot when it’s your turn.',
  successBody4: 'Come back to this page anytime and sign in with your email to update your info, change your tier, pause, or leave the list.',

  // ---------------------------------------------------------------- profile (step e)
  profileTitle: 'Your Wood Chip Profile',
  // Same five statuses the office sees, worded for the customer reading their own profile.
  statusLabels: {
    pending: 'New: we’re checking your details',
    active: 'Active: you’re on the list',
    paused: 'Paused',
    inactive: 'Got all your loads',
    left: 'Off the list'
  },
  viewJobberButton: 'See Your Invoices in Jobber',
  mapLinkText: 'View Your Drop Spot on Google Maps',

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
    name: 'Name', phone: 'Phone', address: 'Address', tier: 'Tier',
    loads_wanted: 'Loads Wanted', drop_notes: 'Notes for the Crew',
    truck_access: 'Truck Access'
  }
};
