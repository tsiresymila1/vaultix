#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./commands/init";
import { login } from "./commands/login";
import { listVaults } from "./commands/list";
import { listEnvs } from "./commands/env";
import { runCommand } from "./commands/run";
import { exportEnv } from "./commands/export";

const program = new Command();

program
    .name("vaultix")
    .description("Secure secrets manager")
    .version("0.1.0");

program.command("init").action(init);
program.command("login").action(login);
program.command("list").action(listVaults);

const env = program.command("env");
env.command("list [vault]").action(listEnvs);

program.command("run")
    .description("Run a command with secrets injected")
    .argument("<cmd...>", "Command to run")
    .option("-e, --env <env>", "Environment name")
    .option("-v, --vault <vault>", "Vault name")
    .allowUnknownOption()
    .action((cmd, opts) => runCommand(opts.vault, opts, cmd));

program.command("export [vault]")
    .option("--env <env>")
    .action(exportEnv);


program.parse();
