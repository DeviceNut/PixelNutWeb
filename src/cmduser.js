import { get } from 'svelte/store';

import {
  defDeviceName,
  MIN_TRACK_LAYERS,
  PAGEMODE_CONTROLS,
  curPageMode,
  curDevice,
  nTracks,
  tLayers,
  nStrands,
  idStrand,
  pStrand,
  aStrands,
  eStrands,
  dStrands,
  aBuiltinPats,
  aStoredPats,
  aEffectsDraw,
  aEffectsFilter,
  aTriggers
} from './globals.js';

import {
  DRAW_LAYER,
  MAX_BYTE_VALUE,
  cmdStr_DeviceName    ,
  cmdStr_PullTrigger   ,
  cmdStr_Pause         ,
  cmdStr_Resume        ,
  cmdStr_SaveFlash     ,
  cmdStr_AddrStrand    ,
  cmdStr_AddrLayer     ,
  cmdStr_OR_Bright     ,
  cmdStr_OR_Delay      ,
  cmdStr_OR_Props      ,
  cmdStr_SetXmode      ,
  cmdStr_SetFirst      ,
  cmdStr_Clear         ,
  cmdStr_PcentBright   ,
  cmdStr_MsecsDelay    ,
  cmdStr_DegreeHue     ,
  cmdStr_PcentWhite    ,
  cmdStr_PcentCount    ,
  cmdStr_OrideBits     ,
  cmdStr_Direction     ,
  cmdStr_OwritePixs    ,
  cmdStr_TrigFromLayer ,
  cmdStr_TrigFromMain  ,
  cmdStr_TrigForce     ,
  cmdStr_TrigCount     ,
  cmdStr_TrigMinTime   ,
  cmdStr_TriggerRange  ,
} from './pixcmds.js';

import {
  strandClearAll,
  strandCopyAll,
  strandCopyTop,
  strandCopyLayer,
  strandCopyTracks,
  makeNewStrand
} from './strands.js';

import {
  convTrackLayerToID,
  makeOrideBits,
  makeLayerCmdStr,
  makeEntireCmdStr,
  makeTrackCmdStrs,
  makeTrigSourceList
} from './cmdmake.js';

import { parsePattern } from './cmdparse.js';
import { mqttSend } from './mqtt.js';

///////////////////////////////////////////////////////////

function sendDevice(cmdstr)
{
  let device = get(curDevice);
  if (device === null)
    console.warn(`No current device (\"${cmdstr}\"`)
  else if (!device.active)
    console.warn(`No active device (\"${cmdstr}\"`)
  else
  {
    console.log('>>', cmdstr); // DEBUG
    mqttSend(device.name, cmdstr);
  }
}

function sendCmd(cmdstr)
{
  const sid = get(idStrand);
  let didone = false;

  if (get(pStrand).selected)
    sendDevice(cmdstr); // send to current strand

  for (let s = 0; s < get(nStrands); ++s)
  {
    if ((s !== sid) && get(aStrands)[s].selected)
    {
      sendDevice(cmdStr_AddrStrand.concat(s));
      sendDevice(cmdstr);
      didone = true;
    }
  }

  if (didone) sendDevice(cmdStr_AddrStrand.concat(sid));
}

export const sendEntireCmdStr = () =>
{
  sendCmd(cmdStr_SaveFlash);
  sendCmd(cmdStr_Clear.concat(' ', get(pStrand).curPatternStr));
  sendCmd(cmdStr_SaveFlash);
  sendCmd('0'); // triggers executing that pattern just stored
}

function sendCmdCheck(cmdstr)
{
  if (get(pStrand).curPatternStr !== '')
    sendCmd(cmdstr);
}

// send command (and optional value) to entire strand
function sendStrandCmd(cmdstr, cmdval)
{
  if (cmdval !== undefined)
       sendCmdCheck(cmdstr.concat(cmdval));
  else sendCmdCheck(cmdstr);
}

