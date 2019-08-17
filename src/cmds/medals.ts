
import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds } from '../ext/index';
import * as expHandler from '../ext/experienceHandler';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author')); 	// If Author is Needed
			if (!message.member) return reject(new Error('No Member')); 	// If Member is Needed
			if (!message.guild) return reject(new Error('No Guild')); 		// If Guild is Needed
			if (!discordBot.user) return reject(new Error('No Bot User')); 	// If Bot Instance is Needed
			
			const theBoi = [];
			const categorisedMedals = expHandler.categoriseMedals();
			for (const [key, value] of Object.entries(categorisedMedals)) {
				if (key === 'Locked') continue;
				const embed = new discord.MessageEmbed()
				.setTitle(`${key} Medals`);
				for(const medal of value) {
					embed.addField(`${medal.name} ${medal.emoji}`, `${medal.description}\n**${medal.xp} XP**`);
				}
				theBoi.push(embed);
			}
		for(const boi of theBoi){
			message.author.send(boi);
		}
		message.channel.send(Embeds.notifyEmbed(`Prove your Worth Guardian <:Legend:518606062195310629>`, `List of ${message.guild} Medals has been sent, best of luck on your hunt!`));
		
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'yeet',
	environments: ['text', 'dm'],
	example: 'fuck you',
	expectedArgs: [],
	name: 'medals',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
