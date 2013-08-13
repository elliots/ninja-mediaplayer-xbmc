// Maps a single Xbmc instance to a NinjaBlocks device

require('util').inherits(XbmcDevice, require('stream'));

function XbmcDevice(name, ip, port) {

    console.log('Starting xbmc device', name, ip, port);

  this.writeable = true;
  this.readable = true;
  this.V = 0;
  this.D = 281;
  this.G = 'xbmc';
  this.name = 'XBMC - ' + name;
  this._ip = ip;
  this._port = port;

  setTimeout(function() {
    this.emit('xbmc:connect');
  }.bind(this), 10);

}

module.exports = XbmcDevice;


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
