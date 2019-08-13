import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author')); 	// If Author is Needed
			if (!message.member) return reject(new Error('No Member')); 	// If Member is Needed
			if (!message.guild) return reject(new Error('No Guild')); 		// If Guild is Needed
			if (!discordBot.user) return reject(new Error('No Bot User')); 	// If Bot Instance is Needed

			const select = await discordBot.databaseClient.query(`SELECT * FROM G_Prefix WHERE guild_id = ${message.guild.id}`);
			if (select.length) await discordBot.databaseClient.query(`UPDATE G_Prefix SET prefix = \'${args[0]}\' WHERE guild_id = ${message.guild.id}`);
			else await discordBot.databaseClient.query(`INSERT INTO G_Prefix (guild_id, prefix) VALUES (${message.guild.id}, \'${args[0]}\')`);
			await message.channel.send(Embeds.successEmbed('Prefix Updated', `Set to ${args[0]}`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Sets the Guilds Bot Command Prfix',
	environments: ['text'],
	example: 'setprefix *',
	expectedArgs: [{ name: 'prefix', optional: false, example: '*' }],
	name: 'setprefix',
	permissionRequired: 'ADMINISTRATOR', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