// send command (and optional value) to specific layer
function sendLayerCmd(id, cmdstr, cmdval)
{
  if (cmdval !== undefined)
    cmdstr = cmdstr.concat(cmdval);

  // don't need to set back to top-of-stack?
  //let str = `${cmdStr_AddrLayer}${id} `;
  //str = str.concat(`${cmdstr} `);
  //str = str.concat(`${cmdStr_AddrLayer}`);
  //sendCmdCheck(str);

  // Note: effective only within a command string
  sendCmdCheck(`${cmdStr_AddrLayer}${id} ${cmdstr}`);
}

function updateLayerVals(track, layer)
{
  makeLayerCmdStr(track, layer);
  strandCopyLayer(track, layer);
  makeEntireCmdStr();
}

export const updateAllTracks = () =>
{
  // rebuild all tracks to account for changes
  // to tracks/layers or trigger sources

  for (let i = 0; i <= get(pStrand).tactives; ++i)
    makeTrackCmdStrs(i);

  strandCopyTracks();
  makeEntireCmdStr();
}

// must be called after any changes to the number
// or position of tracks, layers, or effect settings
export const updateTriggerLayers = () =>
{
  makeTrigSourceList();

  const strand = get(pStrand);
  let atrigs = get(aTriggers);

  // update index into trigger source list for all enabled layers
  for (let track = 0; track < strand.tactives; ++track)
  {
    for (let layer = 0; layer < strand.tracks[track].lactives; ++layer)
    {
      if (strand.tracks[track].layers[layer].trigDoLayer)
      {
        let found = false;
        let tnum = strand.tracks[track].layers[layer].trigTrackNum;
        let lnum = strand.tracks[track].layers[layer].trigLayerNum;

        for (const [i, item] of atrigs.entries())
        {
          if (item.id > 0) // not placeholder entry
          {
            if ((item.tnum === tnum) && (item.lnum === lnum))
            {
              found = true;
              strand.tracks[track].layers[layer].trigListDex = i;
              get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigListDex = i;

              //console.log('updated: ', track, layer, tnum, lnum, i, item); // DEBUG
            }
          }
        }

        if (!found)
        {
          //console.log('disabling trigger (track,layer): ', track, layer); // DEBUG

          strand.tracks[track].layers[layer].trigDoLayer = false;
          strand.tracks[track].layers[layer].trigListDex = 0;

          get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoLayer = false;
          get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigListDex = 0;
        }
      }
    }
  }
}

// Commands from Header:

export const userSetDevName = () =>
{
  let name = get(curDevice).name;
  // TODO disallow some chars for device name
  if (name === '') name = defDeviceName;
  else sendDevice(cmdStr_DeviceName.concat(name));
}

export const userSendPause = (enable) =>
{
  const sid = get(idStrand);
  let didone = false;

  if (enable)
       sendDevice(cmdStr_Pause);
  else sendDevice(cmdStr_Resume);

  for (let s = 0; s < get(nStrands); ++s)
  {
    if ((s !== sid) && get(aStrands)[s].selected)
    {
      sendDevice(cmdStr_AddrStrand.concat(s));
      if (enable)
           sendDevice(cmdStr_Pause);
      else sendDevice(cmdStr_Resume);
      didone = true;
    }
  }

  if (didone) sendDevice(cmdStr_AddrStrand.concat(sid));
}

// Commands from Strand Selector

export const userStrandCombine = (combine) =>
{
  if (!combine) // user turned off combine
  {
    // must disable all but the current one
    for (let i = 0; i < get(nStrands); ++i)
    {
      if (i === get(idStrand))
      {
        get(aStrands)[i].selected = true;
        get(eStrands)[i] = true;
      }
      else
      {
        get(aStrands)[i].selected = false;
        get(eStrands)[i] = false;
      }
    }

    aStrands.set(get(aStrands)); // triggers update
  }
}

function switchStrands(s)
{
  idStrand.set(s);
  pStrand.set(get(aStrands)[s]);
  sendDevice(cmdStr_AddrStrand.concat(s));
}

