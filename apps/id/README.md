# noo id

**noo id** is the Identity Provider component of the [noo](https://noo.eu) ecosystem.

## About noo

The noo project is building an European ecosystem of digital products. Read more about our vision and mission on our [website](https://noo.eu).

## Features

- [x] **OpenID Connect:** noo id follows the OIDC specification to ensure compatibility with a wide range of applications.
- [x] **Multi-tenancy:** businesses and enterprises signing up to noo with a private domain will automatically be provisioned their own private OIDC IdP instance. For example, a business registering with `example.es` will be allocated an endpoint at:
  ```
  https://id.noo.eu/oidc/example.es/.well-known/openid-configuration
  ```
- [x] **Dynamic Client Registration:** private instances support [OIDC Dynamic client Registration](https://openid.net/specs/openid-connect-registration-1_0.html), allowing businesses to register clients in their dedicated namespace.
- [x] **Multi-Session Support:** users can maintain multiple sessions concurrently and switch between them seamlessly.
- [ ] **Passkeys and MFA**
- [ ] **Audit logs**
- [ ] **European eIDAS integration:** noo id will integrate with European eIDAS solutions such as the Swedish BankID, Estonian eID, Italian SPID/CIE, and others. This will enable verified identities and help establish a robust ecosystem for digital identity management in Europe.

## Development

This is a [React Router](https://reactrouter.com/) (Framework) app. We use [asdf](https://asdf-vm.com/) to manage the versions of our runtimes. You can run our setup script to ensure your development environment is ready.

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

  - install asdf and its pnpm plugin
  - install the required versions of pnpm
  - install the application dependencies
  - install a pre-commit hook for formatting

- **Prepare the development database:**

  ```bash
  cd apps/id
  createdb noo_id
  pnpm db:migrate
  ```

- **Generate your key set:**

  An OIDC IdP needs a set of keys to sign tokens.

  ```bash
  pnpm run keys:rotate
  ```

- **Start the development server:**

  ```bash
  pnpm dev
  ```

- Visit [http://localhost:13000](http://localhost:13000) to access the application.

### Serving over HTTPS

For strict OIDC compliance, the IdP must be served over HTTPS. To enable this in development, we rely on [mkcert](https://github.com/FiloSottile/mkcert) to generate a local CA and certificates. You can start a development server with HTTPS by running:

```bash
pnpm dev:tls
```

The first time you run this command, mkcert will create a local CA and install it in your system's trust store. You may be prompted to enter your password to allow this. Subsequent runs will not require this step.

### Testing

We use Vitest for Unit tests and [Playwright](https://playwright.dev/) for end-to-end testing.

Before running the tests, create the test database:

```bash
createdb noo_id_test
```

Ensure the schema is up to date:

```bash
pnpm db:test:push
```

Load the test fixtures:

```bash
pnpm db:test:fixtures
```

Run the unit tests:

```bash
pnpm test:unit # or test:unit:watch
```

Finally run the end-to-end tests:

```bash
pnpm test:e2e
```

To assist in debugging, you can run the tests in headful mode:

```bash
pnpm test:e2e:ui
```

## License

The noo project adopts a custom hybrid license, allowing unrestricted use for personal, community, and non-commercial purposes. Run this at home, hack it, and share it with your friends. For details about the noo license, please refer to the [LICENSE](../LICENSE.md) file.

For any form of commercial or governmental use, please contact us for a commercial license.

## Contributing

We welcome contributions from the community. Please refer to our [Contributing Guidelines](../CONTRIBUTING.md) for more information.

## Contact

For any questions or support, please reach out via our [GitHub Issues](https://github.com/noo-eu/noo/issues) or join our community on [Discord](https://discord.gg/hZ8NYPPVP3).
