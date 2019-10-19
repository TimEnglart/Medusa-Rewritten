import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds, CommandError } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed

			const bannedVoiceChannelIds = ['197984269430161408', '386504870695534593'];
			const voiceChannel = message.member.voice.channel;
			if (!voiceChannel) throw new CommandError('NO_VOICE_CHANNEL');
			if (voiceChannel.name.substr(0).indexOf('🔒') > -1) throw new CommandError('CHANNEL_ALREADY_LOCKED', 'Channel is Already Locked. Unlock or Lock Another Channel');
			if (bannedVoiceChannelIds.includes(voiceChannel.id)) throw new CommandError('BLACKLISTED_CHANNEL');
			const members = [];
			const voiceData: discord.OverwriteResolvable[] = [{
				id: discordBot.user.id,
				allow: ['CONNECT'],
				type: 'member'
			},
			{
				id: message.guild.id,
				deny: ['CONNECT'],
				type: 'role'
			}
			];
			for (const [memberId, member] of voiceChannel.members) {
				members.push(member.displayName);
				voiceData.push({
					id: memberId,
					allow: ['CONNECT'],
					type: 'member'
				});
			}
			await voiceChannel.edit({
				permissionOverwrites: voiceData,
				userLimit: 0, //voiceChannel.members.size, locked so no one can join fixes invite
				name: `🔒 ${voiceChannel.name}`
			},
				`Channel Locked By ${message.member.displayName}`
			);
			await message.channel.send(Embeds.successEmbed(`Locked Channel ${voiceChannel.name}`, `Current Members (${members.join(', ')}) are free to leave and rejoin, while all others are restricted.`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Restricts Joining Permissions to Current Voice Channel to Other Members',
	environments: ['text'],
	example: 'lock',
	expectedArgs: [],
	name: 'lock',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
