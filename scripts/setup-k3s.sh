#!/bin/bash

# Setup k3s Kubernetes cluster with necessary configurations
set -e

echo "Configuring k3s cluster..."

# Wait for kubeconfig to be available
MAX_WAIT=60
WAIT_TIME=0

while [ ! -f kubeconfig/kubeconfig.yaml ] && [ $WAIT_TIME -lt $MAX_WAIT ]; do
    echo "Waiting for kubeconfig..."
    sleep 2
    WAIT_TIME=$((WAIT_TIME + 2))
done

if [ ! -f kubeconfig/kubeconfig.yaml ]; then
    echo "Error: kubeconfig not found after ${MAX_WAIT} seconds"
    exit 1
fi

# Update kubeconfig to use localhost instead of container name
sed -i.bak 's/127.0.0.1/localhost/g' kubeconfig/kubeconfig.yaml 2>/dev/null || \
sed -i '' 's/127.0.0.1/localhost/g' kubeconfig/kubeconfig.yaml 2>/dev/null || true

export KUBECONFIG=$(pwd)/kubeconfig/kubeconfig.yaml

echo "✓ Kubeconfig configured"

# Install kubectl if not present (optional - for manual cluster management)
if ! command -v kubectl &> /dev/null; then
    echo "⚠ kubectl not found. Install kubectl to manually manage the cluster."
    echo "  macOS: brew install kubectl"
    echo "  Linux: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/"
else
    echo "✓ kubectl found"

    # Wait for k3s API to be ready
    echo "Waiting for Kubernetes API..."
    MAX_RETRIES=30
    RETRY=0

    until kubectl get nodes &> /dev/null || [ $RETRY -eq $MAX_RETRIES ]; do
        echo -n "."
        sleep 2
        RETRY=$((RETRY + 1))
    done
    echo ""

    if [ $RETRY -eq $MAX_RETRIES ]; then
        echo "Warning: Could not connect to Kubernetes API"
    else
        echo "✓ Kubernetes API is ready"

        # Create namespaces for platform services
        echo "Creating platform namespaces..."
        kubectl create namespace kubidu-system --dry-run=client -o yaml | kubectl apply -f -

        # Label the namespace
        kubectl label namespace kubidu-system name=kubidu-system --overwrite

        echo "✓ Platform namespaces created"

        # Install Traefik Ingress Controller (since we disabled the built-in one)
        echo "Installing Traefik ingress controller..."
        kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v2.10/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml

        cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traefik-ingress-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: traefik-ingress-controller
rules:
  - apiGroups: [""]
    resources: ["services", "endpoints", "secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions", "networking.k8s.io"]
    resources: ["ingresses", "ingressclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions", "networking.k8s.io"]
    resources: ["ingresses/status"]
    verbs: ["update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: traefik-ingress-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: traefik-ingress-controller
subjects:
  - kind: ServiceAccount
    name: traefik-ingress-controller
    namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  namespace: kube-system
  labels:
    app: traefik
spec:
  replicas: 1
  selector:
    matchLabels:
      app: traefik
  template:
    metadata:
      labels:
        app: traefik
    spec:
      serviceAccountName: traefik-ingress-controller
      containers:
        - name: traefik
          image: traefik:v2.10
          args:
            - --api.insecure=true
            - --providers.kubernetesingress=true
            - --entrypoints.web.address=:80
            - --entrypoints.websecure.address=:443
            - --log.level=INFO
          ports:
            - name: web
              containerPort: 80
            - name: websecure
              containerPort: 443
            - name: admin
              containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: traefik
  namespace: kube-system
spec:
  type: LoadBalancer
  selector:
    app: traefik
  ports:
    - name: web
      port: 80
      targetPort: 80
    - name: websecure
      port: 443
      targetPort: 443
    - name: admin
      port: 8080
      targetPort: 8080
EOF

        echo "✓ Traefik installed"

        # Create directories for Kubernetes manifests
        mkdir -p infrastructure/kubernetes/base

        # Create resource quota template for user namespaces
        echo "Creating resource quota template..."
        cat <<EOF > infrastructure/kubernetes/base/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: user-quota
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    requests.storage: "50Gi"
    persistentvolumeclaims: "5"
    pods: "20"
    services: "10"
    configmaps: "20"
    secrets: "20"
EOF

        # Create network policy template
        echo "Creating network policy template..."
        cat <<EOF > infrastructure/kubernetes/base/network-policy.yaml
# Deny all traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
---
# Allow ingress from Traefik
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-traefik
spec:
  podSelector:
    matchLabels:
      app: user-deployment
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    - podSelector:
        matchLabels:
          app: traefik
---
# Allow egress to internet
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-internet
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.0.0/16
EOF

        echo "✓ Templates created"

        # Show cluster info
        echo ""
        echo "Cluster information:"
        kubectl cluster-info
        echo ""
        kubectl get nodes
        echo ""
        echo "✓ k3s setup complete"
    fi
fi
