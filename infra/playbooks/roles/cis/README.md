# noo Ansible Role: CIS Benchmark for Debian 12

This role implements the CIS Benchmark for Debian 12. It performs a large number
of security checks and configurations to bring the system in line with the CIS
Benchmarks.

## GRUB password

One of the requirements is to protect the GRUB bootloader from unauthorized
changes at boot time. This is done by setting a password for the GRUB
bootloader. The password is stored (hashed) in the `grub_password` variable in
the `defaults/main.yml`. There's no scenario where this password is actually
used, but it's stored in our vault for safekeeping.

## Not implemented

The Benchmark requires separate partitions for /home, /var, /var/tmp, /var/log,
and /var/log/audit. This is not implemented in this role. While this is a
reasonable practice, it's hard to implement in a generic way, especially without
knowing the disk layout of the system.

Many controls apply to desktop environments, like disabling wireless and bluetooth
devices. These are not implemented at the moment, as Debian for servers does not
have these devices enabled by default. We might implement these later to ensure
that these stay disabled.

Additionally many controls are optional, mutually exclusive or not applicable
to our environment. These are not implemented.
