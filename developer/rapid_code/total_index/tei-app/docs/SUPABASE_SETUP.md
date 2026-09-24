# Supabase setup for TEI

No database migration is needed for password recovery. It uses Supabase Auth's
standard email recovery flow and the app's existing `updateUser` permission.

## Required dashboard changes

In the Supabase dashboard, open **Authentication → URL Configuration**.

1. Set **Site URL** to the canonical production web app, for example
   `https://tei.example.com`.
2. Add these exact values under **Redirect URLs** (replace the web domain):

   ```text
   tei://reset-password
   https://tei.example.com/reset-password
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
