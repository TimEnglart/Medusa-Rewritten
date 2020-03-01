import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";
import CommandHandler from "@extensions/CommandHandler";
import { Message, Collection, TextChannel } from "discord.js";
import { CommandError } from "@extensions/errorParser";
import { Utility } from "@extensions/utility";
import RichEmbedGenerator from "@extensions/RichEmbeds";

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
				me: undefined
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
			const databaseResponse = await this.client.databaseClient.query(
				`SELECT * FROM G_Reaction_Roles WHERE guild_id = ${message.guild.id} AND message_id = ${foundMessage.id} AND channel_id = ${foundMessageChannel.id} AND role_id = ${role.id}`,
			);
			if (!databaseResponse.length) {
				await this.client.databaseClient.query(
					`INSERT INTO G_Reaction_Roles(guild_id, message_id, channel_id, role_id, reaction_name, reaction_id, reaction_animated) VALUES(${message.guild.id}, ${foundMessage.id}, ${foundMessageChannel.id}, ${role.id}, '${emojiInfo.name}', ${emojiInfo.id}, ${emojiInfo.animated})`,
				);
				await foundMessage.react(emojiInfo.id || emojiInfo.name);
				// Update Response Message
				await statusMessage.edit('', RichEmbedGenerator.successEmbed('Successfully Linked Reaction Role to Message', `...`));
			} else {
				// Already in db
				await statusMessage.edit(
					'',
					RichEmbedGenerator.notifyEmbed('Reaction Role Already Linked to Message', `...`),
				);
			}
		} else {
			await statusMessage.edit('', RichEmbedGenerator.errorEmbed('Failed to Find Specified Message', `...`));
			// Failed to Find Message
		}
	}
}