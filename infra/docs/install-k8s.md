# How K8s was initialized

To bootstrap, we will share postgres & control plane nodes. This is not recommended long term, but it is a good way to get started.

## 1. The control plane

- Launch the 3 postgres instances, 1 monitoring, provision the zfs volumes.
- Start the kubernetes-bootstrap.yml playbook on the first node.
- Save the 3 keys to sops/age, then export them as environment variables.
- Start the kubernetes-join.yml playbook on the other two nodes.

Now the control plane is ready. Copy /etc/kubernetes/admin.conf to your ~/.kube/config.

TODO: I'm fairly sure we can merge the kubernetes-bootstrap.yml and
kubernetes-join.yml playbooks into one and run it on all 3 nodes at once.

## 2. Cilium

- Download the Cilium CLI to your local machine
- helm install cilium cilium/cilium --version 1.17.2 \
    --namespace kube-system \
    --set kubeProxyReplacement=true \
    --set k8sServiceHost=auto \
    --set encryption.enabled=true \
    --set encryption.type=wireguard
- Wait ~2 minutes for the pods to come up.
- You MUST rollout CoreDNS once Cilium is installed. `kubectl rollout restart -n kube-system deployment/coredns`
- You can `cilium hubble enable --ui` but it will fail because it doesn't like to run on the control plane nodes.

## 3. The worker nodes

- Export the K8S_JOIN_TOKEN and K8S_JOIN_CA_CERT environment variables from sops.
- Start the kubernetes-join-worker.yml playbook on the worker nodes.

## 4. Label the public nodes

- `kubectl label node node-1 ingress-ready=true`
- `kubectl label node node-2 ingress-ready=true`

## 5. Install cert-manager

```
helm repo add jetstack https://charts.jetstack.io
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.crds.yaml

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace
```

Apply the manifest from `manifests/letsencrypt-prod.yml` to create the Let's
Encrypt issuer.

## 6. Install the nginx ingress controller

```
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.kind=DaemonSet \
  --set controller.daemonset.useHostPort=true \
  --set controller.hostNetwork=true \
  --set controller.service.type=ClusterIP \
  --set controller.ingressClass=nginx \
  --set controller.ingressClassResource.name=nginx \
  --set controller.ingressClassResource.default=true \
  --set-string controller.nodeSelector.ingress-ready=true \
  --set controller.extraArgs.enable-ssl-passthrough=""
```

## 7. Metrics Server

```
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Edit the deployment to add the `--kubelet-insecure-tls` flag to the `container.args` array. Also change `--kubelet-preferred-address-types` to `Hostname`.

## 8. Prometheus

```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
```

Install Prometheus:

```
helm upgrade --install \
  -f manifests/prometheus-values.yml \
  prometheus prometheus-community/kube-prometheus-stack
```

## 9. CloudNativePG

Label the 3 nodes to host PG
```
kubectl label node postgres-1 storage=pg region=hc-nbg1 sync-group=a
kubectl label node postgres-2 storage=pg region=hc-nbg1 sync-group=b
kubectl label node postgres-3 storage=pg region=hc-hel1 sync-group=a
```

Install CNPG:

```
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm upgrade --install cnpg \
  --namespace cnpg-system \
  --create-namespace \
  cnpg/cloudnative-pg
```

Create the PV from the encrypted ZFS volumes:

```
kubectl apply -f manifests/postgres-pv.yml
```

Create the PG cluster:

```
kubectl apply -f manifests/postgres.yml
```

Install the CNPG Grafana dashboard:

```
helm upgrade --install \
  cnpg-grafana-cluster cnpg-grafana/cluster