import { CommandError, CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed

			const voiceChannel = message.member.voice.channel;
			if (!voiceChannel) throw new CommandError('NO_CHANNEL');
			if (voiceChannel.name.substr(0).indexOf('🔒') === -1) throw new CommandError('VOICE_CHANNEL_NOT_LOCKED', 'This Command Requires the Current Voice Channel to Be Unlocked');
			await voiceChannel.lockPermissions();
			await voiceChannel.edit({
				userLimit: voiceChannel.parent ? (voiceChannel.parent.children.first()! as discord.VoiceChannel).userLimit : 0,
				name: `${voiceChannel.name.substr(2)}`
			}, `Channel Unlocked By ${message.member.displayName}`);
			await message.channel.send(Embeds.successEmbed(`Unlocked Channel ${voiceChannel.name}`, `Anyone is Now Free To Join The Channel Within the User Limits`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Unlocks a Currently Locked Voice Channel',
	environments: ['text'],
	example: 'unlock',
	expectedArgs: [],
	name: 'unlock',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