export const userStrandSelect = (combine) =>
{
  let cur = get(idStrand);
  for (let s = 0; s < get(nStrands); ++s)
  {
    let wason = get(eStrands)[s];
    let nowon = get(aStrands)[s].selected;

    if (wason !== nowon)
    {
      if (nowon && !combine && (s !== cur))
      {
        // user selected a different strand
        get(aStrands)[cur].selected = false;
        switchStrands(s);
        get(eStrands)[cur] = false;
        get(eStrands)[s] = true;
      }
      else if (nowon && combine && (s !== cur))
      {
        get(eStrands)[cur] = true;
        strandCopyAll();

        // mirror current strand by sending entire current command to newly selected strand
        sendDevice(cmdStr_AddrStrand.concat(s));
        sendEntireCmdStr();
        sendDevice(cmdStr_AddrStrand.concat(sid));
      }
      else if (!nowon && combine && (s === cur))
      {
        // disabled the current strand, so set to first enabled one
        for (let ss = 0; ss < get(nStrands); ++ss)
        {
          if (get(aStrands)[ss].selected)
          {
            switchStrands(ss);
            break;
          }
        }
        get(eStrands)[s] = false;
      }
      else if (nowon && (s === cur))
      {
        // must resend entire command string
        // after having all strands disabled
        sendEntireCmdStr();
      }
      else
      {
        // else just update current enables, but do nothing
        // when just disabling one when others still enabled
        get(eStrands)[s] = get(aStrands)[s].selected;
      }
    }
  }
}

// Pattern Commands from PanelMain: 

// user just selected pattern to use
export const userSetPattern = (name, cmdstr) =>
{
  const strand = get(pStrand);

  strandClearAll();

  strand.patternName = name;
  strand.orgPatternStr = cmdstr;

  if (parsePattern(cmdstr)) // sets vars for current strand
  {
    strandCopyAll();
    sendEntireCmdStr();
  }
  // else software bug? FIXME?
}

export const userClearPattern = () =>
{
  const strand = get(pStrand);

  strandClearAll();

  sendCmd(cmdStr_Clear);
  makeEntireCmdStr();

  strand.showCustom = false;
  strand.patternName = '';

  strand.userChanged = false; // must reset after clear
}

// Pattern Commands from PanelCustom: 

/*
// user just edited pattern string - DISABLED TODO
export const userEditPattern = () =>
{
  let cmdstr = get(pStrand).curPatternStr;

  strandClearAll();

  if (parsePattern(cmdstr)) // sets vars for current strand
  {
    strandCopyAll();
    sendEntireCmdStr();
  }
  else get(pStrand).curPatternStr = get(pStrand).backupCmds;
}
*/

// Commands from PanelMain:

export const userSetBright = (track) =>
{
  if (track === undefined)
  {
    let bright = get(pStrand).pcentBright;
    if (get(dStrands)[get(idStrand)].pcentBright !== bright)
    {
      get(dStrands)[get(idStrand)].pcentBright = bright;

      strandCopyTop();
      sendStrandCmd(cmdStr_OR_Bright, bright);
    }
  }
  else
  {
    let bright = get(pStrand).tracks[track].drawProps.pcentBright;
    if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentBright !== bright)
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentBright = bright;

      updateLayerVals(track, DRAW_LAYER);
  
      let layerid = convTrackLayerToID(track, DRAW_LAYER);
      sendLayerCmd(layerid, cmdStr_PcentBright, bright);
    }
  }
}

export const userSetDelay = (track) =>
{
  if (track === undefined)
  {
    let delay = get(pStrand).msecsDelay;
    if (get(dStrands)[get(idStrand)].msecsDelay !== delay)
    {
      get(dStrands)[get(idStrand)].msecsDelay = delay;

      strandCopyTop();
      sendStrandCmd(cmdStr_OR_Delay, delay);
    }
  }
  else
  {
    let delay = get(pStrand).tracks[track].drawProps.msecsDelay;
    if (get(dStrands)[get(idStrand)].tracks[track].drawProps.msecsDelay !== delay)
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.msecsDelay = delay;

      updateLayerVals(track, DRAW_LAYER);

      let layerid = convTrackLayerToID(track, DRAW_LAYER);
      sendLayerCmd(layerid, cmdStr_MsecsDelay, delay);
    }
  }
}

