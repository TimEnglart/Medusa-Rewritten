import ExtendedClient from "./ExtendedClient";
import { MessageReaction, User, Message, Role, Emoji, EmojiResolvable, GuildEmoji, ReactionEmoji, PartialUser } from "discord.js";
import { UpsertResult } from "mariadb";
import { CommandError } from "./errorParser";
import { IReactionRoleResponse } from "./DatabaseInterfaces";
import { LogFilter } from "./logger";

export default class ReactionRoleHandler {
	constructor(private readonly client: ExtendedClient) {}
	public async OnReactionAdd(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
		if (!messageReaction.message.guild) return; // Roles Only Assignable In Guilds
		const member = await messageReaction.message.guild.members.fetch(user.id);
		if (!member) return; // Unable To Find Member
		const role = await this.ReactionRole(
			messageReaction.message.guild.id,
			messageReaction.emoji,
			messageReaction.message.channel.id,
			messageReaction.message.id,
		);
		if (role) {
			// Assign Role Based on React
			const member = await messageReaction.message.guild.members.fetch(user.id);
			await member.roles.add(role, 'Linked React Button');
			this.client.logger.logS(
				`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${messageReaction.emoji.name}(${messageReaction.emoji.id})`,
				LogFilter.Debug,
			);
			member.roles.add(role);
		}
		
	}

	public async OnReactionRemove(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
		if (!messageReaction.message.guild) return; // Roles Only Assignable In Guilds
		const member = await messageReaction.message.guild.members.fetch(user.id);
		if (!member) return; // Unable To Find Member
		const role = await this.ReactionRole(
			messageReaction.message.guild.id,
			messageReaction.emoji,
			messageReaction.message.channel.id,
			messageReaction.message.id,
		);
		if (role) {
			// Assign Role Based on React
			const member = await messageReaction.message.guild.members.fetch(user.id);
			await member.roles.remove(role, 'Linked React Button');
			this.client.logger.logS(
				`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${messageReaction.emoji.name}(${messageReaction.emoji.id})`,
				LogFilter.Debug,
			);
			member.roles.remove(role);
		}
	}
	public async SetupReactionRole(message: Message, role: Role, emoji: Emoji): Promise<void> {
		if (!message.guild) throw new CommandError('NO_GUILD');
		const result = await this.client.databaseClient.query<UpsertResult>(
			`INSERT IGNORE INTO G_Reaction_Roles(guild_id, message_id, channel_id, role_id, reaction_name, reaction_id, reaction_animated) VALUES(${message.guild.id}, ${message.id}, ${message.channel.id}, ${role.id}, '${emoji.name}', ${emoji.id}, ${emoji.animated})`,
		);
		if (result.length && result[0].affectedRows === 0)
			throw new CommandError('DATABASE_ENTRY_NOT_FOUND');
		await message.react(emoji.id || emoji.name);
	}
	public async RemoveReactionRole(message: Message, role: Role, emoji: Emoji): Promise<void> {
		if (!message.guild) throw new CommandError('NO_GUILD');
		const result = await this.client.databaseClient.query<UpsertResult>(
			`DELETE IGNORE INTO G_Reaction_Roles(guild_id, message_id, channel_id, role_id, reaction_name, reaction_id, reaction_animated) VALUES(${message.guild.id}, ${message.id}, ${message.channel.id}, ${role.id}, '${emoji.name}', ${emoji.id}, ${emoji.animated})`,
		);
		if (result.length && result[0].affectedRows === 0)
			throw new CommandError('DATABASE_ENTRY_NOT_FOUND');
		const reaction = message.reactions.resolve(emoji.id || emoji.name);
		if (reaction) await reaction.remove();
	}
	private async ReactionRole(guildId: string, emoji: GuildEmoji | ReactionEmoji, channelId: string, messageId: string): Promise<string | undefined> {
		const response = await this.client.databaseClient.query<IReactionRoleResponse>(
			`SELECT role_id FROM G_Reaction_Roles WHERE guild_id = ${guildId} AND channel_id = ${channelId} AND message_id = ${messageId} AND reaction_id ${
				emoji.id ? `=` : `IS`
			} ${emoji.id} AND reaction_name = '${emoji.name}'`
		);
		return response.length > 0 ? response[0].role_id : undefined;
	}
} 