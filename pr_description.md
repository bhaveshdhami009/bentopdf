🧹 [Code Health] Remove console.log statements in wasm-preloader.ts

🎯 **What:** Removed all debug `console.log` statements in `src/js/utils/wasm-preloader.ts`.
💡 **Why:** To improve code health by removing noisy debug logs that clutter the console.
✅ **Verification:** Ran `npm run lint`, `npx prettier --write` and `npm run test:run` to ensure formatting is correct, no lint issues were introduced, and all tests pass.
✨ **Result:** A cleaner console output in production and development environments, with improved maintainability of the wasm-preloader module.
