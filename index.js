var util = require('util');
var stream = require('stream');

util.inherits(Driver,stream);

var log = console.log;

function Driver(opts,app) {

  app.once('client::up',function(){
    // Add all the xbmc instances previously seen
    for (var ip in opts.xbmc) {
      this.add(ip, opts.xbmc[ip]);
    }
  }.bind(this));

}


/* Example from spotify

{
  "state":{
    "track_id":"spotify:track:4TNFuLbPd1JULG0krJ4unF",
    "volume":100,
    "position":0,
    "state":"playing"
  },
  "track":{
    "artist":"Yelle",
    "album":"Safari Disco Club",
    "disc_number":0,
    "duration":287,
    "played_count":24,
    "track_number":12,
    "starred":true,
    "popularity":35,
    "id":"spotify:track:4TNFuLbPd1JULG0krJ4unF",
    "name":"Que Veux-Tu - Madeon Extended Remix",
    "album_artist":"Yelle",
    "spotify_url":"spotify:track:4TNFuLbPd1JULG0krJ4unF"
  },
  "image":"https://d3rt1990lpmkn.cloudfront.net/640/06d04c1b7905f5248bbe4422da2ae275723f386a"

  */
module.exports = Driver;
