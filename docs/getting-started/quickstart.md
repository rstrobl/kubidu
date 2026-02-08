# Quickstart

Get your app deployed in 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- A Kubidu account ([sign up free](https://app.kubidu.dev/signup))

## Step 1: Install the CLI

```bash
npm install -g @kubidu/cli
```

Verify installation:

```bash
kubidu --version
```

## Step 2: Login

```bash
kubidu login
```

This opens your browser for secure authentication. Once complete, you'll see:

```
✔ Logged in as you@example.com
```

## Step 3: Initialize Your Project

Navigate to your project directory:

```bash
cd my-awesome-app
kubidu init
```

Answer the prompts:

```
? Project name: my-awesome-app
? Service name: web
✔ Project initialized!
```

This creates a `kubidu.yaml` configuration file.

## Step 4: Deploy

```bash
kubidu deploy
```

Watch the magic happen:

```
⠋ Creating archive...
⠋ Uploading (24.3 KB)...
⠋ Building Docker image...
⠋ Deploying to cluster...
✔ Deployed successfully in 45s

  Status: running
  URL: https://abc123.kubidu.app
```

## Step 5: Open Your App

```bash
kubidu open
```

Your browser opens to your live application. 🎉

## Next Steps

- [Add environment variables](../guides/variables.md)
- [Configure a custom domain](../guides/domains.md)
- [Set up continuous deployment](../guides/deployments.md)
- [View logs](../guides/logs.md)

## Example: Deploy a Node.js App

```bash
# Create a simple Express app
mkdir my-api && cd my-api
npm init -y
npm install express

# Create index.js
cat > index.js << 'EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Kubidu!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF

# Add start script to package.json
npm pkg set scripts.start="node index.js"

# Deploy to Kubidu
kubidu init
kubidu deploy
kubidu open
```

## Example: Deploy with Docker

Already have a Dockerfile? Even easier:

```bash
cd my-docker-app
kubidu init
kubidu deploy
```

Kubidu auto-detects your Dockerfile and builds it.

## Troubleshooting

### Build Failed

Check your build logs:

```bash
kubidu logs
```

Common issues:
- Missing `package.json` start script
- Incorrect `PORT` environment variable
- Dependencies not in `package.json`

### Deployment Timeout

If deployment takes too long:
- Check your healthcheck endpoint
- Ensure your app starts within 60 seconds
- Increase timeout in `kubidu.yaml`

See [Troubleshooting](../troubleshooting.md) for more help.
