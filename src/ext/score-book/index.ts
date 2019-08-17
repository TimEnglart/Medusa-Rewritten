import { ExtendedClient, Database, MyRequester } from "..";
import { calculateExperience, giveMedal } from "../experienceHandler";
import { BungieResponse } from '../discordToBungie';
class ScoreBook {
	public static toReadableTime(time: number) {
		time = Number(time);
		const minutes = Math.floor(time / 60);
		const seconds = time - minutes * 60;
		return `${minutes}m ${seconds}s`;
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
			path: `/Destiny2/Stats/PostGameCarnageReport/{activityId}/`,
			method: 'GET',
			headers: {
				'X-API-Key': this.discordInstance.settings.bungie.apikey
			},
			doNotFollowRedirect: false,
			responseType: 'JSON'
		});
		if (typeof epoch === 'string') epoch = new Date(epoch);
		else if (typeof epoch === 'undefined') epoch = new Date(this.discordInstance.settings.lighthouse.scorebook.epoch);
		this.epoch = epoch;
	}

	public async start(): Promise<void> {



		setTimeout(() => this.start(), 600000); // check every 10 mins
	}
	public async totalWinners(): Promise<number> {
		const allWinners = await this.databaseClient.query(`SELECT COUNT(*) FROM SBWinners`);
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
		const utcDate = new Date();
		utcDate.setUTCHours(17, 0, 0, 0); // UTC Reset is at 5pm
		utcDate.setDate(utcDate.getDate() - (utcDate.getDay() + 5) % 7); // + Value = 7 - 1 - getDay() Value
		return utcDate;
	}
	public dateToMySql(date: Date): string {
		return `FROM_UNIXTIME(${(date.getTime() / 1000).toFixed(0)})`;
	}
	public async thisWeekSubmissions(): Promise<ISubmissionResponse[]> {
		const response = await this.databaseClient.query(`SELECT * FROM SB_Submissions WHERE date_completed > ${this.dateToMySql(this.lastReset)}`);
		return response;
	}
	public async getPostGameCarnageReport(activityId: number | string): Promise<BungieResponse<PostGameCarnageReport>> {
		const bungieData = await this.requester.request({ path: `/Destiny2/Stats/PostGameCarnageReport/${activityId}/` });
		return bungieData;
	}
	public async addWeekWinnersToDatabase(type: 'SPEED' | 'POINT', activityEntries: IActivityEntry[]) {
		for (const entry of activityEntries) {
			let verified: boolean;
			const destinyProfiles = await this.databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE destiny_id = ${entry.player.destinyPlayerInfo.membershipId}`);
			if (destinyProfiles.length) verified = true;
			await this.databaseClient.query(``);
		}

	}
	public async addWeekWinners(): Promise<void> {
		// SPEED VS POINT
		const response = await this.thisWeekSubmissions();
		if (!response.length) return;
		const speedWinner = response.reduce((prev, current) => (+prev.time > +current.time) ? prev : current);
		const pointWinner = response.reduce((prev, current) => (+prev.score > +current.score) ? prev : current);

		const speedReport = await this.getPostGameCarnageReport(speedWinner.pgcr_id);
		const pointReport = await this.getPostGameCarnageReport(pointWinner.pgcr_id);


	}
}
interface PostGameCarnageReport {
	period: string;
	startingPhaseIndex: number;
	activityDetails: IActivityDetails;
	entries: IActivityEntry[];
	teams: IActivityTeam[];
}
interface IActivityDetails {
	referenceId: number;
	directorActivityHash: number;
	instanceId: string;
	mode: number[];
	isPrivate: boolean;
	membershipType: number;
}
interface IActivityTeam {

}
interface IActivityEntry {
	standing: number;
	score: {
		basic: {
			value: number;
			displayValue: string;
		}
	};
	player: IActivityPlayer;
	characterId: string;
	values: any;

}
interface IActivityPlayer {
	destinyPlayerInfo: {
		iconPath: string;
		membershipType: number;
		membershipId: number;
		displayName: string;
	};
	characterClass: string;
	classHash: number;
	raceHash: number;
	genderHash: number;
	characterLevel: number;
	lightLevel: number;
	bungieNetUserInfo?: {
		iconPath: string,
		membershipType: number,
		membershipId: string,
		displayName: string
	};
	emblemHash: number;
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
	verified: boolean;
}
interface IWeekWinners {
	pointBreakers: {
		score: number;
		winners: IWinner[];
	};
	speedBreakers: {
		time: number;
		winners: IWinner[];
	};
}


export { ScoreBook };