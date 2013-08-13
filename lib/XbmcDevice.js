// Maps a single Xbmc instance to a NinjaBlocks device

require('util').inherits(Device, require('stream'));

function XbmcDevice(name, ip, port) {

  this.writeable = true;
  this.readable = true;
  this.V = 0;
  this.D = 281;
  this.G = 'xbmc';
  this.name = 'XBMC - ' + name;
  this._ip = ip;
  this._port = port;

}

module.exports = Device;
