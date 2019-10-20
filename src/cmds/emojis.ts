import { CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient, CommandError } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			let stuff = 1;
			let botEmbed = new discord.MessageEmbed().setTitle(`Emojis ;) Pt.${stuff}`);
			for (const [snowflake, emoji] of message.guild!.emojis.entries()) {
				if (botEmbed.fields.length === 25) {
					await message.author.send(botEmbed);
					botEmbed = new discord.MessageEmbed().setTitle(`Emojis ;) Pt.${++stuff}`);
				}
				botEmbed.addField(`${emoji.name} - <${emoji.animated ? 'a' : ''}:${emoji.name}:${snowflake}>`, `\\<${emoji.animated ? 'a' : ''}:${emoji.name}:${snowflake}>`);
			}
			await message.author.send(botEmbed);
			await message.channel.send(Embeds.notifyEmbed(`List of ${message.guild} Custom Emojis has been sent`, `Useful tool for bot development.`));
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
	name: 'emojis',
	description: 'Sends a list of all Discord servers custom emojis via direct message.',
	example: 'emojis',
};

module.exports = {
	help,
	run
} as CommandFile;