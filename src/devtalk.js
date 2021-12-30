import { get } from 'svelte/store';

import {
  SECS_RESPONSE_TIMEOUT,
  MAX_DEVICE_FAIL_COUNT,
  PAGEMODE_DEVICES,
  curPageMode,
  curDevice,
  deviceList,
  isConnected,
  msgTitle,
  msgDesc  
 } from './globals.js';

 // Device Query/Responses:
const queryStr_GetInfo    = "?";        // returns device info in JSON format
const respStr_Rebooted    = "<Reboot>"  // indicates device just rebooted
const respStr_StartInfo   = "?<"        // indicates start of device info
const respStr_FinishInfo  = ">?"        // indicates end of device info

                                        // device states:
const QSTATE_NONE         = 0;          //  not querying device now
const QSTATE_RESTART      = 1;          //  restart query on next notify
const QSTATE_WAIT_RESP    = 2;          //  waiting for response
const QSTATE_WAIT_DATA    = 3;          //  waiting for more data

/*
// format of each custom device pattern object:
{
  id: 0,                // index into this list
  text: '',             // user name of pattern
  pcmd: '',             // pattern command string
  desc: []              // pattern description array
}

// format of each custom device plugin object:
{
  id: 0,                // global unique plugin ID
  bits: 0x00,           // pluginBit_ values
  text: '',             // user name for plugin
  desc: ''              // plugin description
}

// format of each device strand info object:
{
  pixels: 0,            // number of pixels
  bright: 0,            // brightness percent
  delay: 0,             // delay msecs +/- MAX_DELAY
  force: 0,             // force (0-MAX_FORCE_VALUE)
  first: 1,             // first pixel to draw (from 1)
                        // extern mode:
  xt_mode: false,       //  enabled=1
  xt_hue: 0,            //  hue property (0-359)
  xt_white: 0,          //  white property (percent)
  xt_count: 0,          //  count property (percent)

  patname: ''           // pattern name
  patstr: '',           // pattern string
}

// format of each device info object:
{
  nstrands: 0,          // strand count (>= 1)
  npatterns: 0,         // custom device patterns
  nplugins: 0,          // custom device plugins

  maxstrlen: 0,         // max length for cmds/patterns
  numtracks: 0,         // number of tracks available
  numlayers: 0,         // number of layers available

  strands: [],          // list of strand info
  patterns: [],         // list of pattern info
  plugins: [],          // list of plugin info
}
*/

// state of each device found
export const deviceState =
{
  curname: '',          // used as topic to talk to device
  newname: '',          // used when renaming the device

  tstamp: 0,            // secs of last notify/response
  qstate: QSTATE_NONE,  // query state of this device

  failcount: 0,         // number of protocol failures
  ignore: false,        // true to ignore this device

  ready: false,         // true to stop spinner on UI
  active: false,        // true after user selected

  dinfo: {},            // holds raw JSON device output
  report: {}            // parsed device info object
};

function curTimeSecs()
{
  return Math.floor(Date.now() / 1000); // convert to seconds
}

export let deviceError = (text, title=null) =>
{
  if (title === null) title = 'Program Error';

  console.error(text == '' ? title : text);

  // trigger error message title/text
  msgDesc.set(text);
  msgTitle.set(title);

  deviceReset();

  // set state to send new device query
  device.qstate = QSTATE_RESTART;
  device.active = false;
  device.ready = false;
}

// reset currently active device and return to the discovery page
function deviceReset()
{
  let device = get(curDevice);
  if (device !== null)
  {
    if (get(curPageMode) !== PAGEMODE_DEVICES)
      curPageMode.set(PAGEMODE_DEVICES);

    curDevice.set(null);

    // triggers update to UI - MUST HAVE THIS
    deviceList.set(get(deviceList));
  }
}

function deviceQuery(device, fsend)
{
  console.log(`Device Query: "${device.curname}"`)

  device.qstate = QSTATE_WAIT_RESP;
  device.tstamp = curTimeSecs();

  fsend(device.curname, queryStr_GetInfo);
}

