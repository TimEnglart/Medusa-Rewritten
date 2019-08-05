

module.exports.help = {

	permissionRequired: null
}
import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds, Settings } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author')); 	// If Author is Needed
			if (!message.member) return reject(new Error('No Member')); 	// If Member is Needed
			if (!discordBot.user) return reject(new Error('No Bot User')); 	// If Bot Instance is Needed

			const guildIcon = message.guild ? message.guild.iconURL() || '' : '';
			const ranksEmbed = new discord.MessageEmbed()
				.setTitle(`${message.guild} Ranks`)
				.setColor('#ffae00')
				.setThumbnail(guildIcon);
			for (let i = 0; i < Settings.lighthouse.medals.length; i++) {
				ranksEmbed.addField(`${i} ${Settings.lighthouse.medals[i].name}`, `${Settings.lighthouse.medals[i].emoji}`);
			}
			await message.author.send(ranksEmbed);
			await message.channel.send(Embeds.notifyEmbed(`Prove your Worth Guardian ${Settings.lighthouse.medals[Settings.lighthouse.medals.length - 1].emoji}`, `List of ${message.guild} Ranks has been sent, best of luck on your hunt!`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	environments: ['text', 'dm'],
	expectedArgs: [],
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	name: "ranks",
	usage: "To see names and order of current obtainable ranks.",
	description: "Responds with a list of all current Ranks via direct message.",
	example: "``?ranks``",
};

module.exports = {
	help,
	run
} as CommandFile;
