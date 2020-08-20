import ExtendedClient from "./ext/ExtendedClient";
import { LogFilter } from "./ext/logger";
import HotReload from "./ext/HotReload";
import { exec, execSync } from "child_process";



let client: ExtendedClient | undefined;

function onUnhandledRejection(reason: {} | null | undefined, promise: Promise<unknown>): void {
	if(client)
		client.logger.logS(
			`Uncaught Promise Rejection:\nReason:\n${reason}\n\nPromise:\n${JSON.stringify(promise)}`,
			LogFilter.Error,
		);
}
function onUncaughtException(err: Error): void {
	console.log(err);
	if (client)
		client.logger.logS(`Uncaught Exception thrown:\n${err}\nExiting...`, LogFilter.Error);
	throw err;
}

function onExit(exitCode: number): void {
	console.log(exitCode);
}

process
	.on('unhandledRejection', onUnhandledRejection)
	.on('uncaughtException', onUncaughtException)
	.on('exit', onExit);

// HotReload will be Referenced in client so it shouldnt be in GC
new HotReload<ExtendedClient>({
	exec: (reloader): ExtendedClient => {
		// Because the file will be in lib
		// eslint-disable-next-line node/no-missing-require
		client = new (require('./ext/ExtendedClient').default)({
			fetchAllMembers: true,
			reloader: reloader
		});
		if(!client) throw new Error(`Failed to Create Discord Client`);
		client.login();
		return client;
	},
	shutdown: (client): void => {
		if (client) {
			client.destroy();
			client.webServer.shutdown();
			for (const requiredFiles of Object.keys(require.cache)) {
				if (requiredFiles.startsWith(client.BasePaths.WorkingPath))
					delete require.cache[require.resolve(requiredFiles)]
			}
			execSync(`cd ${client.BasePaths.WorkingPath} && npm run build`);
		}
	}
});
