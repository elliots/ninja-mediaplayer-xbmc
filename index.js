var util = require('util');
var stream = require('stream');

var XbmcMediaPlayer = require('./lib/XbmcMediaPlayer.js');

util.inherits(Driver,stream);

var log = console.log;

function Driver(opts,app) {

  this._opts = opts;
  this._opts.xbmc = opts.xbmc || {};

  this._devices = {};

  app.once('client::up',function(){
    // Add all the xbmc instances previously seen
    log("Starting up. Adding existing configured xbmc instances : " + opts);
    for (var ip in opts.xbmc) {
      var d = opts.xbmc[ip];
      this.add(d.ip, d.port, d.name);
    }
  }.bind(this));

}

Driver.prototype.add = function(ip, port, name) {

  if (this._devices[ip]) {
    return;
  }

  log('Xbmc: Adding:' + name + ' (' + ip + ':' + port + ')');

  var device = new XbmcMediaPlayer(name, ip, port);
  this._devices[ip] = device;

  // Only register our devices when we connect for the first time
  device.once('xbmc:connect', function() {
      this.emit('register', device);
  }.bind(this));

};

Driver.prototype.scan = function () {
  var mdns;
  try {
    mdns = require('mdns');
  } catch(e) {
    // TODO: If there are no configured devices... notify the dashboard?
    log('MDNS not available. Automatically discovery of XBMC using ZeroConf is not possible.');
    return;
  }

  log('MDNS: Scanning');
  var browser = new mdns.Browser(mdns.tcp('xbmc-jsonrpc'));

  browser.on('serviceUp', function(service) {
    log("MDNS: service up: ", service);

    if (!this._devices[service.addresses[0]]) {
      this.add(service.addresses[0], 9090, service.name);
    }

  }.bind(this));

  browser.on('serviceDown', function(service) {
    log("MDNS: service down: ", service);
  });

  browser.start();
};

Driver.prototype.config = function(rpc,cb) {

  if (!rpc) {
    return cb(null,{"contents":[
      { "type": "submit", "name": "Add manually using IP address", "rpc_method": "addModal" },
      { "type": "submit", "name": "RickRoll All The Things!", "rpc_method": "rick-roll" }
    ]});
  }

  switch (rpc.method) {
    case 'addModal':
      cb(null, {
        "contents":[
          { "type": "paragraph", "text":"Please enter the IP address of the XBMC instance as well a nickname."},
          { "type": "input_field_text", "field_name": "ip", "value": "", "label": "IP", "placeholder": "x.x.x.x", "required": true},
          { "type": "input_field_text", "field_name": "port", "value": "9090", "label": "Port", "placeholder": "9090", "required": true},
          { "type": "input_field_text", "field_name": "name", "value": "XBMC", "label": "Name", "placeholder": "LoungeRoom", "required": true},
          { "type": "paragraph", "text":"Note: You must enable the JSON-RPC interface with the xbmc setting 'Allow programs on other systems to control XBMC'"},
          { "type": "submit", "name": "Add", "rpc_method": "add" }
        ]
      });
      break;
    case 'add':
      this._opts.xbmc[rpc.params.ip] = rpc.params;
      this.save();
      this.add(rpc.params.ip, rpc.params.port, rpc.params.name);
      cb(null, {
        "contents": [
          { "type":"paragraph", "text":"XBMC at http://" + rpc.params.ip + ":9090 (name : " + rpc.params.name + ") added."},
          { "type":"close", "text":"Close"}
        ]
      });
      break;
    case 'rick-roll':
      this.rickRoll();
      cb(null, {
        "contents": [
          { "type":"paragraph", "text":"<img src='http://www.schwimmerlegal.com/rickroll.jpg'/>"},
          { "type":"close", "text":"Close"}
        ]
      });
      break;
    default:
      log('Unknown rpc method', rpc.method, rpc);
  }
};

Driver.prototype.rickRoll = function() {
  for (var ip in this._devices) {
    var device = this._devices[ip];
    log('rickrolling', device.G);
    device._xbmc.player.openYoutube('y2Y7xqAlUHk');
  }
};

module.exports = Driver;
