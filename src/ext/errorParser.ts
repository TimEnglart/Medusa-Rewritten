import { RequestError } from "./webClient";

class CommandError extends Error {
	constructor(errorCode: string, public reason?: string) {
		super(errorCode);
		if (!reason) this.reason = this.determineReason();
	}
	private determineReason() {
		switch (this.message) {
			/* General Command Errors */
			case 'NO_AUTHOR':
				return 'No Author was Found in the Context of The Command -> Possible Command Error';
			case 'NO_MEMBER':
				return 'No Server Member was Found in the Context of The Command -> Use Command in a Server so Server User Attributes (like Roles) are exposed';
			case 'NO_BOT_USER':
				return 'No Bot was Found in the Context of The Command -> Possible Bot Error';
			case 'NO_GUILD':
				return 'No Server was Found in the Context of The Command -> Use Command in a Server so Server Attributes (like Member Lists) are exposed';
	
			/* SPECIFIC CASES */
			case 'NO_CHANNEL':
				return 'No Voice/Text Channel was Found in the Context or Arguments of The Command -> Either Execute The Command in the Given Channel or Provide an Channel Resolvable When Using the Command\nIf Your Unsure about Resolvable use the `resolvable` Command';
			case 'NO_ARGUMENTS':
				return 'No Arguments were Found in the Context of the Command -> The Command Executed Requires Arguments which were not Provided in the Command Message\nUse `help <command>` to get Argument Details';
			case 'MISSING_ARGUMENTS':
				return 'Not All Arguments were Found in the Context of the Command -> The Command Executed Requires Arguments which were not Provided in the Command Message\nUse `help <command>` to get Argument Details';
			case 'INSUFFICIENT_PRIVILEGES':
				return 'The Bot Does Not Have the Privileges on the Server to Execute the Given Command -> *This Isn\'t Very Well Documented in the Bot.*\nUse `help <command>` to get ~ Privilege Details';
			case 'USER_INSUFFICIENT_PRIVILEGES':
				return 'You Do Not Have the Privileges on the Server to Execute the Given Command\nUse `help <command>` to get Privilege Details';
	
			/* Parsing Errors */
			case 'FAILED_EMOJI_PARSE':
				return 'Failed to Parse the Provided Emoji -> Make sure You are Providing a Correct Emoji Resolvable\nIf Your Unsure about Resolvable use the `resolvable` Command';
			case 'FAILED_ROLE_PARSE':
				return 'Failed to Parse the Provided Role -> Make sure You are Providing a Correct Role Resolvable\nIf Your Unsure about Resolvable use the `resolvable` Command';
			case 'FAILED_CHANNEL_PARSE':
				return 'Failed to Parse the Provided Channel -> Make sure You are Providing a Correct Channel Resolvable\nIf Your Unsure about Resolvable use the `resolvable` Command';
			case 'FAILED_USER_PARSE':
				return 'Failed to Parse the Provided User -> Make sure You are Providing a Correct User Resolvable\nIf Your Unsure about Resolvable use the `resolvable` Command';

			/* Locating Errors */
			case 'NO_CHANNEL_FOUND':
				return 'Failed to Find Given Channel Based on the Provided Resolvable -> Make Sure the Resolvable is Accessible in the Current Scope of the Command (eg. Attempting to use a Channel From Another Server)';
			case 'NO_ROLE_FOUND':
				return 'Failed to Find Given Role Based on the Provided Resolvable -> Make Sure the Resolvable is Accessible in the Current Scope of the Command (eg. Attempting to use a Role From Another Server)';
			case 'NO_USER_FOUND':
				return 'Failed to Find Given User Based on the Provided Resolvable -> Make Sure the Resolvable is Accessible in the Current Scope of the Command (eg. Attempting to use a User From Another Server)';
			case 'NO_EMOJI_FOUND':
				return 'Failed to Find Given Emoji Based on the Provided Resolvable -> Make Sure the Resolvable is Accessible in the Current Scope of the Command (eg. Attempting to use a Emoji From Another Server)';

			case 'DATABASE_ENTRY_NOT_FOUND':
				return 'Missing Record At Backend -> The Given Context is not Available on The Server as It Doesn\'t Exist';

			case 'HTTP_STATUS_CODE_300':
			case 'HTTP_STATUS_CODE_301':
			case 'HTTP_STATUS_CODE_302':
			case 'HTTP_STATUS_CODE_303':
			case 'HTTP_STATUS_CODE_304':
			case 'HTTP_STATUS_CODE_305':
				return 'Failed HTTP Redirect -> When Accessing Online Resources A Redirection Was Required and Wasn\'t Done.';
			case 'HTTP_STATUS_CODE_400':
			case 'HTTP_STATUS_CODE_401':
			case 'HTTP_STATUS_CODE_402':
			case 'HTTP_STATUS_CODE_403':
			case 'HTTP_STATUS_CODE_404':
			case 'HTTP_STATUS_CODE_405':
				return 'Failed HTTP Request (Client Error) -> The Provided Endpoint was Not Found (If This Appears With Bungie Related Commands Re-Register using the `?register` Command as the BNet Endpoint is Deprecated)';
			case 'HTTP_STATUS_CODE_500':
			case 'HTTP_STATUS_CODE_501':
			case 'HTTP_STATUS_CODE_502':
			case 'HTTP_STATUS_CODE_503':
			case 'HTTP_STATUS_CODE_504':
			case 'HTTP_STATUS_CODE_505':
				return 'Failed HTTP Request (Server Error) -> The Server Requested is Having Issues At This Time';

			default:
				return 'UNKNOWN_ERROR';
		}
	}
}



export { CommandError };
