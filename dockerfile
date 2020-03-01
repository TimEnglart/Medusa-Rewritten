FROM node:12-alpine
LABEL maintainer="timenglart@gmail.com"
LABEL version="1.0.0"

ARG ssh-key="~/github_rsa"

WORKDIR /srv/Medusa-Rewritten

ADD ${ssh-key} ./github_rsa

RUN apk add --no-cache git openssh

RUN git config core.sshCommand 'ssh -i ./github_rsa' && \ 
	git clone https://github.com/TimEnglart/Medusa-Rewritten.git . && \
	chmod +x start-bot.sh;

ENTRYPOINT start-bot.sh

EXPOSE 3000/tcp
