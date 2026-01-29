#!/bin/bash

# Generate encryption keys for Kubidu platform
set -e

echo "Generating encryption keys..."

# Generate encryption key for environment variables (64 hex characters = 32 bytes)
if ! grep -q "ENCRYPTION_KEY=" .env 2>/dev/null || grep -q "ENCRYPTION_KEY=$" .env 2>/dev/null; then
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    if [ -f .env ]; then
        # Update existing .env file
        if grep -q "ENCRYPTION_KEY=" .env; then
            # Replace empty ENCRYPTION_KEY
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=${ENCRYPTION_KEY}/" .env
            else
                sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=${ENCRYPTION_KEY}/" .env
            fi
        else
            # Add ENCRYPTION_KEY if missing
            echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}" >> .env
        fi
    else
        # Create new .env file
        echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}" > .env
    fi

    echo "✓ Encryption key generated and saved to .env"
else
    echo "✓ Encryption key already exists in .env"
fi

# Generate JWT secret if needed
if ! grep -q "JWT_SECRET=" .env 2>/dev/null || grep -q "JWT_SECRET=your-super-secret" .env 2>/dev/null; then
    JWT_SECRET=$(openssl rand -base64 32)

    if [ -f .env ]; then
        if grep -q "JWT_SECRET=" .env; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
            else
                sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
            fi
        else
            echo "JWT_SECRET=${JWT_SECRET}" >> .env
        fi
    fi

    echo "✓ JWT secret generated and saved to .env"
else
    echo "✓ JWT secret already exists in .env"
fi

# Generate JWT refresh secret if needed
if ! grep -q "JWT_REFRESH_SECRET=" .env 2>/dev/null || grep -q "JWT_REFRESH_SECRET=your-super-secret" .env 2>/dev/null; then
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)

    if [ -f .env ]; then
        if grep -q "JWT_REFRESH_SECRET=" .env; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env
            else
                sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env
            fi
        else
            echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}" >> .env
        fi
    fi

    echo "✓ JWT refresh secret generated and saved to .env"
else
    echo "✓ JWT refresh secret already exists in .env"
fi

echo ""
echo "All encryption keys generated successfully!"
echo ""
echo "IMPORTANT: Keep these keys secret and never commit them to version control."
echo "The .env file should be in your .gitignore."
