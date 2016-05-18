gcron
=====
Cron like scheduler for Node, with one (minor?) difference.
When used with steps that do not properly divide 60 (or 12 for months), Cron
rounds off the values to 0 when it exceeds that current limit. This library, on
the other hand, will continue stepping through original values.
For example,
*/7 * * * * will start from current minute and keep adding 7, wrapping around
to next minute, continuing with what is left from previous minute. This is useful
when repeated alarms are set.

One exception to the above is when you use multiple repeats or list/ranges for
higher units (in that case lower units are reset to their start values).

Repeat steps are supported, as long as they are within the unit's boundaries
Ex: */7 * * * *
Callback is called at 7,14,21 etc minutes of every hour

Lists are supported where a comma separated ordered numbers can be provided as
possible values for any units
Ex: 1,7,9 * * * *
Callback is called at 1,7 and 9th minute of every hour

Ranges are supported where initial number (positive integer) and final number
are provided, separated by '-'
Ex: 4-10 * * * *
Callback is called for 4,5,6,7,8,9 and 10th minutes of every hour

Lists and rages can be mixed
Ex: 2,5,9-12 * * * *

Ranges and repeats can be mixed together
Ex: 2,5,9-24/3 * * * * => 2,5,9,12,15,18,21,24 * * * *


## Installation
    npm install gcron --save

## Usage
    //called every minute
    var j1 = new cron.cron('* * * * *', function(){
        console.log('tick @'+moment().format());
    });

    //called every 2nd minute
    var j1 = new cron.cron('*/2 * * * *', function(){
        console.log('tick @'+moment().format());
    });

    //called every 11th minute and does not break at the turn of hour boundary
	// ex: 10:11:00 10:22:00 10:33:00 10:44:00 10:55:00 11:06:00 11:17:00 ...
    var j3 = new cron.cron('*/7 * * * *', function(){
        console.log('tick @'+moment().format());
    });

	setTimeout(function(){
		j1.stop();
		j2.stop();
	}, 10*60*1000);

## Limitations
    Seconds and weeks are not supported
    Names for months are not supported yet
