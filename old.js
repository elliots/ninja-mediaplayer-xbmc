old.js
var XbmcApi = require('xbmc'),
    util = require('util'),
    stream = require('stream'),
    http = require('http'),
    https = require('https');

// ES: This code is horrid. Please fix it.

var log = console.log;

util.inherits(driver,stream);
util.inherits(XBMCDevice,stream);


function driver(opts, app) {

  this._app = app;
  this._opts = opts;
  this._opts.xbmc = opts.xbmc || {};

  this._devices = {};

  var initialised = false;

  app.on('client::up',function(){
    if (!initialised) {
      initialised = true;
      for (var ip in opts.xbmc) {
        this.add(ip, opts.xbmc[ip]);
      }
    }

    this.scan();
  }.bind(this));

}

driver.prototype.config = function(rpc,cb) {

  var self = this;

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
          { "type": "input_field_text", "field_name": "name", "value": "XBMC", "label": "Name", "placeholder": "LoungeRoom", "required": true},
          { "type": "paragraph", "text":"Note: You must enable the JSON-RPC interface with the xbmc setting 'Allow programs on other systems to control XBMC'"},
          { "type": "submit", "name": "Add", "rpc_method": "add" }
        ]
      });
      break;
    case 'add':
      self._opts.xbmc[rpc.params.ip] = rpc.params.name;
      self.save();
      self.add(rpc.params.ip, rpc.params.name);
      cb(null, {
        "contents": [
          { "type":"paragraph", "text":"XBMC at http://" + rpc.params.ip + ":9090 (name : " + rpc.params.name + ") added."},
          { "type":"close", "text":"Close"}
        ]
      });
      break;
    case 'rick-roll':
      self.rickRoll();
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


driver.prototype.rickRoll = function() {
  for (ip in this._devices) {
    var device = this._devices[ip];
    log('rickrolling', device.G);
    device._xbmc.player.openYoutube('y2Y7xqAlUHk');
  }
};

driver.prototype.add = function(ip, name) {

  if (this._devices[ip]) {
    return;
  }

  this._app.log.info('Xbmc: Adding:' + name + ' (' + ip + ')');
  var self = this;
  var parentDevice = new XBMCDevice(ip, 9090, name, self._app);
  self._devices[ip] = parentDevice;

  Object.keys(parentDevice.devices).forEach(function(id) {
    log('Adding sub-device', id, parentDevice.devices[id].G);
    self.emit('register', parentDevice.devices[id]);
  });
};

driver.prototype.scan = function () {
  var mdns;
  try {
    mdns = require('mdns');
  } catch(e) {
    log('MDNS not available. Automatically discovery of XBMC using ZeroConf is not possible.');
    return;
  }

  log('MDNS: Scanning');
  var self = this;

  var browser = new mdns.Browser(mdns.tcp('xbmc-jsonrpc'));
  browser.on('serviceUp', function(service) {
    log("MDNS: service up: ", service);

    if (!self._devices[service.addresses[0]]) {
      self.add(service.addresses[0], service.name);
    }

  });
  browser.on('serviceDown', function(service) {
    log("MDNS: service down: ", service);
  });
  browser.start();

};

module.exports = driver;


