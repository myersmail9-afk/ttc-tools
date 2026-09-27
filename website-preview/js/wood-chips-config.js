/* Wood Chips sign-up page — configuration only. No logic, no secrets.
 *
 * The publishable ("anon") key below is PUBLIC BY DESIGN — Supabase expects it to ship inside
 * browser code, same as any site using supabase-js. It grants nothing by itself; every rule is
 * enforced by the database (see the plan's "Security for the public page and its backend"). It is
 * still correct to leave the TEST key blank here rather than paste it sight-unseen: fill it in
 * once you have it, and never paste the LIVE/production key into this file or any other file in
 * this repo.
 */
window.TTC_CHIP_CONFIG = {
  // TEST Supabase project (soeesnzussrignjlvjnr). Do NOT point this at the live "ttc-apps" project
  // from this public page until Stage 4's security review + soft launch are done.
  SUPABASE_URL: 'https://soeesnzussrignjlvjnr.supabase.co',

  // TODO(orchestrator): paste the TEST project's publishable ("anon") key here before wiring this
  // page to a real backend. Get it from the Supabase dashboard → Project Settings → API → the
  // "publishable" / "anon" key for project soeesnzussrignjlvjnr. Never the LIVE project's key
  // (that one lives in domains/crew/apps/employee-app/next/overlay/crew-api.json and must stay out
  // of this file).
  SUPABASE_ANON_KEY: '',

  // The one Edge Function this page talks to (contract: POST JSON {action, ...}). TODO(orchestrator):
  // confirm the deployed function's name matches "chip-customer" once the backend is built.
  EDGE_FUNCTION_URL: 'https://soeesnzussrignjlvjnr.supabase.co/functions/v1/chip-customer',

  // Cloudflare Turnstile. This is Cloudflare's published TEST site key that always passes — safe to
  // commit, never a real secret. Swap for the real site key before this page sees a real customer.
  TURNSTILE_SITE_KEY: '1x00000000000000000000AA',

  // Shown in the closed state, the confirmation screen, and anywhere else the page needs a human.
  OFFICE_PHONE_DISPLAY: '(435) 752-1884',
  OFFICE_PHONE_HREF: 'tel:+14357521884'
};
