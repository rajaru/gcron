/*
 * Cron
 *	Cron like scheduler that works on indivisble times (like every 22 minutes)
 *
 *	License: Public domain
 *	You may do anything thats legal in your country with this code :-)
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
// * every 1 units (day, month, year, hour, minute)
// */n every n units (day, month, year, hour, minute)
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
	this.schedule 	= schedule;
	this.stopped 	= false;
	this.lastTime 	= lastTime || moment();
	this.onTickCB 	= callback;
	if( schedule )
		this.scheduleAt(this._nextSchedule());
	return this;
}

Cron.prototype.fixLastTime = function(last){
    var next = this.schedule.split(' ').reverse();
    //fix the ranges and lists
    for(var i=4; i>=0; i--){
        if(next[i].indexOf(',')>0||next[i].indexOf('-')>0){
            var list = this._expandRange(next[i].split(','));
            for(var j=0; j<list.length; j++)
        		if( last[j] < list[j] ){
        			last[j] = list[j];
        			break;
        		}

        	//bump up the next element
            //
        	last[i] = list[0];
        	if(i>0)last[i-1] ++;

        }
    }
};

Cron.prototype._dbg = function(){
	console.log.apply(console, arguments);
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

Cron.prototype._tick = function(){
	if(this.onTickCB)this.onTickCB();
	if(this.stopped)return;    //stop might have been called in the onTickCB
	this.lastTime = moment();
	this.scheduleAt(this._nextSchedule());
};

Cron.prototype.scheduleAt = function(nextTime){
	this._dbg('scheduleAt: '+nextTime.format()+ '  after: '+(nextTime.diff(moment())/1000)+' seconds [now: '+moment().format()+']');
	this._after(nextTime.diff(moment()));
};

Cron.prototype.stop = function(){
	this.stopped = true;
	clearTimeout(this.timer);
};

Cron.prototype._timeToArray = function(time){
	if( time instanceof Array )return time;
	return time.toArray().slice(0, 5);
};

//list is expected to be sorted (including the range expression)
// and ranges are expected to have both elements (no 5- etc)
//
Cron.prototype._expandRange = function(list, idx){
	var l = [];
	for(var i=0; i<list.length; i++)
		if( list[i].indexOf('-')>=0 ){
			var range = list[i].split('-');
			for( var y=+range[0]; y<=+range[1]; y++)
				l.push(y);
		}
		else{
			l.push(list[i]);
		}

    //to make day and month index 1 based
    //if( idx==2 || idx==3 )l.map(function(v){return v-1;});
	return l;
};

Cron.prototype._normalizeDatePart = function(adate, i){
    // array constructor of moment does not bubble up out-of-range values
    //
	var m = moment().year(adate[0]).month(adate[1]).date(adate[2]).hour(adate[3]).minute(adate[4]);
	return m.toArray()[i];
};

Cron.prototype.processPart = function(last, part, i, skipRepeats){
	if( part=='*' )return '*';

	last = last.slice();
	if( part.startsWith('*/') ){
        if(skipRepeats)return part;
		last[i] = +last[i] + (+part.substr(2));
		return this._normalizeDatePart(last, i);
	}

    //move to the next element in the list
    //
	var list=this._expandRange(part.split(','), i);
	for(var x=0; x<list.length; x++)
		if( last[i] < list[x] ){
			last[i] = list[x];
			return this._normalizeDatePart(last, i);
		}

	//bump up the next element
    //
	last[i] = list[0];
	if(i>0)last[i-1] ++;
	return this._normalizeDatePart(last, i);
};

//make a new moment object by replacing wildcards with values from
// last tick time.
//
Cron.prototype._makeMoment = function(next, last){
	for(var i=0; i<5; i++)
		if( next[i]=='*' )next[i] = last[i];
	return moment(next);
};

//calculate the next schedule time from last tick time and return a moment
// object.
//
Cron.prototype._nextSchedule = function(){
	var parts = this.schedule.split(' ').reverse();
	var next = ['*', '*', '*', '*', '*'];
	var mom, last = this._timeToArray(this.lastTime);

	if( parts.length != 5 )
		throw new Error('Invalid schedule, 5 parts separated by space expected');

	this._dbg('last: '+last);

    // try the repeats, lists and ranges first
    //
    var skipRepeats = false;
	for( var i=4; i>=0; i--){
        //lists and ranges should be applied always
		next[i] = this.processPart(last, parts[i], i, skipRepeats);

        //repeats should be applied only until nextTime is less than last time
        if(!skipRepeats)
	       skipRepeats = this._makeMoment(next.slice(), last).isAfter(this.lastTime);
	}
    mom = this._makeMoment(next.slice(), last);
    if(mom.isAfter(this.lastTime))
        return mom;

    // bump up the *s to the next level, one at a time
    //
	for(i=4; i>=0; i--)
		if( next[i] == '*' ){
			next[i] = +last[i]+1;
			mom = this._makeMoment(next.slice(), last);
			if( mom.isAfter(this.lastTime) )
				return mom;
		}

    //unless its a singleton schedule (no *s no repeats and no ranges), this
    // part of the code should never get executed (its more efficient to use
    // javascript setTimeout for one time executions).
    //
	console.log("shouldn't come here");
	return this._makeMoment(next, last);
};

if( exports ){
	exports.cron = Cron;
}
