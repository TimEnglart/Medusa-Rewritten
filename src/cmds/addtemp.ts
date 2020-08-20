import ExtendedClientCommand, { ICommandResult } from '../ext/CommandTemplate';
import CommandHandler from '../ext/CommandHandler';
import { Message, VoiceChannel } from "discord.js";
import { CommandError } from '../ext/errorParser';
import { Utility } from '../ext/utility';


export default class AddTemporaryChannelCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'addtemp';
		this.description = 'Makes Current Voice Channel or Provided Voice Channel a Temporary Channel Master';
		this.executorPermissionRequired = 'MANAGE_CHANNELS';
		this.clientPermissionsRequired = ['MANAGE_CHANNELS', 'MOVE_MEMBERS', 'CONNECT'];
		this.environments = ['text'];
		this.expectedArguments = [{ name: 'Voice Channel ID', optional: true, example: '321314561424' }];
		this.requiredProperties = {
			Message: {
				author: undefined,
				guild: undefined,
				member: undefined
			},
			ExtendedClient: {
				user: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		const channelId = Utility.parseChannelMentionToId(args[0]) || message.member.voice.channel?.id;
		if (channelId) {
			const channel = message.guild.channels.resolve(channelId) as VoiceChannel;
			
			if (!channel) throw new CommandError('NO_CHANNEL_FOUND');
			if (channel.type !== 'voice') throw new CommandError('INVALID_CHANNEL', 'Use This Command in a Voice Channel or Provide A Voice Channel with the Command');
			
			if(this.client.TempChannelHandler.isTempChannel(channel)) throw new CommandError('ALREADY_TEMP_CHANNEL', `The Supplied Channel: ${channel.name} is a Temporary Channel`);
			if(this.client.TempChannelHandler.isMasterTempChannel(channel)) throw new CommandError('ALREADY_TEMP_CHANNEL_MASTER', `The Supplied Channel: ${channel.name} is Already a Temporary Channel Master`);
			
			await this.client.TempChannelHandler.AddMasterTempChannel(channel);
		} else throw new CommandError('FAILED_CHANNEL_PARSE'); // No Channel Selected
	}
}