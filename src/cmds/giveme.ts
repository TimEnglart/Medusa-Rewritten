import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Utility } from '../ext/index';
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

			let subject = message.member;
			if (args.length) subject = Utility.LookupMember(message.guild, args.join(' ')) || message.member;
			const statusMessage = await message.channel.send(`Currently Checking Medals for ${subject.displayName}`);
			const awardedMedals = await exp.checkAllMedals(subject, discordBot.databaseClient, true);
			await exp.giveMedal(subject.id, awardedMedals, discordBot.databaseClient);
			await statusMessage.edit(awardedMedals.length ? `Successfully Added Medals for ${subject.displayName}:\n- ${awardedMedals.map(x => x.name).join('\n- ')}` : `No New Medals Awarded for ${subject.displayName}`);
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Gives In Game Acquired Medals for Guild Progression',
	environments: ['text'],
	example: 'giveme',
	expectedArgs: [],
	name: 'giveme',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
