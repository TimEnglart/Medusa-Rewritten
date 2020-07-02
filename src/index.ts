import ExtendedClient from "./ext/ExtendedClient";
import { LogFilter } from "./ext/logger";
import HotReload from "./ext/HotReload";



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
		client = new ExtendedClient({
			fetchAllMembers: true,
			reloader: reloader
		});
		client.login();
		return client;
	},
	shutdown: (client): void => {
		if (client) {
			client.destroy();
			client.webServer.shutdown();
		}
	}
});
