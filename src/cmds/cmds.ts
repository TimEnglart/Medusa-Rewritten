import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds, CommandError } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			const resolvedId = message.guild ? message.guild.id : message.author.id;
			const response = await discordBot.databaseClient.query(`SELECT prefix FROM G_Prefix WHERE guild_id = ${resolvedId}`);
			const prefix = response ? response[0].prefix : discordBot.settings.defaultPrefix;
			const botEmbed = new discord.MessageEmbed()
				.setTitle('List of Commands')
				.setColor('#00dde0')
				.setThumbnail(discordBot.user.displayAvatarURL())
				.setDescription(`Admin Permissions Required. **\\⚠️**\nVersion: ${discordBot.settings.version}`);
			for (const [name, commandFile] of discordBot.commands.filter(command => command.help.name !== 'cmds')) {
				if (commandFile.help.permissionRequired === 'SEND_MESSAGES' || (message.guild && message.member!.hasPermission(commandFile.help.permissionRequired))) {
					botEmbed.addField(`${prefix}${name} ${commandFile.help.permissionRequired !== 'SEND_MESSAGES' ? '\\⚠️' : ''}`, `Desc - ${commandFile.help.description}\nUsage - ${Embeds.generateUsage(module.exports, prefix)}`);
				}
			}
			await message.channel.send(botEmbed);
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Provides details on all commands available to you.',
	environments: ['text', 'dm'],
	example: 'cmds',
	expectedArgs: [],
	name: 'cmds',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;
