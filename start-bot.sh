#!/bin/bash

# Allow SSH Connection to Github For Private Repo
eval $(ssh-agent);
ssh-add ~/.ssh/github_rsa;

# Set CWD
REPO_DIR=/srv/Medusa-Rewritten;
cd $REPO_DIR;

# Get Lastest Github Commit
git fetch --all
gitdiff=$(git diff master origin/master)
if [ $(git rev-parse HEAD) != $(git rev-parse @{u}) ]
then
git reset --hard origin/master
chmod -R a+rX *;
chmod +x "./start-bot.sh"; # Make Updated Script Execuatble
npm i;
fi

# Update NPM Packagaes & Start Bot
npm update && npm audit fix;
npm run dev;
