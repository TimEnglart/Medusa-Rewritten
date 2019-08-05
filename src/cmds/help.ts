import { CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient } from '../ext/index';
import * as exp from '../ext/experienceHandler';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (args.length > 0) {
				const commandModule = discordBot.commands.get(args[0]);
				if (commandModule && !commandModule.help.permissionRequired) {
					await message.channel.send(Embeds.helpEmbed(commandModule));
				} else {
					await message.channel.send(Embeds.errorEmbed('Unable to Find Command', `I was Unable to Find the Specified Command: ${args[0]}`));
				}
			} else {
				const response = await discordBot.databaseClient.query(`SELECT prefix FROM G_Prefix WHERE guild_id = ${message.guild ? message.guild.id : message.author!.id}`);
				const prefix = response.length ? response[0].prefix : discordBot.settings.defaultPrefix;
				const botIcon = discordBot.user!.displayAvatarURL();
				const helpCmdEmbed = new discord.MessageEmbed() // make rich embeded discord message.
					.setTitle('Medusa Help')
					.setColor('#00dde0')
					.setThumbnail(botIcon)
					.setDescription('See below a basic guide to using Medusa Discord Bot. <:banshee:515429193518153748>\nFor help on a specific command, enter the command followed by help.\nExample:' + '``' + `${prefix}guardian help` + '``')
					.addField(`Commands <:Spark:529856678607454218>`, '``' + `${prefix}cmds` + '``' + ' lists all commands available to you.')
					.addField(`Discord Progression`, `Medusa provides a progression system that rewards active members of the Discord.\nUse command ` + '``' + `${prefix}guardian` + '``' + ` to see your current progress.`)
					.addField(`Earning XP`, `Medusa ranks all members of this Discord by XP earned.\nMembers earn XP by sending text messages, spending time in voice channels, earning Medals and participating in channel events.`)
					.addField(`Earning Ranks <:Legend:515540542830936064>`, `After you've earn't enough XP you will increase in rank. To see a list of all ranks use command ` + '``' + `${prefix}ranks` + '``')
					.addField(`Earning Medals <a:Dredgen:518758666388635669>`, `Complete Triumphs and Feats in Destiny 2 to earn Medals and XP in the Discord, show proof of Medals earnt in #medals-text and use` + '``' + `${prefix}medals` + '``' + ` to see all Medals and how to earn them.`);
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
	expectedArgs: [{ name: '', optional: false }],
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	name: 'help',
	usage: 'To assist with teaching new users of the bot.',
	description: 'Responds with a guide on how to use the bot, including basic commands.',
	example: '``?help``',
};

module.exports = {
	help,
	run
} as CommandFile;
