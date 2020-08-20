import ExtendedClientCommand, { ICommandResult } from '../ext/CommandTemplate';
import CommandHandler from "../ext/CommandHandler";
import { Message, Collection, TextChannel } from "discord.js";
import { CommandError } from '../ext/errorParser';
import { Utility } from '../ext/utility';
import RichEmbedGenerator from '../ext/RichEmbeds';


export default class AddReactionCommand extends ExtendedClientCommand {
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
		this.executorPermissionRequired = 'MANAGE_ROLES';
		this.clientPermissionsRequired = ['MANAGE_ROLES', 'ADD_REACTIONS'];
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

		if (Utility.isRoleElevation(message.guild.me, role, this.clientPermissionsRequired) || Utility.isRoleElevation(message.member, role, this.clientPermissionsRequired))
			throw new CommandError('INSUFFICIENT_PRIVILEGES');
		
		
		const statusMessage = await message.channel.send('Attempting To Find Message....');
		const textChannels = message.guild.channels.cache.filter(guildChannel => guildChannel.type === 'text') as Collection<string, TextChannel>;


		for (const [, channel] of textChannels) {
			try {
				const messageLookup = await channel.messages.fetch(args[0], true);
				if (messageLookup) {
					const emoji = message.guild.emojis.resolve(emojiInfo.id || emojiInfo.name);
					if (!emoji) throw new CommandError('NO_EMOJI_FOUND');
					
					if (this.client.ReactionRoleHandler.SetupReactionRole(messageLookup, role, emoji))
						await statusMessage.edit('', RichEmbedGenerator.successEmbed('Successfully Linked Reaction Role to Message', `...`));
					else
						await statusMessage.edit('', RichEmbedGenerator.notifyEmbed('Reaction Role Already Linked to Message', `...`));
					return;
				}
			} catch (e) {
				// message was not found in channel
				if(e instanceof CommandError) throw e; // Throw any Command Errors
				continue;
			}
		}
		await statusMessage.edit('', RichEmbedGenerator.errorEmbed('Failed to Find Specified Message', `...`));
	}
}