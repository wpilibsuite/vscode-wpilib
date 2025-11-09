<script lang="ts" module>
  export interface WizardProgressStep {
    step: number;
    label: string;
  }
</script>

<script lang="ts">
  interface Props {
    steps?: WizardProgressStep[];
    currentStep?: number;
  }

  let { steps = [], currentStep = 1 }: Props = $props();
</script>

<div class="wizard-progress" role="list" aria-label="Wizard progress">
  {#each steps as step (step.step)}
    <div
      role="listitem"
      class={`progress-step${currentStep === step.step ? ' active' : ''}${currentStep > step.step ? ' completed' : ''}`}
      data-step={step.step}
    >
      {step.label}
    </div>
  {/each}
</div>

