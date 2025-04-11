# K8s disasters handbook

## Loss of a control plane node

If you lose a control plane node, you can recover by following these steps:

1. Launch a new node, from the golden image, update DNS records.
2. Export the KUBERNETES_MASTER_KEY from the SOPS store.
3. Run the `kubernetes-bootstrap.yml` playbook.

`kubectl get nodes -o wide` should show the new node as `Ready`. Good luck!
