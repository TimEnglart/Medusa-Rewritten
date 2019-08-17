import { RateLimiter } from './ext/rate-limiter';

const a = new RateLimiter({
	operations: 4
});
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