#!/bin/bash
npx eslint src/tests/workflow/errors.test.ts
npx prettier --check src/tests/workflow/errors.test.ts
