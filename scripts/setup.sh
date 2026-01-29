#!/bin/bash

# Kubidu Platform Setup Script
set -e

echo "========================================="
echo "  Kubidu Platform Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker Compose is available"

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p kubeconfig
mkdir -p logs
mkdir -p data/minio
mkdir -p data/registry
mkdir -p data/postgres
mkdir -p data/redis

echo -e "${GREEN}✓${NC} Directories created"

# Generate encryption keys if they don't exist
echo ""
echo "Generating encryption keys..."
bash scripts/generate-keys.sh

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    cat > .env << 'EOF'
# Kubidu Platform Environment Variables

# Database
DATABASE_URL=postgresql://kubidu:kubidu_dev_password@postgres:5432/kubidu

# Redis
REDIS_URL=redis://:kubidu_redis_password@redis:6379

# Security (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars

# Encryption key (generated automatically)
# Run: openssl rand -hex 32
ENCRYPTION_KEY=

# GitHub
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret-change-this

# GitLab
GITLAB_WEBHOOK_SECRET=your-gitlab-webhook-secret-change-this

# Stripe (optional for local development)
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=kubidu
MINIO_SECRET_KEY=kubidu_dev_password
MINIO_USE_SSL=false

# Kubernetes
K8S_KUBECONFIG_PATH=/kubeconfig/kubeconfig.yaml

# Application
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DEFAULT_DOMAIN_SUFFIX=kubidu.local

EOF
    echo -e "${GREEN}✓${NC} .env file created (please review and update as needed)"
else
    echo -e "${YELLOW}⚠${NC}  .env file already exists, skipping..."
fi

# Pull Docker images
echo ""
echo "Pulling Docker images (this may take a while)..."
docker-compose pull postgres redis minio registry k3s

echo -e "${GREEN}✓${NC} Docker images pulled"

# Start infrastructure services first
echo ""
echo "Starting infrastructure services..."
docker-compose up -d postgres redis minio registry k3s

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U kubidu > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo ""
echo -e "${GREEN}✓${NC} PostgreSQL is ready"

# Wait for k3s to be ready
echo "Waiting for k3s..."
sleep 15
echo -e "${GREEN}✓${NC} k3s should be ready"

# Setup k3s
echo ""
echo "Configuring k3s..."
bash scripts/setup-k3s.sh

echo ""
echo "========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Review and update .env file if needed"
echo "  2. Install dependencies: npm install"
echo "  3. Build packages: npm run build"
echo "  4. Start all services: docker-compose up"
echo ""
echo "Access points:"
echo "  - Web Dashboard: http://localhost:5173"
echo "  - API: http://localhost:3000"
echo "  - MinIO Console: http://localhost:9001"
echo "  - PostgreSQL: localhost:5432"
echo ""
echo "Default credentials:"
echo "  - Email: demo@kubidu.io"
echo "  - Password: password123"
echo ""
