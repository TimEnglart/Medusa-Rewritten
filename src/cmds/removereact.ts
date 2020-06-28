import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, TextChannel } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { Utility } from "../ext/utility";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'removereact';
		this.description = 'Remove an Existing Reaction Role Assigner From a Message';
		this.environments = ['text'];
		this.expectedArguments = [
			{ name: 'Message Id', optional: false, example: '62135126421' },
			{ name: 'Role Resolvable', optional: false, example: '@Role' },
		];
		this.permissionRequired = 'MANAGE_ROLES';
		this.requiredProperties = {
			Message: {
				author: undefined,
				member: undefined,
				guild: {
					me: undefined
				},
			},
			ExtendedClient: {
				user: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user || !message.member || !message.guild || !message.guild.me) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
		const messageId = args[0];
		const roleResolvable = args.slice(1).join(' ');
		
		const role = Utility.LookupRole(message.guild, roleResolvable);

		if (!role) throw new CommandError('NO_ROLE_FOUND');
		else {
			if (
				(role.position >= message.member.roles.highest.position ||
                        role.position >= message.guild.me.roles.highest.position) &&
                    !message.guild.me.hasPermission('ADMINISTRATOR')
			)
				throw new CommandError('INSUFFICIENT_PRIVILEGES');
			
			
			const response = this.client.ReactionRoleHandler.get({
				guildId: message.guild.id,
				messageId: messageId,
				roleId: role.id
			});
			if (!response)
				throw new CommandError('DATABASE_ENTRY_NOT_FOUND', 'Reaction Role Not Linked to Provided Role');
			const statusMessage = await message.channel.send(
				`Removing Reaction For ${role.name} From the Selected Message`,
			);
			const channelLookup = message.guild.channels.resolve(response.channelId) as TextChannel;
			if (!channelLookup) throw new CommandError('NO_CHANNEL_FOUND');
			const reactionMessage = await channelLookup.messages.fetch(messageId);
			if (!reactionMessage) throw new CommandError('NO_MESSAGE_FOUND');
			const emoji = this.client.emojis.resolve(response.reactionId || response.reactionName);
			if(!emoji) throw new CommandError('NO_EMOJI_FOUND');

			await this.client.ReactionRoleHandler.RemoveReactionRole(reactionMessage, emoji);
			await statusMessage.edit(
				'',
				RichEmbedGenerator.successEmbed(
					'Role Reaction Successfully Removed From Message',
					`Reaction: ${emoji}`,
				),
			);
		}
	}
}