#!/bin/bash
REPO_DIR=/srv/Medusa-Rewritten
cd $REPO_DIR
git fetch
gitdiff=$(git diff master origin/master)
if [ $(git rev-parse HEAD) != $(git rev-parse @{u}) ]
then
git pull origin master
fi
npm run build
node "./lib/index.js"
