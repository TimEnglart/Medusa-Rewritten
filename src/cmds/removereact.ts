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
		if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
		const messageId = args[0];
		const roleResolvable = args.slice(1).join(' ');

		const role = Utility.LookupRole(message.guild, roleResolvable);

		if (!role) throw new CommandError('NO_ROLE_FOUND');
		else {
			if (
				(role.position >= message.member.roles.highest.position ||
                        role.position >= message.guild.me!.roles.highest.position) &&
                    !message.guild.me!.hasPermission('ADMINISTRATOR')
			)
				throw new CommandError('INSUFFICIENT_PRIVILEGES');
			const response = await this.client.databaseClient.query(
				`SELECT * FROM G_Reaction_Roles WHERE guild_id = ${message.guild.id} AND message_id = ${messageId} AND role_id = ${role.id}`,
			);
			if (!response.length)
				throw new CommandError('DATABASE_ENTRY_NOT_FOUND', 'Reaction Role Not Linked to Provided Role');
			const statusMessage = await message.channel.send(
				`Removing Reaction For ${role.name} From the Selected Message`,
			);
			const channelLookup = message.guild.channels.resolve(response[0].channel_id) as TextChannel;
			if (!channelLookup) throw new CommandError('NO_CHANNEL_FOUND');
			const reactionMessage = await channelLookup.messages.fetch(messageId);
			if (!reactionMessage) throw new CommandError('NO_MESSAGE_FOUND');
			reactionMessage.reactions.remove(
				response[0].reaction_id === null
					? response[0].reaction_name
					: this.client.emojis.resolve(response[0].reaction_id),
			);
			await this.client.databaseClient.query(
				`DELETE FROM G_Reaction_Roles WHERE guild_id = ${message.guild.id} AND message_id = ${messageId} AND role_id = ${role.id}`,
			);
			await statusMessage.edit(
				'',
				RichEmbedGenerator.successEmbed(
					'Role Reaction Successfully Removed From Message',
					`Reaction: ${
						response[0].reaction_id === null
							? response[0].reaction_name
							: this.client.emojis.resolve(response[0].reaction_id)
					}`,
				),
			);
		}
	}
}