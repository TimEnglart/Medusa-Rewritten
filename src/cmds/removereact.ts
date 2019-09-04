import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Utility, Embeds } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author')); 	// If Author is Needed
			if (!message.member) return reject(new Error('No Member')); 	// If Member is Needed
			if (!message.guild) return reject(new Error('No Guild')); 		// If Guild is Needed
			if (!discordBot.user) return reject(new Error('No Bot User')); 	// If Bot Instance is Needed

			if (!args.length) return;
			const messageId = args[0];
			const roleResolvable = args[1];

			const role = Utility.LookupRole(message.guild, roleResolvable);

			if (!role) {
				await message.channel.send(Embeds.errorEmbed('No Role Found', 'Couldn\'t Find That Role in The Lighthouse'));
				return resolve();
			}
			else {
				try {
					if ((role.position >= message.member.roles.highest.position || role.position >= message.guild.me!.roles.highest.position) && !message.guild.me!.hasPermission('ADMINISTRATOR')) {
						await message.channel.send(Embeds.errorEmbed('Description', 'Your Rank is Too Low or I Will Not be able to Assign this Role'));
						return resolve();
					}
				} catch (e) {
					await message.channel.send(Embeds.errorEmbed('Incorrect Usage', `Use \`help ${help.name}\` Command`));
					return resolve();
				}
				const response = await discordBot.databaseClient.query(`SELECT * FROM G_Reaction_Roles WHERE guild_id = ${message.guild.id} AND message_id = ${messageId} AND role_id = ${role.id}`);
				if (!response.length) {
					await message.channel.send(Embeds.errorEmbed('No Reaction Found', 'The Given Message Doesn\'t have a registered Reaction Role'));
					return resolve();
				}
				const statusMessage = await message.channel.send(`Removing Reaction For ${role.name} From the Selected Message`) as discord.Message;
				const findMessage = message.guild.channels.get(response[0].channel_id) as discord.TextChannel;
				if (!findMessage) {
					await message.channel.send(Embeds.errorEmbed('No Reaction Found', 'The Given Message Doesn\'t have a registered Reaction Role'));
					return resolve();
				}
				const reactionMessage = await findMessage.messages.fetch(messageId);
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
