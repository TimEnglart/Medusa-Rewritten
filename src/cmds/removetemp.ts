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

			let voiceChannelId = args[0];
			if (!voiceChannelId) {
				if (message.member.voice.channelID) {
					voiceChannelId = message.member.voice.channelID;
				} else {
					await message.channel.send(Embeds.errorEmbed('Description', 'Join a voicechannel or type Channel ID *?removetemp <Channel ID>*'));
					return resolve();
				}
			}
			const tempChannelMaster = await discordBot.databaseClient.query(`SELECT * FROM G_Master_Temp_Channels WHERE guild_id = ${message.guild.id} AND voice_channel_id = ${voiceChannelId}`);
			if (tempChannelMaster.length) {
				await discordBot.databaseClient.query(`DELETE FROM G_Master_Temp_Channels WHERE guild_id = ${message.guild.id} AND voice_channel_id = ${voiceChannelId}`);
				await message.channel.send(Embeds.successEmbed('Successfully Removed Temporary Channel Master', `**Channel Name:** ${message.guild.channels.get(voiceChannelId)!.name}\n**ID:** ${voiceChannelId}`));
			}
			else await message.channel.send(Embeds.errorEmbed('Selected Channel is Currently **NOT** a Temporary Channel Master', `**Channel Name:** ${message.guild.channels.get(voiceChannelId)!.name}\n**ID:** ${voiceChannelId}`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: '',
	environments: ['text'],
	example: '',
	expectedArgs: [{ name: '', optional: false }],
	name: 'removetemp',
	permissionRequired: 'MANAGE_CHANNELS', // Change nulls to 'SEND_MESSAGES'
	usage: ''
};

module.exports = {
	help,
	run
} as CommandFile;
