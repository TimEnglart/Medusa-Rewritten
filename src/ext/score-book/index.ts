import { CommandError, Database, discord, ExtendedClient, MyRequester } from '..';
import { BungieResponse, IActivityDefinition, IActivityEntry, IPostGameCarnageReport } from '../discordToBungie';
import { calculateExperience, giveMedal } from '../experienceHandler';
import { LogFilter } from '../logger';
class ScoreBook {
	public static toReadableTime(time: number) {
		time = Number(time);
		const minutes = Math.floor(time / 60);
		const seconds = time - minutes * 60;
		return `${minutes}m ${seconds}s`;
	}
	public static dateToMySql(date: Date): string {
		return `FROM_UNIXTIME(${(date.getTime() / 1000).toFixed(0)})`;
	}
	private epoch?: Date;
	private discordInstance: ExtendedClient;
	private databaseClient: Database;
	private requester: MyRequester;

	constructor(discordInstance: ExtendedClient, epoch?: Date | string) {
		this.discordInstance = discordInstance;
		this.databaseClient = discordInstance.databaseClient;
		this.requester = new MyRequester({
			hostname: 'www.bungie.net',
			port: 443,
			path: `/Platform/Destiny2/Stats/PostGameCarnageReport/{activityId}/`,
			method: 'GET',
			headers: {
				'X-API-Key': this.discordInstance.settings.bungie.apikey,
			},
			doNotFollowRedirect: false,
			responseType: 'JSON',
		});
		if (typeof epoch === 'string') epoch = new Date(epoch);
		else if (typeof epoch === 'undefined') epoch = new Date(this.discordInstance.settings.lighthouse.scorebook.epoch);
		this.epoch = epoch;
	}

