import ExtendedClientCommand, { ICommandResult } from '../ext/CommandTemplate';
import CommandHandler from '../ext/CommandHandler';
import { Message } from "discord.js";
import { CommandError } from '../ext/errorParser';
import { Utility } from '../ext/utility';

export default class AutoRoleCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'autorole';
		this.description = 'Set a role to automatically assigned to all new members.';
		this.environments = ['text'];
		this.expectedArguments = [
			{ name: 'Role Resolvable', optional: false, example: '@Role' }
		];
		this.permissionRequired = 'MANAGE_ROLES';
		this.requiredProperties = {
			Message: {
				author: undefined,
				member: undefined,
				guild: undefined,
			},
			ExtendedClient: {
				user: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !message.member || !message.guild || !this.client.user || !message.guild.me)
			throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
		const roleId = Utility.parseRoleMentionToId(args.join(' '));
		if (!roleId) throw new CommandError('FAILED_ROLE_PARSE');
		const role = message.guild.roles.resolve(roleId);
		if (!role) throw new CommandError('NO_ROLE_FOUND');

		const guildCollection = await this.client.nextDBClient.getCollection('guilds');
		guildCollection.update({ _id: message.guild.id }, { autoRoleId: roleId }, { upsert: true });
		await message.channel.send(`Success!`); // Update For Embed
	}
}