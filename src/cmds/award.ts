import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Utility, Embeds, Settings } from '../ext/index';
import * as exp from '../ext/experienceHandler'
// Only Reject Promise if a Real Error Occurs

const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			args = Utility.quotedWords(args.join(' '));
			const user: discord.GuildMember | null = Utility.LookupMember(message.guild, args[0]);
			if (!user) {
				await message.channel.send(Embeds.errorEmbed('Error Locating User', `I was unable to find the user ${args[0]} in the Server`));
				return resolve();
			}
			const possibleMedal = args.slice(1).join(' ');
			let myMedal: exp.MedalData | undefined = Settings.lighthouse.medals.find(medal => medal.name.toLowerCase() === possibleMedal.toLowerCase());
			if (!myMedal) {
				const matchMedal = yobboCorrector(possibleMedal.toLowerCase());
				if (matchMedal.correctness > 30) {
					const correctionMessage = await message.channel.send(
						`Did You Mean ${matchMedal.name}?`
					);
					await correctionMessage.react(`✅`);
					const filter = (reaction: discord.MessageReaction, user: discord.User) =>
						reaction.emoji.name === `✅` && user.id === message.author!.id;
					const collectedReactions = await correctionMessage.awaitReactions(
						filter, {
							max: 1,
							time: 40000
						}
					);
					await correctionMessage.delete();
					if (collectedReactions.size > 0) {
						myMedal = Settings.lighthouse.medals.find(x => x.name === matchMedal.name);
					}
				}
			}
			if (!myMedal) {
				await message.channel.send(Embeds.errorEmbed(`${possibleMedal}`, `Was not found in the Medal List.`));
				return resolve();
			}
			await exp.giveMedal(user.id, [myMedal], discordBot.databaseClient);
			await message.channel.send(Embeds.successEmbed(`Successfully Awarded ${myMedal.name}`, `To User ${user.displayName}`));
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	environments: ['text'],
	expectedArgs: [{ name: 'User Resolvable', optional: false, example: '@User#12345' }, { name: 'Medal Resolvable', optional: false, example: 'pointbreaker' }],
	name: 'award',
	description: 'Award selected user a given medal.\nUse ``?medals`` to see awardable Medals.\n**Note - ** Excludes Event Medals.',
	example: 'award @User#12345 pointbreaker',
	permissionRequired: 'MANAGE_ROLES'
};

module.exports = {
	help,
	run
} as CommandFile;

function determineUser(message: discord.Message, args: string[]) {
	// See if it is Raw Name of Role
	if (args.length > help.expectedArgs!.length) { // its a raw name
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
			if (medalString[i] === listedMedal.name[i] ? listedMedal.name[i].toLowerCase() : undefined) {
				if (Array.isArray(medalCheck[listedMedal.name])) {
					medalCheck[listedMedal.name].push(true);
				} else {
					medalCheck[listedMedal.name] = [true];
				}
			}
		}
	}
	let selection = {
		name: '',
		correctness: 0
	};
	for (const checkedMedal in medalCheck) {
		if (!checkedMedal) continue;
		const percentCheck =
			(medalCheck[checkedMedal].filter(element => element).length /
				checkedMedal.length) *
			100;
		if (selection.correctness < percentCheck) {
			selection = { name: checkedMedal, correctness: percentCheck };
		}
	}
	return selection;
}