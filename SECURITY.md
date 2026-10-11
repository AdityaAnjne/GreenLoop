# Security Policy

## Supported versions

Only the latest commit on `main` (the version deployed at
https://green-loop-zeta.vercel.app) is supported with security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's
private reporting instead: **Security tab → Report a vulnerability** on this
repository. If that is unavailable, contact the author through the GitHub
profile at https://github.com/AdityaAnjne.

Please include the affected endpoint or page, steps to reproduce, and the
impact you observed.

## Security measures in this project

- Passwords are BCrypt-hashed and never returned by any API response.
- Authentication uses JWTs; endpoint access is enforced server-side by
  Spring Security roles, not just hidden in the UI.
- Retailers, distributors and farmers only receive their own slice of an
  order; order access checks return "not found" rather than "forbidden".
- The AI quality check runs on the backend only, so a client cannot submit
  a forged quality score.
- All secrets (database, JWT, API keys) come from environment variables and
  are never committed.