import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author')); 	// If Author is Needed
			if (!message.member) return reject(new Error('No Member')); 	// If Member is Needed
			if (!message.guild) return reject(new Error('No Guild')); 		// If Guild is Needed
			if (!discordBot.user) return reject(new Error('No Bot User')); 	// If Bot Instance is Needed

			// Do Shit
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Prints Welcome Messages to Welcome Channel [Hard Coded]',
	environments: ['text'],
	example: 'welcome',
	expectedArgs: [{ name: '', optional: false }],
	name: 'welcome',
	permissionRequired: 'ADMINISTRATOR', // Change nulls to 'SEND_MESSAGES'
	usage: 'welcome'
};

module.exports = {
	help,
	run
} as CommandFile;