export const userSetRotate = () =>
{
  let firstp = get(pStrand).firstPixel;
  if (get(dStrands)[get(idStrand)].firstPixel !== firstp)
  {
    get(dStrands)[get(idStrand)].firstPixel = firstp;

    strandCopyTop();
    sendStrandCmd(cmdStr_SetFirst, firstp);
  }
}

export const userSetOverMode = () =>
{
  let oride = get(pStrand).doOverride;
  if (get(dStrands)[get(idStrand)].doOverride !== oride)
  {
    get(dStrands)[get(idStrand)].doOverride = oride;

    sendStrandCmd(cmdStr_SetXmode, oride ? 1 : 0);
    if (!oride) // must resend any props that were overriden
    {
      for (let i = 0; i < get(pStrand).tactives; ++i)
      {
        let props = get(pStrand).tracks[i].drawProps;
        let layerid = convTrackLayerToID(i, DRAW_LAYER);

        if (props.overHue)
          sendLayerCmd(layerid, cmdStr_DegreeHue, `${props.degreeHue}`);

        if (props.overWhite)
          sendLayerCmd(layerid, cmdStr_PcentWhite, `${props.pcentWhite}`);

        if (props.overCount)
          sendLayerCmd(layerid, cmdStr_PcentCount, `${props.pcentCount}`);
      }
    }
  }
}

export const userSetProps = () =>
{
  const strand = get(pStrand);

  let hue   = strand.degreeHue;
  let white = strand.pcentWhite;
  let count = strand.pcentCount;

  if ((get(dStrands)[get(idStrand)].degreeHue  !== hue)   ||
      (get(dStrands)[get(idStrand)].pcentWhite !== white) ||
      (get(dStrands)[get(idStrand)].pcentCount !== count))
  {
    get(dStrands)[get(idStrand)].degreeHue  = hue;
    get(dStrands)[get(idStrand)].pcentWhite = white;
    get(dStrands)[get(idStrand)].pcentCount = count;

    strandCopyTop();
    sendStrandCmd(cmdStr_OR_Props, `${hue} ${white} ${count}`);
  }
}

export const userSetHue = (track) =>
{
  let hue = get(pStrand).tracks[track].drawProps.degreeHue;

  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.degreeHue !== hue)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.degreeHue = hue;

    updateLayerVals(track, DRAW_LAYER);

    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_DegreeHue, `${hue}`);
  }
}

export const userSetWhite = (track) =>
{
  let white = get(pStrand).tracks[track].drawProps.pcentWhite;

  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentWhite !== white)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentWhite = white;

    updateLayerVals(track, DRAW_LAYER);

    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_PcentWhite, `${white}`);
  }
}

export const userSetCount = (track) =>
{
  let count = get(pStrand).tracks[track].drawProps.pcentCount;

  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentCount !== count)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentCount = count;

    updateLayerVals(track, DRAW_LAYER);

    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_PcentCount, `${count}`);
  }
}

export const userSetForce = () =>
{
  // do nothing when user changes force value
}

export const userSendTrigger = () =>
{
  sendCmdCheck(cmdStr_PullTrigger.concat(get(pStrand).forceValue));
}

// Commands from ControlsDraw:

export const userSetDrawEffect = (track) =>
{
  const strand = get(pStrand);
  let pindex = strand.tracks[track].layers[DRAW_LAYER].pluginIndex;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[DRAW_LAYER].pluginIndex !== pindex)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[DRAW_LAYER].pluginIndex = pindex;

    let bits = get(aEffectsDraw)[pindex].bits;
    strand.tracks[track].layers[DRAW_LAYER].pluginBits = bits;
    get(dStrands)[get(idStrand)].tracks[track].layers[DRAW_LAYER].pluginBits = bits;

    updateTriggerLayers();

    // must update all tracks and resend entire command
    // when an effect is changed
    updateAllTracks();
    sendEntireCmdStr();
  }
}

