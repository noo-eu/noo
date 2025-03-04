// This file is run by Next.js at startup.

import { startCleanupTask } from "@/lib/oidc/cleanup";
startCleanupTask();
