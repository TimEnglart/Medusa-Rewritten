import ExtendedClient from "./ExtendedClient";
import { MessageReaction, User, Message, Role, Emoji, EmojiResolvable, GuildEmoji, ReactionEmoji, PartialUser, TextChannel, GuildMember } from "discord.js";
import { CommandError } from "./errorParser";
import { LogFilter } from "./logger";
import { Collection } from "mongodb";
import { prototype } from "events";

export interface ReactionRoleRequiredAttrs {
	guildId: string;
	messageId: string;
	channelId: string;
	reactionId: string | null;
	reactionName: string;
}
// Optimize This Later
export type ReactionRoleAttrs = ReactionRoleRequiredAttrs & { reactionAnimated: boolean; roleId: string };
export default class ReactionRoleHandler {
	public readonly reactionRoles: Map<ReactionRoleRequiredAttrs, ReactionRoleAttrs>;
	constructor(private readonly client: ExtendedClient) {
		this.reactionRoles = new Map();
	}
	public async OnReactionAdd(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
		if (!messageReaction.message.guild) return; // Roles Only Assignable In Guilds

		const reactionRole = this.reactionRoles.get({
			guildId: messageReaction.message.guild.id,
			reactionId: messageReaction.emoji.id,
			reactionName: messageReaction.emoji.name,
			channelId: messageReaction.message.channel.id,
			messageId: messageReaction.message.id,
		});
		if (reactionRole) {
			// Assign Role Based on React
			const member = await messageReaction.message.guild.members.fetch(user.id);
			await member.roles.add(reactionRole.roleId, 'Linked React Button');
			this.client.logger.logS(
				`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${messageReaction.emoji.name}(${messageReaction.emoji.id})`,
				LogFilter.Debug,
			);
			member.roles.add(reactionRole.roleId);
		}
	}

	public async OnReactionRemove(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
		if (!messageReaction.message.guild) return; // Roles Only Assignable In Guilds

		const reactionRole = this.reactionRoles.get({
			guildId: messageReaction.message.guild.id,
			reactionId: messageReaction.emoji.id,
			reactionName: messageReaction.emoji.name,
			channelId: messageReaction.message.channel.id,
			messageId: messageReaction.message.id,
		});
		if (reactionRole) {
			// Assign Role Based on React
			const member = await messageReaction.message.guild.members.fetch(user.id);
			await member.roles.remove(reactionRole.roleId, 'Linked React Button');
			this.client.logger.logS(
				`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${messageReaction.emoji.name}(${messageReaction.emoji.id})`,
				LogFilter.Debug,
			);
			member.roles.remove(reactionRole.roleId);
		}
	}
	private async getRoleReactionCollection(): Promise<Collection<ReactionRoleAttrs>> {
		return await this.client.nextDBClient.getCollection('roleReactions');
	}
	public async GetRemoteReactionRoles(): Promise<Map<ReactionRoleRequiredAttrs, ReactionRoleAttrs>> {
		const remoteReactionRoles = await this.getRoleReactionCollection();
		for await (const reactionRole of remoteReactionRoles.find()) {
			this.reactionRoles.set({
				reactionId: reactionRole.reactionId,
				reactionName: reactionRole.reactionName,
				guildId: reactionRole.guildId,
				messageId: reactionRole.messageId,
				channelId: reactionRole.channelId
			}, reactionRole);
		}
		return this.reactionRoles;
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
			const reaction = await message.reactions.resolve(emoji.id || emoji.name)?.fetch();
			if (reaction) await reaction.remove();
		}
		
	}

	public get(filter: { // hack atm
		roleId: string;
		guildId: string;
		messageId: string;
	}): ReactionRoleRequiredAttrs | undefined {
		for (const [key, val] of this.reactionRoles.entries()) {
			if (val.roleId === filter.roleId && val.guildId === filter.guildId && val.messageId === filter.messageId) return key;
		}
	}

	*[Symbol.iterator](): Generator<ReactionRoleAttrs> {
		for(const [, value] of this.reactionRoles)
			yield value;
	}

	public find(filter: (value: ReactionRoleAttrs) => boolean): ReactionRoleAttrs[] {
		const results: ReactionRoleAttrs[] = [];
		for(const attr of this)
			if (filter(attr))
				results.push(attr);
		
		return results;
	}

	public async assignMissingRoles(): Promise<void> {
		const reactionObj: {[guildId: string]: {[roleId: string]: string[]}} = {};

		for (const reactionRoleStruct of this.reactionRoles.values()) {
			const reactionResolvable = reactionRoleStruct.reactionId || reactionRoleStruct.reactionName;
			const guild = this.client.guilds.resolve(reactionRoleStruct.guildId),
				channel = guild?.channels.resolve(reactionRoleStruct.channelId) as TextChannel | null,
				rMessage = channel?.messages.resolve(reactionRoleStruct.messageId),
				reactions = await rMessage?.reactions.resolve(reactionResolvable)?.fetch(),
				reactedUsers = await reactions?.users.fetch();

			if(reactedUsers && guild)
			{
				if (!reactionObj[reactionRoleStruct.guildId]) reactionObj[reactionRoleStruct.guildId] = {};
				if (!reactionObj[reactionRoleStruct.guildId][reactionRoleStruct.roleId]) reactionObj[reactionRoleStruct.guildId][reactionRoleStruct.roleId] = [];
				reactionObj[reactionRoleStruct.guildId][reactionRoleStruct.roleId].push(...reactedUsers.keys());
			}	
		}
		for (const [guildId, userArray] of Object.entries(reactionObj)) {
			const guild = this.client.guilds.resolve(guildId);
			if (guild) {
				const roles = await guild.roles.fetch(),
					members = await guild.members.fetch();
				for (const [roleId, role] of roles.cache) {
					if (!userArray[roleId]) continue;
					for (const [memberId, member] of members) {
						if (member.roles.cache.has(roleId) && !userArray[roleId].includes(memberId)) {
							member.roles.remove(role);
							this.client.logger.log(`Removing Role (${roleId}) from: ${member.user.username}(${member.id})`, 1);
						}

						if (!member.roles.cache.has(roleId) && userArray[roleId].includes(memberId)) {
							member.roles.add(role);
							this.client.logger.log(`Giving Role (${roleId}) to: ${member.user.username}(${member.id})`, 1);
						}

					}
				}
			}

		}
		
	}
	
} 