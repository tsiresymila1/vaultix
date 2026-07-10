import { Hono } from "hono";
import type { AppEnv } from "./types";
import { onError } from "./middleware/error";
import { authRouter } from "./routers/auth.router";
import { cliRouter } from "./routers/cli.router";
import { extensionRouter } from "./routers/extension.router";
import { usersRouter } from "./routers/users.router";
import { sharedRouter } from "./routers/shared.router";
import { vaultsRouter } from "./routers/vaults.router";
import { accountRouter } from "./routers/account.router";
import { passwordsRouter } from "./routers/passwords.router";
import { cronRouter } from "./routers/cron.router";

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
