// use an express webserver
import * as express from 'express';
import * as fs from 'fs';
import { ExtendedClient } from '..';
class WebServer {
	private app: express.Express;
	constructor(discordInstance: ExtendedClient, port?: number) {
		this.app = express();
		this.app
			.get('/', (req, res) => {
				res.send('Hello World!');
				console.log('Http Request Revieved');
			})
			.get('/register', (req, res) => {
				res.status(200)
					.send('REGSIUTER!');
			})
			.get('/logs', (req, res) => {
				const logFile = discordInstance.logger.logClient.returnLogFile().then(r => {
					res.set('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');
					res.set('Access-Control-Allow-Origin', '*');
					res.status(200).send(JSON.parse(r));
				});
			})



			.listen(port || 3000, () => console.log(`Example app listening on port ${port || 3000}!`));
		return this;
	}
}

export { WebServer };