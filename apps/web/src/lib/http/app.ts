import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import { onError } from "@/lib/http/middleware/error";
import { authRouter } from "@/lib/http/routers/auth.router";
import { cliRouter } from "@/lib/http/routers/cli.router";
import { extensionRouter } from "@/lib/http/routers/extension.router";
import { usersRouter } from "@/lib/http/routers/users.router";
import { sharedRouter } from "@/lib/http/routers/shared.router";
import { vaultsRouter } from "@/lib/http/routers/vaults.router";
import { accountRouter } from "@/lib/http/routers/account.router";
import { passwordsRouter } from "@/lib/http/routers/passwords.router";
import { cronRouter } from "@/lib/http/routers/cron.router";

const app = new Hono<AppEnv>()
  .basePath("/api")
  .route("/auth", authRouter)
  .route("/cli", cliRouter)
  .route("/extension", extensionRouter)
  .route("/users", usersRouter)
  .route("/shared", sharedRouter)
  .route("/vaults", vaultsRouter)
  .route("/account", accountRouter)
  .route("/passwords", passwordsRouter)
  .route("/cron", cronRouter);

app.onError(onError);

export type AppType = typeof app;
export default app;