	public async start(): Promise<void> {
		if (this.minutesToNextReset <= 5) { // is absolute so there is a 10 min window
			this.discordInstance.logger.logClient.logS(`[WORKS???] adding winners to Database`, 0);
			await this.addWinners();
			setTimeout(() => this.start(), 1200000); // wait 20mins to avoid re submit
		} else setTimeout(() => this.start(), 480000/*600000*/); // check every 10 mins -> now 8
	}
	public async totalWinners(): Promise<number> {
		const allWinners = await this.databaseClient.query(`SELECT COUNT(*) FROM SB_Winners`);
		return allWinners[0].COUNT;
	}
	public async totalWeeks(): Promise<number> {
		return (await this.totalWinners()) / 2;
	}
	public async currentWeek(): Promise<number> {
		return (await this.totalWeeks()) + 1;
	}
	public async allWinners(): Promise<IWinnersResponse[]> {
		const allSubmissions = await this.databaseClient.query(`SELECT COUNT(*) FROM SB_Winners`);
		return allSubmissions;
	}
	get currentSeason(): number {
		return this.discordInstance.settings.lighthouse.scorebook.season;
	}
	get lastReset(): Date {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const utcDate = new Date();
		utcDate.setUTCHours(17, 0, 0, 0); // UTC Reset is at 5pm
		utcDate.setUTCDate(today.getDate() - today.getDay() + 2); // 2 Days from Sunday (Tuesday)
		return utcDate;
	}
	get minutesToNextReset(): number {
		return Math.abs((this.lastReset.getTime() - new Date().getTime()) / (60 * 1000));
	}
	public async thisWeekSubmissions(): Promise<ISubmissionResponse[]> {
		const response = await this.databaseClient.query(
			`SELECT * FROM SB_Submissions WHERE date_completed >= ${ScoreBook.dateToMySql(this.lastReset)}`,
		);
		return response;
	}
	public async getPostGameCarnageReport(
		activityId: number | string,
	): Promise<BungieResponse<IPostGameCarnageReport>> {
		const bungieData = await this.requester.request({
			path: `/Platform/Destiny2/Stats/PostGameCarnageReport/${activityId}/`,
		});
		return bungieData;
	}
	public async getWeekWinners() /*: Promise<void>*/ {
		// SPEED VS POINT
		const response = await this.thisWeekSubmissions();
		if (!response.length) return;
		const speedWinner = response.reduce((prev, current) => (+prev.time > +current.time ? prev : current));
		const pointWinner = response.reduce((prev, current) => (+prev.score > +current.score ? prev : current));

		// API Activity Details
		const speedReport = await this.getPostGameCarnageReport(speedWinner.pgcr_id);
		const pointReport = await this.getPostGameCarnageReport(pointWinner.pgcr_id);

		// Resolved Players with Discord ID
		const resolvedSpeedWinners = await this.resolveWeekWinners('SPEED', speedReport.Response.entries);
		const resolvedPointWinners = await this.resolveWeekWinners('POINT', pointReport.Response.entries);

		return {
			pointBreakers: {
				activity: pointReport,
				players: resolvedPointWinners,
			},
			speedBreakers: {
				activity: speedReport,
				players: resolvedSpeedWinners,
			},
		};
	}
	private async resolveWeekWinners(type: 'SPEED' | 'POINT', activityEntries: IActivityEntry[]) {
		const winners: IWinner[] = [];
		for (const entry of activityEntries) {
			const winnerObj: IWinner = {
				name: entry.player.destinyUserInfo.displayName,
				type,
			};
			const destinyProfiles = await this.databaseClient.query(
				`SELECT * FROM U_Destiny_Profile WHERE destiny_id = ${entry.player.destinyUserInfo.membershipId}`,
			);
			if (destinyProfiles.length) {
				const bungieProfiles = await this.databaseClient.query(
					`SELECT * FROM U_Bungie_Account WHERE bungie_id = ${destinyProfiles[0].bungie_id}`,
				);
				if (bungieProfiles.length) {
					winnerObj.userId = bungieProfiles[0].user_id;
				}
			}
			winners.push(winnerObj);
		}
		return winners;
	}
	private async addWinners() {
		const winners = await this.getWeekWinners();
		if (!winners) return; // No Winners :(
		for (const winner of winners.pointBreakers.players) {
			if (!winner.userId) continue;

			// Update User Statistics
			const column = winner.type === 'SPEED' ? 'speedbreaker_wins' : 'pointbreaker_wins';
			const medal = this.discordInstance.settings.lighthouse.medals.find(
				medal => medal.name === (winner.type === 'SPEED' ? 'Speedbreaker' : 'Pointbreaker'),
			);

			const currentStatistics = await this.databaseClient.query(
				`SELECT * FROM U_SB_Statistics WHERE user_id = ${winner.userId}`,
			);
			if (!currentStatistics.length) {
				await this.databaseClient.query(
					`INSERT INTO U_SB_Statistics (user_id, pointbreaker_wins, speedbreaker_wins) VALUES (${
					winner.userId
					}, ${winner.type === 'POINT' ? 1 : 0}, ${winner.type === 'SPEED' ? 1 : 0});`,
				);
			}
			else {
				await this.databaseClient.query(
					`UPDATE U_SB_Statistics SET ${column} = ${currentStatistics[0][column] + 1} WHERE user_id = ${
					winner.userId
					}`,
				);
			}
			// Give Medal / XP
			if (medal) await giveMedal(winner.userId, [medal], this.databaseClient);
		}
		// Update Winner Table
		await this.databaseClient.query(
			`INSERT INTO SB_Winners (week, type, pgcr_id, season) VALUES (${await this.currentWeek()}, ${'SPEED'}, ${
			winners.speedBreakers.activity.Response.activityDetails.instanceId
			}, ${this.currentSeason}); ` +
			`INSERT INTO SB_Winners (week, type, pgcr_id, season) VALUES (${await this.currentWeek()}, ${'POINT'}, ${
			winners.pointBreakers.activity.Response.activityDetails.instanceId
			}, ${this.currentSeason});`,
		);

		const guild = this.discordInstance.guilds.get(this.discordInstance.settings.lighthouse.discordId);
		if (!guild) return;
		const channel = guild.channels.get(
			this.discordInstance.settings.lighthouse.scorebook.channelId,
		) as discord.TextChannel;
		if (!channel) return;
		const historyEmbed = await this.generateHistoryEmbed();
		const winnerEmbed = await this.generateWinnersEmbed(winners);
		await channel.send(historyEmbed);
		await channel.send(winnerEmbed);
		// channel.send();
	}
	private async generateHistoryEmbed() {
		const allSpeedBreakers: IScorebookWinnerResponse[] = await this.databaseClient.query(
			`SELECT * FROM U_SB_Statistics WHERE speedbreaker_wins IS NOT NULL AND speedbreaker_wins > 0 ORDER BY speedbreaker_wins DESC`,
		);
		const allPointBreakers: IScorebookWinnerResponse[] = await this.databaseClient.query(
			`SELECT * FROM U_SB_Statistics WHERE pointbreaker_wins IS NOT NULL AND pointbreaker_wins > 0 ORDER BY pointbreaker_wins DESC`,
		);
		const guild = this.discordInstance.guilds.get(this.discordInstance.settings.lighthouse.discordId);
		if (!guild) return;
		const speedLayout = allSpeedBreakers
		.filter(player => player.season === this.currentSeason)
		.sort((player1, player2) => player2.speedbreaker_wins - player1.speedbreaker_wins)
		.map(player => `${guild.members.get(player.user_id)?.displayName}: ${player.speedbreaker_wins}`);
		const pointLayout = allPointBreakers
		.filter(player => player.season === this.currentSeason)
		.sort((player1, player2) => player2.pointbreaker_wins - player1.pointbreaker_wins)
		.map(player => `${guild.members.get(player.user_id)?.displayName}: ${player.speedbreaker_wins}`);

		return new discord.MessageEmbed()
		.setTitle(`Scorebook History - Season: ${this.currentSeason}`)
		.addField('Pointbreakers:', pointLayout)
		.addField('Speedbreakers:', speedLayout);

	}
	private async generateWinnersEmbed(winners: IWeekWinners) {
		if (!winners) return;
		const speedEntDef: BungieResponse<IActivityDefinition> = await this.requester.request({ path: `/Platform/Destiny2/Manifest/${'DestinyActivityDefinition'}/${winners.speedBreakers.activity.Response.activityDetails.referenceId}/` });
		const pointEntDef: BungieResponse<IActivityDefinition> = await this.requester.request({ path: `/Platform/Destiny2/Manifest/${'DestinyActivityDefinition'}/${winners.pointBreakers.activity.Response.activityDetails.referenceId}/` });
		if (!speedEntDef || !pointEntDef) return;
		const currentWeek = this.currentWeek();
		const thisReset = this.lastReset.toLocaleDateString();
		const lastReset = new Date().setDate(this.lastReset.getDate() - 7); // new Date().setDate(this.lastReset.getDate() + 7); // Add One Week to Last Reset or May need to subtract from
		const winnerEmbed = new discord.MessageEmbed()
			.setTitle(`Week ${currentWeek} Winners`)
			.setColor('#FFD662')
			.setDescription(`**${lastReset} - ${thisReset}**`); // because the last reset should** be a few seconds ago as it has registered that it has reset
			winnerEmbed.addField(
				`Speedbreakers Winners - ${speedEntDef.Response.displayProperties.name}\nRun Time - ${winners.speedBreakers.activity.Response.entries[0].values.activityDurationSeconds.basic.displayValue}`,
				`${winners.speedBreakers.activity.Response.entries.map(entry => `${entry.player.characterClass} ${entry.player.destinyUserInfo.displayName}: ${entry.player.lightLevel}`).join('\n')}`
			)
			.addField(
				`Pointbreaker Winners - ${pointEntDef.Response.displayProperties.name}\nRun Score - ${winners.pointBreakers.activity.Response.entries[0].values.activityDurationSeconds.basic.displayValue}`,
				`${winners.pointBreakers.activity.Response.entries.map(entry => `${entry.player.characterClass} ${entry.player.destinyUserInfo.displayName}: ${entry.player.lightLevel}`).join('\n')}`
			);
			/*
			Speed Winners - {Strike Name}
			Run Time - {Time}
			--------------------------------
			{Player 1 Class} {Player 1 Name}: {Player 1 Light} {Light Emoji}
			{Player 2 Class} {Player 2 Name}: {Player 2 Light} {Light Emoji}
			{Player 3 Class} {Player 3 Name}: {Player 3 Light} {Light Emoji}
			*/
			/*
			Point Winners - {Strike Name}
			Score - {Time}
			--------------------------------
			{Player 1 Class} {Player 1 Name}: {Player 1 Light} {Light Emoji}
			{Player 2 Class} {Player 2 Name}: {Player 2 Light} {Light Emoji}
			{Player 3 Class} {Player 3 Name}: {Player 3 Light} {Light Emoji}
			*/
			return winnerEmbed;
	}
}


interface ISubmissionResponse {
	pgcr_id: number;
	score: string;
	time: string;
	date_completed: Date;
}
interface IWinnersResponse {
	week: number;
	type: string;
	pgcr_id: number;
}
interface IScorebookWinnerResponse {
	user_id: string;
	pointbreaker_wins: number;
	speedbreaker_wins: number;
	season: number;
}
interface IWinner {
	name: string;
	type: 'POINT' | 'SPEED';
	userId?: string;
}
/*interface IWeekWinners {
    pointBreakers: {
        score: number;
        winners: IWinner[];
    };
    speedBreakers: {
        time: number;
        winners: IWinner[];
    };
}*/

interface IWeekWinners {
	pointBreakers: {
		activity: BungieResponse<IPostGameCarnageReport>;
		players: IWinner[];
	};
	speedBreakers: {
		activity: BungieResponse<IPostGameCarnageReport>;
		players: IWinner[];
	};
}

export { ScoreBook };
