import { writable } from 'svelte/store'

export let defDeviceName  = 'PixelNut!';
export let titleDevices   = 'PixelNut! Devices';
export let titleHelpDocs  = 'PixelNut! Docs';

export let defCustomCmd   = 'E0 T';           // initial custom pattern when cleared

export const MQTT_BROKER_PORT       = 9001;   // MUST be 9001 for websocket
export const MSECS_WAIT_CONNECTION  = 5000;   // total time to wait for MQTT connection
export const MSECS_CHECK_TIMEOUT    = 800;    // interval between check for devices added
export const SECS_NOTIFY_TIMEOUT    = 7;      // secs since last notify for connection timeout
export const SECS_REPLY_TIMEOUT     = 3;      // secs since sent command for reply timeout

export const HELPTEXT_HEIGHT        = 45;     // height of help text panel

export const PAGEMODE_DEVICES       = 0;      // list of devices to connect to
export const PAGEMODE_CONTROLS      = 1;      // controls for specific device
export const PAGEMODE_HELPDOCS      = 2;      // controls help documentation

export const MIN_TRACKS             = 4;      // minimum tracks for built-in patterns
export const MIN_TRACK_LAYERS       = 4;      // minimum layers for each track

export let curPageMode    = writable(PAGEMODE_DEVICES);
export let prevPageMode   = writable(PAGEMODE_DEVICES);

export let mqttBrokerIP   = writable('');     // IP address string of broker
export let mqttBrokerFail = writable(false);  // true if broker connection failed
export let isConnected    = writable(false);  // true if connected to that broker

export let deviceList     = writable([]);     // list of discovered devices
export let curDevice      = writable(null);   // "points" to current device

export let helpMenuOpen   = writable(true);   // true to display help menu
export let helpActiveID   = writable(0);      // currently selected menu choice
export let helpOpenItems  = writable([]);     // list of currently expanded items
export let helpCurText    = writable('');     // text to display for selected item

export let nStrands       = writable(0);      // number of physical strands
export let idStrand       = writable(0);      // current strand index (0...nStrands-1)
export let eStrands       = writable([]);     // array of current strand enables
export let aStrands       = writable([]);     // contains all strands/tracks/layers
export let strandCombine  = writable(false);  // true to combine strands
export let dStrands       = writable([]);     // used to hold current device values
export let pStrand        = writable([]);     // "points" to current strand in aStrands

export let nTracks        = writable(0);      // total number of tracks
export let nLayers        = writable(0);      // total layers for each track
export let maxLenPattern  = writable(0);      // max length of pattern by device

export let msgTitle       = writable('');     // non-empty to cause user message popup
export let msgDesc        = writable('');     // description text for that message

                                              // for stored-in-browser:
export let aStoredPatt    = writable([]);     // list of pattern strings
export let aStoredDesc    = writable([]);     // list of help strings

                                              // for stored-in-device:
export let aDevicePatt    = writable([]);     // list of pattern strings
export let aDeviceDesc    = writable([]);     // list of help strings

                                              // created each time device is started:
export let aEffectsDraw   = writable([]);     // list of all drawing effects
export let aEffDrawDesc   = writable([]);     // list of all draw effect descriptions
export let aEffectsFilter = writable([]);     // list of all filter effects
export let aEffFilterDesc = writable([]);     // list of all filter effect descriptions

export let patsMenuOpen   = writable(false);  // true to display pattern select menu
export let patsActiveID   = writable(0);      // currently selected menu choice
export let patsMenuItems  = writable([]);     // array of menu items for current device
export let patsCurText    = writable('');     // text to display for selected item

export const MENUID_PRESETS         = 0;      // must be 0
export const MENUID_BROWSWER        = 1000;   // must be larger than highest filter effect id
export const MENUID_DEVICE          = 2000;   // must be larger than number of browser patterns

export let patsSelectedID = writable([MENUID_PRESETS]); // list of selected/expanded items
export let patsOpenItems  = writable([MENUID_PRESETS,MENUID_DEVICE,MENUID_BROWSWER]);

export let menuPresets =
{
  id: MENUID_PRESETS,
  text: "PixelNut! Presets:",
  children: [],
};

export let menuBrowser =
{
  id: MENUID_BROWSWER,
  text: "Saved to your Browser:",
  children: [],
};

export let menuDevice =
{
  id: MENUID_DEVICE,
  text: "Specific to this Device:",
  children: [],
};