// create timer for receiving a connection notification
// if device doesn't respond in time, stop and remove it
let timeObj = 0;
function checkTimeout()
{
  let curlist = get(deviceList);
  if (curlist.length > 0)
  {
    let newlist = [];
    let tstamp = curTimeSecs();
    for (const device of curlist)
    {
      //console.log(`Device Check: "${device.curname}""`);
  
      if (!device.ignore &&
         ((device.tstamp + SECS_RESPONSE_TIMEOUT) < tstamp))
      {
        console.warn(`Device Lost: "${device.curname}"`);

        if (device.active)
        {
          // trigger error message title/text
          msgDesc.set('The device you were using just disconnected.');
          msgTitle.set('Device Disconnect');

          deviceReset();
        }
      }
      else newlist.push(device);
    }

    deviceList.set(newlist);
  }

  timeObj = setTimeout(checkTimeout, (1000 * SECS_RESPONSE_TIMEOUT));
}

// if lose connection, clear devices
export const onConnection = (enabled) =>
{
  if (enabled) checkTimeout();
  else
  {
    if (timeObj)
    {
      clearTimeout(timeObj);
      timeObj = 0;
    } 

    deviceList.set([]);
  }

  isConnected.set(enabled);
}

export const onNotification = (msg, fsend) =>
{
  const info = msg.split(',');
  const name = info[0];

  //console.log(`Device Notify: "${name}" IP=${info[1]}`);

  for (const device of get(deviceList))
  {
    if (device.ignore) continue;

    device.tstamp = curTimeSecs();

    if (device.curname === name)
    {
      if (device.qstate == QSTATE_RESTART)
        deviceQuery(device, fsend);

      return; // don't add this device
    }
    else if (device.newname === name)
    {
      console.log(`Device Rename: "${name}"`);

      device.curname = name;
      device.newname = '';

      return; // don't add this device
    }
  }

  console.log(`Device Add: "${name}"`);

  let device = {...deviceState};
  device.curname = name;
  get(deviceList).push(device);

  deviceQuery(device, fsend);

  // triggers update to UI - MUST HAVE THIS
  deviceList.set(get(deviceList));
}

export const onDeviceReply = (msg) =>
{
  //console.log(`Device Reply: ${msg}`)

  const reply = msg.split('\n');
  const name = reply[0];
  reply.shift();

  let device = null;
  const dlist = get(deviceList);
  for (const d of dlist)
  {
    if (d.curname === name)
    {
      device = d;
      break;
    }
  }

  if (device !== null)
  {
    if (device.ignore) return;

    device.tstamp = curTimeSecs();

    if (reply[0] === respStr_Rebooted)
    {
      console.log(`>> Device Reboot: "${name}"`);

      if (device.active)
      {
        // trigger error message title/text
        msgDesc.set('The device you were using just restarted.');
        msgTitle.set('Device Restart');

        deviceReset();
      }
      else if (device.ready)
      {
        device.ready = false;
        device.qstate = QSTATE_RESTART;
      }
      return;
    }
    else if (device.qstate === QSTATE_WAIT_RESP)
    {
      if (reply[0] === respStr_StartInfo)
      {
        //console.log('Starting device info...');
        device.qstate = QSTATE_WAIT_DATA;
        device.dinfo = '';
        return;
      }
    }
    else if (device.qstate === QSTATE_WAIT_DATA)
    {
      if (reply[0] === respStr_FinishInfo)
      {
        //console.log('...Ending device info');
        try
        {
          device.report = JSON.parse(device.dinfo);
          device.qstate = QSTATE_NONE;
          device.ready = true;

          console.log(`Device Ready: "${device.curname}"`)
          console.log(device.report);
        
          // triggers update to UI - MUST HAVE THIS
          deviceList.set(get(deviceList));
        }
        catch (e)
        {
          console.warn(`Device Fail: "${device.curname}" JSON=${device.dinfo}`);

          if (++device.failcount > MAX_DEVICE_FAIL_COUNT)
            device.ignore = true;
        }
      }
      else
      {
        //console.log(`<< ${reply[0]}`);
        device.dinfo += reply[0];
      }
      return;
    }
  }

  console.warn(`>> Device Ignore: "${name}" reply=${reply[0]}`);
}