export const userSetOverrides = (track) =>
{
  const strand = get(pStrand);
  let bits = makeOrideBits(strand, track);
  let props = strand.tracks[track].drawProps;

  if (makeOrideBits(get(dStrands)[get(idStrand)], track) !== bits)
  {
    updateLayerVals(track, DRAW_LAYER);
  
    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_OrideBits, bits);

    if (get(dStrands)[get(idStrand)].tracks[track].drawProps.overHue != props.overHue)
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.overHue = props.overHue;
      if (!props.overHue)
           sendLayerCmd(layerid, cmdStr_DegreeHue, `${props.degreeHue}`);
      else sendLayerCmd(layerid, cmdStr_DegreeHue, `${strand.degreeHue}`);
    }

    if (get(dStrands)[get(idStrand)].tracks[track].drawProps.overWhite != props.overWhite)
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.overWhite = props.overWhite;
      if (!props.overWhite)
           sendLayerCmd(layerid, cmdStr_PcentWhite, `${props.pcentWhite}`);
      else sendLayerCmd(layerid, cmdStr_PcentWhite, `${strand.pcentWhite}`);
    }

    if (get(dStrands)[get(idStrand)].tracks[track].drawProps.overCount != props.overCount)
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.overCount = props.overCount;
      if (!props.overCount)
           sendLayerCmd(layerid, cmdStr_PcentCount, `${props.pcentCount}`);
      else sendLayerCmd(layerid, cmdStr_PcentCount, `${strand.pcentCount}`);
    }
  }
}

export const userSetStart = (track) =>
{
  const strand = get(pStrand);
  let start = strand.tracks[track].drawProps.pcentStart;

  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentStart !== start)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentStart = start;

    let length = strand.tracks[track].drawProps.pcentFinish - start;
    if (length > 0)
    {
      updateLayerVals(track, DRAW_LAYER);

      // must resend entire command when start/fnish has changed
      sendEntireCmdStr();
      return false;
    }
    else
    {
      strand.tracks[track].drawProps.pcentFinish = start;
      return true; // cause reactive change and call to userSetFinish()
    }
  }
}

export const userSetFinish = (track) =>
{
  const strand = get(pStrand);
  let finish = strand.tracks[track].drawProps.pcentFinish;

  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentFinish !== finish)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentFinish = finish;

    let length = finish - strand.tracks[track].drawProps.pcentStart;
    if (length > 0)
    {
      updateLayerVals(track, DRAW_LAYER);

      // must resend entire command when start/fnish has changed
      sendEntireCmdStr();
      return false;
    }
    else
    {
      strand.tracks[track].drawProps.pcentStart = finish;
      return true; // cause reactive change and call to userSetStart()
    } 
  }
}

export const userSetOwrite = (track) =>
{
  let orval = get(pStrand).tracks[track].drawProps.orPixelVals;

  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.orPixelVals !== orval)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.orPixelVals = orval;

    updateLayerVals(track, DRAW_LAYER);

    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_OwritePixs, (orval ? 1 : 0));
  }
}

export const userSetDirect = (track) =>
{
  let rdir = get(pStrand).tracks[track].drawProps.reverseDir;

  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.reverseDir !== rdir)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.reverseDir = rdir;

    updateLayerVals(track, DRAW_LAYER);

    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_Direction, (rdir ? 0 : 1)); // 1 is default
  }
}

export const userSetTrigStart = (track, layer) =>
{
  if (layer === undefined) layer = 0;

  let dostart = get(pStrand).tracks[track].layers[layer].trigAutoStart;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigAutoStart !== dostart)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigAutoStart = dostart;

    get(pStrand).tracks[track].layers[layer].trigTypeStr = (dostart ? 'once' : 'none');
    userSetTrigType(track, layer);
  }
}

