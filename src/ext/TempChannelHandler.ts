import ExtendedClient from "./ExtendedClient";
import { IKeyBasedObject } from ".";
import { VoiceChannel } from "discord.js";
import { ITempChannelResponse, ITempChannelMasterResponse } from "./DatabaseInterfaces";
import { LogFilter } from "./logger";
import { Collection } from "mongodb";
import { throws } from "assert";




export default class TempChannelHandler {
	private TempMasterChannels: Map<string, string[]>;
	private TemporaryChannels: Map<string, string[]>;

	constructor(private readonly client: ExtendedClient) {
		this.TempMasterChannels = new Map();
		this.TemporaryChannels = new Map();
	}
	private async getTempChannelCollection(): Promise<Collection<any>> {
		return await this.client.nextDBClient.getCollection('temporaryChannels');
	}
	private async getMasterTempChannelCollection(): Promise<Collection<any>> {
		return await this.client.nextDBClient.getCollection('masterTemporaryChannels');
	}
	public async UpdateFromDatabase(): Promise<TempChannelHandler> {
		// yuck
		const dbMasterChannelCollection = await this.getMasterTempChannelCollection();
		for await (const masterChannel of dbMasterChannelCollection.find()) {
			const masterChannels = this.TempMasterChannels.get(masterChannel.guildId);
			if (!masterChannels)
				this.TempMasterChannels.set(masterChannel.guildId, [masterChannel.voiceChannelId]);
			else masterChannels.push(masterChannel.voiceChannelId);
		}
		const tempChannelCollection = await this.getTempChannelCollection();
		for await (const tempChannel of tempChannelCollection.find()) {
			const tempChannels = this.TemporaryChannels.get(tempChannel.guildId);
			if (!tempChannels) this.TemporaryChannels.set(tempChannel.guildId, [tempChannel.voiceChannelId]);
			else tempChannels.push(tempChannel.voiceChannelId);
		}
		return this;
	}
	public async AddTempChannel(
		voiceChannel: VoiceChannel,
		channelName?: string,
	): Promise<VoiceChannel> {
		
		// Clone Current Voice Channel as a Temporary Channel
		const clonedChannel = await voiceChannel.clone({
			name: `${channelName || voiceChannel.name}`,
			reason: 'Dynamic Channel Created',
		});
		this.AddChannelEntry(this.TemporaryChannels, clonedChannel.guild.id, clonedChannel.id);
		// Set Members Voice Channel to New Temp Channel
		//await newVoiceState.setChannel(clonedChannel, 'Moving to Temp Channel');

		this.client.logger.logS(
			`Created Temporary Channel: ${clonedChannel.name}(${clonedChannel.id}) in Guild: ${clonedChannel.guild.id}`,
			LogFilter.Debug,
		);

		// Add Clone to Current Temp Channel List
		const tempCollection = await this.getTempChannelCollection();
		await tempCollection.insertOne({
			guildId: clonedChannel.guild.id,
			voiceChannelId: clonedChannel.id,
		});
		// Wait 10 Seconds. Allow for Latency as If User Doesnt Successfully Join Channel VoiceState Doesnt Trigger
		setTimeout(async () => {
			await this.DeleteEmptyChannel(clonedChannel);
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

		const tempCollection = await this.getTempChannelCollection();
		await tempCollection.deleteOne({
			voiceChannelId: voiceChannel.id,
			guildId: voiceChannel.guild.id
		});
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
		if (!guidVoiceChannels) map.set(key, [value]);
		else guidVoiceChannels.push(value);
	}
	private GetChannelEntry(map: Map<string, string[]>, key: string, value: string): string | undefined {
		const guildTempChannels = map.get(key);
		if (!guildTempChannels) return undefined; // No Temp Channels
		return guildTempChannels.find((entryValue) => entryValue === value);
	}
	private RemoveChannelEntry(map: Map<string, string[]>, key: string, value: string): void {
		const guildTempChannels = map.get(key);
		if (!guildTempChannels) return; // No Temp Channels

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
		const masterCollection = await this.getMasterTempChannelCollection();
		await masterCollection.insertOne({
			guildId: voiceChannel.guild.id,
			voiceChannelId: voiceChannel.id,
		});
	}
	public async RemoveMasterTempChannel(voiceChannel: VoiceChannel): Promise<void> {
		const tempVoiceChannel = this.GetChannelEntry(
			this.TemporaryChannels,
			voiceChannel.guild.id,
			voiceChannel.id,
		);
		if (tempVoiceChannel) return; // DONT ADD CURRENT TEMP CHANNELS AS MASTERS

		this.RemoveChannelEntry(this.TempMasterChannels, voiceChannel.guild.id, voiceChannel.id);

		this.client.logger.logS(
			`Removed Temporary Channel Master: ${voiceChannel.name}(${voiceChannel.id}) in Guild: ${voiceChannel.guild.id}`,
			LogFilter.Debug,
		);
		// Add Clone to Current Temp Channel List
		const masterCollection = await this.getMasterTempChannelCollection();
		await masterCollection.deleteOne({
			guildId: voiceChannel.guild.id,
			voiceChannelId: voiceChannel.id,
		});
	}
	public async DeleteEmptyChannel(voiceChannel: VoiceChannel): Promise<void> {
		if (!voiceChannel.members.size && voiceChannel.deletable)
			await this.RemoveTempChannel(voiceChannel);
	}
}