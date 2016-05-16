/*
 * Cron
 *	Cron like scheduler that works on indivisble times (like every 22 minutes)
 *
 *	License: Public domain
 *	You may do anything  with this code thats legal in your country :-)
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 *  IN THE SOFTWARE. 
 *
 *  Author: Raja Raman
 * 	v1.0 May-14-2016
 */

 /* jshint node: true */
 'use strict';
var moment = require('moment-timezone');

//Constructor
// schedule must have five elements and accepts following values
// * repeats every 1 unit (day, month, year, hour, minute)
// */n repeats every n units (day, month, year, hour, minute)
// n1,n2,n3..nn sorted list of absolute values (must be within the valid range of
//  corresponding units, for ex month 0 to 11 )
// n1-n2 a range of numbers from n1 to n2, inclusive
// range and list can be combined, for ex n1,n2,n3-n5,...nn
// callback: javascript function to call when the timer ticks
// lastTime: optional, last time the timer ticked. If you are loading from storage
//  ensure it is within one tick of time from current time, otherwise you may
//  get multiple calls until it reaches current time
//
function Cron(schedule, callback, lastTime){
	this.starts = [0,0,1,0,0];
	this.repeat = [0,0,0,0,0];
	this.ranges = [[],[],[],[],[]];
	this.lastTime = lastTime || moment();
	this.stopped  = false;
	this._parse(schedule);
	this.scheduleAt(this._nextSchedule());
	return this;
}

Cron.prototype.stop = function(){
	this.stopped = true;
	clearTimeout(this.timer);
};


Cron.prototype._tick = function(){
	if(this.onTickCB)this.onTickCB();
	if(this.stopped)return;    	//stop might have been called in the onTickCB
	this.lastTime = moment();	//last tick time, we may have to move this up
	this.scheduleAt(this._nextSchedule());
};

//javascript setTimeout treats the parameter as signed 32bit integer and has a
// maximum allowed value of 2147483647. We need to split our timer into multiple
// calls if timems exceeds this limit. We may loose few milliseconds here but
// that should be acceptable since it is over a large period of time
//
Cron.prototype._after = function(timems){
	var max = 2147483647;
	if( timems < max )
		this.timer = setTimeout(this._tick.bind(this), timems);
	else
		this.timer = setTimeout(this._after.bind(this, timems - max), max);
};

Cron.prototype.scheduleAt = function(nextTime){
	console.log('scheduleAt: '+nextTime.format()+ '  after: '+(nextTime.diff(moment())/1000)+' seconds [now: '+moment().format()+']');
	this._after(nextTime.diff(moment()));
};


Cron.prototype._parse = function(schedule){
	var parts = schedule.split(' ');
	if( parts.length!==5 )
		throw new Error('Invalid schedule, 5 parts separated by space expected');

	//as a special case, 0 (minute) gets repeat even when there is a range
	// defined unless it is already a repeat with different value
	//
	this.repeat[0] = 1;

	//find all the ranges and lists in the schedule parts
	//
	for(var i=0; i<5; i++){
		if( parts[i]=='*' )
			this.repeat[i] = 1;
		else if( parts[i].startsWith('*/')  )
			this.repeat[i] = +parts[i].substr(2);
		else{
			var list = parts[i].split(',');

			for(var j=0; j<list.length; j++){
                var reps  = list[j].split('/');
                var step  = reps.length==2?+reps[1]:1;
				var range = reps[0].split('-');
                
				if( range.length===1 )
					this.ranges[i].push(+range[0]);
				else{
					for(var k=+range[0]; k<=+range[1]; k+=step)
                        this.ranges[i].push(k);
                }
			}
		}
	}
};

Cron.prototype._makeMoment = function(adate){
	return moment().year(adate[4]).month(adate[3]).date(adate[2]).hour(adate[1]).minute(adate[0]);
};

Cron.prototype._resetPartsToStart = function(adate, idx){
	if( idx<0 )return;
	for(var i=idx; i>=0; i--)
		adate[i] = this.starts[i];
};

Cron.prototype._fixRanges = function(adate){
	for(var i=4; i>=0; i--){
		var range=this.ranges[i];

		if( range.length===0 )continue;
		for(var j=0; j<range.length; j++){
			if( range[j]==adate[i])break;
			if( range[j]> adate[i]){
				adate[i] = range[j];
				this._resetPartsToStart(adate, i-1);
				break;
			}
		}

		//wrap arround if none found and fixup the previous part
		if( j>=range.length ){
			adate[i] = range[0];
			if(i<4){
				adate[i+1]++;
				i += 2;		//backup a bit and redo list validation
				this._resetPartsToStart(adate, i-2);
			}
		}
	}
	return this._makeMoment(adate);
};

Cron.prototype._nextSchedule = function(){
	var mom, last = moment(this.lastTime).toArray().slice(0,5).reverse();

	for(var i=0; i<5; i++){
		if( this.repeat[i] > 0 ){
			last[i] += this.repeat[i];
			this._resetPartsToStart(last, i-1);
			mom = this._fixRanges(last);
			if( mom.isAfter(moment()) )
				return mom;
		}
	}
	throw new Error('Invalid schedule, could not move forward from '+this.lastTime.format());
};

if( exports ){
	exports.cron = Cron;
}
