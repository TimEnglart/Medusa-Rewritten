import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, OverwriteResolvable } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'lock';
		this.description = 'Restricts Joining Permissions to Current Voice Channel to Other Members';
		this.environments = ['text'];
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
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		const bannedVoiceChannelIds = ['197984269430161408', '386504870695534593'];
		const voiceChannel = message.member.voice.channel;
		if (!voiceChannel) throw new CommandError('NO_VOICE_CHANNEL');
		if (voiceChannel.name.substr(0).indexOf('🔒') > -1)
			throw new CommandError(
				'CHANNEL_ALREADY_LOCKED',
				'Channel is Already Locked. Unlock or Lock Another Channel',
			);
		if (bannedVoiceChannelIds.includes(voiceChannel.id)) throw new CommandError('BLACKLISTED_CHANNEL');
		const members = [];
		const voiceData: OverwriteResolvable[] = [
			{
				id: this.client.user.id,
				allow: ['CONNECT'],
				type: 'member',
			},
			{
				id: message.guild.id,
				deny: ['CONNECT'],
				type: 'role',
			},
		];
		for (const [memberId, member] of voiceChannel.members) {
			members.push(member.displayName);
			voiceData.push({
				id: memberId,
				allow: ['CONNECT'],
				type: 'member',
			});
		}
		await voiceChannel.edit(
			{
				permissionOverwrites: voiceData,
				userLimit: 0, // voiceChannel.members.size, locked so no one can join fixes invite
				name: `🔒 ${voiceChannel.name}`,
			},
			`Channel Locked By ${message.member.displayName}`,
		);
		await message.channel.send(
			RichEmbedGenerator.successEmbed(
				`Locked Channel ${voiceChannel.name}`,
				`Current Members (${members.join(
					', ',
				)}) are free to leave and rejoin, while all others are restricted.`,
			),
		);
	}
}