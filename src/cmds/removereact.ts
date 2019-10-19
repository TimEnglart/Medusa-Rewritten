import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Utility, Embeds, CommandError } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
			const messageId = args[0];
			const roleResolvable = args.slice(1).join(' ');

			const role = Utility.LookupRole(message.guild, roleResolvable);

			if (!role) throw new CommandError('NO_ROLE_FOUND');
			else {
				if ((role.position >= message.member.roles.highest.position || role.position >= message.guild.me!.roles.highest.position) && !message.guild.me!.hasPermission('ADMINISTRATOR')) throw new CommandError('INSUFFICIENT_PRIVILEGES');
				const response = await discordBot.databaseClient.query(`SELECT * FROM G_Reaction_Roles WHERE guild_id = ${message.guild.id} AND message_id = ${messageId} AND role_id = ${role.id}`);
				if (!response.length) throw new CommandError('DATABASE_ENTRY_NOT_FOUND', 'Reaction Role Not Linked to Provided Role');
				const statusMessage = await message.channel.send(`Removing Reaction For ${role.name} From the Selected Message`);
				const channelLookup = message.guild.channels.get(response[0].channel_id) as discord.TextChannel;
				if (!channelLookup) throw new CommandError('NO_CHANNEL_FOUND');
				const reactionMessage = await channelLookup.messages.fetch(messageId);
				if (!reactionMessage) throw new CommandError('NO_MESSAGE_FOUND');
				reactionMessage.reactions.remove(response[0].reaction_id === null ? response[0].reaction_name : discordBot.emojis.get(response[0].reaction_id));
				await discordBot.databaseClient.query(`DELETE FROM G_Reaction_Roles WHERE guild_id = ${message.guild.id} AND message_id = ${messageId} AND role_id = ${role.id}`);
				await statusMessage.edit('', Embeds.successEmbed('Role Reaction Successfully Removed From Message', `Reaction: ${response[0].reaction_id === null ? response[0].reaction_name : discordBot.emojis.get(response[0].reaction_id)}`));
				return resolve();
			}
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Remove an Existing Reaction Role Assigner From a Message',
	environments: ['text'],
	example: 'removereact 3612736712367 @admin',
	expectedArgs: [{ name: 'Message Id', optional: false, example: '62135126421' }, { name: 'Role Resolvable', optional: false, example: '@Role' }],
	name: 'removereact',
	permissionRequired: 'MANAGE_ROLES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
