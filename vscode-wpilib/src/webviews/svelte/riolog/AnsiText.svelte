<script lang="ts">
  import type { AnsiSegment } from '../../../riolog/ansi/ansiparser';
  import { ansiStateToStyle } from './ansi';

  interface Props {
    lines: AnsiSegment[][];
  }

  let { lines }: Props = $props();
</script>

{#each lines as line, lineIndex}
  {#if lineIndex > 0}<br />{/if}
  {#each line as segment}
    <span style={ansiStateToStyle(segment.state)}>{segment.text}</span>
  {/each}
{/each}
