import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";


export default class SetPrefix extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'setprefix';
		this.description = 'Sets the Guilds Bot Command Prefix';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [{ name: 'prefix', optional: false, example: '*' }];
		this.executorPermissionRequired = 'ADMINISTRATOR';
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
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		const resolvedEnvironmentId = message.guild?.id || message.author.id;
		const guildCollection = await this.client.nextDBClient.getCollection('guilds');
		await guildCollection.updateOne(
			{
				_id: resolvedEnvironmentId,
			},
			{
				$set: {
					_id: resolvedEnvironmentId,
					prefix: args[0]
				}
			},
			{ upsert: true },
		);
		await message.channel.send(RichEmbedGenerator.successEmbed('Prefix Updated', `Set to ${args[0]}`));
	}
}