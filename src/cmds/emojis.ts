import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class ListEmojisCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'emojis';
		this.description = 'Sends a list of all Discord servers custom emojis via direct message.';
		this.environments = ['text'];
		this.expectedArguments = [];
		this.permissionRequired = 'SEND_MESSAGES';
		this.requiredProperties = undefined;
	}
	protected async Run(message: Message): Promise<ICommandResult | void> {
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		let messageIndex = 1;
		let botEmbed = new MessageEmbed().setTitle(`Emojis ;) Pt.${messageIndex}`);
		for (const [snowflake, emoji] of message.guild.emojis.cache.entries()) {
			if (botEmbed.fields.length === 25) {
				await message.author.send(botEmbed);
				botEmbed = new MessageEmbed().setTitle(`Emojis ;) Pt.${++messageIndex}`);
			}
			botEmbed.addFields({
				name: `${emoji.name} - <${emoji.animated ? 'a' : ''}:${emoji.name}:${snowflake}>`,
				value: `\\<${emoji.animated ? 'a' : ''}:${emoji.name}:${snowflake}>`,
				inline: false
			});
		}
		await message.author.send(botEmbed);
		await message.channel.send(
			RichEmbedGenerator.notifyEmbed(
				`List of ${message.guild} Custom Emojis has been sent`,
				`Useful tool for bot development.`,
			),
		);
	}
}