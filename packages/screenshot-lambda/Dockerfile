FROM mcr.microsoft.com/playwright:v1.59.1-jammy

# Set Lambda-specific environment variables
ENV LAMBDA_TASK_ROOT="/var/task"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

WORKDIR ${LAMBDA_TASK_ROOT}

# Install build dependencies
RUN apt-get update && apt-get install -y cmake g++ make xz-utils

COPY package.json yarn.lock ./
RUN yarn install --immutable

# Copy source code
COPY src/ ./src/

# Set the ENTRYPOINT to the Lambda RIC
ENTRYPOINT ["/usr/bin/node", "/var/task/node_modules/.bin/aws-lambda-ric"]
CMD ["src/index.handler"]
