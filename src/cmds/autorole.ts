import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Utility, CommandError } from '../ext/index';

const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
    return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
        try {
            if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
            if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
            if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
            if (!discordBot.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
            if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
            const roleId = Utility.parseRoleMentionToId(args.join(' '));
			if (!roleId) throw new CommandError('FAILED_ROLE_PARSE');
			const role = message.guild.roles.get(roleId);
            if (!role) throw new CommandError('NO_ROLE_FOUND');
            const guildAutoRole = await discordBot.databaseClient.query(
                `SELECT * FROM G_Auto_Role WHERE guild_id = ${message.guild.id}`,
            );
            if (guildAutoRole.length) {
                await discordBot.databaseClient.query(
                    `UPDATE G_Auto_Role SET guild_id = ${message.guild.id}, role_id = ${roleId}`,
                );
            } else {
                await discordBot.databaseClient.query(
                    `INSERT INTO G_Auto_Role(guild_id, role_id) VALUES(${message.guild.id}, ${roleId})`,
                );
			}
			message.channel.send(`Success!`); // Update For Embed
            return resolve();
        } catch (e) {
            return reject(e);
        }
    });
};

const help: CommandHelp = {
    name: 'autorole',
    description: 'Set a role to automatically assigned to all new members.',
    example: 'autorole @Role',
    permissionRequired: 'MANAGE_GUILD', // Change nulls to 'SEND_MESSAGES'
    environments: ['text'],
    expectedArgs: [{ name: 'Role Resolvable', optional: false, example: '@Role' }],
};

module.exports = {
    help,
    run,
} as CommandFile;

function determineRole(message: discord.Message, args: string[]) {
    // See if it is Raw Name of Role
    if (args.length > help.expectedArgs!.length) {
        // its a raw name
        const lookupRole = message.guild!.roles.find(role => role.name.toLowerCase() === args.join(' '));
        if (!lookupRole && isNaN(Number(args[0]))) {
            return args[0];
        } else {
            return lookupRole!.id;
        }
    } else {
        return Utility.parseRoleMentionToId(args[0]);
    }
}
