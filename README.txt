Happy Birds App Store Edition - STABLE FIX

This version fixes the issue where the bird could appear and then disappear / freeze.
Changes:
- All bird, pipe, coin, heart, and enemy drawings now have canvas fallbacks.
- The frame loop is protected so one bad image/cache load cannot freeze the game.
- You start with 1 extra life and a short invincible grace period.
- Tapping anywhere starts/flaps more reliably.
- Service worker cache name was bumped again.

Upload all files and folders to the root of your GitHub Pages repo.
After uploading, open the live page in Safari and refresh once. If you installed it to your Home Screen, delete the old Home Screen icon and add it again so the old cached app is cleared.

Update in this build:
- Starts with 0 extra lives.
- Heart pickups still add extra lives.
- Reset button restarts the current run and does not erase coins, unlocked skins, or best score.
