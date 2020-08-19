#!/bin/bash

# Allow SSH Connection to Github For Private Repo
# Too much of a Hassle When Running under a service
# eval $(ssh-agent);
# ssh-add ~/.ssh/github_rsa;

# Set CWD
REPO_DIR=/srv/Medusa-Rewritten;
cd $REPO_DIR;

# Get Lastest Github Commit
# Too much of a Hassle When Running under a service

# git fetch --all
# gitdiff=$(git diff master origin/master)
# if [ $(git rev-parse HEAD) != $(git rev-parse @{u}) ]
# then
# git reset --hard origin/master
# chmod -R a+rX *;
# chmod +x "./start-bot.sh"; # Make Updated Script Execuatble
# npm i;
# fi

# Get Vue Sorted
cd './client';
npm i && npm run build;
cd $REPO_DIR;

# Update NPM Packagaes & Start Bot
# npm update && npm audit fix; 
# Prevent Breaking modules from x.x.x update

npm run build && npm run start;
