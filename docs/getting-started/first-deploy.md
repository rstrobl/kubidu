# Your First Deployment

A complete walkthrough of deploying your first application to Kubidu.

## Prerequisites

- [Kubidu CLI installed](./installation.md)
- A Kubidu account ([sign up free](https://app.kubidu.dev/signup))
- Your application code

## Step 1: Login

First, authenticate with your Kubidu account:

```bash
kubidu login
```

A browser window opens for secure OAuth authentication. Once complete:

```
✔ Logged in as you@example.com
```

> **Tip**: For CI/CD, use `kubidu login --token <api-token>` with a token from your account settings.

## Step 2: Navigate to Your Project

```bash
cd /path/to/your/project
```

## Step 3: Initialize

Create a new Kubidu project:

```bash
kubidu init
```

You'll be prompted for:

```
? Project name: my-app
? Service name: web
```

This creates:
- A new project on Kubidu
- A `kubidu.yaml` config file in your directory

### kubidu.yaml

```yaml
# Kubidu Configuration
name: my-app
service: web

build:
  # dockerfile: Dockerfile
  # context: .

deploy:
  replicas: 1
  # port: 3000
  # healthcheck: /health
```

## Step 4: Configure Your App

### Automatic Detection

Kubidu auto-detects most frameworks:

| File | Framework | Build Command | Start Command |
|------|-----------|---------------|---------------|
| `package.json` | Node.js | `npm install` | `npm start` |
| `requirements.txt` | Python | `pip install` | `gunicorn` |
| `Gemfile` | Ruby | `bundle install` | `bundle exec` |
| `go.mod` | Go | `go build` | `./app` |
| `Dockerfile` | Docker | `docker build` | From Dockerfile |

### Manual Configuration

If auto-detection fails, add to `kubidu.yaml`:

```yaml
build:
  dockerfile: Dockerfile
  context: .

deploy:
  port: 3000
  healthcheck: /health
```

## Step 5: Set Environment Variables

Add any required environment variables:

```bash
# Set variables
kubidu env set NODE_ENV=production
kubidu env set DATABASE_URL=postgres://... --secret

# Verify
kubidu env list
```

> **Important**: Use `--secret` for sensitive values. They're encrypted at rest.

## Step 6: Deploy

```bash
kubidu deploy
```

Watch the deployment progress:

```
⠋ Creating archive...
⠋ Uploading (156.2 KB)...
⠋ Building Docker image...
⠋ Deploying to cluster...
✔ Deployed successfully in 2m 34s

  Status: running
  Deployment ID: dep_abc123
```

## Step 7: Verify

Check your deployment:

```bash
# View status
kubidu status

# View logs
kubidu logs

# Open in browser
kubidu open
```

## Step 8: Add a Custom Domain (Optional)

```bash
kubidu domains add myapp.example.com
```

Then add a CNAME record:

```
myapp.example.com → abc123.kubidu.app
```

SSL is provisioned automatically.

## Complete Example: Node.js Express App

```bash
# Create new directory
mkdir my-express-app && cd my-express-app

# Initialize Node.js project
npm init -y
npm install express

# Create app
cat > index.js << 'EOF'
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from Kubidu!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Add start script
npm pkg set scripts.start="node index.js"

# Initialize Kubidu
kubidu init

# Deploy
kubidu deploy

# Open in browser
kubidu open
```

## Complete Example: Python Flask App

```bash
# Create new directory
mkdir my-flask-app && cd my-flask-app

# Create app
cat > app.py << 'EOF'
from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify(message='Hello from Kubidu!')

@app.route('/health')
def health():
    return 'OK', 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
EOF

# Create requirements
cat > requirements.txt << 'EOF'
flask==3.0.0
gunicorn==21.2.0
EOF

# Create Procfile
echo "web: gunicorn app:app" > Procfile

# Initialize and deploy
kubidu init
kubidu deploy
kubidu open
```

## Complete Example: Docker

```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
EOF

# Initialize and deploy
kubidu init
kubidu deploy
```

## What's Next?

- [Configure environments](../guides/environments.md)
- [Set up continuous deployment](../guides/deployments.md)
- [Scale your service](../guides/scaling.md)
- [View and stream logs](../guides/logs.md)

## Troubleshooting

### Build Failed

```bash
# Check build logs
kubidu logs

# Common fixes:
# - Add missing dependencies
# - Check Dockerfile syntax
# - Verify start command in package.json
```

### Port Not Detected

Add to `kubidu.yaml`:

```yaml
deploy:
  port: 3000
```

### App Crashes on Start

1. Check logs: `kubidu logs -f`
2. Verify environment variables: `kubidu env list`
3. Test locally first: `npm start` or `docker run`

See [Troubleshooting](../troubleshooting.md) for more.
