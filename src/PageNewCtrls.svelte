<script>

  import MediaQuery from "svelte-media-query";

  import {
    Grid,
    Row,
    Column
  } from "carbon-components-svelte";

  import {
    SECS_DEVSTORE_TOUT,
    MSECS_DEVSTORE_CHECK,
    curDevice,
    curPageMode,
    PAGEMODE_DEVICES,
    connectActive,
    nStrands,
    pStrand,
    aStrands,
    showCustom,
    userCustom,
    curTimeSecs
  } from './globals.js';

  import { defCustomCmd } from './devcmds.js';
  import { userSetPattern } from './cmdpats.js';
  import { sendStrandPattern } from './cmdsend.js';

  import HeaderControls  from './HeaderControls.svelte';
  import MultiStrands    from './MultiStrands.svelte';
  import ButtonsPatterns from './ButtonsPatterns.svelte';
  import PanelMenu       from './PanelMenu.svelte';
  import PanelNewCtrls   from './PanelNewCtrls.svelte';
  import TrackLayout     from './TrackLayout.svelte';

  let pstr = '';
  $: pstr = ($showCustom ? '^' : 'Customize');

  const toggleshow = () =>
  {
    $showCustom = !$showCustom;
    $userCustom = $showCustom;

    if ($showCustom && ($pStrand.tactives === 0))
      userSetPattern(defCustomCmd);
  }

  $: if (!$connectActive || !$curDevice)
      $curPageMode = PAGEMODE_DEVICES;

  let prevsecs = curTimeSecs();
  function checkStore()
  {
    let secs = curTimeSecs();
    let sdiff = secs - prevsecs;
    prevsecs = secs;

    for (let s = 0; s < $nStrands; ++s)
    {
      const strand = $aStrands[s];
      if (strand.selected && strand.modified)
      {
        strand.idletime += sdiff;
        if (strand.idletime > SECS_DEVSTORE_TOUT)
        {
          sendStrandPattern(false);
          strand.modified = false;
          strand.idletime = 0;
        }
      }
    }

    setTimeout(checkStore, MSECS_DEVSTORE_CHECK);
  }
  setTimeout(checkStore, MSECS_DEVSTORE_CHECK);

</script>

<Grid style="margin-top:5px;">

  <MediaQuery query="(max-width: 1100px)" let:matches>
    {#if matches}
      <div class="page small">
        <Row>
          <Column>
            <HeaderControls/>
            <MultiStrands/>
          </Column>
        </Row>
        <Row>
          <Column>
            <div style="margin:15px 20px 0 20px;">
              <ButtonsPatterns/>
              <PanelMenu/>
            </div>
            <div class="divider"></div>
            <div style="padding-left:10px;">
              <PanelNewCtrls/>
            </div>
            <div class="bdiv" class:bdiv2={$showCustom}
              on:click={toggleshow}>
              <span>{pstr}</span>
            </div>
          </Column>
        </Row>
      </div>
    {/if}
  </MediaQuery>
  <MediaQuery query="(min-width: 1101px)" let:matches>
    {#if matches }
      <div class="page large">
        <Row>
          <Column>
            <HeaderControls/>
            <MultiStrands/>
          </Column>
        </Row>
        <Row style="margin:10px 0 10px 10px;">
          <Column>
            <ButtonsPatterns/>
            <PanelMenu/>
          </Column>
          <div class="vertdiv"></div>
          <Column>
            <PanelNewCtrls/>
          </Column>
        </Row>
        <Row>
          <Column>
            <div class="bdiv" class:bdiv2={$showCustom}
              on:click={toggleshow}>
              <span>{pstr}</span>
            </div>
          </Column>
        </Row>
      </div>
    {/if}
  </MediaQuery>

  {#if $showCustom }
    <MediaQuery query="(max-width: 1100px)" let:matches>
      {#if matches}
        <TrackLayout numcols={1} />
      {/if}
    </MediaQuery>
    <MediaQuery query="(min-width: 1101px) and (max-width: 1600px)" let:matches>
      {#if matches }
        <TrackLayout numcols={($pStrand.tactives < 2) ? ($pStrand.tactives) : 2} />
      {/if}
    </MediaQuery>
    <MediaQuery query="(min-width: 1601px)" let:matches>
      {#if matches }
        <TrackLayout numcols={($pStrand.tactives < 3) ? ($pStrand.tactives) : 3} />
      {/if}
    </MediaQuery>
  {:else}
    <div style="margin-top:10px;"></div>
  {/if}

</Grid>

<style>
  .page {
    margin: 0 auto;
    min-width: 330px;
    background-color: var(--page-back);
    border: 2px solid var(--page-border);
  }
  .small {
    max-width: 800px;
  }
  .large {
    max-width: 1050px;
  }
  .vertdiv {
    width: 3px;
    background-color: var(--page-border);
  }
  .divider {
    margin-top: 20px;
    margin-bottom: 15px;
    padding-top: 2px;
    background-color: var(--page-border);
  }
  .bdiv {
    cursor: pointer;
    height: 18px;
    padding-top: 2px;
    text-align: center;
    color: var(--btn-text-normal);
    background-color: var(--btn-back-normal);
  }
  .bdiv2 {
    padding-top: 5px;
  }
</style>
