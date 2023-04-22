#
# Copyright 2021 Todd Little and the syslog-interceptor contributors.  All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

RUN npm install -g typescript ts-node

# Required environment variables:
#   serverPort - the port this container will listen on for incoming syslog messages
#   APIKey - the API Key from AbuseIPDB
# Optional environment variables:
#    nextServerAddr - The address of a syslog server to relay messages to
#    nextServerPort - The port of the above syslog server
#
# These can all be set at the time of creating the container
ENV serverPort=20514
ENV APIKey=""  
ENV nextServerAddr=""  
ENV nextServerPort=""
# Add as many as needed regexp expressions, with incremented number
ENV CHECK_REGEXP_1="failed to log in via"
ENV CHECK_REGEXP_2="due to authorization failure."
ENV CHECK_REGEXP_3=""


EXPOSE 20514
CMD [ "ts-node", "listener.ts" ]