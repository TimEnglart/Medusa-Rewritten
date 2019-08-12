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

			const bannedVoiceChannelIds = ['197984269430161408', '386504870695534593'];
			const voiceChannel = message.member.voice.channel;
			if (!voiceChannel) {
				await message.channel.send(Embeds.errorEmbed('You Currently are Not in a Channel', 'Join a Channel To Use This Command'));
				return resolve();
			}
			if (voiceChannel.name.substr(0).indexOf('🔒') > -1) {
				await message.channel.send(Embeds.errorEmbed('Channel is Already Locked', 'Create a New Channel to Unlock.'));
				return resolve();
			}
			if (bannedVoiceChannelIds.includes(voiceChannel.id)) return resolve();
			const members = [];
			let voiceData: discord.OverwriteResolvable[] = [{
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
	usage: 'lock'
};

module.exports = {
	help,
	run
} as CommandFile;
