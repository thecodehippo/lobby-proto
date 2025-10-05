#!/bin/bash
set -e

VERSION=${1:-latest}
DOCKER_USER="your-dockerhub-username"

echo "Building and deploying version: $VERSION"

# Build
docker-compose build app

# Tag
docker tag lobby-proto-app:latest $DOCKER_USER/lobby-proto-app:$VERSION
docker tag lobby-proto-app:latest $DOCKER_USER/lobby-proto-app:latest

# Push
docker push $DOCKER_USER/lobby-proto-app:$VERSION
docker push $DOCKER_USER/lobby-proto-app:latest

# Deploy
aws lightsail create-container-service-deployment \
  --cli-input-json file://lightsail-deployment.json

echo "Deployment initiated. Check status with:"
echo "aws lightsail get-container-services --service-name lobby-proto"