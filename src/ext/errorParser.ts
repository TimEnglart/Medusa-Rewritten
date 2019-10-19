class CommandError extends Error {
	public error: Error;
	constructor(errorCode: string, public reason?: string) {
		super(errorCode);
		if (!reason) this.reason = this.determineReason();
	}
	private determineReason() {
		switch (this.message) {
			/* General Command Errors */
			case 'NO_AUTHOR':
				return '';
			case 'NO_MEMBER':
				return '';
			case 'NO_BOT_USER':
				return '';
			case 'NO_GUILD':
				return '';
	
			/* SPECIFIC CASES */
			case 'NO_CHANNEL':
				return '';
			case 'NO_ARGUMENTS':
				return '';
			case 'MISSING_ARGUMENTS':
				return '';
			case 'INSUFFICIENT_PRIVILEGES':
				return '';
			case 'USER_INSUFFICIENT_PRIVILEGES':
				return '';
	
			/* Parsing Errors */
			case 'FAILED_EMOJI_PARSE':
				return '';
			case 'FAILED_ROLE_PARSE':
				return '';
			case 'FAILED_CHANNEL_PARSE':
				return '';
			case 'FAILED_USER_PARSE':
				return '';

			/* Locating Errors */
			case 'NO_CHANNEL_FOUND':
					return '';
			case 'NO_ROLE_FOUND':
					return '';
			case 'NO_USER_FOUND':
				return '';
			case 'NO_EMOJI_FOUND':
				return '';

			case 'DATABASE_ENTRY_NOT_FOUND':
				return '';

			default:
				return 'UNKNOWN_ERROR';
		}
	}
}

export { CommandError };
