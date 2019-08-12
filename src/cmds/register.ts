import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author'));
			const initialTimeStamp = new Date();
			const registerEmbed = new discord.MessageEmbed()
				.setURL(`https://medusabot.tk/initialize.php?did=${message.author.id}`)
				.setTitle('Link Your Destiny Account to Your Lighthouse Progression')
				.setColor('#1E90FF')
				.setFooter('Medusa', discordBot.user!.displayAvatarURL())
				.addField('Enhance Your Guardian Progression', 'Completing this Registration Will Add Additional Features and Integrations Between Destiny and The Lighthouse Discord Server\n\n[Click Here To Register](https://medusabot.tk/initialize.php?did=${message.author.id})');
			const registerMsg = await message.author.send(registerEmbed) as discord.Message;
			let hasRegistered = false;
			let timePassed = 0;
			while (!hasRegistered && timePassed < 1200) {
				await new Promise(resolve =>
					setTimeout(() => {
						return resolve();
					}, 5000)
				);
				timePassed += 5;
				const dbQuery = await discordBot.databaseClient.query(`SELECT * FROM U_Bungie_Account WHERE user_id = ${message.author.id}`);
				if (dbQuery && new Date(dbQuery[0].time_added) > initialTimeStamp) {
					hasRegistered = true;
					await registerMsg.delete();
					await message.author.send(Embeds.successEmbed('Sign Up Successful', 'Nothing More For You To Do :)'));
					return resolve();
				}
			}
			await registerMsg.edit(Embeds.errorEmbed('Registration Request Timed Out', 'Reuse the `register` Command to Attempt to Sign Up Again'));
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
	expectedArgs: [{ name: '', optional: false }],
	name: 'register',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	usage: ''
};

module.exports = {
	help,
	run
} as CommandFile;
