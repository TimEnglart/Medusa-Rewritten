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

			const voiceChannel = message.member.voice.channel;
			if (!voiceChannel) {
				await message.channel.send(Embeds.errorEmbed('You Currently are Not in a Channel', 'Join a Channel To Use This Command'));
				return resolve();
			}
			if (voiceChannel.name.substr(0).indexOf('🔒') === -1) {
				await message.channel.send(Embeds.errorEmbed('Channel isn\'t Locked', 'You Need to Lock a Channel in order to Unlock.'));
				return resolve();
			}
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
	description: '',
	environments: ['text'],
	example: '',
	expectedArgs: [{ name: '', optional: false }],
	name: 'unlock',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	usage: ''
};

module.exports = {
	help,
	run
} as CommandFile;
