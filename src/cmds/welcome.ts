import { CommandError, CommandFile, CommandHelp, CommandRun, discord, ExtendedClient } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed

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
	expectedArgs: [{ name: 'Text Channel ID', optional: true, example: '341246125412541' }],
	name: 'welcome',
	permissionRequired: 'ADMINISTRATOR', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
