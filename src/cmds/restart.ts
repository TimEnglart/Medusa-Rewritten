import { CommandError, CommandFile, CommandHelp, CommandRun, discord, ExtendedClient } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed

			if (discordBot.settings.superUsers.includes(message.author.id)) {
				await message.channel.send('Restarting :)');
				process.exit(+args[0] || 0);
			}
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: '',
	environments: ['text', 'dm'],
	example: '',
	expectedArgs: [{ name: 'Error Code', optional: true, example: '1' }],
	hidden: true,
	name: 'restart',
	permissionRequired: 'ADMINISTRATOR', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
