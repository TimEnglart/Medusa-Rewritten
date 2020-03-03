import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'ranks';
		this.description = 'Responds with a list of all current Ranks via direct message.';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [];
		this.permissionRequired = 'SEND_MESSAGES';
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
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		const guildIcon = message.guild ? message.guild.iconURL() || '' : '';
		const ranksEmbed = new MessageEmbed()
			.setTitle(`${message.guild} Ranks`)
			.setColor('#ffae00')
			.setThumbnail(guildIcon);
		for (let i = 0; i < this.client.settings.lighthouse.ranks.length; i++) {
			ranksEmbed.addFields({
				name: `${i} ${this.client.settings.lighthouse.ranks[i].name}`,
				value: `${this.client.settings.lighthouse.ranks[i].emoji}`,
				inline: false,
			});
		}
		await message.author.send(ranksEmbed);
		await message.channel.send(
			RichEmbedGenerator.notifyEmbed(
				`Prove your Worth Guardian ${
					this.client.settings.lighthouse.medals[this.client.settings.lighthouse.medals.length - 1].emoji
				}`,
				`List of ${message.guild} Ranks has been sent, best of luck on your hunt!`,
			),
		);
	}
}