function XBMCDevice(host, port, name, app) {

  this.host = host;
  this.port = port;
  this.name = name && name.length > 0? name : host;
  this.app = app;

  this._connection = new XbmcApi.TCPConnection({
    host: host,
    port: port,
    verbose: false
  });

  this._xbmc = new XbmcApi.XbmcApi({silent:true});

  this._xbmc.setConnection(this._connection);

  var self = this;
  this._xbmc.on('connection:open', function() {
    self.devices.hid.emit('data', 'connected');
    //self.devices.camera.emit('data', 1);
    //self.devices.displayText.emit('data', 1);
    //self.devices.temperature.emit('data', 'xxx');
    //self._xbmc.message('Online.', 'NinjaBlocks', 1000);// 'http://www.sydneyangels.net.au/wp-content/uploads/2012/09/ninjablocks_logo.png');
  });


  this._xbmc.on('connection:close', function() {
    //log('Xbmc connection closed. Reconnecting in 10 seconds');
    setTimeout(self._connection.create.bind(self), 10000);
  });

  'play,pause,add,update.clear,scanstarted,scanfinished,screensaveractivated,screensaverdeactivated'
    .split(',').forEach(  function listenToNotification(name) {

      self._xbmc.on('notification:'+name, function(e) {
        self.devices.hid.emit('data', name);
      });
    });

  self._xbmc.on('connection:data', function(e) {
    log('onData', e);
  });

  function hid() {
    this.readable = true;
    this.writeable = true;
    this.V = 0;
    this.D = 14;
    this.G = self.name.replace(/[^a-zA-Z0-9]/g, '') + self.port;
  }

  util.inherits(hid, stream);

  hid.prototype.write = function(data) {
      self._xbmc.input.ExecuteAction(data);
  };

  function displayText() {
    this.readable = true;
    this.writeable = true;
    this.V = 0;
    this.D = 240;
    this.G = self.name.replace(/[^a-zA-Z0-9]/g, '') + self.port;
  }

  util.inherits(displayText, stream);


  displayText.prototype.write = function(data) {
    log('XBMC - received text to display', data);
    self._xbmc.message(data);
    return true;
  };

  function temperature() {
    this.readable = true;
    this.writeable = false;
    this.V = 0;
    this.D = 202;
    this.G = self.name.replace(/[^a-zA-Z0-9]/g, '') + self.port;

    var device = this;


    setInterval(function() {
      self.getInfoLabels(['System.CPUTemperature'], function(data) {

        var celsius = (parseFloat(data['System.CPUTemperature'].match(/[0-9\.]*/))- 32) * 5 / 9;
        device.emit('data', celsius.toFixed(1));
      });
    }, 10000);
  }

  util.inherits(temperature, stream);

  function camera() {
    this.writeable = true;
    this.readable = true;
    this.V = 0;
    this.D = 1004;
    this.G = self.host.replace(/[^a-zA-Z0-9]/g, '') + self.port;
    this._guid = [self.app.id,this.G,this.V,this.D].join('_');

    log("Camera guid", this._guid);

  }

  util.inherits(camera, stream);

  camera.prototype.write = function(data) {

    var postOptions = {
      host:self.app.opts.streamHost,
      port:self.app.opts.streamPort,
      path:'/rest/v0/camera/'+this._guid+'/snapshot',
      method:'POST'
    };

    var proto = (self.app.opts.streamPort==443) ? https:http;

    log('Requesting current playing');
    self._xbmc.media.api.send('Player.GetActivePlayers').then(function(data) {
      if (data.result && data.result.length) {
        self._xbmc.media.api.send('Player.GetItem', {
          playerid: data.result[0].playerid,
          properties: ['thumbnail']
        }).then(function(data) {
          if (!data.result.item.thumbnail) {
            console.warn("No thumbnail available!");
            return;
          }
          var thumbnail = "http://" + self.host + ':8080/image/' + encodeURIComponent(data.result.item.thumbnail);

          log('Sending thumbnail : ' + thumbnail);

          var getReq = http.get(thumbnail,function(getRes) {

            postOptions.headers = getRes.headers;
            postOptions.headers['X-Ninja-Token'] = self.app.token;
            log('token', self.app.token);

            var postReq = proto.request(postOptions,function(postRes) {

              postRes.on('end',function() {
                log('Stream Server ended');
              });
              postRes.resume();
            });

            postReq.on('error',function(err) {
              log('Error sending picture: ');
              log(err);
            });

            var lenWrote=0;
            getRes.on('data',function(data) {
              postReq.write(data,'binary');
              lenWrote+=data.length;
            });

            getRes.on('end',function() {
              postReq.end();
              log("Image sent %s",lenWrote);
            });
            getRes.resume();
          });
          getReq.on('error',function(error) {
            log(error);
          });
          getReq.end();

        });
      } else {
        log("Nothing is currently playing");
      }
    });

    return true;
  };

  this.devices = {
    hid: new hid(),
    camera: new camera(),
    displayText: new displayText(),
    temperature: new temperature()
  };

}

XBMCDevice.prototype.getInfoLabels = function(labels, cb) {
  this._xbmc.player.api.send('XBMC.GetInfoLabels', {
    labels: labels
  }).then(function(data) {
    //log('xxx', data);
    cb(data.result);
  });
};

XBMCDevice.prototype.end = function() {};
XBMCDevice.prototype.close = function() {};
/*

var dumpEvent = function(event) {
  if (event && event.method)
    log(event.method, event);
};

xbmcApi.on('connection:data', function(e) {
  log('onData', e);
});

xbmcApi.on('notification', function() {
  log(111);
});

xbmcApi.on('connection:open', dumpEvent);

xbmcApi.on('connection:close', dumpEvent);

xbmcApi.on('connection:error', dumpEvent);

xbmcApi.on('api:movie', dumpEvent);

xbmcApi.on('api:episode', dumpEvent);

xbmcApi.on('api:playerStopped', dumpEvent);

xbmcApi.on('api:video', dumpEvent);

xbmcApi.on('notification:play', dumpEvent);

xbmcApi.on('notification:pause', dumpEvent);

xbmcApi.on('notification:add', dumpEvent);

xbmcApi.on('notification:update', dumpEvent);

xbmcApi.on('notification:clear', dumpEvent);

xbmcApi.on('notification:scanstarted', dumpEvent);

xbmcApi.on('notification:scanfinished', dumpEvent);

xbmcApi.on('notification:screensaveractivated', dumpEvent);

xbmcApi.on('notification:screensaverdeactivated', dumpEvent);

log('done');*/


