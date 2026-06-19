🧹 Remove unused variable 'currentSaved'

🎯 **What:** Removed the unused variable `currentSaved` and its empty surrounding `input.onkeyup` event handler in `src/js/main.ts`.
💡 **Why:** Cleaned up dead code. The empty `if` block had no functional purpose, removing it improves readability and maintainability.
✅ **Verification:** Ran full test suite (`npm run test:run`) and lint checks (`npm run lint`). No functionality or checks broken.
✨ **Result:** Cleaner, more maintainable code without dead handlers.
