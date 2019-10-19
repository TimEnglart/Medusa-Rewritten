import { CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient, CommandError } from '../ext/index';
import * as exp from '../ext/experienceHandler';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			if (args.length > 0) {
				const commandModule = discordBot.commands.get(args[0]);
				if (commandModule) {
					let prefix = discordBot.settings.defaultPrefix;
					if (message.guild) {
						const resp = await discordBot.databaseClient.query(`SELECT * FROM G_Prefix WHERE guild_id = ${message.guild.id};`);
						if (resp.length) prefix = resp[0].prefix;
					}
					await message.channel.send(Embeds.helpEmbed(commandModule, prefix));
				} else throw new CommandError(`NO_COMMAND_FOUND`, `I was Unable to Find the Specified Command: ${args[0]}`);
			} else {
				const response = await discordBot.databaseClient.query(`SELECT prefix FROM G_Prefix WHERE guild_id = ${message.guild ? message.guild.id : message.author.id}`);
				const prefix = response.length ? response[0].prefix : discordBot.settings.defaultPrefix;
				const botIcon = discordBot.user.displayAvatarURL();
				const helpCmdEmbed = new discord.MessageEmbed() // make rich embeded discord message.
					.setTitle('Medusa Help')
					.setColor('#00dde0')
					.setThumbnail(botIcon)
					.setDescription('See below a basic guide to using Medusa Discord Bot. <:banshee:515429193518153748>\nFor help on a specific command, enter the command followed by help.\nExample:' + '``' + `${prefix}guardian help` + '``')
					.addField(`Commands <:Spark:529856678607454218>`, '``' + `${prefix}cmds` + '``' + ' lists all commands available to you.')
					.addField(`Discord Progression`, `Medusa provides a progression system that rewards active members of the Discord.\nUse command ` + '``' + `${prefix}guardian` + '``' + ` to see your current progress.`)
					.addField(`Earning XP`, `Medusa ranks all members of this Discord by XP earned.\nMembers earn XP by sending text messages, spending time in voice channels, earning Medals and participating in channel events.`)
					.addField(`Earning Ranks <:Legend:515540542830936064>`, `After you've earned enough XP you will increase in rank. To see a list of all ranks use command ` + '``' + `${prefix}ranks` + '``')
					.addField(`Earning Medals <a:Dredgen:518758666388635669>`, `Complete Triumphs and Feats in Destiny 2 to earn Medals and XP in the Discord, show proof of Medals that have been earned in #medals-text and use` + '``' + `${prefix}medals` + '``' + ` to see all Medals and how to earn them.`);
				await message.channel.send(helpCmdEmbed); // send message
			}
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	environments: ['text', 'dm'],
	expectedArgs: [{ name: 'query', optional: true, example: 'guardian' }],
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	name: 'help',
	description: 'Responds with a guide on how to use the bot, including basic commands.',
	example: 'help',
};

module.exports = {
	help,
	run
} as CommandFile;
