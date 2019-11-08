/*
import * as discord from 'discord.js';
import { createHash, Hash } from 'crypto';
import { Stream } from 'stream';
class AntiRepost {
	public hashType: string;
	public outputText: string;
	constructor(public channelToWatch: discord.TextChannel) {
		this.hashType = 'sha3';
		this.outputText = 'hex';
	}
	public async checkMessage(message: discord.Message): Promise<boolean> {
		const hashes: Hash[] = [];
		// Check Attachments
		if(message.attachments.size > 0) {
			// go through attachments
			for(const [snowflake, attachment] of message.attachments) {
				const hash = createHash(this.hashType);
				hash.setEncoding('hex');
				if (typeof attachment.attachment === 'string') {
					hash.write(attachment.attachment);
				}
				else if (attachment.attachment instanceof Buffer) {
					hash.write(attachment.attachment);
				}
				else if(attachment.attachment instanceof Stream) {
					// Stream Could have Already Started
				}
				hash.end();
				hashes.push(hash);
			}
		}
		if(message.content.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/)) {
			if (attachment.url.match(/\.(jpg|jpeg|png|gif|bmp)$/ig)) {
				// image
			}
			else if (attachment.url.match(/\.(mp4|m4a|m4v|f4v|f4a|m4b|m4r|f4b|mov|3gp|ogg|oga|ogv|ogx|wmv|webm|flv|avi)$/ig)) {
				// video
			}
			else continue;
		}

	}
}*/