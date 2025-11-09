<script lang="ts" context="module">
  export interface WizardProgressStep {
    step: number;
    label: string;
  }
</script>

<script lang="ts">
  export let steps: WizardProgressStep[] = [];
  export let currentStep = 1;
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

