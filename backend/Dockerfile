# /react-chat-app/backend/Dockerfile

# Use the official Node.js image as the base image
FROM node:18

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and yarn.lock first to install dependencies
COPY package.json yarn.lock ./

# Clear yarn cache and install app dependencies
RUN yarn cache clean && yarn install

# Log installed modules for debugging
RUN ls -la node_modules
RUN yarn list --pattern express

# Copy the app source code
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Start the app
CMD [ "node", "index.js" ]
