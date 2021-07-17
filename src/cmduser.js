import { get } from 'svelte/store';

import {
  DRAW_LAYER,
  MAX_BYTE_VALUE,
  cmdStr_PullTrigger   ,
  cmdStr_Pause         ,
  cmdStr_Resume        ,
  cmdStr_AddrStrand    ,
  cmdStr_AddrLayer     ,
  cmdStr_SetBright     ,
  cmdStr_SetDelay      ,
  cmdStr_SetFirst      ,
  cmdStr_SetProps      ,
  cmdStr_SetXmode      ,
  cmdStr_Clear         ,
  cmdStr_OrideBits     ,
  cmdStr_Direction     ,
  cmdStr_OwritePixs    ,
  cmdStr_TrigLayer     ,
  cmdStr_TrigManual    ,
  cmdStr_TrigForce     ,
  cmdStr_TrigCount     ,
  cmdStr_TrigMinTime   ,
  cmdStr_TriggerRange  ,
} from './pixelnut.js';

import {
  nStrands,
  idStrand,
  pStrand,
  aStrands,
  eStrands,
  dStrands,
  aBuiltinPats,
  aCustomPats,
  aEffectsDraw,
  aEffectsFilter,
  modeCustom,
  mainEnabled
} from './globals.js';

import {
  strandClearTracks,
  strandCopyAll,
  strandCopyTop,
  strandCopyLayer
} from './strands.js';

import {
  convTrackLayerToID,
  makeOrideBits,
  makeLayerCmdStr,
  makeEntireCmdStr
} from './cmdmake.js';

import { writeDevice } from './device.js'
import { parsePattern } from './cmdparse.js';

///////////////////////////////////////////////////////////

function sendCmd(cmdstr)
{
  const sid = get(idStrand);
  let didone = false;

  if (get(pStrand).selected)
    writeDevice(cmdstr); // send to current strand

  for (let s = 0; s < get(nStrands); ++s)
  {
    if ((s != sid) && get(aStrands)[s].selected)
    {
      writeDevice(cmdStr_AddrStrand.concat(s, ' ', cmdstr));
      didone = true;
    }
  }

  if (didone) writeDevice(cmdStr_AddrStrand.concat(sid));
}

export const sendEntireCmdStr = () =>
{
  sendCmd(cmdStr_Clear.concat(' ', get(pStrand).patternStr));
}

function sendCmdCheck(cmdstr)
{
  if (get(mainEnabled)) sendCmd(cmdstr);
}

// send command (and optional value) to entire strand
function sendStrandCmd(cmdstr, cmdval)
{
  if (cmdval != undefined)
        sendCmdCheck(cmdstr.concat(cmdval));
  else sendCmdCheck(cmdstr);
}

