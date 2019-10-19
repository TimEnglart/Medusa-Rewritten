import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds, CommandError } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			let voiceChannelId = args[0];
			if (!voiceChannelId) {
				if (message.member.voice.channelID) voiceChannelId = message.member.voice.channelID;
				else throw new CommandError('NO_VOICE_CHANNEL', 'Not in Voice Channel or No Voice Channel ID Provided');
			}
			const tempChannelMaster = await discordBot.databaseClient.query(`SELECT * FROM G_Master_Temp_Channels WHERE guild_id = ${message.guild.id} AND voice_channel_id = ${voiceChannelId}`);
			if (tempChannelMaster.length) {
				await discordBot.databaseClient.query(`DELETE FROM G_Master_Temp_Channels WHERE guild_id = ${message.guild.id} AND voice_channel_id = ${voiceChannelId}`);
				await message.channel.send(Embeds.successEmbed('Successfully Removed Temporary Channel Master', `**Channel Name:** ${message.guild.channels.get(voiceChannelId)!.name}\n**ID:** ${voiceChannelId}`));
			}
			else throw new CommandError('DATABASE_ENTRY_NOT_FOUND');
			// else await message.channel.send(Embeds.errorEmbed('Selected Channel is Currently **NOT** a Temporary Channel Master', `**Channel Name:** ${message.guild.channels.get(voiceChannelId)!.name}\n**ID:** ${voiceChannelId}`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Remove an Existing Temporary Channel Master So No Temp Channels are Created Based on That Channel',
	environments: ['text'],
	example: 'removetemp 3213123131',
	expectedArgs: [{ name: 'Channel Id', optional: false, example: '31263512635413' }],
	name: 'removetemp',
	permissionRequired: 'MANAGE_CHANNELS', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
