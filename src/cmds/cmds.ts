import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from '../ext/CommandHandler';
import { Message, PermissionString, MessageEmbed } from "discord.js";
import { CommandError } from '../ext/errorParser';
import RichEmbedGenerator from '../ext/RichEmbeds';

export default class AwardCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'cmds';
		this.description =
            'Provides details on all commands available to you.';
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
		if (!message.author || !this.client.user)
			throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		const guildCollection = await this.client.nextDBClient.getCollection('guilds');
		const guildPrefix = await guildCollection.findOne({
			_id: message.guild ? message.guild.id : message.author.id,
		});
		const prefix = guildPrefix.prefix || this.client.settings.defaultPrefix;
		const botEmbed = new MessageEmbed()
			.setTitle('List of Commands')
			.setColor('#00dde0')
			.setThumbnail(this.client.user.displayAvatarURL())
			.setDescription(`Admin Permissions Required. **\\⚠️**\nVersion: ${this.client.settings.version}`);
		for (const [name, commandFile] of this.client.commandHandler.Commands) {
			if (name === this.name) continue; // Don't Show This Command
			if (this.permissionRequired !== 'SEND_MESSAGES')
				if (message.guild && message.member && message.member.id)
					if (!message.member.hasPermission(this.permissionRequired as PermissionString)) continue;
			botEmbed.addFields({
				name: `${prefix}${name} ${this.permissionRequired !== 'SEND_MESSAGES' ? '\\⚠️' : ''}`,
				value: `Desc - ${this.description}\nUsage - ${RichEmbedGenerator.generateUsage(commandFile, prefix)}`,
				inline: false,
			});
		}
		await message.channel.send(botEmbed);
	}
}