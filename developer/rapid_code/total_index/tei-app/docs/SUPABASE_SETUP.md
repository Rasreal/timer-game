# Supabase setup for TEI

No database migration is needed for password recovery. It uses Supabase Auth's
standard email recovery flow and the app's existing `updateUser` permission.

## Required dashboard changes

In the Supabase dashboard, open **Authentication → URL Configuration**.

1. Set **Site URL** to the current production web app:
   `https://tei-app-blue.vercel.app`.
2. Add these exact values under **Redirect URLs** (replace the web domain):

   ```text
   tei://reset-password
   https://tei-app-blue.vercel.app/reset-password
   ```

3. Add an exact reset URL for every staging/preview web deployment that sends
   real emails. Use narrow allowlist entries in production; do not use a broad
   wildcard for arbitrary domains.

The app passes `Linking.createURL('reset-password')` as `redirectTo`. A
development build uses `tei://reset-password`; Expo Go typically creates an
`exp://…/--/reset-password` URL instead, so either test recovery in a
development build or temporarily add the exact URL printed by the running Expo
server to the allowlist. Remove temporary development URLs after testing.

## Email provider and template

1. In **Authentication → Providers**, make sure **Email** is enabled.
2. In **Authentication → Email Templates → Reset Password**, keep the default
   recovery link (`{{ .ConfirmationURL }}`), or ensure a custom template links
   to it. The confirmation URL carries the `redirectTo` destination selected by
   the app.
3. For a release, configure a transactional SMTP provider in the Auth email
   settings. The built-in sender is intentionally rate-limited and is suitable
   only for very light development/testing use. Configure a verified sender
   domain and disable link-tracking rewrites for this email, because they can
   consume or alter one-time recovery links.

## Postmark SMTP

TEI sends Auth email (password recovery, and signup confirmation when
**Confirm email** is on) through Postmark. Supabase Auth sends these itself,
so the app needs no code or client-side keys for it; the token lives only in
the Supabase Auth settings.

1. **Postmark → Sender Signatures:** the From address must be confirmed
   (the owner clicks Postmark's confirmation email), or its whole domain
   verified with the DKIM TXT and `pm-bounces` Return-Path CNAME records
   Postmark lists. Domain verification allows a `no-reply@` sender and
   improves inbox placement.
2. **Postmark account approval:** until Postmark approves the account it only
   delivers to the sender's own domain, so request approval before release.
3. **Supabase → Authentication → Emails → SMTP Settings:**

   | Field | Value |
   | --- | --- |
   | Host | `smtp.postmarkapp.com` |
   | Port | `587` |
   | Username | Postmark Server API Token |
   | Password | the same Server API Token |
   | Sender name | `TEI` |
   | Sender email | the confirmed From address |

4. **Supabase → Authentication → Rate Limits:** raise the email limit; the
   default stays low even with custom SMTP.
5. Keep **Track links** off on the Postmark `outbound` stream so recovery
   links are not rewritten.

While the From address is unconfirmed, Postmark rejects every send, so Auth
email fails until it is confirmed.

## Recovery email template and app hand-off

**Authentication → Email Templates → Reset Password** links straight to the
web reset page instead of Supabase's `/verify` redirect:

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a>
```

- A direct link is what lets iOS open the app as a Universal Link; links that
  reach the domain through a redirect open the app inconsistently.
- Email security scanners that pre-fetch links cannot spend the one-time
  token, because only the page's JavaScript calls `verifyOtp`.
- `{{ .RedirectTo }}` is not used, so recovery requested from the app and from
  the web both arrive at the web URL; the installed app takes it over.
- Deploy the web build that understands `token_hash` **before** switching the
  template, or links will open a page that cannot read them.

Universal Links need `public/.well-known/apple-app-site-association` served
from the web domain (deployed with the web build) and an iOS build whose
entitlements include `applinks:tei-app-blue.vercel.app` (set in app.json).
Android App Links additionally need `assetlinks.json` with the release
signing certificate's SHA-256 fingerprint; until then Android users get the
page's "Open in the TEI app" button.

## Password policy and testing

The UI requires a password with at least 8 characters, one uppercase letter,
and one number. Supabase may use a stricter policy, but should not use a weaker
user-facing requirement without updating the UI copy.

After saving the dashboard settings:

1. Create a test user through the app.
2. Use **Forgot password?** and confirm the email arrives.
3. Open the link once on the target platform. It should open `/reset-password`.
4. Set a new valid password and verify that the app returns to Login.
5. Sign in with the new password; repeat with an expired/used link to confirm
   the friendly error and resend path.

`resetPasswordForEmail` intentionally does not disclose whether an address is
registered, so the app always shows a neutral sent message on success.

## Existing project requirements

Apply the committed SQL migrations in `supabase/migrations/` in numeric order
when provisioning a new project. Add only the public project URL and anon key
to `.env`; never expose `service_role`/secret credentials in this client.

## References

- [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase password-based authentication and recovery](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
