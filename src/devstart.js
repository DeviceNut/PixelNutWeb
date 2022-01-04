import { get } from 'svelte/store';

import {
  MIN_TRACKS,
  MIN_LAYERS,
  MINLEN_MAXPATTERN,
  PAGEMODE_CONTROLS,
  curPageMode,
  curDevice,
  nStrands,
  idStrand,
  pStrand,
  aStrands,
  eStrands,
  nTracks,
  nLayers,
  maxLenPattern,
  aStoredPatt,
  aStoredDesc,
  aDevicePatt,
  aDeviceDesc,
  aEffectsDraw,
  aEffDrawDesc,
  aEffectsFilter,
  aEffFilterDesc,
  msgTitle,
  msgDesc
} from './globals.js';

import {
  preset_PatStrs,
  preset_PatDescs,
  preset_DrawEffectItems,
  preset_DrawEffectDescs,
  preset_FilterEffectItems,
  preset_FilterEffectDescs
} from './presets.js';

import {
  cmdStr_PcentBright,
  cmdStr_MsecsDelay,
  cmdStr_ValueHue,
  cmdStr_PcentWhite,
  cmdStr_PcentCount,
  cmdStr_OrideBits,
  cmdStr_LayerMute
} from './devcmds.js';

import { pluginBit_REDRAW } from './devcmds.js';
import { deviceError } from './devtalk.js';
import { strandCreateNew } from './strands.js';
import { parsePattern } from './cmdparse.js';
import { makeEntireCmdStr } from './cmdmake.js';
import { sendPatternToStrand } from './cmdsend.js';

import {
  MENUID_CUSTOM,
  MENUID_PRESETS,
  MENUID_BROWSER,
  MENUID_DEVICE,
  menuPresets,
  menuBrowser,
  menuDevice,
  menuCreate
} from './menu.js';

///////////////////////////////////////////////////////////

function devInfoErr(msg)
{
  deviceError(msg, 'Device Error');
}

function setStrandTop(strand, dvals)
{
  strand.pcentBright = dvals.bright;
  strand.pcentDelay  = dvals.delay;
  strand.pixelOffset = dvals.first;
  strand.numPixels   = dvals.pixels;

  let mode = dvals.xt_mode ? true : false;
  strand.opropsUser.doEnable   = mode;
  strand.opropsUser.valueHue   = dvals.xt_hue;
  strand.opropsUser.pcentWhite = dvals.xt_white;
  strand.opropsUser.pcentCount = dvals.xt_count;

  strand.opropsSent.doEnable   = mode;
  strand.opropsSent.valueHue   = dvals.xt_hue;
  strand.opropsSent.pcentWhite = dvals.xt_white;
  strand.opropsSent.pcentCount = dvals.xt_count;
}

function setStrandPattern(strand, id, name='', pstr='', pdesc='')
{
  strand.curPatternId   = id;
  strand.curPatternName = name;
  strand.curPatternCmd  = pstr;
  strand.curPatternDesc = pdesc;
}

function stripCmdStr(instr)
{
  //console.log(`instr="${instr}"`);

  let outstr = '';
  const cmds = instr.toUpperCase().split(/\s+/); // remove all spaces

  for (let cmd of cmds)
  {
    if (cmd === '') continue;

    const ch = cmd.substr(0, 1);
    const val = parseInt(cmd.substr(1));

    switch (ch)
    {
      default:
      {
        if (isNaN(val))
             outstr += `${ch} `;
        else outstr += `${ch}${val} `;
        break;
      }
      case cmdStr_PcentBright:
      case cmdStr_MsecsDelay:
      case cmdStr_ValueHue:
      case cmdStr_PcentWhite:
      case cmdStr_PcentCount:
      case cmdStr_OrideBits:
      case cmdStr_LayerMute:
      {
        // strip from command
        break;
      }
    }
  }

  outstr = outstr.trim();
  //console.log(`outstr="${outstr}"`);
  return outstr;
}

