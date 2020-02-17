import { CommandError, CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Utility } from '../ext/index';



const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			const channelId = Utility.parseChannelMentionToId(args[0]) || (message.member.voice.channel !== null ? message.member.voice.channel.id : null);
			if (channelId) {
				const channel = message.guild.channels.get(channelId);
				if (!channel) throw new CommandError('NO_CHANNEL_FOUND');
				const currentTempChannelMasters = await discordBot.databaseClient.query(`SELECT * FROM G_Master_Temp_Channels WHERE guild_id = ${message.guild.id} AND voice_channel_id = ${channelId}`);
				if (currentTempChannelMasters.length) {
					// Already a Temp Channel Master
					await message.reply('Already Temp');
				} else {
					await discordBot.databaseClient.query(`INSERT INTO G_Master_Temp_Channels(guild_id, voice_channel_id) VALUES(${message.guild.id}, ${channelId})`);
					// Added Channel Master
					await message.reply('Added Temp');
				}
			}
			else throw new CommandError('FAILED_CHANNEL_PARSE'); // No Channel Selected
			return resolve();
		} catch (e) {
			return reject(e instanceof CommandError ? e : new CommandError(e.message));
		}
	});
};

const help: CommandHelp = {
	name: 'addtemp',
	description: 'Assigns voicechannel you are in as a Tempory Channel Master.',
	example: 'addtemp',
	permissionRequired: 'MANAGE_CHANNELS',
	environments: ['text'],
	expectedArgs: [{ name: 'Voice Channel Id', optional: true, example: '321314561424' }]
};

module.exports = {
	help,
	run
} as CommandFile;
