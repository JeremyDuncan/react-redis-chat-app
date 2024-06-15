# # Use the official Node.js image as the base image
# FROM node:14
# 
# # Create and change to the app directory
# WORKDIR /usr/src/app
# 
# # Install app dependencies
# COPY package*.json ./
# RUN npm install
# 
# # Copy the app source code
# COPY ./src ./src
# COPY ./public ./public
# 
# # Start the app
# CMD [ "npm", "start" ]


# /react-chat-app/frontend/Dockerfile
# Use the official Node.js image as the base image
FROM node:18

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and yarn.lock first to install dependencies
COPY package.json yarn.lock ./

# Install app dependencies
RUN yarn install

# Copy the app source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD [ "yarn", "start" ]



