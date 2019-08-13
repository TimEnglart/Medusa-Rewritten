import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Embeds } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			const resolvedId = message.guild ? message.guild.id : message.author ? message.author.id : null;
			if (!resolvedId) return;
			const response = await discordBot.databaseClient.query(`SELECT prefix FROM G_Prefix WHERE guild_id = ${resolvedId}`);
			const prefix = response ? response[0].prefix : discordBot.settings.defaultPrefix;
			const botEmbed = new discord.MessageEmbed()
				.setTitle('List of Commands')
				.setColor('#00dde0')
				.setThumbnail(discordBot.user!.displayAvatarURL())
				.setDescription(`Admin Permissions Required. **\\⚠️**\nVersion: ${discordBot.settings.version}`);
			for (const [name, commandf] of discordBot.commands.filter(command => command.help.name !== 'cmds')) {
				if (commandf.help.permissionRequired === 'SEND_MESSAGES' || (message.guild && message.member!.hasPermission(commandf.help.permissionRequired))) {
					botEmbed.addField(`${prefix}${name} ${commandf.help.permissionRequired !== 'SEND_MESSAGES' ? '\\⚠️' : ''}`, `Desc - ${commandf.help.description}\nUsage - ${Embeds.generateUsage(module.exports, prefix)}`);
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
