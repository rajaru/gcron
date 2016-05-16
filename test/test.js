var chai = require('chai');
var expect = chai.expect;
var cron = require('../gcron.js');
var moment = require('moment-timezone');

function countTicks(schedule, count, wait, desc){
	desc = desc || 'should run every';
	it(desc+' ('+schedule+')', function(done) {
		var job = new cron.cron(schedule, function() {
			console.log('ticked @'+moment().format());
			count--;
		});
		this.timeout(wait);
		setTimeout(function(){
			job.stop();
			expect(count).to.be.at.most(0);
			done();
		}, wait-5000);
	});
}

function countTicksExact(schedule, count, wait, curTime, desc){
	desc = desc || 'should run every';
	var c = 0;
	it(desc+' ('+schedule+')', function(done) {
		var job = new cron.cron(schedule, function() {
			console.log('ticked at '+(moment().format()));
			c++;
		}, curTime);
		this.timeout(wait);
		setTimeout(function(){
			job.stop();
			expect(c).to.equal(count);
			done();
		}, wait-5000);
	});
}

describe('utils', function(){
	it('month names', function(done) {
		var job = new cron.cron(null, function() {});
		var str = job._fixMonths('1,jan,2');
		expect(str).to.equal('1,0,2');
		done();
	});
	it('all months', function(done) {
		var job = new cron.cron(null, function() {});
		var str = job._fixMonths('Jan-fEb-maR-apr-may-jun-jul-aug-sep-oct-nov-dec');
		expect(str).to.equal('0-1-2-3-4-5-6-7-8-9-10-11');
		done();
	});
	it('all months full', function(done) {
		var job = new cron.cron(null, function() {});
		var str = job._fixMonths('January-february-march-april-may-june-july-august-september-october-november-december');
		expect(str).to.equal('0-1-2-3-4-5-6-7-8-9-10-11');
		done();
	});
});

describe('cron', function(){
	countTicks('* * * * *',   2, 2.5*60*1000, 'should run every minute' );
	countTicks('*/1 * * * *', 3, 3.5*60*1000, 'should run every minute' );
	//countTicks('*/2 * * * *', 1, 3.5*60*1000, 'should run every two minutes' );
	//countTicks('61 * * * *', 0, 1*60*1000, 'should work with invalid times' );

	var curMoment = moment({year: 2016, month: 1, date: 1, hour: 0, minute: 59, second: 0});
	//countTicksExact('1-3 * * * *', 3, 5.1*60*1000, curMoment,'range - spill over' );
	//countTicksExact('1,2,3 * * * *', 3, 5.1*60*1000, curMoment,'list - spill over' );

	curMoment = moment({year: 2016, month: 0, date: 31, hour: 23, minute: 59, second: 55});
	//countTicksExact('0 0 1 * *', 1, 1.1*60*1000, curMoment,'first of every month' );
	//countTicksExact('0 0 1,2 * *', 1, 1.1*60*1000, curMoment,'first & second of every month' );

	curMoment = moment({year: 2016, month: 0, date: 1, hour: 23, minute: 59, second: 55});
	//countTicksExact('0 0 2-3 * *', 1, 1.1*60*1000, curMoment,'second & third of every month' );

	curMoment = moment({year: 2016, month: 0, date: 1, hour: 0, minute: 59, second: 55});
	//countTicksExact('1,2,3 1,2,3 * * *', 1, 4*60*60*1000, null, 'multiple ranges' );
});
