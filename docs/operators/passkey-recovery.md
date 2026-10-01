# Passkey Recovery

This guide is for staff users (mostly support) helping someone who has lost
their passkey or can no longer use it and has asked for help signing in. It
assumes you already have staff portal access.

The recovery link goes only to the verified email address on the user's
account. You never see the link or the code, and you can't send it anywhere
else.

## What you can do here

- Email a user a one-time link that lets them register a new passkey.
- Record why you sent it. Your reason and your name are saved with the send
  for audit.
- See every recovery link staff have sent to that user, who sent it, and why.

## Before you start

- **The email must show as Verified.** Open the user and check the
  **Account Identities** card. The email badge reads **Verified**,
  **Unverified**, or **Not synced**. The send button only works for
  **Verified**. Otherwise it is disabled, and hovering it shows "Email not
  verified" with a note to ask the user to sign up again to get a fresh
  verification link. **Not synced** means the identity provider hasn't
  reported the address yet. Treat it as "check again later", not as a failed
  verification.
- **The user must exist in milo.** If you can't find them under
  **Customers → Users**, there is no account to recover.

## Sending a recovery link

1. Go to **Customers → Users** and open the user.
2. Find the **Account Management** card. The **Passkey Recovery** row is at
   the bottom.
3. Click **Send passkey recovery link**.
4. Type a reason of at least 5 characters (leading and trailing spaces don't
   count). A ticket reference is ideal. The reason is recorded alongside your
   name.
5. Click **Send link**.

On success the dialog closes and you see the toast "Recovery link sent to the
user's verified email address". There is nothing to copy or hand over: the
API never returns the code.

## Checking what was sent

Click **View sent links** in the same row. The **Passkey Recovery Links**
dialog lists every link staff have sent to this user, newest first. Each entry
shows:

- **Sent by**: the staff user who sent it.
- The reason they typed.
- The name of the notification email that carried the link.
- When it was sent.

If the history is long, the dialog shows only the most recent entries and
says "Showing the most recent N; older links exist." If nothing has been sent,
it says "No recovery links have been sent to this user."

Only links sent from the staff portal appear here. A link the user requested
for themselves does not.

## What the user receives

The user gets an email with a link (the support mail carries only the link;
there is no code to type). The link expires in about an hour and works once.
They should:

1. Open the link on the device that should hold the new passkey.
2. Register the passkey when prompted.
3. Sign in with it.

The user-side flow is described in the auth-ui [account recovery
doc](https://github.com/datum-cloud/auth-ui/blob/main/docs/architecture/account-recovery.md).

## Limits and error messages

The server enforces a cooldown between links to the same user and an hourly
budget, and tells you when it refuses a send.

Any failure shows as an error toast. The dialog stays open with your reason
still filled in, so you can retry without retyping. What the common ones mean:

- **Recovery links are disabled.** The feature is switched off on the server.
  Nothing you can change from here; raise it with engineering.
- **A permission error.** Your staff account doesn't have the recovery role.
  Ask for it to be granted.
- **The cooldown or hourly budget.** Wait and try again later.

## Troubleshooting

**The user says no email arrived.**

- Check that the **Account Identities** card shows **Verified**.
- Ask them to look in their spam or junk folder.
- Open **View sent links** to confirm the send was recorded. If it isn't in
  the list, the send didn't go through.
- If it was recorded, wait for the cooldown to pass and send again.

**The user says the link has expired or doesn't work.** Send a new one. Each
link works once and expires after about an hour.

**You want to take a link back.** You can't recall it. It expires on its own
after about an hour, and it only ever goes to the user's own verified address.

## What you can't do here

- See or copy the link or code.
- Send the link to any address other than the verified one on file.
- Recall or cancel a link once it is sent.
