import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class SetLogChannel extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'unlock';
		this.description = 'Unlocks a Currently Locked Voice Channel';
		this.environments = ['text'];
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
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		const voiceChannel = message.member.voice.channel;
		if (!voiceChannel) throw new CommandError('NO_CHANNEL');
		if (voiceChannel.name.substr(0).indexOf('🔒') === -1)
			throw new CommandError(
				'VOICE_CHANNEL_NOT_LOCKED',
				'This Command Requires the Current Voice Channel to Be Unlocked',
			);
		await voiceChannel.lockPermissions();
		await message.channel.send(
			RichEmbedGenerator.successEmbed(
				`Unlocked Channel ${voiceChannel.name}`,
				`Anyone is Now Free To Join The Channel Within the User Limits`,
			),
		);
	}
}