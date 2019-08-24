import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, LogFilter, MyRequester, Embeds } from '../ext/index';
import * as d2b from '../ext/discordToBungie';
import { ScoreBook, IActivityDetails, IPostGameCarnageReport } from '../ext/score-book';
// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted

const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	const requester = new MyRequester({
		hostname: 'www.bungie.net',
		port: 443,
		path: '',
		method: 'GET',
		headers: {
			'X-API-Key': discordBot.settings.bungie.apikey
		},
		doNotFollowRedirect: false,
		responseType: 'JSON'
	});

	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			if (!message.author) return reject(new Error('No Author')); 	// If Author is Needed	// If Guild is Needed
			if (!discordBot.user) return reject(new Error('No Bot User')); 	// If Bot Instance is Needed
			let activityId = null;
			if (message.guild) try { await message.delete(); } catch (e) { }
			if (args.length) {
				const bungieSiteRegex = /https:\/\/www.bungie.net\/en\/PGCR\/(\d+)(\?character=(\d+))?/; //data[1] = ActivityId, data[3] = CharacterId
				const regex = args[0].match(bungieSiteRegex);
				if (regex && regex.length > 1) activityId = regex[1];
				else if (args.length === 1) activityId = args[0];
				else {
					//Blue
				}
			}
			else {
				const destinyData = await discordBot.databaseClient.query(`SELECT b.user_id, d.bungie_id, d.destiny_id, d.membership_id FROM U_Bungie_Account as b JOIN U_Destiny_Profile as d ON d.bungie_id = b.bungie_id WHERE user_id = ${message.author.id}`);
				if (!destinyData.length) {
					await message.author.send('Your Not in The Lighthouse Database.\nYou Can use The `register` to enable usage of this command\nYou Can Manually Input Your Nightfall Using a Bungie.Net Link:\nExample:https://www.bungie.net/en/PGCR/<activityId>/\n<activityId>');
					return resolve();
				}
				const destinyProfiles = await d2b.DestinyPlayer.lookup({
					membershipId: destinyData[0].destiny_id,
					membershipType: destinyData[0].membership_id
				});
				if (destinyProfiles.length !== 1) {
					await message.author.send('An Error Has Occurred During the Player Lookup Process. This has been logged');
					discordBot.logger.logClient.log(`Multiple Destiny Accounts Have Been Found on the Credentials\nDestiny Id: ${destinyData[0].destiny_id}\nMembership Type: ${destinyData[0].membership_id}`, LogFilter.Error);
					return resolve();
				}
				const destinyProfile = destinyProfiles[0];
				let mostRecentNightfall: INightfallSubmission | undefined;
				for (const characterId of destinyProfile.parsedData.profile.data.characterIds) {
					const charactersLastNightfall = await requester.request({ path: `/Platform/Destiny2/${destinyProfile.parsedData.profile.data.userInfo.membershipType}/Account/${destinyProfile.parsedData.profile.data.userInfo.membershipId}/Character/${characterId}/Stats/Activities/?mode=46&count=1` });
					for (const activity of charactersLastNightfall.Response.activities) {
						const timeCompleted = new Date(activity.period);
						if (!mostRecentNightfall || (mostRecentNightfall && mostRecentNightfall.completed && mostRecentNightfall.completed > timeCompleted)) {
							mostRecentNightfall = {
								completed: timeCompleted,
								nightfallData: activity
							};
						}
					}
				}
				if (!mostRecentNightfall) {
					await message.author.send('Unable to Find Most Recent Nightfall. This has been logged');
					discordBot.logger.logClient.log(`No Nighfalls Found: ${JSON.stringify(mostRecentNightfall)}`, LogFilter.Error);
					return resolve();
				}
				// console.log(JSON.stringify(mostRecentNightfall));
				activityId = mostRecentNightfall.nightfallData.activityDetails.instanceId;
				// destinyProfile.
			}
			// console.log(activityId);
			if (!activityId) {
				await message.author.send('No Activity Id Has been Found. This has been logged');
				discordBot.logger.logClient.log(`No Activity Id Found`, LogFilter.Error);
				return resolve();
			}
			const scoreBook = new ScoreBook(discordBot);
			const pgcr = await scoreBook.getPostGameCarnageReport(activityId);

			const lastReset = scoreBook.lastReset;
			const nightfallDate = new Date(pgcr.Response.period);
			const diffDays = Math.floor(Math.abs((lastReset.getTime() - nightfallDate.getTime()) / (24 * 60 * 60 * 1000))); // was round instead of floor
			if (diffDays >= 7) {
				await message.author.send(new discord.MessageEmbed()
					.setTitle('This Nightfall is Over a Week Old')
					.setColor('#FFA500')
					.addField(
						'This Nightfall Was Completed:',
						`**${nightfallDate.toLocaleString()}**\n\u200B`
					)
					.addField(
						'Nightfalls This Week Must Be Completed After:',
						`**${lastReset.toLocaleString()}**`
					));
				return resolve();
			}
			if (pgcr.Response.entries[0].values.completed.basic.value === 0) {
				await message.author.send(new discord.MessageEmbed()
					.setTitle('This Nightfall is Incomplete')
					.setColor('#FFA500')
					.addField(
						'The Submitted Nightfall was Incomplete!',
						`This May Be due to a Player Disconnecting before the nightfall was completed\n\nIf you believe this is an error contact <@125522120129118208>\nReference ID: ${activityId}`
					));
				return resolve();
			}
			const entityDef: d2b.BungieResponse<IActivityDefinition> = await requester.request({ path: `/Platform/Destiny2/Manifest/${'DestinyActivityDefinition'}/${pgcr.Response.activityDetails.referenceId}/` })
			if (!entityDef) {
				await message.author.send('Failed to Find Entity Definition. This has been logged');
				return resolve();
			}
			let embed = new discord.MessageEmbed()
				.setTitle(`Nightfall to Submit`)
				.setDescription(
					`**${entityDef.Response.displayProperties.name} - ${
					pgcr.Response.entries[0].values.activityDurationSeconds.basic.displayValue
					} \nTotal Score: ${
					pgcr.Response.entries[0].values.teamScore.basic.displayValue
					}** `
				)
				.setThumbnail(`http://www.bungie.net${entityDef.Response.pgcrImage}`)
				.setColor('#00FF00')
				.setFooter(
					`Activity ID: ${
					pgcr.Response.activityDetails.instanceId
					} | via Medusa | ${
					entityDef.Response.originalDisplayProperties.name
					} on ${entityDef.Response.selectionScreenDisplayProperties.name}`,
					'https://warmind.io/img/blizzard_logo.png'
				)
				.setTimestamp(new Date(pgcr.Response.period))
				.setAuthor('✅ to Submit | ❌ to Decline Submission');
			for (const entry of pgcr.Response.entries) {
				embed.addField(
					`${entry.player.destinyPlayerInfo.displayName} ${
					entry.player.lightLevel
					}`,
					`K: **${entry.values.kills.basic.displayValue}** D: **${
					entry.values.deaths.basic.displayValue
					}** A: **${
					entry.values.assists.basic.displayValue
					}**\nK/D: **${
					entry.values.killsDeathsRatio.basic.displayValue
					}**`,
					true
				);
			}
			const pendingMessage = await message.author.send(embed);
			await pendingMessage.react('✅');
			await pendingMessage.react('❌');
			const filter = (reaction: discord.MessageReaction, user: discord.User) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === message.author!.id;
			const reactionCollection = await pendingMessage.awaitReactions(filter, { max: 1, time: 60000 });
			if (reactionCollection.size) {
				const messageReaction = reactionCollection.get('✅');
				if (messageReaction) { // Accepted
					const count = (await discordBot.databaseClient.query(`SELECT COUNT(*) FROM SB_Submissions`))[0].COUNT;
					const selectQuery = await discordBot.databaseClient.query(`SELECT * FROM SB_Submissions WHERE pgcr_id = ${activityId}`);
					if (!selectQuery) {
						await discordBot.databaseClient.query(`INSERT INTO SB_Submissions (pgcr_id, score, time, date_completed) VALUES (${activityId}, ${pgcr.Response.entries[0].values.teamScore.basic.value}, ${pgcr.Response.entries[0].values.activityDurationSeconds.basic.value}, ${ScoreBook.dateToMySql(new Date(pgcr.Response.period))})`);
						await message.author.send(
							Embeds
								.successEmbed(
									'NightFall Successfully Submitted',
									`Strike: ${
									entityDef.Response.selectionScreenDisplayProperties.name
									}\nPlayers: ${pgcr.Response.entries.map(entry => entry.player.destinyPlayerInfo.displayName).join(', ')}\nScore: ${
									pgcr.Response.entries[0].values.teamScore.basic.value
									}\nTime: ${
									pgcr.Response.entries[0].values.activityDurationSeconds.basic.displayValue
									}`
								)
								.setFooter(
									`${(+count) + 1} Submission(s)`
								)
						);
					}
					else {
						// tslint:disable-next-line: no-floating-promises
						message.author.send('This Nightfall Has Already Been Submitted').then(newMsg => newMsg.delete({ timeout: 20000 }));
					}
				}
				else {
					// tslint:disable-next-line: no-floating-promises
					message.author.send('Nightfall Has Not Been Submitted').then(responseMsg => responseMsg.delete({ timeout: 20000 }));
				}
			}
			// tslint:disable-next-line: no-floating-promises
			pendingMessage.delete({ timeout: 20000 });
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Locates a Users Most Recent Nightfall and User Chooses Whether to Submit it as a Score Book Run',
	environments: ['text', 'dm'],
	example: '',
	expectedArgs: [{ name: 'Bungie PGCR Link | ActivityID', optional: true, example: ' https://www.bungie.net/en/PGCR/4156451264/  | submit 4156451264' }],
	name: 'submit',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;


