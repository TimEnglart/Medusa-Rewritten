import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";
import CommandHandler from "@extensions/CommandHandler";
import { Message, MessageEmbed, MessageReaction, User } from "discord.js";
import { CommandError } from "@extensions/errorParser";
import { INightfallSubmission, IActivityDefinition } from "@extensions/discordToBungie";
import { ScoreBook } from "@extensions/score-book";
import RichEmbedGenerator from "@extensions/RichEmbeds";

export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'submit';
		this.description = 'Locates a Users Most Recent Nightfall and User Chooses Whether to Submit it as a Score Book Run';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [
			{
				name: 'Bungie PGCR Link | ActivityID',
				optional: true,
				example: ' https://www.bungie.net/en/PGCR/4156451264/  | submit 4156451264',
			},
		];
		this.permissionRequired = 'SEND_MESSAGES';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
				me: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		let activityId = null;
		if (message.guild && message.guild.me && message.guild.me.hasPermission('MANAGE_MESSAGES'))
			await message.delete();
		if (args.length) {
			const bungieSiteRegex = /https:\/\/www.bungie.net\/en\/PGCR\/(\d+)(\?character=(\d+))?/; // data[1] = ActivityId, data[3] = CharacterId
			const regex = args[0].match(bungieSiteRegex);
			if (regex && regex.length > 1) activityId = regex[1];
			// PGCR Link as Arg
			else if (args.length === 1) activityId = args[0];
			// Acivity Id as Arg
			else {
				// TODO: Add the Ability to Add Custom Run?
			}
		} else {
			const destinyData = await this.client.databaseClient.query(
				`SELECT b.user_id, d.bungie_id, d.destiny_id, d.membership_id FROM U_Bungie_Account as b JOIN U_Destiny_Profile as d ON d.bungie_id = b.bungie_id WHERE user_id = ${message.author.id}`,
			);
			if (!destinyData.length)
				throw new CommandError(
					'DATABASE_ENTRY_NOT_FOUND',
					'You Can use The `register` to enable usage of this command\nYou Can Manually Input Your Nightfall Using a Bungie.Net Link:\nExample:https://www.bungie.net/en/PGCR/<activityId>/\n<activityId>',
				);
			//const destinyProfiles = await DestinyPlayer.lookup({
			//	membershipId: destinyData[0].destiny_id,
			//	membershipType: destinyData[0].membership_id,
			//});

			// if (destinyProfiles.length !== 1) {
			// 	await message.author.send('An Error Has Occurred During the Player Lookup Process. This has been logged');
			// 	discordBot.logger.log(`Multiple Destiny Accounts Have Been Found on the Credentials\nDestiny Id: ${destinyData[0].destiny_id}\nMembership Type: ${destinyData[0].membership_id}`, LogFilter.Error);
			// 	return resolve();
			// }
			// const destinyProfile = destinyProfiles[0];
			// let mostRecentNightfall: INightfallSubmission | undefined;
			// for (const characterId of destinyProfile.parsedData.profile.data.characterIds) {
			// 	const charactersLastNightfall = await this.client.bungieApiRequester.SendRequest<any>(
			// 		`/Platform/Destiny2/${destinyProfile.parsedData.profile.data.userInfo.membershipType}/Account/${destinyProfile.parsedData.profile.data.userInfo.membershipId}/Character/${characterId}/Stats/Activities/?mode=46&count=1`,
			// 	);
			// 	if(!charactersLastNightfall) continue;
				
			// 	for (const activity of charactersLastNightfall.Response.activities) {
			// 		const timeCompleted = new Date(activity.period);
			// 		if (
			// 			!mostRecentNightfall ||
			//             (mostRecentNightfall &&
			//                 mostRecentNightfall.completed &&
			//                 mostRecentNightfall.completed < timeCompleted)
			// 		) {
			// 			mostRecentNightfall = {
			// 				completed: timeCompleted,
			// 				nightfallData: activity,
			// 			};
			// 		}
			// 	}
			// }
			// if (!mostRecentNightfall) throw new CommandError('FAILED_NIGHTFALL_SELECTION');
			// // console.log(JSON.stringify(mostRecentNightfall));
			// activityId = mostRecentNightfall.nightfallData.activityDetails.instanceId;
			// destinyProfile.
		}
		// console.log(activityId);
		if (!activityId) throw new CommandError('B_API_NO_INSTANCE_ID');
		
		const pgcr = await this.client.scoreBook.getPostGameCarnageReport(activityId);

		const lastReset = this.client.scoreBook.lastReset;
		const nightfallDate = new Date(pgcr.Response.period);
		const diffDays = Math.floor(Math.abs((lastReset.getTime() - nightfallDate.getTime()) / (24 * 60 * 60 * 1000))); // was round instead of floor
		if (diffDays >= 7) {
			await message.author.send(
				new MessageEmbed()
					.setTitle('This Nightfall is Over a Week Old')
					.setColor('#FFA500')
					.addField('This Nightfall Was Completed:', `**${nightfallDate.toLocaleString()}**\n\u200B`)
					.addField('Nightfalls This Week Must Be Completed After:', `**${lastReset.toLocaleString()}**`),
			);
			return;
		}
		if (pgcr.Response.entries[0].values.completed.basic.value === 0) {
			await message.author.send(
				new MessageEmbed()
					.setTitle('This Nightfall is Incomplete')
					.setColor('#FFA500')
					.addField(
						'The Submitted Nightfall was Incomplete!',
						`This May Be due to a Player Disconnecting before the nightfall was completed\n\nIf you believe this is an error contact <@125522120129118208>\nReference ID: ${activityId}`,
					),
			);
			return;
		}
		const entityDef = await this.client.bungieApiRequester.SendRequest<IActivityDefinition>(`/Platform/Destiny2/Manifest/${'DestinyActivityDefinition'}/${
			pgcr.Response.activityDetails.referenceId
		}/`);
		if (!entityDef) throw new CommandError('B_API_NO_ENTITY');
		const embed = new MessageEmbed()
			.setTitle(`Nightfall to Submit`)
			.setDescription(
				`**${entityDef.Response.displayProperties.name} - ${pgcr.Response.entries[0].values.activityDurationSeconds.basic.displayValue} \nTotal Score: ${pgcr.Response.entries[0].values.teamScore.basic.displayValue}** `,
			)
			.setThumbnail(`http://www.bungie.net${entityDef.Response.pgcrImage}`)
			.setColor('#00FF00')
			.setFooter(
				`Activity ID: ${pgcr.Response.activityDetails.instanceId} | via Medusa | ${entityDef.Response.originalDisplayProperties.name} on ${entityDef.Response.selectionScreenDisplayProperties.name}`,
				'https://warmind.io/img/blizzard_logo.png',
			)
			.setTimestamp(new Date(pgcr.Response.period))
			.setAuthor('✅ to Submit | ❌ to Decline Submission');
		for (const entry of pgcr.Response.entries) {
			embed.addField(
				`${entry.player.destinyUserInfo.displayName} ${entry.player.lightLevel}`,
				`K: **${entry.values.kills.basic.displayValue}** D: **${entry.values.deaths.basic.displayValue}** A: **${entry.values.assists.basic.displayValue}**\nK/D: **${entry.values.killsDeathsRatio.basic.displayValue}**`,
				true,
			);
		}
		const pendingMessage = await message.author.send(embed);
		await pendingMessage.react('✅');
		await pendingMessage.react('❌');
		const filter = (reaction: MessageReaction, user: User): boolean =>
			(reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === message.author.id;
		const reactionCollection = await pendingMessage.awaitReactions(filter, { max: 1, time: 60000 });
		if (reactionCollection.size) {
			const messageReaction = reactionCollection.get('✅');
			if (messageReaction) {
				// Accepted
				const count = +(
					await this.client.databaseClient.query(`SELECT COUNT(*) as count FROM SB_Submissions`)
				)[0].count;
				const selectQuery = await this.client.databaseClient.query(
					`SELECT * FROM SB_Submissions WHERE pgcr_id = ${activityId}`,
				);
				if (!selectQuery.length) {
					await this.client.databaseClient.query(
						`INSERT INTO SB_Submissions (pgcr_id, score, time, date_completed) VALUES (${activityId}, ${
							pgcr.Response.entries[0].values.teamScore.basic.value
						}, ${
							pgcr.Response.entries[0].values.activityDurationSeconds.basic.value
						}, ${ScoreBook.dateToMySql(new Date(pgcr.Response.period))})`,
					);
					await message.author.send(
						RichEmbedGenerator.successEmbed(
							'NightFall Successfully Submitted',
							`Strike: ${
								entityDef.Response.selectionScreenDisplayProperties.name
							}\nPlayers: ${pgcr.Response.entries
								.map((entry) => entry.player.destinyUserInfo.displayName)
								.join(', ')}\nScore: ${pgcr.Response.entries[0].values.teamScore.basic.value}\nTime: ${
								pgcr.Response.entries[0].values.activityDurationSeconds.basic.displayValue
							}`,
						).setFooter(`${count + 1} Submission(s)`),
					);
				} else {
					// tslint:disable-next-line: no-floating-promises
					message.author
						.send('This Nightfall Has Already Been Submitted')
						.then((newMsg) => newMsg.delete({ timeout: 20000 }));
				}
			} else {
				// tslint:disable-next-line: no-floating-promises
				message.author
					.send('Nightfall Has Not Been Submitted')
					.then((responseMsg) => responseMsg.delete({ timeout: 20000 }));
			}
		}
		// tslint:disable-next-line: no-floating-promises
		pendingMessage.delete({ timeout: 20000 });
	}
}