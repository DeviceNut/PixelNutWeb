import { get } from 'svelte/store';

import { pStrand } from './globals.js';
import { strandCopyTop } from './strands.js';

import {
  DRAW_LAYER,
  cmdStr_PullTrigger,
  cmdStr_OR_Bright,
  cmdStr_OR_Delay,
  cmdStr_OR_Props1,
  cmdStr_OR_Props2,
  cmdStr_SetOride,
  cmdStr_SetFirst,
  cmdStr_PcentXoffset,
  cmdStr_PcentXlength,
  cmdStr_PcentBright,
  cmdStr_MsecsDelay,
  cmdStr_CombinePixs,
  cmdStr_Backwards,
  cmdStr_NoRepeating
} from './devcmds.js';

import { updateLayerVals } from './cmdmake.js';
import { sendStrandCmd, sendLayerCmd } from './cmdsend.js';

///////////////////////////////////////////////////////////

// Main Controls:

export const userSetBright = (track) =>
{
  if (track === undefined)
  {
    let bright = get(pStrand).pcentBright;

    strandCopyTop();
    sendStrandCmd(cmdStr_OR_Bright, bright);
  }
  else
  {
    const layer = DRAW_LAYER;
    const bright = get(pStrand).tracks[track].drawProps.pcentBright;

    updateLayerVals(track, layer);
    sendLayerCmd(track, layer, cmdStr_PcentBright, bright);
  }
}

export const userSetDelay = (track) =>
{
  if (track === undefined)
  {
    let delay = get(pStrand).pcentDelay;

    strandCopyTop();
    sendStrandCmd(cmdStr_OR_Delay, delay);
  }
  else
  {
    const layer = DRAW_LAYER;
    const delay = get(pStrand).tracks[track].drawProps.pcentDelay;

    updateLayerVals(track, layer);
    sendLayerCmd(track, layer, cmdStr_MsecsDelay, delay);
  }
}

export const userSetRotate = () =>
{
  const firstp = get(pStrand).pixelOffset;

  strandCopyTop();
  sendStrandCmd(cmdStr_SetFirst, firstp);
}

export const userSetOverMode = () =>
{
  const strand = get(pStrand);
  const oride = strand.opropsUser.doEnable;

  //console.log(`userSetOverMode: ${oride}`);

  if (oride !== strand.opropsSent.doEnable)
  {
    strand.opropsSent.doEnable = oride;
    sendStrandCmd(cmdStr_SetOride, oride ? 1 : 0);
  }
}

export const userSetProps = () =>
{
  const strand = get(pStrand);

  let hue = strand.opropsUser.valueHue;
  let wht = strand.opropsUser.pcentWhite;
  let cnt = strand.opropsUser.pcentCount;

  //console.log(`userSetProps: ${hue} ${wht} ${cnt}`);

  if ((hue !== strand.opropsSent.valueHue)   ||
      (wht !== strand.opropsSent.pcentWhite) ||
      (cnt !== strand.opropsSent.pcentCount))
  {
    strand.opropsSent.valueHue   = hue;
    strand.opropsSent.pcentWhite = wht;
    strand.opropsSent.pcentCount = cnt;

    strandCopyTop();
    sendStrandCmd(cmdStr_OR_Props1, `${hue} ${wht} ${cnt}${cmdStr_OR_Props2}`);
  }
}

export const userSendTrigger = () =>
{
  sendStrandCmd(cmdStr_PullTrigger, get(pStrand).forceValue);
}

// Track Controls:

export const userSetOffset = (track) =>
{
  const layer = DRAW_LAYER;
  const strand = get(pStrand);
  const offset = strand.tracks[track].drawProps.pcentXoffset;

  updateLayerVals(track, layer);
  sendLayerCmd(track, layer, cmdStr_PcentXoffset, offset);
}

export const userSetLength = (track) =>
{
  const layer = DRAW_LAYER;
  const strand = get(pStrand);
  const extent = strand.tracks[track].drawProps.pcentXlength;

  updateLayerVals(track, layer);
  sendLayerCmd(track, layer, cmdStr_PcentXlength, extent);
}

export const userSetOrPixs = (track) =>
{
  const layer = DRAW_LAYER;
  const enable = get(pStrand).tracks[track].drawProps.orPixelVals;

  updateLayerVals(track, layer);
  sendLayerCmd(track, layer, cmdStr_CombinePixs, (enable ? undefined : 0));
}

export const userSetBack = (track) =>
{
  const layer = DRAW_LAYER;
  const enable = get(pStrand).tracks[track].drawProps.dirBackwards;

  updateLayerVals(track, layer);
  sendLayerCmd(track, layer, cmdStr_Backwards, (enable ? undefined : 0));
}

export const userSetNoRep = (track) =>
{
  const layer = DRAW_LAYER;
  const enable = get(pStrand).tracks[track].drawProps.noRepeating;

  updateLayerVals(track, layer);
  sendLayerCmd(track, layer, cmdStr_NoRepeating, (enable ? undefined : 0));
}
