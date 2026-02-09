<script lang="ts">
  import { SummaryBox } from '../../components/shared';
  import { ProjectType } from '../types';

  interface Props {
    projectType?: ProjectType;
    language?: string;
    base?: string;
    location?: string;
    teamNumber?: string;
    onBack?: () => void;
    onCreate?: () => void;
  }

  let {
    projectType = ProjectType.Template,
    language = '',
    base = '',
    location = '',
    teamNumber = '',
    onBack = () => {},
    onCreate = () => {}
  }: Props = $props();

  const back = () => onBack();
  const createProject = () => onCreate();

  const projectTypeLabel = projectType === ProjectType.Template ? 'Template' : 'Example';
</script>

<div class="step-header">
  <h2>Step 4: Review &amp; Create</h2>
  <p>Review your selections and create the project.</p>
</div>

<div class="project-row">
  <SummaryBox
    items={[
      { label: 'Project Type', value: projectTypeLabel },
      { label: 'Language', value: language },
      { label: 'Project Base', value: base },
      { label: 'Location', value: location },
      { label: 'Team Number', value: teamNumber || 'Not specified' },
    ]}
  />
</div>

<div class="wizard-navigation">
  <button id="back-to-step-3" type="button" class="vscode-button secondary" onclick={back}>
    Back
  </button>
  <button id="generateProject" type="button" class="vscode-button" onclick={createProject}>
    Create Project
  </button>
</div>
