import { CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author'));
			let stuff = 1;
			let botEmbed = new discord.MessageEmbed().setTitle(`Emojis ;) Pt.${stuff}`);
			for (const [snowflake, emoji] of message.guild!.emojis.entries()) {
				if (botEmbed.fields.length === 25) {
					stuff += 1;
					await message.author!.send(botEmbed);
					botEmbed = new discord.MessageEmbed().setTitle(`Emojis ;) Pt.${stuff}`);
				}
				botEmbed.addField(`${emoji.name} - <${emoji.animated ? 'a' : ''}:${emoji.name}:${snowflake}>`, `\\<${emoji.animated ? 'a' : ''}:${emoji.name}:${snowflake}>`);
			}
			await message.author!.send(botEmbed);
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