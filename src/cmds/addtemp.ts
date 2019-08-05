import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient } from '../ext/index';



const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			const channelId = args[0] || (message.member!.voice.channel !== null ? message.member!.voice.channel.id : null);
			if (channelId) {
				const currentTempChannelMasters = await discordBot.databaseClient.query(`SELECT * FROM G_Master_Temp_Channels WHERE guild_id = ${message.guild!.id} AND voice_channel_id = ${args[0]}`);
				if (currentTempChannelMasters.length) {
					// Already a Temp Channel Master
					await message.reply('Already Temp');
				} else {
					await discordBot.databaseClient.query(`INSERT INTO G_Master_Temp_Channels(guild_id, voice_channel_id) VALUES(${message.guild!.id}, ${args[0]})`);
					// Added Channel Master
					await message.reply('Added Temp');
				}
			}
			else {
				// No Channel Selected
				await message.reply('no');
			}
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	name: 'addtemp',
	usage: 'While in a voicechannel use ``?addtemp`` *or* ``?addtemp <Channel ID>``.',
	description: 'Assigns voicechannel you are in as a Tempory Channel Master.',
	example: '?addtemp <Channel ID>',
	permissionRequired: 'MANAGE_CHANNELS',
	environments: ['text'],
	expectedArgs: [{ name: 'Voice Channel Id', optional: true }]
};

module.exports = {
	help,
	run
} as CommandFile;