export let deviceStartup = (device) =>
{
  //console.log(`Connecting to: "${device.curname}"...`);

  // now being actively controlled
  device.active = true;
  curDevice.set(device);

  // create draw/filter effect lists with device specific items

  let items_draw = [];
  let descs_draw = [];

  let items_filter = [];
  let descs_filter = [];

  for (let i = 0; i < preset_DrawEffectItems.length; ++i)
  {
    items_draw.push( preset_DrawEffectItems[i] );
    descs_draw.push( preset_DrawEffectDescs[i] );
  }

  for (let i = 0; i < preset_FilterEffectItems.length; ++i)
  {
    items_filter.push( preset_FilterEffectItems[i] );
    descs_filter.push( preset_FilterEffectDescs[i] );
  }

  for (let i = 0; i < device.report.plugins.length; ++i)
  {
    let bvalue = parseInt(device.report.plugins[i].bits, 16);
    const item = { id:  device.report.plugins[i].id,
                  bits: bvalue,
                  text: device.report.plugins[i].name };

    if (bvalue & pluginBit_REDRAW)
    {
      items_draw.push( item );
      descs_draw.push( device.report.plugins[i].desc );
    }
    else
    {
      items_filter.push( item );
      descs_filter.push( device.report.plugins[i].desc );
    }
  }

  aEffectsDraw.set(items_draw);
  aEffDrawDesc.set(descs_draw);

  aEffectsFilter.set(items_filter);
  aEffFilterDesc.set(descs_filter);

  // create strand lists for this specific device

  let numstrands = device.report.strands.length;
  if (numstrands <= 0)
    return devInfoErr(`No strands found: ${numstrands}`);

  let numtracks = device.report.numtracks;
  let numlayers = device.report.numlayers;
  let tracklayers = numlayers / numtracks;

  let maxstrlen = device.report.maxstrlen;
  maxLenPattern.set(maxstrlen);

  if (maxstrlen < MINLEN_MAXPATTERN)
    return devInfoErr(`Must support longer patterns: ${maxstrlen} < ${MINLEN_MAXPATTERN}`);

  if (numtracks < MIN_TRACKS)
    return devInfoErr(`Too few tracks: ${numtracks} < ${MIN_TRACKS}`);

  if (tracklayers < MIN_LAYERS)
    return devInfoErr(`Too few layers: ${tracklayers} < ${MIN_LAYERS}`);

  nStrands.set(numstrands);
  nTracks.set(numtracks);
  nLayers.set(tracklayers);

  const sid = 0;
  let slist = [];
  let elist = [];

  for (let s = 0; s < numstrands; ++s)
  {
    const strand = strandCreateNew(s);
    const select = (s === sid) ? true : false;

    strand.selected = select;
    setStrandTop(strand, device.report.strands[s]);

    slist.push(strand);
    elist.push(select);
  }

  aStrands.set(slist);
  eStrands.set(elist);
  pStrand.set(slist[sid]);

  // create pattern menu lists for this specific device

  let items = []; // device menu items
  let pcmds = [];
  let descs = [];

  let devdex_base = MENUID_DEVICE + 1;
  let devdex_last = devdex_base;

  const patlen = device.report.patterns.length;
  for (let i = 0; i < patlen; ++i)
  {
    const item =
    {
      id: devdex_last++,
      text: device.report.patterns[i].name
    };

    items.push( item );
    pcmds.push( device.report.patterns[i].pcmd );
    descs.push( device.report.patterns[i].desc );
  }

  // initialize each strand with its pattern

  let didclear = false;

  for (let s = 0; s < numstrands; ++s)
  {
    idStrand.set(s);
    let strand = get(aStrands)[s];
    pStrand.set(strand);

    let cmdname = device.report.strands[s].patname;
    let cmdstr = device.report.strands[s].patstr.trim();

    if (cmdstr === '') // no pattern running
    {
      setStrandPattern(strand, MENUID_CUSTOM);
    }
    else if (!parsePattern(cmdstr)) // failed: clear pattern
    {
      setStrandPattern(strand, MENUID_CUSTOM);
      sendPatternToStrand(s);
      didclear = true;
    }
    else // check for match with existing patterns
    {
      let found = false;
      let apats, adesc;

      apats = preset_PatStrs;
      adesc = preset_PatDescs;
      for (let i = 0; i < menuPresets.children.length; ++i)
      {
        let name = menuPresets.children[i].text;
        let idex = menuPresets.children[i].id - (MENUID_PRESETS + 1);

        if ((cmdname === name) && (stripCmdStr(cmdstr) === stripCmdStr(apats[idex])))
        {
          //console.log(`Preset(${i}): ${cmdname}`);
          //console.log(`  ${cmdstr}`);
          //console.log(`  ${apats[idex]}`);

          setStrandPattern(strand, (MENUID_PRESETS + i + 1), cmdname, cmdstr, adesc[idex]);
          found = true;
          break;
        }
      }

      if (!found)
      {
        apats = get(aStoredPatt);
        adesc = get(aStoredDesc);
        for (let i = 0; i < menuBrowser.children.length; ++i)
        {
          let name = menuBrowser.children[i].text;
          let idex = menuBrowser.children[i].id - (MENUID_BROWSER + 1);
  
          if ((cmdname === name) && (stripCmdStr(cmdstr) === stripCmdStr(apats[idex])))
          {
            //console.log(`s1="${stripCmdStr(cmdstr)}"`)
            //console.log(`s2="${stripCmdStr(apats[idex])}"`)

            //console.log(`Saved(${i}): ${cmdname}`);
            //console.log(`  ${cmdstr}`);
            //console.log(`  ${apats[idex]}`);
  
            setStrandPattern(strand, (MENUID_BROWSER + i + 1), cmdname, cmdstr, adesc[idex]);
            found = true;
            break;
          }
        }
      }

      if (!found)
      {
        for (let i = 0; i < device.report.patterns.length; ++i)
        {
          let name = device.report.patterns[i].name;
          let pcmd = device.report.patterns[i].pcmd;
          let desc = device.report.patterns[i].desc;

          if ((cmdname === name) && (stripCmdStr(cmdstr) === stripCmdStr(pcmd)))
          {
            //console.log(`Device(${i}): ${cmdname}`);
            //console.log(`  ${cmdstr}`);
            //console.log(`  ${device.report.patterns[i].pcmd}`);

            setStrandPattern(strand, (devdex_base + i), cmdname, cmdstr, desc);
            found = true;
            break;
          }
        }
      }

      if (!found) // if doesn't match known patterns: add to device menu
      {
        let cmdid = devdex_last++;
        let cmdesc = `Strand #${s+1}`;
    
        setStrandPattern(strand, cmdid, cmdname, cmdstr, cmdesc);

        const item = { id:cmdid, text: cmdname };
  
        items.push( item );
        pcmds.push( cmdstr );
        descs.push( cmdesc );
      }

      makeEntireCmdStr();
    }
  }

  // reset to use first strand
  idStrand.set(0);
  pStrand.set(get(aStrands)[0]);

  // setup device patterns/descriptions
  aDevicePatt.set(pcmds);
  aDeviceDesc.set(descs);
  menuDevice.children = items;
  menuCreate(); // create entire menu

  // sanity check if device still active
  if (get(curDevice) !== null)
  {
    curPageMode.set(PAGEMODE_CONTROLS);

    if (didclear)
    {
      // trigger warning message title/text
      msgDesc.set('Could not recognize a device pattern - cleared');
      msgTitle.set('Device Issue');
    }
  }
}
