# K8s disasters handbook

## Loss of a control plane node

If you lose a control plane node, you can recover by following these steps:

1. Launch a new node, from the golden image.
2. Export the KUBERNETES_MASTER_KEY from the SOPS store.
3. Filter out the lost node from the `kubernetes-join.yml` playbook.
4. Run the `kubernetes-join.yml` playbook on the new node.

`kubectl get nodes -o wide` should show the new node as `Ready`. Good luck!