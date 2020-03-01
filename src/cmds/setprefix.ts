import ExtendedClient from "@extensions/ExtendedClient";
import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";
import CommandHandler from "@extensions/CommandHandler";
import { Message } from "discord.js";
import RichEmbedGenerator from "@extensions/RichEmbeds";
import { CommandError } from "@extensions/errorParser";

export default class PrintWelcomeMessage extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'welcome';
		this.description = 'Sets the Guilds Bot Command Prefix';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [{ name: 'prefix', optional: false, example: '*' }];
		this.permissionRequired = 'ADMINISTRATOR';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
				me: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		const select = await this.client.databaseClient.query(
			`SELECT * FROM G_Prefix WHERE guild_id = ${message.guild.id}`,
		);
		if (select.length)
			await this.client.databaseClient.query(
				`UPDATE G_Prefix SET prefix = '${args[0]}' WHERE guild_id = ${message.guild.id}`,
			);
		else
			await this.client.databaseClient.query(
				`INSERT INTO G_Prefix (guild_id, prefix) VALUES (${message.guild.id}, '${args[0]}')`,
			);
		await message.channel.send(RichEmbedGenerator.successEmbed('Prefix Updated', `Set to ${args[0]}`));
	}
}