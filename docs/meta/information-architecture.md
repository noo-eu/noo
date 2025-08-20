This document describes how we organize, author, review, and publish documentation. It is intentionally practical. We use one source of truth in Markdown, generate facts from machine-readable specs, and publish a public site.

## Purpose and scope

Our goal is a single, coherent documentation set that serves all readers. We avoid duplicate documents and drifting wikis. Our documentation is entirely public. It must not contain sensitive data or implementation details that could compromise security or privacy.

## Audiences and how we address them

Our documentation must support a vast array of users with different needs and expertise. We do not fork content per audience. Each page declares who it serves, and the site can surface related material for each persona.

- Individuals: people signing up and using noo as private individuals. Some of these may be minors, and must be treated accordingly.
- Organization users: these are typically employees of a business. Organizations can also invite external users as guests.
- Organization administrators: power users of an organization.
- Engineers: our own engineers and contributors.
- System administrators: those managing the infrastructure and deployment of our platform. These can be noo engineers or third-party professionals that host our services.
- App developers: those building applications on top of, or integrating with, our platform.

## Content model

We follow the Diátaxis model:

- **Tutorials** teach by doing.
- **How-tos** solve a specific task.
- **Reference** is exact and exhaustive.
- **Explanations** describe models and the "why".

![Diátaxis model](https://diataxis.fr/_images/diataxis.png)

Whenever possible, reference facts should be generated from spec files to ensure accuracy and consistency.
