// use an express webserver
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import ExtendedClient from '../ExtendedClient';
class WebServer {
	private app: express.Express;
	constructor(discordInstance: ExtendedClient, port?: number) {
		this.app = express();
		this.app.use(express.static(path.join(__dirname, '../../../public')));
		this.app
			.get('*', (req, res) => {
				res.sendFile(__dirname, '../../../public/index.html');
			})
			.get('/register', (req, res) => {
				res.status(200).send('REGSIUTER!');
			})
			.get('/api/logs', async (req, res) => {
				const logFile = await discordInstance.logger.returnLogFile();
				res.set('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');
				res.set('Access-Control-Allow-Origin', '*');
				res.status(200).send(JSON.parse(logFile));
			})

			.listen(port || 3000, () => console.log(`Example app listening on port ${port || 3000}!`));
		return this;
	}
}

export { WebServer };
