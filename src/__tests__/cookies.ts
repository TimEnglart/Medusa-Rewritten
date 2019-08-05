import { MyRequester } from '../ext';

const req = new MyRequester({

});
const test1 = new URL('https://');
req.request({
	hostname: 'mlcs.medu.com',
	path: 'api/b2_registration/match_schools/?q=james&language=en-GB&platform=android&device_name=Android&carrier_code=1337&carrier_name=LEET',
});
req.request().then(r => {
	console.log(r);
})