interface INightfallSubmission {
	nightfallData: { activityDetails: IActivityDetails } & IActivityValues;
	completed: Date;
}
interface IActivityValues {
	values: {
		[key: string]: {
			statId: string;
			basic: {
				value: number;
				displayValue: string;
			}
		}
	};
}

interface IActivityDefinition {
	displayProperties: {
		description: string; //The Fanatic has returned. Take him down and finish the job you started.;
		name: string; //Nightfall: The Hollowed Lair;
		icon: string; ///common/destiny2_content/icons/f2154b781b36b19760efcb23695c66fe.png;
		hasIcon: boolean
	};
	originalDisplayProperties: {
		description: string; //The Fanatic has returned. Take him down and finish the job you started.;
		name: string; //Nightfall;
		icon: string; ///img/misc/missing_icon_d2.png;
		hasIcon: boolean
	};
	selectionScreenDisplayProperties: {
		description: string; //The Fanatic has returned. Take him down and finish the job you started.;
		name: string; //The Hollowed Lair;
		hasIcon: boolean
	};
	releaseIcon: string; ///img/misc/missing_icon_d2.png;
	releaseTime: number;
	activityLevel: number;
	completionUnlockHash: number;
	activityLightLevel: number;
	destinationHash: number;
	placeHash: number;
	activityTypeHash: number;
	tier: number;
	pgcrImage: string; ///img/destiny_content/pgcr/strike_taurus.jpg;
	rewards: any[];
	modifiers: Array<{
		activityModifierHash: number
	}>;
	isPlaylist: boolean;
	challenges: Array<{
		rewardSiteHash: number;
		inhibitRewardsUnlockHash: number;
		objectiveHash: number;
		dummyRewards: [
			{
				itemHash: number;
				quantity: number;
			}
		]
	}>;
	optionalUnlockStrings: [];
	inheritFromFreeRoam: boolean;
	suppressOtherRewards: boolean;
	playlistItems: [];
	matchmaking: {
		isMatchmade: boolean;
		minParty: number;
		maxParty: number;
		maxPlayers: number;
		requiresGuardianOath: boolean
	};
	directActivityModeHash: number;
	directActivityModeType: number;
	activityModeHashes: number[];
	activityModeTypes: number[];
	isPvP: boolean;
	insertionPoints: [];
	activityLocationMappings: [];
	hash: number;
	index: number;
	redacted: boolean;
	blacklisted: boolean;
}
