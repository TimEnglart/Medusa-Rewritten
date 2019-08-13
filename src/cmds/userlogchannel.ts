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

			const userLogChannel = Utility.LookupChannel(message, args[0]);
			if (!userLogChannel) {
				await message.channel.send(Embeds.errorEmbed('Invalid Channel', 'Invalid Channel Resolvable Provided'));
				return resolve();
			}
			const actualChannel = message.guild.channels.get(userLogChannel.id);
			if (actualChannel) {
				const select = await discordBot.databaseClient.query(`SELECT * FROM G_Event_Log_Channel WHERE guild_id = ${message.guild.id} AND text_channel_id = ${userLogChannel.id}`);
				if (select.length) await discordBot.databaseClient.query(`UPDATE G_Event_Log_Channel SET text_channel_id = ${userLogChannel.id} WHERE guild_id = ${message.guild.id}`);
				else await discordBot.databaseClient.query(`INSERT INTO G_Prefix (guild_id, text_channel_id) VALUES (${message.guild.id}, ${userLogChannel.id})`);
				await message.channel.send(Embeds.successEmbed('User Log Channel Updated', `${message.guild.channels.get(userLogChannel.id)}`));
			}
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Sets a Text Channel Where Guild Events are Sent',
	environments: ['text'],
	example: 'userlogchannel 72136712313',
	expectedArgs: [{ name: 'Channel Id', optional: true, example: '4126456125411' }],
	name: 'userlogchannel',
	permissionRequired: 'MANAGE_GUILD', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
