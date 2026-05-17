#!/bin/bash

# Usage: ./.github/workflows/push-updates.sh "your commit message"

MESSAGE=$1

if [ -z "$MESSAGE" ]; then
  echo "Error: Please provide a commit message."
  echo "Usage: ./.github/workflows/push-updates.sh \"your commit message\""
  exit 1
fi

echo "🚀 Starting automation sequence..."

git add .
git commit -m "$MESSAGE"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "⬆️ Pushing changes to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo "✅ Done!"