import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient } from '../ext/index';
import * as exp from '../ext/experienceHandler'
// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author')); 	// If Author is Needed
			if (!message.member) return reject(new Error('No Member')); 	// If Member is Needed
			if (!message.guild) return reject(new Error('No Guild')); 		// If Guild is Needed
			if (!discordBot.user) return reject(new Error('No Bot User')); 	// If Bot Instance is Needed


			const statusMessage = await message.channel.send(`Currently Checking Medals`) as discord.Message;
			const awardedMedals = await exp.checkAllMedals(message.member, discordBot.databaseClient, true);
			await exp.giveMedal(message.member.id, awardedMedals, discordBot.databaseClient);
			awardedMedals.length ? statusMessage.edit(`Successfully Added Medals:\n- ${awardedMedals.map(x => x.name).join('\n- ')}`) : statusMessage.edit(`No New Medals Awarded`);
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
	name: 'giveme',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	usage: ''
};

module.exports = {
	help,
	run
} as CommandFile;
