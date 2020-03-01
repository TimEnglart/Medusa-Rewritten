import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";

import CommandHandler from "@extensions/CommandHandler";

import { Message } from "discord.js";
import RichEmbedGenerator from "@extensions/RichEmbeds";
import { CommandError } from "@extensions/errorParser";
import { Utility } from "@extensions/utility";

export default class SetLogChannel extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'userlogchannel';
		this.description = 'Sets a Text Channel Where Guild Events are Sent';
		this.environments = ['text'];
		this.expectedArguments = [{ name: 'Channel Resolvable', optional: true, example: '4126456125411' }];
		this.permissionRequired = 'MANAGE_GUILD';
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
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		const userLogChannel = Utility.LookupChannel(message, args[0]);
		if (!userLogChannel) throw new CommandError('NO_CHANNEL_FOUND');
		const actualChannel = message.guild.channels.resolve(userLogChannel.id);
		if (actualChannel) {
			const select = await this.client.databaseClient.query(
				`SELECT * FROM G_Event_Log_Channel WHERE guild_id = ${message.guild.id} AND text_channel_id = ${userLogChannel.id}`,
			);
			if (select.length)
				await this.client.databaseClient.query(
					`UPDATE G_Event_Log_Channel SET text_channel_id = ${userLogChannel.id} WHERE guild_id = ${message.guild.id}`,
				);
			else
				await this.client.databaseClient.query(
					`INSERT INTO G_Prefix (guild_id, text_channel_id) VALUES (${message.guild.id}, ${userLogChannel.id})`,
				);
			await message.channel.send(
				RichEmbedGenerator.successEmbed('User Log Channel Updated', `${message.guild.channels.resolve(userLogChannel.id)}`),
			);
		}
	}
}