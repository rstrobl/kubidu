# Configuration

Configure your Kubidu applications for optimal performance, security, and reliability.

## Configuration File

Every Kubidu app has a `kubidu.json` file in the project root:

```json
{
  "name": "my-app",
  "type": "docker",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "deploy": {
    "instances": 2,
    "port": 3000,
    "healthCheck": {
      "path": "/health"
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Quick Reference

| Section | Description |
|---------|-------------|
| [Environment Variables](/configuration/environment-variables) | Secrets and configuration |
| [Custom Domains](/configuration/domains) | Connect your own domain |
| [Auto-Scaling](/configuration/scaling) | Scale based on traffic |
| [Resource Limits](/configuration/resources) | CPU and RAM allocation |

## Full Schema

```json
{
  "name": "string",           // App name (required)
  "type": "docker",           // Deployment type
  "workspace": "string",      // Workspace ID
  
  "build": {
    "dockerfile": "string",   // Path to Dockerfile
    "context": "string",      // Build context directory
    "args": {}                // Build arguments
  },
  
  "deploy": {
    "instances": 1,           // Number of instances
    "port": 3000,             // Container port
    "region": "eu-central",   // Deployment region
    "healthCheck": {
      "path": "/health",
      "interval": 30,
      "timeout": 5,
      "retries": 3
    },
    "resources": {
      "cpu": "0.5",
      "memory": "512Mi"
    },
    "scaling": {
      "min": 1,
      "max": 10,
      "metric": "cpu",
      "target": 80
    }
  },
  
  "env": {},                  // Environment variables
  
  "domains": [                // Custom domains
    "app.example.com"
  ],
  
  "github": {
    "autoDeploy": true,
    "branches": ["main"]
  }
}
```

## CLI Configuration

Create or update configuration:

```bash
# Initialize a new project
kubidu init

# Set a config value
kubidu config set deploy.instances 3

# Get a config value
kubidu config get deploy.instances

# View full config
kubidu config list
```

## Environment-Specific Config

Use different configurations per environment:

```json
{
  "name": "my-app",
  "environments": {
    "production": {
      "deploy": {
        "instances": 3,
        "resources": {
          "cpu": "1",
          "memory": "1Gi"
        }
      }
    },
    "staging": {
      "deploy": {
        "instances": 1,
        "resources": {
          "cpu": "0.5",
          "memory": "512Mi"
        }
      }
    }
  }
}
```

Deploy to a specific environment:

```bash
kubidu deploy --environment production
```

## Validation

Validate your configuration before deploying:

```bash
kubidu validate
```

```
✓ kubidu.json is valid
✓ Dockerfile found
✓ Health check endpoint configured
✓ Environment variables set
```

## Next Steps

- [Environment Variables](/configuration/environment-variables) — Manage secrets and config
- [Custom Domains](/configuration/domains) — Add your own domain
- [Auto-Scaling](/configuration/scaling) — Scale automatically with traffic
- [Resource Limits](/configuration/resources) — Configure CPU and memory
