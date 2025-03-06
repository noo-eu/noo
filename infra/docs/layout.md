# noo Servers layout

- **noo-hc-eu-production-1-service**: 10.0.16.2 + Public IP
    - Acts as a NAT for the other servers
    - Hosts Tang for disk encryption, port 999, locked down to only 10.0.0.0/8 access.
