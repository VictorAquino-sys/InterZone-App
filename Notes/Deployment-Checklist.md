(Steps before launching updates)
Steps to follow before releasing an update.
- Helps prevent shipping broken builds.
- Ensures Firebase, Expo, and EAS are configured properly.

## Deployment Checklist
[x] Run `expo publish` to ensure updates are live
[x] Verify `.env` file is set correctly
[x] Confirm Firebase Firestore rules are updated
[x] Test authentication (login, logout, signup)
[x] Check app performance on Android emulator

Commit to github
git add .
git status
git commit -m "message"
git push origin main