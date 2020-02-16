import { RateLimiter } from './ext/rate-limiter';

const a = new RateLimiter({
	operations: 1,
	rate: 1500,
	returnTokenOnCompletion: true

});
a.add(() => { }, (r) => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
});
a.addP((() => { return 'Yeet'; })).then(r => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
})
a.add(() => { }, (r) => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
});
a.addP((() => { return 32; })).then(r => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
})
console.log(a.pendingRequests);
a.add(() => { }, (r) => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
});
a.addP((() => { return null; })).then(r => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
})
a.add(() => { }, (r) => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
});
a.addP((() => { })).then(r => {
	console.log(`Time Started: ${new Date(r.timeAdded)}\nTime Ended: ${new Date(r.timeCompleted)}\nReturn Value: ${r.returnValue}\n\n`);
})