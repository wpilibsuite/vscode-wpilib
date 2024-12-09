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
    const badge = Object.assign(document.createElement("vscode-badge"), {
      variant: "counter",
      slot: "decorations",
      textContent: installed.length,
    });
    container.replaceChildren(badge);
    installed.forEach((dep, index) => {
      const installedDep = Object.assign(document.createElement("div"), {
        className: "installed-dependency",
      });
      const topLine = Object.assign(document.createElement("div"), {
        className: "top-line",
      });
      topLine.appendChild(
        Object.assign(document.createElement("span"), {
          textContent: dep.name,
        })
      );
      topLine.appendChild(
        Object.assign(document.createElement("span"), {
          textContent: dep.currentVersion,
        })
      );
      installedDep.appendChild(topLine);
      const update = Object.assign(document.createElement("div"), {
        className: "update",
      });
      const versionSelect = update.appendChild(
        Object.assign(document.createElement("vscode-single-select"), {
          id: `version-select-${index}`,
        })
      );
      const versionAction = update.appendChild(
        Object.assign(document.createElement("vscode-button"), {
          id: `version-action-${index}`,
        })
      );
      dep.versionInfo.forEach((versionTuple, i) => {
        const option = document.createElement("vscode-option");
        option.value = versionTuple.version;
        option.textContent = versionTuple.version;
        if (dep.currentVersion === versionTuple.version) {
          option.selected = true;
          versionAction.textContent = versionTuple.buttonText;
          if (i === 0) {
            //This is the first element of the version array thus the most current
            versionAction.setAttribute("disabled", "true");
          }
        }
        versionSelect.appendChild(option);
      });

      versionAction.addEventListener("click", () => {
        const action = versionAction.getAttribute("id");
        if (versionSelect) {
          var selectedText =
            versionSelect.options[versionSelect.selectedIndex].label;
          // Handle update logic here
          vscode.postMessage({
            type: "update",
            version: selectedText,
            index: index,
          });
        }
      });
      versionSelect.addEventListener("change", () => {
        const versions = dep.versionInfo;
        var selectedText =
          versionSelect.options[versionSelect.selectedIndex].label;
        const version = versions.find(
          (versionTuple) => versionTuple.version === selectedText
        );
        // Change button text based on selected dropdown value
        versionAction.textContent = version.buttonText;

        if (
          versionSelect.selectedIndex === 0 &&
          version.version === message.installed[index].currentVersion
        ) {
          //This is the first element of the version array thus the most current
          versionAction.disabled = true;
        } else {
          versionAction.disabled = false;
        }
      });

      const uninstallAction = update.appendChild(
        Object.assign(document.createElement("vscode-button"), {
          id: `uninstall-action-${index}`,
          className: "uninstall-button",
        })
      );
      uninstallAction.setAttribute("data-dependency", dep.name);
      uninstallAction.appendChild(
        Object.assign(document.createElement("vscode-icon"), {
          name: "trash",
        })
      );
      uninstallAction.addEventListener("click", () => {
        vscode.postMessage({ type: "uninstall", index: index });
      });

      installedDep.appendChild(update);
      container.appendChild(installedDep);
    });
  }

  // Function to generate HTML for available dependencies
  function populateAvailableList(available, container) {
    const badge = Object.assign(document.createElement("vscode-badge"), {
      variant: "counter",
      slot: "decorations",
      textContent: available.length,
    });
    container.replaceChildren(badge);
    available.forEach((dep, index) => {
      const availableDep = Object.assign(document.createElement("div"), {
        className: "available-dependency",
      });
      const topLine = Object.assign(document.createElement("div"), {
        className: "top-line",
      });
      topLine.appendChild(
        Object.assign(document.createElement("span"), {
          textContent: dep.name,
        })
      );

      const installAction = topLine.appendChild(
        Object.assign(document.createElement("vscode-button"), {
          id: `install-action-${index}`,
          textContent: "Install",
        })
      );
      installAction.addEventListener("click", () => {
        vscode.postMessage({ type: "install", index: index });
      });

      availableDep.appendChild(topLine);
      const details = Object.assign(document.createElement("div"), {
        className: "details",
        textContent: `${dep.version} - ${dep.description}`,
      });
      availableDep.appendChild(details);
      container.appendChild(availableDep);
    });
  }

  // Add event listeners to the buttons
  function addEventListeners() {
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
      message = event.data; // The json data that the extension sent
      switch (message.type) {
        case "updateDependencies": {
          const installedContainer = document.getElementById(
            "installed-dependencies"
          );
          const availableContainer = document.getElementById(
            "available-dependencies"
          );

          if (installedContainer) {
            populateInstalledList(message.installed, installedContainer);
          } else {
            console.error(
              'Element with ID "installed-dependencies" not found.'
            );
          }

          if (availableContainer) {
            populateAvailableList(message.available, availableContainer);
          } else {
            console.error(
              'Element with ID "available-dependencies" not found.'
            );
          }

          break;
        }
      }
    });

    document
      .getElementById("updateall-action")
      ?.addEventListener("click", () => {
        vscode.postMessage({ type: "updateall" });
      });


    // Listen for focus events
    window.addEventListener("blur", () => {
      vscode.postMessage({ type: "blur" });
    });
  }

  addEventListeners();
})();
