# How K8s was initialized

To get started, we will make some questionable choices that will help us avoid
wasteful spending (why build a world-class infrastructure for me and my 2
friends?).

Kubernetes master nodes are supposed to be close together and have exclusive
use of the nodes where they run. Initially we will:

- Run 2 master nodes in Nuremberg and 1 in Helsinki.
- The 3 master nodes will also run Postgres (3 is a nice number for Postgres
  replication).
- Postgres will synchronously replicate in Nuremberg and
  asynchronously replicate to Helsinki.

We will also run Tang in the same Hetzner infrastructure. Longer term it would
be preferable to keep the Disk Encryption keys in a separate location.

## 1. Run the network and nodes terraform configurations

These will create:
- a private network
- a NAT
- a load balancer
- 3 nodes for the control plane (with encrypted storage for Postgres)
- 2 nodes for workers
- 1 node for monitoring (with encrypted storage for Prometheus/Grafana)

The configuration outputs will prompt you to create DNS records (Netim does not
have an API or terraform provider, so you will have to do this manually).

## 2. Launch the bootstrap wireguard entry point

To execute the next steps you will need a backdoor in our network. Apply the
bootstrap/wireguard configuration (checkout the
[README.md](../bootstrap/wireguard/README.md)) and set up the Wireguard tunnel.

Ensure your SSH public key has been signed by the SSH CA. If you don't have
an ~/.ssh/id_ed25519-cert.pub file, prepare the ssh_user_ca (from Bitwarden)
and run:

```
ssh-keygen -s ssh_user_ca -n noo-admin -I id -V +52w ~/.ssh/id_ed25519.pub
```

You should now be able to ssh into the nodes, for example with:

```
ssh noo-admin@node-1.internal.noo.eu
```

You probably want to add the following to your ~/.ssh/config:

```
Host *.internal.noo.eu
	StrictHostKeyChecking no
```

To avoid answering yes to the host key prompt for each node. (we might use the
CA to sign the host keys in the future, but for now this is a bit easier).

## 3. Prepare the service server (Tang)

```
ansible-playbook -i inventory.ini --ask-become-pass playbooks/service.yml
```

You will be asked for the password of the `noo-admin` user, also found in
Bitwarden.

## 4. Prepare the encrypted storage

```
ansible-playbook -i inventory.ini --ask-become-pass playbooks/encrypted-storage.yml
```

You will be asked for the password of the `noo-admin` user.

At this point the 3 postgres (control plane) nodes and monitoring should have an
encrypted ZFS volume mounted at `/secure`. You may want to reboot one of these
nodes to verify that systemd can successfully run Clevis at boot time, obtain a
key from Tang, and decrypt the volume. Better to do this now than once there's
data in it.

## 5. Install Kubernetes

- Run the kubernetes-bootstrap.yml playbook. This will also prepare your ~/.kube/config
  file to interact with the cluster.

```bash
ansible-playbook -i inventory.ini --ask-become-pass playbooks/kubernetes-bootstrap.yml
```

- Run the kubernetes-join-worker.yml playbook.

```bash
ansible-playbook -i inventory.ini --ask-become-pass playbooks/kubernetes-join-workers.yml
```

Label the nodes. This will be used to place ingress nodes and to spread the
Postgres replication.

```bash
kubectl label node node-1 ingress-ready=true
kubectl label node node-2 ingress-ready=true
kubectl label node postgres-1 sync-group=a
kubectl label node postgres-2 sync-group=b
kubectl label node postgres-3 sync-group=a
```

## 6. Install additional tools:

```bash
brew install helm fluxcd/tap/flux
```

## 7. Install Cilium with helm

```
helm install cilium cilium/cilium --version 1.17.2 \
    --namespace kube-system \
    -f manifests/cilium-values.yml
```

- Wait ~2 minutes for the pods to come up.
- You MUST rollout CoreDNS once Cilium is installed. `kubectl rollout restart -n kube-system deployment/coredns`

This is a good time to run a `cilium connectivity test` to verify that
everything is working. This will take around 10 minutes to run.

## 8. Install FluxCD

Flux will be in charge of applying all changes to the cluster from this
point on.

1. Generate an SSH key for Flux to read/write the git repository:

```bash
ssh-keygen -t ed25519 -f ./flux-gitops -C flux-gitops
```

Create an SSH Deploy Key on this Github repository with the public key file.

2. Install the SOPS-age secret to decrypt the secrets in the git repository.

```bash
kubectl create namespace flux-system
cat age.agekey |
  kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

You can find the Private key in Bitwarden.

3. Execute:

```bash
flux bootstrap git \
  --url=ssh://git@github.com/noo-eu/noo \
  --branch=main \
  --path=infra/flux \
  --private-key-file=./flux-gitops
```

At this point Flux will monitor the `infra/flux` directory and periodically
apply the changes to the cluster. You can check the status of Flux with:

```bash
flux get kustomization
```

In a few minutes the entire cluster should be up and running.