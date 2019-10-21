import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds, CommandError } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			message.channel.stopTyping();
			
			const initialTimeStamp = new Date();
			const registerEmbed = new discord.MessageEmbed()
				.setURL(`https://medusabot.tk/initialize.php?did=${message.author.id}`)
				.setTitle('Link Your Destiny Account to Your Lighthouse Progression')
				.setColor('#1E90FF')
				.setFooter('Medusa', discordBot.user.displayAvatarURL())
				.addField('Enhance Your Guardian Progression', `Completing this Registration Will Add Additional Features and Integrations Between Destiny and The Lighthouse Discord Server\n\n[Click Here To Register](https://medusabot.tk/initialize.php?did=${message.author.id})`);
			const registerMsg = await message.author.send(registerEmbed);
			registerMsg.channel.startTyping();
			let hasRegistered = false;
			let timePassed = 0;
			while (!hasRegistered && timePassed < 1200) {
				await new Promise(completeTimeout =>
					setTimeout(() => {
						return completeTimeout();
					}, 5000)
				);
				timePassed += 5;
				const dbQuery = await discordBot.databaseClient.query(`SELECT * FROM U_Bungie_Account WHERE user_id = ${message.author.id}`);
				if (dbQuery && dbQuery[0]) {
					if (new Date(dbQuery[0].time_added) > initialTimeStamp) {
					hasRegistered = true;
					await registerMsg.delete();
					await message.author.send(Embeds.successEmbed('Sign Up Successful', 'Nothing More For You To Do :)'));
					return resolve();
					}
				}
			}
			throw new CommandError('REGISTRATION_TIMEOUT', 'Reuse the `register` Command to Attempt to Sign Up Again');
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Link Discord Account to Bungie Account For Guild So In Game Progression Can Be Tracked',
	environments: ['text', 'dm'],
	example: 'register',
	expectedArgs: [],
	name: 'register',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
