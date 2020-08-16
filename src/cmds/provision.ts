import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, TextChannel } from "discord.js";
import { CommandError } from "../ext/errorParser";

export default class Provision extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'provision';
		this.description = 'Goes through all Database Relient Information that was changed while offline';
		this.environments = ['text'];
		this.expectedArguments = [];
		this.permissionRequired = 'ADMINISTRATOR';
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
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		// Because This bot has more downtime than uptime lmao

		// Give Roles to People Who Have Reacted While Bot is Offline
		
		for (const reactionRoleStruct of this.client.ReactionRoleHandler.reactionRoles.values()) {
			const guild = this.client.guilds.resolve(reactionRoleStruct.guildId),
				channel = guild?.channels.resolve(reactionRoleStruct.channelId) as TextChannel | null,
				message = channel?.messages.resolve(reactionRoleStruct.messageId),
				reactions = message?.reactions.resolve(reactionRoleStruct.reactionId || reactionRoleStruct.reactionName),
				reactedUsers = await reactions?.users.fetch();
			
			if (reactedUsers)
				for (const user of reactedUsers.values()) {
					const member = guild?.member(user);
					if (member && !member.roles.cache.has(reactionRoleStruct.roleId)) {
						this.log(`Assigning Role (${reactionRoleStruct.roleId}) to: ${user.username}(${user.id})`, 1);
						await member.roles.add(reactionRoleStruct.roleId);
					}	
				}
			else this.log(`Failed to Get Message Reaction Users\nGuild: ${reactionRoleStruct.guildId}\nChannel: ${reactionRoleStruct.channelId}\nMessage: ${reactionRoleStruct.messageId}`, 2);
		}




	}
}