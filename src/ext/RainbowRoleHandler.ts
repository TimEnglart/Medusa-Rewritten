import ExtendedClient from "./ExtendedClient";


type RainbowRoleObject = {[guild: string]: string[]};
type RGB = {
	red: number;
	green: number;
	blue: number;
}

export default class RainbowRoleHandler {
	private rainbowRoles: RainbowRoleObject;
	private timeout: NodeJS.Timeout | null;

	private currentColor: RGB;

	constructor(private readonly client: ExtendedClient, private tick = 1500) {
		this.rainbowRoles = {
			"157737184684802048": ["482474212250877952"]
		};
		this.timeout = null;
		this.currentColor = this.resetColor();
	}

	private resetColor(): RGB {
		this.currentColor = { red: 255, green: 0, blue: 0 };
		return this.currentColor;
	}
	private async cacheData(): Promise<void> {
		for (const [guildId, roleIds] of Object.entries(this.rainbowRoles)) {
			const guild = await this.client.guilds.fetch(guildId, true);
			if (!guild) continue;
			for (const roleId of roleIds) {
				await guild.roles.fetch(roleId, true);
			}
		}
	}

	private async run(): Promise<void> {
		// generate Color
		this.client.logger.logS('Getting Color');
		this.generateDiscordColor();
		// update roles
		for(const [guildId, roleIds] of Object.entries(this.rainbowRoles)) {
			const guild = this.client.guilds.cache.get(guildId);
			if(!guild) continue;
			for(const roleId of roleIds) {
				const role = guild.roles.cache.get(roleId);
				if(role){
					this.client.logger.logS(`Setting Role: ${role.name}(${role.id}) Color to: ${this.currentColor.red}, ${this.currentColor.green}, ${this.currentColor.blue}`)
					await role.setColor([this.currentColor.red, this.currentColor.green, this.currentColor.blue]);
				}
					
			}
		}
		this.client.logger.logS(`Role Colors to: ${this.currentColor.red}, ${this.currentColor.green}, ${this.currentColor.blue}`);
		if(this.timeout)
			this.timeout = setTimeout(this.run.bind(this), this.tick);
	}

	private generateDiscordColor(step = 10): RGB {
		if (this.currentColor.red > 0 && this.currentColor.blue == 0) {
			this.currentColor.red -= (this.currentColor.red < step ? this.currentColor.red : step);
			this.currentColor.green += (this.currentColor.green < 255 - step ? step : 255 - this.currentColor.green);
		}
		if (this.currentColor.green > 0 && this.currentColor.red == 0) {
			this.currentColor.green -= (this.currentColor.green < step ? this.currentColor.green : step);
			this.currentColor.blue += (this.currentColor.blue < 255 - step ? step : 255 - this.currentColor.blue);
		}
		if (this.currentColor.blue > 0 && this.currentColor.green == 0) {
			this.currentColor.red += (this.currentColor.red < 255 - step ? step : 255 - this.currentColor.red);
			this.currentColor.blue -= (this.currentColor.blue < step ? this.currentColor.blue : step);
		}
		return this.currentColor;
	}

	public async start(): Promise<RainbowRoleHandler> {
		this.stop();
		await this.cacheData();
		this.client.logger.logS("Cached Rainbow Roles");
		this.timeout = setTimeout(this.run.bind(this), this.tick);
		return this;
	}

	public stop(): RainbowRoleHandler {
		if(this.timeout) clearTimeout(this.timeout);
		this.timeout = null;
		return this;
	}

	public restart(): RainbowRoleHandler {
		this.stop();
		this.start();
		return this;
	}

	set tickRate(amount: number) {
		this.tick = amount;
		this.restart();
	}
}