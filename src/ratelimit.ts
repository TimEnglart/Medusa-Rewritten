import { RateLimiter } from './ext/rate-limiter';

const a = new RateLimiter({
	operations: 1,
	rate: 6000,
	returnTokenOnCompletion: true

});
a.add(() => { }, () => {
	console.log('called back');
});
a.addP((() => { })).then(r => {
	console.log("YAy " + r.timeCompleted);
})
a.add(() => { }, (r) => {
	console.log('called back ' + r.timeCompleted);
});
a.addP((() => { })).then(r => {
	console.log("YAy " + r.timeCompleted);
})
a.add(() => { }, () => {
	console.log('called back');
});
a.addP((() => { })).then(r => {
	console.log("YAy " + r.timeCompleted);
})
a.add(() => { }, () => {
	console.log('called back');
});
a.addP((() => { })).then(r => {
	console.log("YAy " + r.timeCompleted);
})