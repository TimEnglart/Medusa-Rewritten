import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, TextChannel } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { ReactionRoleAttrs } from "ext/ReactionRoleHandler";

export default class Provision extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'provision';
		this.description = 'Goes through all Database Relient Information that was changed while offline';
		this.environments = ['text'];
		this.expectedArguments = [];
		this.permissionRequired = 'ADMINISTRATOR';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
			},
		};
		this.hidden = true;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		// Because This bot has more downtime than uptime lmao
		

	}
}