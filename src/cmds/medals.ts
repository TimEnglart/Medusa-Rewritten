import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'medals';
		this.description = 'Displays all Possible Medals that can/could be awarded';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [];
		this.permissionRequired = 'SEND_MESSAGES';
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
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		const categorizedMedals = this.client.MedalHandler.categorizeMedals();
		for (const [medalCategory, medals] of Object.entries(categorizedMedals)) {
			if (medalCategory === 'Locked') continue;
			const embed = new MessageEmbed().setTitle(`${medalCategory} Medals`);
			for (const medal of medals) {
				embed.addField(`${medal.name} ${medal.emoji}`, `${medal.description}\n**${medal.xp} XP**`);
			}
			await message.author.send(embed);
		}
		await message.channel.send(
			RichEmbedGenerator.notifyEmbed(
				`Prove your Worth Guardian <:Legend:518606062195310629>`,
				`List of ${message.guild} Medals has been sent, best of luck on your hunt!`,
			),
		);
	}
}