export const userSetTrigMain = (track, layer) =>
{
  // TODO: if not new firmware then must send
  //       entire command string if turning off

  if (layer === undefined) layer = 0;

  let domain = get(pStrand).tracks[track].layers[layer].trigFromMain;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigFromMain !== domain)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigFromMain = domain;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigFromMain, (domain ? undefined : 0));
    // don't need to send value if enabling (1 is default)
  }
}

// Commands from ControlsFilter:

export const userSetFilterEffect = (track, layer) =>
{
  const strand = get(pStrand);
  let pindex = strand.tracks[track].layers[layer].pluginIndex;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].pluginIndex !== pindex)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].pluginIndex = pindex;

    let bits = get(aEffectsFilter)[pindex].bits;
    strand.tracks[track].layers[layer].pluginBits = bits;
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].pluginBits = bits;

    //console.log('setfilter: ', pindex, bits);
    updateTriggerLayers();

    // must update all tracks and resend entire command
    // when an effect is changed
    updateAllTracks();
    sendEntireCmdStr();
  }
}

export const userSetTrigLayer = (track, layer) =>
{
  const strand = get(pStrand);
  let dolayer = strand.tracks[track].layers[layer].trigDoLayer;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoLayer !== dolayer)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoLayer = dolayer;

    let tracknum = strand.tracks[track].layers[layer].trigTrackNum;
    let layernum = strand.tracks[track].layers[layer].trigLayerNum;

    let tlayer = MAX_BYTE_VALUE; // indicates disabled state
    if (dolayer) tlayer = convTrackLayerToID(tracknum-1, layernum-1);
    
    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigFromLayer, tlayer);
  }
}

// if this is called then dolayer has already been enabled
export const userSetTrigNums = (track, layer) =>
{
  const strand = get(pStrand);
  let tracknum = strand.tracks[track].layers[layer].trigTrackNum;
  let layernum = strand.tracks[track].layers[layer].trigLayerNum;

  if ((get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTrackNum !== tracknum) ||
      (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigLayerNum !== layernum))
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTrackNum = tracknum;
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigLayerNum = layernum;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    let tlayer = convTrackLayerToID(tracknum-1, layernum-1);
    sendLayerCmd(layerid, cmdStr_TrigFromLayer, tlayer);
  }
}

// must recreate entire command string if no-triggering is chosen
export const userSetTrigType = (track, layer) =>
{
  const strand = get(pStrand);
  let valstr = strand.tracks[track].layers[layer].trigTypeStr;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTypeStr !== valstr)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTypeStr = valstr;

    if (valstr === 'none')
    {
      updateLayerVals(track, layer);

      // must resend entire command to remove trigger
      sendEntireCmdStr();
    }
    else if (valstr === 'once')
    {
      updateLayerVals(track, layer);

      let layerid = convTrackLayerToID(track, layer);
      sendLayerCmd(layerid, cmdStr_TriggerRange); // no value is set for 'once' type
    }
    else if (valstr === 'auto')
    {
      if (!userSetTrigDrange(track, layer))
      {
        updateLayerVals(track, layer);

        let layerid = convTrackLayerToID(track, layer);
        let range = strand.tracks[track].layers[layer].trigDelayRange;
        sendLayerCmd(layerid, cmdStr_TriggerRange, range);
      }
    }
  }
}

export const userSetTrigRandom = (track, layer) =>
{
  const strand = get(pStrand);
  let dorep = strand.tracks[track].layers[layer].trigDoRepeat;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoRepeat !== dorep)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoRepeat = dorep;

    if (dorep)
    {
      updateLayerVals(track, layer);

      let layerid = convTrackLayerToID(track, layer);
      sendLayerCmd(layerid, cmdStr_TrigCount); // no value is set for random
    }
    else if (!userSetTrigCount(track, layer))
    {
      updateLayerVals(track, layer);

      let layerid = convTrackLayerToID(track, layer);
      let count = strand.tracks[track].layers[layer].trigRepCount;
      sendLayerCmd(layerid, cmdStr_TrigCount, count);
    }
  }
}

