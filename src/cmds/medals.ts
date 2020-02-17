
import * as expHandler from '../ext/experienceHandler';
import { CommandError, CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			const categorisedMedals = expHandler.categoriseMedals();
			for (const [medalCategory, medals] of Object.entries(categorisedMedals)) {
				if (medalCategory === 'Locked') continue;
				const embed = new discord.MessageEmbed()
					.setTitle(`${medalCategory} Medals`);
				for (const medal of medals) {
					embed.addField(`${medal.name} ${medal.emoji}`, `${medal.description}\n**${medal.xp} XP**`);
				}
				await message.author.send(embed);
			}
			await message.channel.send(Embeds.notifyEmbed(`Prove your Worth Guardian <:Legend:518606062195310629>`, `List of ${message.guild} Medals has been sent, best of luck on your hunt!`));

			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Displays all Possible Medals that can/could be awarded',
	environments: ['text', 'dm'],
	example: '',
	expectedArgs: [],
	name: 'medals',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
