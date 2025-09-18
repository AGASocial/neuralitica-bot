#!/usr/bin/env node

/**
 * Install git hooks for the project
 * Run with: node scripts/install-git-hooks.js
 */

const fs = require('fs')
const path = require('path')

const hooksDir = path.join(__dirname, '..', '.git', 'hooks')
const prePushHookPath = path.join(hooksDir, 'pre-push')

const prePushHookContent = `#!/bin/sh

# Pre-push hook to run build and prevent pushing if build fails
# This ensures we never push code that doesn't build

echo "🔍 Running pre-push hook: npm run build"

# Run the build command
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Push aborted."
    echo "Please fix build errors before pushing."
    exit 1
fi

echo "✅ Build successful! Proceeding with push..."
exit 0`

try {
  // Check if .git directory exists
  if (!fs.existsSync(hooksDir)) {
    console.error('❌ .git/hooks directory not found. Are you in a git repository?')
    process.exit(1)
  }

  // Write the pre-push hook
  fs.writeFileSync(prePushHookPath, prePushHookContent)
  
  // Make it executable
  fs.chmodSync(prePushHookPath, '755')
  
  console.log('✅ Git hooks installed successfully!')
  console.log('   - pre-push: Runs npm run build before push')
  console.log('')
  console.log('🎯 Now all pushes will be blocked if the build fails.')
  
} catch (error) {
  console.error('❌ Failed to install git hooks:', error.message)
  process.exit(1)
}