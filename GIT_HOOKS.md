# Git Hooks Setup

This project uses git hooks to ensure code quality and prevent broken builds from being pushed.

## 🚀 Quick Setup

### For New Team Members

Run this command after cloning the repository:

```bash
npm run install-hooks
```

This will install all necessary git hooks automatically.

## 📋 Available Hooks

### Pre-Push Hook

**What it does:** Runs `npm run build` before every push

**Why:** Prevents pushing code that doesn't build, keeping the main branch stable

**When it runs:** Every time you run `git push`

**Example output:**
```bash
$ git push origin main
🔍 Running pre-push hook: npm run build
✅ Build successful! Proceeding with push...
```

**If build fails:**
```bash
$ git push origin main
🔍 Running pre-push hook: npm run build
❌ Build failed! Push aborted.
Please fix build errors before pushing.
```

## 🛠️ Manual Installation

If the npm script doesn't work, you can manually install hooks:

```bash
# Make sure you're in the project root
cd /path/to/neuralitica-bot

# Copy the hook
cp scripts/install-git-hooks.js .git/hooks/
chmod +x .git/hooks/pre-push
```

## 🔧 Customization

To modify hooks:

1. Edit `scripts/install-git-hooks.js`
2. Run `npm run install-hooks` to update
3. Or directly edit `.git/hooks/pre-push`

## ⚠️ Important Notes

- Hooks are **local** - each team member needs to install them
- Hooks run in your local environment, not on the server
- If a hook fails, the git operation is cancelled
- To temporarily skip hooks (emergency only): `git push --no-verify`

## 🎯 Benefits

- ✅ Never push broken builds
- ✅ Catch TypeScript errors early
- ✅ Keep main branch stable
- ✅ Reduce CI/CD failures
- ✅ Improve team productivity