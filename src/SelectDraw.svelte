<script>

  import {
    Row,
    Dropdown
  } from "carbon-components-svelte";

  import { DRAW_LAYER } from './devcmds.js';

  import {
    pStrand,
    aEffectsDraw,
    aEffDrawDesc,
    allowUpdates
  } from './globals.js';

  import {
    userDoRestart,
    userSetEffect
  } from './cmdpats.js'

  export let track;

  const setEffect = () => { if ($allowUpdates) userSetEffect(track, DRAW_LAYER); }
  const dorestart = () => { if ($allowUpdates) userDoRestart(track, DRAW_LAYER); }

  let helpon = false;

</script>

<div style="margin-top:10px; padding-left:5px;">
  <Row>
    <Dropdown
      style="margin-bottom:10px;"
      size="sm"
      type="inline"
      on:select={setEffect}
      bind:selectedIndex={$pStrand.tracks[track].layers[DRAW_LAYER].plugindex}
      bind:items={$aEffectsDraw}
    />
    <button class="button-help"
      on:click={() => {helpon = !helpon;}}
      >?
    </button>
    <button class="button-restart"
      on:click={dorestart}
      disabled={$pStrand.tracks[track].layers[DRAW_LAYER].mute}
      >Restart
    </button>
  </Row>

  {#if helpon }
    <Row style="margin-left:-10px; margin-right:1px; padding:5px;
                color: var(--text-lines);
                background-color: var(--panel-back);">
      <p style="font-size:.9em;">
        {$aEffDrawDesc[$pStrand.tracks[track].layers[DRAW_LAYER].plugindex]}
      </p>
    </Row>
  {/if}

</div>

<style>
   .button-restart {
     height: 30px;
     margin-left: 15px;
     padding: 3px;
   }
  .button-help {
    width: 30px;
    height: 30px;
    padding: 3px;
    margin-right: 10px;
    border-width: 2px;
    border-radius: 75%;
  }
</style>
