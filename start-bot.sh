#!/bin/bash
REPO_DIR=/srv/Medusa-Rewritten
cd $REPO_DIR
git fetch --all
gitdiff=$(git diff master origin/master)
if [ $(git rev-parse HEAD) != $(git rev-parse @{u}) ]
then
git reset --hard origin/master
chmod +x "./start-bot.sh" # Make Updated Script Execuatble
fi
npm i && npm audit fix && npm run build && npm run start