// send command (and optional value) to specific layer
function sendLayerCmd(id, cmdstr, cmdval)
{
  if (cmdval != undefined)
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

// Commands from Header:

export const userSetDevName = () =>
{
  console.log('set device name');
}

export const userSendPause = (enable) =>
{
  const sid = get(idStrand);
  let didone = false;

  for (let s = 0; s < get(nStrands); ++s)
  {
    if (enable)
    {
      writeDevice(cmdStr_AddrStrand.concat(s, ' ', cmdStr_Pause));
      didone = true;
    }
    else
    {
      writeDevice(cmdStr_AddrStrand.concat(s, ' ', cmdStr_Resume));
      didone = true;
    }
  }

  if (didone) writeDevice(cmdStr_AddrStrand.concat(sid));
}

// Commands from Strand Selector

export const userStrandCombine = (combine) =>
{
  if (!combine) // user turned off combine
  {
    // must disable all but the current one
    for (let i = 0; i < get(nStrands); ++i)
    {
      if (i == get(idStrand))
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
  writeDevice(cmdStr_AddrStrand.concat(s));
}

export const userStrandSelect = (combine) =>
{
  let cur = get(idStrand);
  for (let s = 0; s < get(nStrands); ++s)
  {
    let wason = get(eStrands)[s];
    let nowon = get(aStrands)[s].selected;

    if (wason != nowon)
    {
      if (nowon && !combine && (s != cur))
      {
        // user selected a different strand
        get(aStrands)[cur].selected = false;
        switchStrands(s);
        get(eStrands)[cur] = false;
        get(eStrands)[s] = true;
      }
      else if (nowon && combine && (s != cur))
      {
        get(eStrands)[cur] = true;
        strandCopyAll();

        // mirror current strand by sending entire current command to newly selected strand
        writeDevice(cmdStr_AddrStrand.concat(s, ' ', cmdStr_Clear, ' ', get(pStrand).patternStr));
      }
      else if (!nowon && combine && (s == cur))
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
      else if (nowon && (s == cur))
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

// user just selected pattern from list
export const userSetPattern = () =>
{
  let id = parseInt( get(pStrand).patternID );
  let name = '';
  let cmdstr = '';

  if (id > 0)
  {
    --id; // zero-base this
    let len = get(aBuiltinPats).length;
    name = (id < len) ? get(aBuiltinPats)[id].text : get(aCustomPats)[id-len].text;
    cmdstr = (id < len) ? get(aBuiltinPats)[id].cmd : get(aCustomPats)[id-len].cmd;

    strandClearTracks(); // clears entire strand to defaults

    if (parsePattern(cmdstr)) // sets vars for current strand
    {
      strandCopyAll();
      sendEntireCmdStr();
  
      get(pStrand).patternName = name;
  
      if (get(modeCustom)) get(pStrand).patternID = '0';
    }
    // software bug: all pre-builts are valid
    else console.error('Parse Failed: ', cmdstr);
  }
}

export const userClearPattern = () =>
{
  strandClearTracks();
  strandCopyAll();

  sendCmd(cmdStr_Clear);
  makeEntireCmdStr();

  modeCustom.set(false);
  get(pStrand).patternName = '';
}

// Pattern Commands from PanelCustom: 

/*
// user just edited pattern string - DISABLED FIXME
export const userEditPattern = () =>
{
  let cmdstr = get(pStrand).patternStr;

  strandClearTracks(); // clears entire strand to defaults

  if (parsePattern(cmdstr)) // sets vars for current strand
  {
    strandCopyAll();
    sendEntireCmdStr();
  }
  else get(pStrand).patternStr = get(pStrand).backupStr;
}
*/

// Commands from PanelMain:

export const userSetBright = (track) =>
{
  if (track == undefined)
  {
    let bright = get(pStrand).pcentBright;
    if (get(dStrands)[get(idStrand)].pcentBright != bright)
    {
      get(dStrands)[get(idStrand)].pcentBright = bright;

      strandCopyTop();
      sendStrandCmd(cmdStr_SetBright, bright);
    }
  }
  else
  {
    let bright = get(pStrand).tracks[track].drawProps.pcentBright;
    if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentBright != bright)
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentBright = bright;

      updateLayerVals(track, DRAW_LAYER);
  
      let layerid = convTrackLayerToID(track, DRAW_LAYER);
      sendLayerCmd(layerid, cmdStr_SetBright, bright);
    }
  }
}

export const userSetDelay = (track) =>
{
  if (track == undefined)
  {
    let delay = get(pStrand).msecsDelay;
    if (get(dStrands)[get(idStrand)].msecsDelay != delay)
    {
      get(dStrands)[get(idStrand)].msecsDelay = delay;

      strandCopyTop();
      sendStrandCmd(cmdStr_SetDelay, delay);
    }
  }
  else
  {
    let delay = get(pStrand).tracks[track].drawProps.msecsDelay;
    if (get(dStrands)[get(idStrand)].tracks[track].drawProps.msecsDelay != delay)
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.msecsDelay = delay;

      updateLayerVals(track, DRAW_LAYER);

      let layerid = convTrackLayerToID(track, DRAW_LAYER);
      sendLayerCmd(layerid, cmdStr_SetDelay, delay);
    }
  }
}

export const userSetRotate = () =>
{
  let firstp = get(pStrand).firstPixel;
  if (get(dStrands)[get(idStrand)].firstPixel != firstp)
  {
    get(dStrands)[get(idStrand)].firstPixel = firstp;

    strandCopyTop();
    sendStrandCmd(cmdStr_SetFirst, firstp);
  }
}

export const userSetOverMode = () =>
{
  let oride = get(pStrand).doOverride;
  if (get(dStrands)[get(idStrand)].doOverride != oride)
  {
    get(dStrands)[get(idStrand)].doOverride = oride;

    sendStrandCmd(cmdStr_SetXmode, oride ? 1 : 0);
    if (oride) userSetProps();
  }
}

export const userSetProps = (track) =>
{
  if (track == undefined)
  {
    let hue   = get(pStrand).degreeHue;
    let white = get(pStrand).pcentWhite;
    let count = get(pStrand).pcentCount;

    if ((get(dStrands)[get(idStrand)].degreeHue  != hue)   ||
        (get(dStrands)[get(idStrand)].pcentWhite != white) ||
        (get(dStrands)[get(idStrand)].pcentCount != count))
    {
      get(dStrands)[get(idStrand)].degreeHue  = hue;
      get(dStrands)[get(idStrand)].pcentWhite = white;
      get(dStrands)[get(idStrand)].pcentCount = count;

      strandCopyTop();
      sendStrandCmd(cmdStr_SetProps, `${hue} ${white} ${count}`);
    }
  }
  else
  {
    let hue   = get(pStrand).tracks[track].drawProps.degreeHue;
    let white = get(pStrand).tracks[track].drawProps.pcentWhite;
    let count = get(pStrand).tracks[track].drawProps.pcentCount;

    if ((get(dStrands)[get(idStrand)].tracks[track].drawProps.degreeHue  != hue)   ||
        (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentWhite != white) ||
        (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentCount != count))
    {
      get(dStrands)[get(idStrand)].tracks[track].drawProps.degreeHue  = hue;
      get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentWhite = white;
      get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentCount = count;

      updateLayerVals(track, DRAW_LAYER);
  
      let layerid = convTrackLayerToID(track, DRAW_LAYER);
      sendLayerCmd(layerid, cmdStr_SetProps, `${hue} ${white} ${count}`);
    }
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
  let pindex = get(pStrand).tracks[track].layers[DRAW_LAYER].pluginIndex;
  if (get(dStrands)[get(idStrand)].tracks[track].layers[DRAW_LAYER].pluginIndex != pindex)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[DRAW_LAYER].pluginIndex = pindex;

    let bits = get(aEffectsDraw)[pindex].bits;
    get(pStrand).tracks[track].layers[DRAW_LAYER].pluginBits = bits;
    //get(dStrands)[get(idStrand)].tracks[track].layers[DRAW_LAYER].pluginBits = bits;

    updateLayerVals(track, DRAW_LAYER);

    // must resend entire command when an effect is changed
    sendEntireCmdStr();
  }
}

export const userSetOverrides = (track) =>
{
  let bits = makeOrideBits(get(pStrand), track);
  if (makeOrideBits(get(dStrands)[get(idStrand)], track) != bits)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.overHue   = get(pStrand).tracks[track].drawProps.overHue;
    get(dStrands)[get(idStrand)].tracks[track].drawProps.overWhite = get(pStrand).tracks[track].drawProps.overWhite;
    get(dStrands)[get(idStrand)].tracks[track].drawProps.overCount = get(pStrand).tracks[track].drawProps.overCount;

    updateLayerVals(track, DRAW_LAYER);
  
    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_OrideBits, bits);
  }
}

export const userSetStart = (track) =>
{
  let start = get(pStrand).tracks[track].drawProps.pcentStart;
  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentStart != start)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentStart = start;

    let length = get(pStrand).tracks[track].drawProps.pcentFinish - start;
    if (length > 0)
    {
      updateLayerVals(track, DRAW_LAYER);

      // must resend entire command when start/fnish has changed
      sendEntireCmdStr();
      return false;
    }
    else
    {
      get(pStrand).tracks[track].drawProps.pcentFinish = start;
      return true; // cause reactive change and call to userSetFinish()
    }
  }
}

