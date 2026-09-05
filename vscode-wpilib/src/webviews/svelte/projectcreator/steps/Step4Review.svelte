<script lang="ts">
  import SummaryBox from '../../components/shared/SummaryBox.svelte';
  import { createTranslator } from '../../lib/i18n';
  import { ProjectType } from '../types';

  interface Props {
    projectType: ProjectType;
    language: string;
    base: string;
    location: string;
    teamNumber: string;
    onBack: () => void;
    onCreate: () => void;
  }

  let { projectType, language, base, location, teamNumber, onBack, onCreate }: Props = $props();
  const t = createTranslator('projectcreator');

  const projectTypeLabel = $derived(
    projectType === ProjectType.Template ? t('Template') : t('Example')
  );
</script>

<div class="step-header">
  <h2>{t('Step 4: Review & Create')}</h2>
  <p>{t('Review your selections and create the project.')}</p>
</div>

<div class="project-row">
  <SummaryBox
    items={[
      { label: t('Project Type'), value: projectTypeLabel },
      { label: t('Language'), value: language },
      { label: t('Project Base'), value: base },
      { label: t('Location'), value: location },
      { label: t('Team Number'), value: teamNumber || t('Not specified') },
    ]}
  />
</div>

<div class="wizard-navigation">
  <button id="back-to-step-3" type="button" class="vscode-button secondary" onclick={onBack}>
    {t('Back')}
  </button>
  <button id="generateProject" type="button" class="vscode-button" onclick={onCreate}>
    {t('Create Project')}
  </button>
</div>
