
FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/ttb-slack-bot
WORKDIR /usr/src/ttb-slack-bot

# Install app dependencies
COPY . /usr/src/ttb-slack-bot

RUN npm install


CMD [ "npm", "start" ]