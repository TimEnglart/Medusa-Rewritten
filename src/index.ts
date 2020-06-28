import ExtendedClient from "./ext/ExtendedClient";
import { LogFilter } from "./ext/logger";
import { AntiRepost } from "./ext/antiRepostInitiative";
// import { ClanSync } from "./ext/clanCheck";
import { Message, MessageEmbed, TextChannel } from "discord.js";
import RichEmbedGenerator from "./ext/RichEmbeds";
import { CommandError } from "./ext/errorParser";
import { inspect } from "util";
import HotReload from "./ext/HotReload";

const instance = new HotReload<ExtendedClient>({
	exec: (reloader) => {
		const client = new ExtendedClient({
			fetchAllMembers: true,
			reloader: reloader
		});

		process
			.on('unhandledRejection', (reason, p) => {
				client.logger.logS(
					`Uncaught Promise Rejection:\nReason:\n${reason}\n\nPromise:\n${JSON.stringify(p)}`,
					LogFilter.Error,
				);
			})
			.on('uncaughtException', err => {
				console.log(err);
				client.logger.logS(`Uncaught Exception thrown:\n${err}\nExiting...`, LogFilter.Error);
				process.exit(1);
			})
			.on('exit', e => {
				console.log(e);
			});

		client.login();
		return client;
	},
	shutdown: (client) => {
		if(client) {
			client.destroy();
			client.webServer.shutdown();
		}
			
	}
});
