# noo id

**noo id** is the Identity Provider component of the [noo](https://noo.eu) ecosystem.

## About noo

The noo project is building an European ecosystem of digital products. Read more about our vision and mission on our [website](https://noo.eu).

## Features

- [ ] **OpenID Connect:** noo id follows the OIDC specification to ensure compatibility with a wide range of applications.
- [ ] **Multi-tenancy:** businesses and enterprises signing up to noo with a private domain will automatically be provisioned their own private OIDC IdP instance. For example, a business registering with `example.es` will be allocated an endpoint at:
  ```
  https://id.noo.eu/oidc/example.es/.well-known/openid-configuration
  ```
- [ ] **Dynamic Client Registration:** private instances support [OIDC Dynamic client Registration](https://openid.net/specs/openid-connect-registration-1_0.html), allowing businesses to register clients in their dedicated namespace.
- [ ] **Multi-Session Support:** users can maintain multiple sessions concurrently and switch between them seamlessly.
- [ ] **Passkeys and MFA**
- [ ] **Audit logs**
- [ ] **European eIDAS integration:** noo id will integrate with European eIDAS solutions such as the Swedish BankID, Estonian eID, Italian SPID/CIE, and others. This will enable verified identities and help establish a robust ecosystem for digital identity management in Europe.

## Development

This is a [Next.js](https://nextjs.org/) app. We use [asdf](https://asdf-vm.com/) to manage the versions of our runtimes. You can run our setup script to ensure your development environment is ready.

- **Clone the monorepo and navigate to the directory:**

  ```bash
  git clone https://github.com/noo-eu/noo.git
  cd noo
  ```

- **Run the setup script:**
  ```bash
  ./setup.sh
  ```
  This will:
  - install asdf and its bun plugin
  - install the required versions of Bun
  - install the application dependencies
  - install a pre-commit hook for formatting
- **Run the development server:**

  ```bash
  cd id && bun dev
  ```

- Visit [http://localhost:13000](http://localhost:13000) to access the application.

### Serving over HTTPS

For strict OIDC compliance, the IdP must be served over HTTPS. To enable this in development, Next.js relies on [mkcert](https://github.com/FiloSottile/mkcert) to generate a local CA and certificates. You can start a development server with HTTPS by running:

```bash
bun dev:tls
```

The first time you run this command, mkcert will create a local CA and install it in your system's trust store. You may be prompted to enter your password to allow this. Subsequent runs will not require this step.

## License

The noo project adopts a custom hybrid license, allowing unrestricted use for personal, community, and non-commercial purposes. Run this at home, hack it, and share it with your friends. For details about the noo license, please refer to the [LICENSE](../LICENSE.md) file.

For any form of commercial or governmental use, please contact us for a commercial license.

## Contributing

We welcome contributions from the community. Please refer to our [Contributing Guidelines](../CONTRIBUTING.md) for more information.

## Contact

For any questions or support, please reach out via our [GitHub Issues](https://github.com/noo-eu/noo/issues) or join our community on [Discord](https://discord.gg/hZ8NYPPVP3).
