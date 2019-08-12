#!/bin/bash
REPO_DIR=/srv/medusa
cd $REPO_DIR
git fetch
gitdiff=$(git diff master origin/master)
if [ $(git rev-parse HEAD) != $(git rev-parse @{u}) ]
then
git pull origin master
fi
npm run build
cd "./lib/"
node "index.js"