// return true if did set new value, else false
export const userSetTrigCount = (track, layer) =>
{
  let count = get(pStrand).tracks[track].layers[layer].trigRepCount;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigRepCount !== count)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigRepCount = count;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigCount, count);
    return true;
  }
  return false;
}

export const userSetTrigDmin = (track, layer) =>
{
  let dmin = get(pStrand).tracks[track].layers[layer].trigDelayMin;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDelayMin !== dmin)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDelayMin = dmin;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigMinTime, dmin);
  }
}

// return true if did set new value, else false
export const userSetTrigDrange = (track, layer) =>
{
  let dmax = get(pStrand).tracks[track].layers[layer].trigDelayRange;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDelayRange !== dmax)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDelayRange = dmax;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TriggerRange, dmax);

    return true;
  }
  return false;
}

export const userSetForceType = (track, layer) =>
{
  let isrand = get(pStrand).tracks[track].layers[layer].forceRandom;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].forceRandom !== isrand)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].forceRandom = isrand;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);

    if (!isrand)
    {
      let force = get(pStrand).tracks[track].layers[layer].forceValue;
      sendLayerCmd(layerid, cmdStr_TrigForce, force);
    }
    else sendLayerCmd(layerid, cmdStr_TrigForce);
  }
}

export const userSetForceValue = (track, layer) =>
{
  let force = get(pStrand).tracks[track].layers[layer].forceValue;

  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].forceValue !== force)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].forceValue = force;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigForce, force);
  }
}

export let userDeviceSetup = (device) =>
{
  console.log(`Connecting to: "${device.name}"...`); // DEBUG

  let scount = device.report.scount;

  let numtracks = device.report.numtracks;
  let numlayers = device.report.numlayers;
  let tracklayers = numlayers / numtracks;

  if (tracklayers < MIN_TRACK_LAYERS)
  {
    tracklayers = MIN_TRACK_LAYERS;
    numtracks = numlayers / tracklayers;
  }

  nStrands.set(scount);
  nTracks.set(numtracks);
  tLayers.set(tracklayers);

  const sid = 0;
  let slist = [];
  let elist = [];

  for (let s = 0; s < scount; ++s)
  {
    const strand = makeNewStrand(s);
    const select = (s === sid) ? true : false;

    strand.selected = select;
    strand.pcentBright = device.report.strands[s].bright;
    strand.msecsDelay  = device.report.strands[s].delay;
    strand.firstPixel  = device.report.strands[s].first;
    strand.directUp    = device.report.strands[s].direct;
    strand.numPixels   = device.report.strands[s].pixels;

    strand.doOverride  = device.report.strands[s].xt_mode;
    strand.degreeHue   = device.report.strands[s].xt_hue;
    strand.pcentWhite  = device.report.strands[s].xt_white;
    strand.pcentCount  = device.report.strands[s].xt_count;

    slist.push(strand);
    elist.push(select);
  }

  aStrands.set(slist);
  eStrands.set(elist);
  pStrand.set(slist[sid]);

  // make duplicate object to keep shadow values
  slist = [];
  for (let i = 0; i < scount; ++i)
    slist.push(makeNewStrand(i));

  dStrands.set(slist);

  device.active = true;
  curDevice.set(device);

  for (let s = 0; s < scount; ++s)
  {
    idStrand.set(s);
    pStrand.set(get(aStrands)[s]);
    
    if (!parsePattern(device.report.strands[s].pattern))
    {
      userClearPattern(); // TODO: more than this?
      return;
    }
  }

  // reset to use first strand
  idStrand.set(0);
  pStrand.set(get(aStrands)[0]);

  curPageMode.set(PAGEMODE_CONTROLS);
}
