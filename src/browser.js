import { get } from "svelte/store";

import {
  ipAddrBrowser,
  aStoredPatt,
  aStoredDesc
} from './globals.js';

import {
  MENUID_BROWSER,
  menuBrowser
} from './newmenu.js';

const SavePatternTheme      = "PixelNut-Theme";
const SavePatternColors     = "PixelNut-Colors";
const SaveBrokerIPaddr      = "PixelNut-Broker";
const SavePatternNames      = "PixelNut-Names";
const SavePatternKeyCmd     = "PixelNut-Cmds-";
const SavePatternKeyDesc    = "PixelNut-Desc-";
const SavePatternSeparator  = ',';

///////////////////////////////////////////////////////////

export const storeThemeGet = () =>
{
  return localStorage.getItem(SavePatternTheme);
}

export const storeThemeSet = (tstr) =>
{
  localStorage.setItem(SavePatternTheme, tstr);
}

export const storeColorsGet = () =>
{
  let colors = null;
  let cstr = localStorage.getItem(SavePatternColors);

  //console.log(`Get Colors = ${cstr}`);
  try
  {
    colors = JSON.parse(cstr);
    if (colors === '') colors = null;
    //else console.log('Parsed Colors: ', colors);
  }
  catch(e) { console.warn(`Cannot parse colors: ${cstr}`); }
  return colors;
}

export const storeColorsSet = (colors) =>
{
  const cstr = JSON.stringify(colors);
  //console.log(`Set Colors: ${cstr}`);
  localStorage.setItem(SavePatternColors, cstr);
}

export const storeBrokerRead = () =>
{
  let ipaddr = localStorage.getItem(SaveBrokerIPaddr);
  if (ipaddr === null) ipaddr = '';
  //console.log(`Retrieving broker IP: ${ipaddr}`);
  ipAddrBrowser.set(ipaddr);
}

export const storeBrokerWrite = () =>
{
  let ipaddr = get(ipAddrBrowser);
  //console.log(`Saving broker IP: ${ipaddr}`);
  if (ipaddr === '')
       localStorage.removeItem(SaveBrokerIPaddr);
  else localStorage.setItem(SaveBrokerIPaddr, ipaddr);
}

export const storePatternsInit = () =>
{
  // if user has saved patterns:
  // retrieve command and search for built-ins

  let lmenu = [];
  let lpatt = [];
  let ldesc = [];

  const names = localStorage.getItem(SavePatternNames);
  if ((names !== null) && (names !== ''))
  {
    let nlist = names.split(SavePatternSeparator);
    let bcount = MENUID_BROWSER;

    //console.log('nlist=', nlist);

    for (const text of nlist)
    {
      if (text === '') continue;

      let patt = localStorage.getItem(SavePatternKeyCmd+text);
      let desc = localStorage.getItem(SavePatternKeyDesc+text);
      desc = [desc];

      if (patt !== '')
      {
        const obj = { id: ++bcount, text:text };
        lmenu.push(obj);
        lpatt.push(patt);
        ldesc.push(desc);
      }
    }
  }

  menuBrowser.children = lmenu;
  aStoredPatt.set(lpatt);
  aStoredDesc.set(ldesc);
}

export const storePatternSave = (name, desc, cmds) =>
{
  if (!desc) desc = ''; // allow empty description

  if (name && cmds)
  {
    //console.log(`saving: ${name}:${desc}`);

    let names = localStorage.getItem(SavePatternNames);
    if (names === null) names = '';
    else if (names !== '') names = names.concat(SavePatternSeparator);
    names = names.concat(name);
  
    //console.log('names=', names);
  
    localStorage.setItem(SavePatternNames, names);
    localStorage.setItem(SavePatternKeyCmd+name, cmds);
    localStorage.setItem(SavePatternKeyDesc+name, desc);
  }
}

export const storePatternRemove = (delname) =>
{
  let found = false;

  let names = localStorage.getItem(SavePatternNames);
  if (names === null) names = '';

  if (names !== '')
  {
    let nlist = names.split(SavePatternSeparator);
    for (const [i, n] of nlist.entries())
    {
      if (n === delname)
      {
        //console.log(`removing: ${n}`);

        nlist.splice(i, 1);
        const str = nlist.join(SavePatternSeparator);
        localStorage.setItem(SavePatternNames, str);
        localStorage.removeItem(SavePatternKeyCmd+n);
        localStorage.removeItem(SavePatternKeyDesc+n);

        found = true;
        break;
      }
    }
  }

  if (!found) console.warn(`Failed to remove pattern: ${delname}`);
}

export const storePatternRemAll = () =>
{
  let names = localStorage.getItem(SavePatternNames);
  if (names === null) names = '';

  if (names !== '')
  {
    let nlist = names.split(SavePatternSeparator);
    for (const [i, n] of nlist.entries())
    {
        //console.log(`removing: ${n}`);

        localStorage.removeItem(SavePatternKeyCmd+n);
        localStorage.removeItem(SavePatternKeyDesc+n);
    }
    localStorage.setItem(SavePatternNames, '');
  }
}