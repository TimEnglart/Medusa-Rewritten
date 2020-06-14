import ExtendedClient from "./ExtendedClient";
import { MessageReaction, User, Message, Role, Emoji, EmojiResolvable, GuildEmoji, ReactionEmoji, PartialUser } from "discord.js";
import { UpsertResult } from "mariadb";
import { CommandError } from "./errorParser";
import { IReactionRoleResponse } from "./DatabaseInterfaces";
import { LogFilter } from "./logger";
import { Collection } from "mongodb";

interface ReactionRoleRequiredAttrs {
	guildId: string;
	messageId: string;
	channelId: string;
	reactionId: string | null;
	reactionName: string;
}
type ReactionRoleAttrs = ReactionRoleRequiredAttrs & { reactionAnimated: boolean; roleId: string };
export default class ReactionRoleHandler {
	public readonly reactionRoles: Map<ReactionRoleRequiredAttrs, ReactionRoleAttrs>;
	constructor(private readonly client: ExtendedClient) {
		this.reactionRoles = new Map();
	}
	public async OnReactionAdd(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
		if (!messageReaction.message.guild) return; // Roles Only Assignable In Guilds
		const collection = await this.getRoleReactionCollection();
		for await (const row of collection.find<ReactionRoleAttrs>({
			guildId: messageReaction.message.guild.id,
			reactionId: messageReaction.emoji.id,
			reactionName: messageReaction.emoji.name,
			channelId: messageReaction.message.channel.id,
			messageId: messageReaction.message.id,
		})) {
			if (row) {
				// Assign Role Based on React
				const member = await messageReaction.message.guild.members.fetch(user.id);
				await member.roles.add(row.roleId, 'Linked React Button');
				this.client.logger.logS(
					`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${messageReaction.emoji.name}(${messageReaction.emoji.id})`,
					LogFilter.Debug,
				);
				member.roles.add(row.roleId);
			}
		}
	}

	public async OnReactionRemove(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
		if (!messageReaction.message.guild) return; // Roles Only Assignable In Guilds
		const collection = await this.getRoleReactionCollection();
		for await (const row of collection.find<ReactionRoleAttrs>({
			guildId: messageReaction.message.guild.id,
			reactionId: messageReaction.emoji.id,
			reactionName: messageReaction.emoji.name,
			channelId: messageReaction.message.channel.id,
			messageId: messageReaction.message.id,
		})) {
			if (row) {
				// Assign Role Based on React
				const member = await messageReaction.message.guild.members.fetch(user.id);
				await member.roles.remove(row.roleId, 'Linked React Button');
				this.client.logger.logS(
					`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${messageReaction.emoji.name}(${messageReaction.emoji.id})`,
					LogFilter.Debug,
				);
				member.roles.remove(row.roleId);
			}
		}
		
	}
	private async getRoleReactionCollection(): Promise<Collection<ReactionRoleAttrs>> {
		return await this.client.nextDBClient.getCollection('roleReactions');
	}
	public async GetRemoteReactionRoles(): Promise<void> {
		const remoteReactionRoles = await this.getRoleReactionCollection();
		for await (const reactionRole of remoteReactionRoles.find()) {
			const key = reactionRole;
			delete key.reactionAnimated;
			delete key.roleId;
			this.reactionRoles.set(key, reactionRole);
		}
	}
	public async SetupReactionRole(message: Message, role: Role, emoji: Emoji): Promise<boolean> {
		if (!message.guild) throw new CommandError('NO_GUILD');
		const query = {
				guildId: message.guild.id,
				messageId: message.id,
				channelId: message.channel.id,
				reactionId: emoji.id,
				reactionName: emoji.name,
			},
			update = {
				guildId: message.guild.id,
				messageId: message.id,
				channelId: message.channel.id,
				reactionId: emoji.id,
				reactionName: emoji.name,
				reactionAnimated: emoji.animated,
				roleId: role.id,
			};
		if (this.reactionRoles.get(query)) return false;
		this.reactionRoles.set(query, update);
		const roleReactions = await this.getRoleReactionCollection();
		await roleReactions.updateOne(query, { $set: update }, { upsert: true });
		await message.react(emoji.id || emoji.name);
		return true;
	}
	public async RemoveReactionRole(message: Message, emoji: Emoji): Promise<void> {
		if (!message.guild) throw new CommandError('NO_GUILD');
		const roleReactions = await this.getRoleReactionCollection();
		const key = {
			guildId: message.guild.id,
			messageId: message.id,
			channelId: message.channel.id,
			reactionId: emoji.id,
			reactionName: emoji.name,
		};
		if (this.reactionRoles.delete(key)) {
			await roleReactions.deleteOne(key);
			const reaction = message.reactions.resolve(emoji.id || emoji.name);
			if (reaction) await reaction.remove();
		}
		
	}
} 