export const userSetFinish = (track) =>
{
  let finish = get(pStrand).tracks[track].drawProps.pcentFinish;
  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentFinish != finish)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.pcentFinish = finish;

    let length = finish - get(pStrand).tracks[track].drawProps.pcentStart;
    if (length > 0)
    {
      updateLayerVals(track, DRAW_LAYER);

      // must resend entire command when start/fnish has changed
      sendEntireCmdStr();
      return false;
    }
    else
    {
      get(pStrand).tracks[track].drawProps.pcentStart = finish;
      return true; // cause reactive change and call to userSetStart()
    } 
  }
}

export const userSetOwrite = (track) =>
{
  let orval = get(pStrand).tracks[track].drawProps.orPixelVals;
  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.orPixelVals != orval)
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
  if (get(dStrands)[get(idStrand)].tracks[track].drawProps.reverseDir != rdir)
  {
    get(dStrands)[get(idStrand)].tracks[track].drawProps.reverseDir = rdir;

    updateLayerVals(track, DRAW_LAYER);

    let layerid = convTrackLayerToID(track, DRAW_LAYER);
    sendLayerCmd(layerid, cmdStr_Direction, (rdir ? 0 : 1)); // 1 is default
  }
}

// Commands from ControlsFilter:

export const userSetFilterEffect = (track, layer) =>
{
  let pindex = get(pStrand).tracks[track].layers[layer].pluginIndex;
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].pluginIndex != pindex)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].pluginIndex = pindex;

    let bits = get(aEffectsFilter)[pindex].bits;
    get(pStrand).tracks[track].layers[layer].pluginBits = bits;
    //get(dStrands)[get(idStrand)].tracks[track].layers[layer].pluginBits = bits;

    updateLayerVals(track, layer);

    // must resend entire command when an effect is changed
    sendEntireCmdStr();
  }
}

