gcron
=====
Cron like scheduler for Node, with one (minor?) difference.
When used with steps that do not properly divide 60 (or 12 for months), Cron
rounds off the values to 0 when it exceeds that current limit. This library, on
the other hand, will continue stepping through original values. For example,
*/7 * * * * will start from current minute and keep adding 7, wrapping arround
to next minute, continuing with what is left from previous minute. This is useful
when repeated alarms are set.
One exception to the above is when you use multiple repeats or list/ranges for
higher units (in that case lower units are reset to their start values).

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

## Limitations
    Seconds and weeks are not supported
    Names for months are not supported yet
