//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();
  let message;

  // Function to generate HTML for installed dependencies
  function populateInstalledList(installed, container) {
    // Create HTML for installed dependencies
    const badge = Object.assign(document.createElement('span'), {
      className: 'vscode-badge counter',
      textContent: installed.length,
    });
    document.querySelector('#installed-actions')?.replaceChildren(badge);
    container.replaceChildren();

    if (installed.length === 0) {
      const emptyState = Object.assign(document.createElement('div'), {
        className: 'empty-state',
        textContent: 'No dependencies installed',
      });
      container.appendChild(emptyState);
      return;
    }

    installed.forEach((dep, index) => {
      const installedDep = Object.assign(document.createElement('div'), {
        className: 'installed-dependency',
      });

      const header = Object.assign(document.createElement('div'), {
        className: 'dependency-header',
      });

      const nameContainer = Object.assign(document.createElement('div'), {
        className: 'dependency-title',
      });

      nameContainer.appendChild(
        Object.assign(document.createElement('span'), {
          textContent: dep.name,
          className: 'dependency-name',
        })
      );

      nameContainer.appendChild(
        Object.assign(document.createElement('span'), {
          textContent: dep.currentVersion,
          className: 'dependency-version',
        })
      );

      header.appendChild(nameContainer);
      installedDep.appendChild(header);

      const controls = Object.assign(document.createElement('div'), {
        className: 'dependency-controls',
      });

      const selectContainer = controls.appendChild(
        Object.assign(document.createElement('div'), {
          className: 'vscode-select',
          style: 'margin: 4px 0',
        })
      );

      selectContainer.appendChild(
        Object.assign(document.createElement('i'), {
          className: 'codicon codicon-chevron-right chevron-icon',
        })
      );

      const versionSelect = selectContainer.appendChild(
        Object.assign(document.createElement('select'), {
          id: `version-select-${index}`,
        })
      );

      const versionAction = controls.appendChild(
        Object.assign(document.createElement('button'), {
          className: 'vscode-button',
          id: `version-action-${index}`,
        })
      );

      dep.versionInfo.forEach((versionTuple, i) => {
        const option = document.createElement('option');
        option.value = versionTuple.version;
        option.textContent = versionTuple.version;
        if (dep.currentVersion === versionTuple.version) {
          option.selected = true;
          versionAction.textContent = versionTuple.buttonText;
          if (i === 0) {
            // This is the first element of the version array thus the most current
            versionAction.setAttribute('disabled', 'true');
          }
        }
        versionSelect.appendChild(option);
      });

      versionAction.addEventListener('click', () => {
        if (versionSelect) {
          var selectedText = versionSelect.options[versionSelect.selectedIndex].label;
          // Handle update logic here
          vscode.postMessage({
            type: 'update',
            version: selectedText,
            index: index,
          });
        }
      });

      versionSelect.addEventListener('change', () => {
        const versions = dep.versionInfo;
        var selectedText = versionSelect.options[versionSelect.selectedIndex].label;
        const version = versions.find((versionTuple) => versionTuple.version === selectedText);
        // Change button text based on selected dropdown value
        versionAction.textContent = version.buttonText;

        if (
          versionSelect.selectedIndex === 0 &&
          version.version === message.installed[index].currentVersion
        ) {
          // This is the first element of the version array thus the most current
          versionAction.disabled = true;
        } else {
          versionAction.disabled = false;
        }
      });

      const uninstallAction = controls.appendChild(
        Object.assign(document.createElement('button'), {
          id: `uninstall-action-${index}`,
          className: 'uninstall-button vscode-button',
          title: `Uninstall ${dep.name}`,
        })
      );

      uninstallAction.appendChild(
        Object.assign(document.createElement('i'), {
          className: 'codicon codicon-trash',
        })
      );

      uninstallAction.addEventListener('click', () => {
        vscode.postMessage({ type: 'uninstall', index: index });
      });

      installedDep.appendChild(controls);
      container.appendChild(installedDep);
    });
  }

  // Function to generate HTML for available dependencies
  function populateAvailableList(available, container) {
    const badge = Object.assign(document.createElement('span'), {
      className: 'vscode-badge counter',
      textContent: available.length,
    });
    document.querySelector('#available-actions')?.replaceChildren(badge);
    container.replaceChildren();

    if (available.length === 0) {
      const emptyState = Object.assign(document.createElement('div'), {
        className: 'empty-state',
        textContent: 'No additional dependencies available',
      });
      container.appendChild(emptyState);
      return;
    }

    available.forEach((dep, index) => {
      const availableDep = Object.assign(document.createElement('div'), {
        className: 'available-dependency',
      });

      const header = Object.assign(document.createElement('div'), {
        className: 'dependency-header',
      });

      header.appendChild(
        Object.assign(document.createElement('span'), {
          textContent: dep.name,
          className: 'dependency-name',
        })
      );

      const installAction = header.appendChild(
        Object.assign(document.createElement('button'), {
          id: `install-action-${index}`,
          className: 'vscode-button',
        })
      );

      installAction.appendChild(
        Object.assign(document.createElement('i'), {
          className: 'codicon codicon-add',
        })
      );

      installAction.appendChild(document.createTextNode(' Install'));

      installAction.addEventListener('click', () => {
        vscode.postMessage({ type: 'install', index: index });
      });

      availableDep.appendChild(header);

      const details = Object.assign(document.createElement('div'), {
        className: 'dependency-description',
      });

      const versionSpan = details.appendChild(
        Object.assign(document.createElement('span'), {
          textContent: dep.version,
        })
      );

      details.appendChild(document.createTextNode(` - ${dep.description}`));
      availableDep.appendChild(details);

      container.appendChild(availableDep);
    });
  }

  // Add event listeners to the buttons
  function addEventListeners() {
    // Handle messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
      message = event.data; // The json data that the extension sent
      switch (message.type) {
        case 'updateDependencies': {
          const installedContainer = document.getElementById('installed-dependencies');
          const availableContainer = document.getElementById('available-dependencies');

          if (installedContainer) {
            populateInstalledList(message.installed, installedContainer);
          } else {
            console.error('Element with ID "installed-dependencies" not found.');
          }

          if (availableContainer) {
            populateAvailableList(message.available, availableContainer);
          } else {
            console.error('Element with ID "available-dependencies" not found.');
          }

          break;
        }
      }
    });

    document.getElementById('updateall-action')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'updateall' });
    });

    document.getElementById('install-url-action')?.addEventListener('click', () => {
      const urlInput = /** @type {HTMLInputElement | null} */ (
        document.getElementById('url-input')
      );
      if (urlInput && urlInput.value.trim()) {
        vscode.postMessage({
          type: 'installFromUrl',
          url: urlInput.value.trim(),
        });
        urlInput.value = '';
      }
    });

    document.getElementById('url-input')?.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        document.getElementById('install-url-action')?.click();
      }
    });

    // Listen for focus events
    window.addEventListener('blur', () => {
      vscode.postMessage({ type: 'blur' });
    });
  }

  addEventListeners();
})();
