<script>

  import {
    Row,
    Column,
    Checkbox
  } from "carbon-components-svelte";

  import {
    pStrand,
    allowUpdates
  } from './globals.js';

  import {
    MAX_HUE_VALUE,
    pluginBit_COLOR,
    pluginBit_COUNT,
    pluginBit_ORIDE_HUE,
    pluginBit_ORIDE_WHITE,
    pluginBit_ORIDE_COUNT,
  } from './devcmds.js';

  import {
    userSetHue,
    userSetWhite,
    userSetCount,
    userSetOverrides
  } from './cmdprops.js';

  import SliderVal from './SliderVal.svelte';

  export let track;
  
  const sethue   = () => { if ($allowUpdates) userSetHue(track); }
  const setwhite = () => { if ($allowUpdates) userSetWhite(track); }
  const setcount = () => { if ($allowUpdates) userSetCount(track); }
  const setovers = () => { if ($allowUpdates) userSetOverrides(track); }

</script>

<div class="panel">
  <p style="font-size:.9em">Allow Property Overrides:</p>

  <Row style="margin:15px 0 5px 0;">
    <Checkbox labelText="Hue"
      on:check={setovers}
      bind:checked={$pStrand.tracks[track].drawProps.overHue}
      disabled={ !($pStrand.tracks[track].trackBits & pluginBit_COLOR) ||
                  ($pStrand.tracks[track].trackBits & pluginBit_ORIDE_HUE) }
    />
    <Checkbox labelText="White"
      on:check={setovers}
      bind:checked={$pStrand.tracks[track].drawProps.overWhite}
      disabled={ !($pStrand.tracks[track].trackBits & pluginBit_COLOR) ||
                  ($pStrand.tracks[track].trackBits & pluginBit_ORIDE_WHITE) }
    />
    <Checkbox labelText="Count"
      on:check={setovers}
      bind:checked={$pStrand.tracks[track].drawProps.overCount}
      disabled={ !($pStrand.tracks[track].trackBits & pluginBit_COUNT) ||
                  ($pStrand.tracks[track].trackBits & pluginBit_ORIDE_COUNT) }
    />
  </Row>
  <Row>
    <Column>
      <SliderVal name='Hue&nbsp;&nbsp;&nbsp;'
        max={MAX_HUE_VALUE}
        onchange={sethue}
        bind:cur={$pStrand.tracks[track].drawProps.valueHue}
        disabled={ ($pStrand.opropsUser.doEnable && $pStrand.tracks[track].drawProps.overHue) ||
                  !($pStrand.tracks[track].trackBits & pluginBit_COLOR)                       ||
                   ($pStrand.tracks[track].trackBits & pluginBit_ORIDE_HUE) }
      />

      <SliderVal name='White&nbsp;'
        onchange={setwhite}
        bind:cur={$pStrand.tracks[track].drawProps.pcentWhite}
        disabled={($pStrand.opropsUser.doEnable && $pStrand.tracks[track].drawProps.overWhite) ||
                 !($pStrand.tracks[track].trackBits & pluginBit_COLOR)                         ||
                  ($pStrand.tracks[track].trackBits & pluginBit_ORIDE_WHITE)}
      />

      <SliderVal name='Count&nbsp;'
        onchange={setcount}
        bind:cur={$pStrand.tracks[track].drawProps.pcentCount}
        disabled={($pStrand.opropsUser.doEnable && $pStrand.tracks[track].drawProps.overCount) ||
                 !($pStrand.tracks[track].trackBits & pluginBit_COUNT)                         ||
                  ($pStrand.tracks[track].trackBits & pluginBit_ORIDE_COUNT)}
      />
    </Column>
  </Row>
</div>

<style>
  .panel {
    margin: 20px -5px 0 -5px;
    padding: 10px;
    background-color: var(--panel-back);
  }
</style>