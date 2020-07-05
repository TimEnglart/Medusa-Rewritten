import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class HelpCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'help';
		this.description = 'Responds with a guide on how to use the bot, including basic commands.';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [{ name: 'Command Name', optional: true, example: 'guardian' }];
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


		const guildCollection = await this.client.nextDBClient.getCollection('guilds');
		const guildPrefix = await guildCollection.findOne({
			_id: message.guild ? message.guild.id : message.author.id,
		});
		const prefix = guildPrefix.prefix || this.client.settings.defaultPrefix;
		if (args.length > 0) {
			const commandModule = this.client.commandHandler.Commands.get(args[0]);
			if (commandModule && commandModule.validPermissions(message)) {
				await message.channel.send(RichEmbedGenerator.helpEmbed(commandModule, prefix));
			} else
				throw new CommandError(
					`NO_COMMAND_FOUND`,
					`I was Unable to Find the Specified Command: ${args[0]}`,
				);
		} else {
			const botIcon = this.client.user.displayAvatarURL();
			const helpCmdEmbed = new MessageEmbed()
				.setTitle('Medusa Help')
				.setColor('#00dde0')
				.setThumbnail(botIcon)
				.setDescription(
					'See below a basic guide to using Medusa Discord Bot. <:banshee:515429193518153748>\nFor help on a specific command, enter the command followed by help.\nExample:' +
					'``' +
					`${prefix}guardian help` +
					'``',
				)
				.addField(
					`Commands <:Spark:529856678607454218>`,
					'``' + `${prefix}cmds` + '``' + ' lists all commands available to you.',
				)
				.addField(
					`Discord Progression`,
					`Medusa provides a progression system that rewards active members of the Discord.\nUse command ` +
					'``' +
					`${prefix}guardian` +
					'``' +
					` to see your current progress.`,
				)
				.addField(
					`Earning XP`,
					`Medusa ranks all members of this Discord by XP earned.\nMembers earn XP by sending text messages, spending time in voice channels, earning Medals and participating in channel events.`,
				)
				.addField(
					`Earning Ranks <:Legend:515540542830936064>`,
					`After you've earned enough XP you will increase in rank. To see a list of all ranks use command ` +
					'``' +
					`${prefix}ranks` +
					'``',
				)
				.addField(
					`Earning Medals <a:Dredgen:518758666388635669>`,
					`Complete Triumphs and Feats in Destiny 2 to earn Medals and XP in the Discord, show proof of Medals that have been earned in #medals-text and use` +
					'``' +
					`${prefix}medals` +
					'``' +
					` to see all Medals and how to earn them.`,
				);
			await message.channel.send(helpCmdEmbed); // send message
		}
	}
}