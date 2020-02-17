import * as exp from '../ext/experienceHandler';
import { CommandError, CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient, Settings, Utility } from '../ext/index';
// Only Reject Promise if a Real Error Occurs

const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			args = Utility.quotedWords(args.join(' '));
			const user: discord.GuildMember | null = Utility.LookupMember(message.guild, args[0]);
			if (!user) throw new CommandError('NO_USER_FOUND');
			const possibleMedal = args.slice(1).join(' ');
			let myMedal: exp.MedalData | undefined = Settings.lighthouse.medals.find(medal => medal.name.toLowerCase() === possibleMedal.toLowerCase());
			if (!myMedal) {
				const matchMedal = yobboCorrector(possibleMedal.toLowerCase());
				if (matchMedal[1] > 30) {
					const correctionMessage = await message.channel.send(`Did You Mean ${matchMedal[0]}?`);
					await correctionMessage.react(`✅`);
					const filter = (reaction: discord.MessageReaction, user: discord.User) =>
						reaction.emoji.name === `✅` && user.id === message.author.id;
					const collectedReactions = await correctionMessage.awaitReactions(
						filter, {
							max: 1,
							time: 40000
						}
					);
					await correctionMessage.delete();
					if (collectedReactions.size > 0) {
						myMedal = Settings.lighthouse.medals.find(x => x.name === matchMedal[0] as string);
					}
				}
			}
			if (!myMedal) throw new CommandError('NO_MEDAL_FOUND', `Was Unable to Find Medal Matching: ${possibleMedal}.`);
			await exp.revokeMedal(user.id, [myMedal], discordBot.databaseClient);
			await message.channel.send(Embeds.successEmbed(`Successfully Revoked ${myMedal.name}`, `To User ${user.displayName}`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	environments: ['text'],
	expectedArgs: [{ name: 'User Resolvable', optional: false, example: '@User#12345' }, { name: 'Medal Resolvable', optional: false, example: 'pointbreaker' }],
	name: 'revoke',
	description: 'Award selected user a given medal.\nUse ``?medals`` to see awardable Medals.\n**Note - ** Excludes Event Medals.',
	example: 'revoke @User#12345 pointbreaker',
	permissionRequired: 'MANAGE_ROLES'
};

module.exports = {
	help,
	run
} as CommandFile;

function determineUser(message: discord.Message, args: string[]) {
	// See if it is Raw Name of Role
	if (args.length > help.expectedArgs.length) { // its a raw name
		const lookupRole = message.guild!.roles.find(role => role.name.toLowerCase() === args.slice(2).join(' '));
		if (!lookupRole && isNaN(Number(args[2]))) {
			return args[2];
		} else {
			return lookupRole!.id;
		}
	}
	else {
		return Utility.parseUserMentionToId(args[2]);
	}
}

function yobboCorrector(medalString: string) {
	const medalCheck: {
		[index: string]: boolean[];
	} = {};
	for (const listedMedal of Settings.lighthouse.medals) {
		for (let i = 0; i < medalString.length; i++) {
			if (medalString[i].toLowerCase() === listedMedal.name[i] ? listedMedal.name[i].toLowerCase() : undefined) {
				if (Array.isArray(medalCheck[listedMedal.name])) {
					medalCheck[listedMedal.name].push(true);
				} else {
					medalCheck[listedMedal.name] = [true];
				}
			}
		}
	}
	let selection = ['', 0];
	for (const checkedMedal in medalCheck) {
		if (!checkedMedal) continue;
		const percentCheck =
			(medalCheck[checkedMedal].filter(element => element).length /
				checkedMedal.length) *
			100;
		if (selection[1] < percentCheck) {
			selection = [checkedMedal, percentCheck];
		}
	}
	return selection;
}