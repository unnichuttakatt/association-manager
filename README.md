# Association Manager

Cash in / cash out by category, members list, yearly membership renewals and renewal reports for one or more associations.
Next.js 14 + Neon Postgres, deployed on Vercel. Login with password + optional authenticator app or passkey.

Set DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD (see .env.example). The first login with the admin email creates the account owner.

The account owner can open every association and is the only person who can add users. Each other user is assigned to one association and can see and change only that association's members, cash, renewals and ID cards. A direct link, a member id or a cash id from another association is refused. After this change, existing users other than the first account see nothing until the owner assigns them an association on the Users page.
