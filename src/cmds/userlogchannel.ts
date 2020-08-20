import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { Utility } from "../ext/utility";
import RichEmbedGenerator from "../ext/RichEmbeds";


export default class SetLogChannel extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'userlogchannel';
		this.description = 'Sets a Text Channel Where Guild Events are Sent';
		this.environments = ['text'];
		this.expectedArguments = [{ name: 'Channel Resolvable', optional: true, example: '4126456125411' }];
		this.executorPermissionRequired = 'MANAGE_GUILD';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
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
			const guildCollection = await this.client.nextDBClient.getCollection('guilds');
			await guildCollection.updateOne(
				{
					_id: message.guild.id,
				},
				{
					$set: {
						_id: message.guild.id,
						eventChannelId: userLogChannel.id,
					}
				},
				{ upsert: true }
			);
			
			await message.channel.send(
				RichEmbedGenerator.successEmbed('User Log Channel Updated', `${message.guild.channels.resolve(userLogChannel.id)}`),
			);
		}
	}
}