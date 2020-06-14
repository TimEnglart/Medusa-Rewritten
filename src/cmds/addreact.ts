import ExtendedClientCommand, { ICommandResult } from '../ext/CommandTemplate';
import CommandHandler from "../ext/CommandHandler";
import { Message, Collection, TextChannel } from "discord.js";
import { CommandError } from '../ext/errorParser';
import { Utility } from '../ext/utility';
import RichEmbedGenerator from '../ext/RichEmbeds';


export default class DisableCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'addreact';
		this.description = 'Adds a Self Assignable Role on a Message by Using Reactions';
		this.environments = ['text'];
		this.expectedArguments = [
			{ name: 'Message Resolvable', optional: false, example: '31267345614' },
			{ name: 'Emoji Resolvable', optional: false, example: ':smile:' },
			{ name: 'Role Resolvable', optional: false, example: '@Role' },
		];
		this.permissionRequired = 'MANAGE_ROLES';
		this.requiredProperties = {
			Message: {
				author: undefined,
				member: undefined,
				guild: undefined
			},
			ExtendedClient: {
				user: undefined,
				
			}
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !message.member || !message.guild || !this.client.user || !message.guild.me)
			throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
		const emojiInfo = Utility.parseEmojiMentionToObject(args[1]);
		if (!emojiInfo) throw new CommandError('FAILED_EMOJI_PARSE');
		const roleId = Utility.parseRoleMentionToId(args.slice(2).join(' '));
		if (!roleId) throw new CommandError('FAILED_ROLE_PARSE');
		const role = message.guild.roles.resolve(roleId);
		if (!role) throw new CommandError('NO_ROLE_FOUND');
		if (
			(role.position >= message.member.roles.highest.position ||
                            role.position >= message.guild.me.roles.highest.position)
		)
			throw new CommandError('INSUFFICIENT_PRIVILEGES');
		const statusMessage = await message.channel.send('Attempting To Find Message....');
		const textChannels = message.guild.channels.cache.filter(
			(guildChannel) => guildChannel.type === 'text',
		) as Collection<string, TextChannel>;
		let foundMessageChannel: TextChannel | undefined;
		let foundMessage: Message | undefined;
		for (const [channelId, channel] of textChannels) {
			try {
				const messageLookup = await channel.messages.fetch(args[0]);
				if (messageLookup) {
					foundMessage = messageLookup;
					foundMessageChannel = channel;
					break;
				}
			} catch (e) {
				continue;
				// message was not found in channel
			}
		}
		if (foundMessageChannel && foundMessage) {
			const emoji = message.guild.emojis.resolve(emojiInfo.id || emojiInfo.name);
			if (!emoji) return;
			if (this.client.ReactionRoleHandler.SetupReactionRole(foundMessage, role, emoji)) 
				await statusMessage.edit('', RichEmbedGenerator.successEmbed('Successfully Linked Reaction Role to Message', `...`));
			else
				await statusMessage.edit('', RichEmbedGenerator.notifyEmbed('Reaction Role Already Linked to Message', `...`));
		} else {
			await statusMessage.edit('', RichEmbedGenerator.errorEmbed('Failed to Find Specified Message', `...`));
			// Failed to Find Message
		}
	}
}