export const userSetTrigManual = (track, layer) =>
{
  // TODO: if not new firmware then must send
  //       entire command string if turning off

  if (layer == undefined) layer = 0;

  let doman = get(pStrand).tracks[track].layers[layer].trigDoManual;
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoManual != doman)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoManual = doman;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigManual, (doman ? undefined : 0));
    // don't need to send value if enabling (1 is default)
  }
}

export const userSetTrigLayer = (track, layer) =>
{
  let dolayer = get(pStrand).tracks[track].layers[layer].trigDoLayer;
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoLayer != dolayer)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoLayer = dolayer;

    let tracknum = get(pStrand).tracks[track].layers[layer].trigTrackNum;
    let layernum = get(pStrand).tracks[track].layers[layer].trigLayerNum;

    let tlayer = MAX_BYTE_VALUE; // indicates disabled state
    if (dolayer) tlayer = convTrackLayerToID(tracknum-1, layernum-1);
    
    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigLayer, tlayer);
  }
}

// if this is called then dolayer has already been enabled
export const userSetTrigNums = (track, layer) =>
{
  let tracknum = get(pStrand).tracks[track].layers[layer].trigTrackNum;
  let layernum = get(pStrand).tracks[track].layers[layer].trigLayerNum;

  if ((get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTrackNum != tracknum) ||
      (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigLayerNum != layernum))
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTrackNum = tracknum;
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigLayerNum = layernum;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    let tlayer = convTrackLayerToID(tracknum-1, layernum-1);
    sendLayerCmd(layerid, cmdStr_TrigLayer, tlayer);
  }
}

// must recreate entire command string if no-triggering is chosen
export const userSetTrigType = (track, layer) =>
{
  let valstr = get(pStrand).tracks[track].layers[layer].trigTypeStr;
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTypeStr != valstr)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigTypeStr = valstr;

    if (valstr == 'none')
    {
      updateLayerVals(track, layer);

      // must resend entire command to remove trigger
      sendEntireCmdStr();
    }
    else if (valstr == 'once')
    {
      updateLayerVals(track, layer);

      let layerid = convTrackLayerToID(track, layer);
      sendLayerCmd(layerid, cmdStr_TriggerRange); // no value is set for 'once' type
    }
    else if (valstr == 'auto')
    {
      if (!userSetTrigDrange(track, layer))
      {
        updateLayerVals(track, layer);

        let layerid = convTrackLayerToID(track, layer);
        let range = get(pStrand).tracks[track].layers[layer].trigDelayRange;
        sendLayerCmd(layerid, cmdStr_TriggerRange, range);
      }
    }
  }
}

export const userSetTrigRandom = (track, layer) =>
{
  let dorep = get(pStrand).tracks[track].layers[layer].trigDoRepeat;
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDoRepeat != dorep)
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
      let count = get(pStrand).tracks[track].layers[layer].trigRepCount;
      sendLayerCmd(layerid, cmdStr_TrigCount, count);
    }
  }
}

// return true if did set new value, else false
export const userSetTrigCount = (track, layer) =>
{
  let count = get(pStrand).tracks[track].layers[layer].trigRepCount;
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigRepCount != count)
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
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDelayMin != dmin)
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
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].trigDelayRange != dmax)
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
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].forceRandom != isrand)
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
  if (get(dStrands)[get(idStrand)].tracks[track].layers[layer].forceValue != force)
  {
    get(dStrands)[get(idStrand)].tracks[track].layers[layer].forceValue = force;

    updateLayerVals(track, layer);

    let layerid = convTrackLayerToID(track, layer);
    sendLayerCmd(layerid, cmdStr_TrigForce, force);
  }
}
