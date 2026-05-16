FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the app for production
RUN npm run build

EXPOSE 5173

# Use a simple server to serve the build, or use preview for now
CMD ["npm", "run", "preview", "--", "--host", "--port", "5173"]
