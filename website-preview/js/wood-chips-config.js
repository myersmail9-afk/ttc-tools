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

  // The TEST project's publishable key (filled 2026-09-27). Public by design. Before launch this becomes the
  // LIVE project's publishable key, together with the live door URL and the real Turnstile site key.
  SUPABASE_ANON_KEY: 'sb_publishable_1hHcHyBTsqG_9kGu3o35aA_im2LdQ_D',

  // The page never talks to the Edge Function directly — it goes through the Cloudflare "door"
  // Worker (chip-door-test), which rate-limits at the edge, stamps the request with a secret the
  // function requires, and forwards it on (contract: POST JSON {action, ...}, same shape as
  // before). SUPABASE_URL above is still used directly for the two Auth REST calls (verify/
  // refresh), which are unauthenticated-by-design and don't need the door.
  EDGE_FUNCTION_URL: 'https://chip-door-test.totaltreecareutah.workers.dev',

  // Cloudflare Turnstile. This is Cloudflare's published TEST site key that always passes — safe to
  // commit, never a real secret. Swap for the real site key before this page sees a real customer.
  TURNSTILE_SITE_KEY: '1x00000000000000000000AA',

  // Shown in the closed state, the confirmation screen, and anywhere else the page needs a human.
  OFFICE_PHONE_DISPLAY: '(435) 752-1884',
  OFFICE_PHONE_HREF: 'tel:+14357521884'
};
