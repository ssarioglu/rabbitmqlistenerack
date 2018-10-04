FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/hackeventlistener
WORKDIR /usr/src/hackeventlistener

ENV AMQPURL=
ENV PROCESSENDPOINT="http://[yourfulfillordername].[namespace]:8080/v1/order"
ENV TEAMNAME="Ducker"

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .


CMD [ "node", "hackeventlistener.js" ]
