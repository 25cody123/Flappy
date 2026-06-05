FLAP DASH - iPhone Flappy-Style Game

WHAT THIS IS
This is a mobile web app / PWA. You can play it on iPhone in Safari and add it to your Home Screen so it behaves like an app.

FILES
- index.html: opens the game
- game.js: game code
- manifest.webmanifest: app install info
- service-worker.js: offline support after hosted once
- icons/: app icons

HOW TO TEST FAST
1. Upload this folder to a simple web host like GitHub Pages, Netlify, Vercel, or your own hosting.
2. Open the website on your iPhone in Safari.
3. Tap Share.
4. Tap Add to Home Screen.
5. Open Flap Dash from your iPhone Home Screen.

HOW TO CHANGE JUMP HEIGHT
Open game.js and find:
  jump: -6
More negative = jumps higher, example -8.
Less negative = jumps lower, example -5.

HOW TO CHANGE PIPE GAP
Open game.js and find:
  pipeGap: 178
Bigger number = easier.
Smaller number = harder.

HOW TO CHANGE SPEED
Open game.js and find:
  pipeSpeed: 3.05
Bigger number = faster.
Smaller number = slower.

IMPORTANT
This is not an App Store package yet. To publish to the App Store later, wrap this with Capacitor or rebuild it as a native Swift/SpriteKit iOS app.
