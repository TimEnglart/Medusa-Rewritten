import ExtendedClient from "./ExtendedClient";
import { IKeyBasedObject } from ".";
import { VoiceChannel, Collection } from "discord.js";
import { ITempChannelResponse, ITempChannelMasterResponse } from "./DatabaseInterfaces";
import { LogFilter } from "./logger";




export default class TempChannelHandler {
	private TempMasterChannels: Map<string, string[]>;
	private TemporaryChannels: Map<string, string[]>;

	constructor(private readonly client: ExtendedClient) {
		this.TempMasterChannels = new Map();
		this.TemporaryChannels = new Map();
	}
	public async UpdateFromDatabase(): Promise<TempChannelHandler> {
		// yuck
		const dbMasterChannels = await this.client.databaseClient.query<ITempChannelMasterResponse>(
			`SELECT * FROM G_Master_Temp_Channels`,
		);
		for (const masterChannel of dbMasterChannels) {
			const masterChannels = this.TempMasterChannels.get(masterChannel.guild_id);
			if (!masterChannels)
				this.TempMasterChannels.set(masterChannel.guild_id, [masterChannel.voice_channel_id]);
			else masterChannels.push(masterChannel.voice_channel_id);

			const dbTempChannels = await this.client.databaseClient.query<ITempChannelResponse>(
				`SELECT * FROM G_Temp_Channels WHERE guild_id = ${masterChannel.guild_id}`,
			);
			for (const tempChannel of dbTempChannels) {
				const tempChannels = this.TemporaryChannels.get(masterChannel.guild_id);
				if (!tempChannels)
					this.TemporaryChannels.set(masterChannel.guild_id, [tempChannel.voice_channel_id]);
				else tempChannels.push(tempChannel.voice_channel_id);
			}
		}
		return this;
	}
	public async AddTempChannel(
		voiceChannel: VoiceChannel,
		channelName?: string,
	): Promise<VoiceChannel> {
		this.AddChannelEntry(this.TemporaryChannels, voiceChannel.guild.id, voiceChannel.id);

		// Clone Current Voice Channel as a Temporary Channel
		const clonedChannel = await voiceChannel.clone({
			name: `${channelName || voiceChannel.name}`,
			reason: 'Dynamic Channel Created',
		});

		// Set Members Voice Channel to New Temp Channel
		//await newVoiceState.setChannel(clonedChannel, 'Moving to Temp Channel');

		this.client.logger.logS(
			`Created Temporary Channel: ${clonedChannel.name}(${clonedChannel.id}) in Guild: ${clonedChannel.guild.id}`,
			LogFilter.Debug,
		);
		// Add Clone to Current Temp Channel List
		await this.client.databaseClient.query(
			`INSERT IGNORE INTO G_Temp_Channels VALUES (${clonedChannel.guild.id}, ${clonedChannel.id})`,
		);

		// Wait 10 Seconds. Allow for Latency as If User Doesnt Successfully Join Channel VoiceState Doesnt Trigger
		setTimeout(async () => {
			await this.RemoveTempChannel(clonedChannel);
		}, 10000);

		return clonedChannel;
	}
	public async RemoveTempChannel(voiceChannel: VoiceChannel): Promise<void> {
		const tempVoiceChannel = this.GetChannelEntry(
			this.TemporaryChannels,
			voiceChannel.guild.id,
			voiceChannel.id,
		);
		if (!tempVoiceChannel) return;
		await voiceChannel.delete('Dynamic Channel Destroyed');
		this.RemoveChannelEntry(this.TemporaryChannels, voiceChannel.guild.id, voiceChannel.id);
		await this.client.databaseClient.query<ITempChannelResponse>(
			`DELETE IGNORE FROM G_Temp_Channels WHERE voice_channel_id = ${voiceChannel.id} AND guild_id = ${voiceChannel.guild.id}`,
		);
		this.client.logger.logS(
			`Deleting Temporary Channel: ${voiceChannel.name}(${voiceChannel.id}) in Guild: ${voiceChannel.guild.id}`,
			1,
		);
	}
	public isTempChannel(voiceChannel: VoiceChannel): boolean {
		const guidVoiceChannels = this.TemporaryChannels.get(voiceChannel.guild.id);
		if (!guidVoiceChannels) return false;
		return guidVoiceChannels.includes(voiceChannel.id);
	}
	public isMasterTempChannel(voiceChannel: VoiceChannel): boolean {
		const guidVoiceChannels = this.TempMasterChannels.get(voiceChannel.guild.id);
		if (!guidVoiceChannels) return false;
		return guidVoiceChannels.includes(voiceChannel.id);
	}
	private AddChannelEntry(map: Map<string, string[]>, key: string, value: string): void {
		const guidVoiceChannels = map.get(key);
		if (!guidVoiceChannels) this.TemporaryChannels.set(key, [value]);
		else guidVoiceChannels.push(value);
	}
	private GetChannelEntry(map: Map<string, string[]>, key: string, value: string): string | undefined {
		const guildTempChannels = map.get(key);
		if (!guildTempChannels) return undefined; // No Temp Channels
		return guildTempChannels.find((entryValue) => entryValue === value);
	}
	private RemoveChannelEntry(map: Map<string, string[]>, key: string, value: string): void {
		const guildTempChannels = map.get(key);
		if (!guildTempChannels) return undefined; // No Temp Channels

		const index = guildTempChannels.indexOf(value);
		if (index > -1) guildTempChannels.splice(index, 1);
	}
	public async AddMasterTempChannel(voiceChannel: VoiceChannel): Promise<void> {
		const tempVoiceChannel = this.GetChannelEntry(
			this.TemporaryChannels,
			voiceChannel.guild.id,
			voiceChannel.id,
		);
		if (tempVoiceChannel) return; // DONT ADD CURRENT TEMP CHANNELS AS MASTERS

		this.AddChannelEntry(this.TempMasterChannels, voiceChannel.guild.id, voiceChannel.id);

		this.client.logger.logS(
			`Added New Temporary Channel Master: ${voiceChannel.name}(${voiceChannel.id}) in Guild: ${voiceChannel.guild.id}`,
			LogFilter.Debug,
		);
		// Add Clone to Current Temp Channel List
		await this.client.databaseClient.query(
			`INSERT IGNORE INTO G_Master_Temp_Channels VALUES (${voiceChannel.guild.id}, ${voiceChannel.id})`,
		);
	}
	public async RemoveMasterTempChannel(voiceChannel: VoiceChannel): Promise<void> {
		const tempVoiceChannel = this.GetChannelEntry(
			this.TemporaryChannels,
			voiceChannel.guild.id,
			voiceChannel.id,
		);
		if (tempVoiceChannel) return; // DONT ADD CURRENT TEMP CHANNELS AS MASTERS

		this.AddChannelEntry(this.TempMasterChannels, voiceChannel.guild.id, voiceChannel.id);

		this.client.logger.logS(
			`Removed Temporary Channel Master: ${voiceChannel.name}(${voiceChannel.id}) in Guild: ${voiceChannel.guild.id}`,
			LogFilter.Debug,
		);
		// Add Clone to Current Temp Channel List
		await this.client.databaseClient.query(
			`DELETE IGNORE FROM G_Master_Temp_Channels WHERE guild_id = '${voiceChannel.guild.id}' AND voice_channel_id = '${voiceChannel.id})'`,
		);
	}
	private async DeleteEmptyChannel(voiceChannel: VoiceChannel): Promise<void> {
		if (!voiceChannel.members.size && voiceChannel.deletable) await voiceChannel.delete();
	}
}