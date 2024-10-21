//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();
    let dropdowns;
    let buttons;
    let message;
    let uninstalls;
    let installs;

    function populateDropDowns(data) {
        dropdowns.forEach((dropdown, index) => {
            const versions = data[index].versionInfo;
            versions.forEach((versionTuple, i) => {
                const option = document.createElement('option');
                option.value = versionTuple.version;
                option.textContent = versionTuple.version;
                if (data[index].currentVersion === versionTuple.version) {
                    option.selected = true;
                    buttons[index].textContent = versionTuple.buttonText;
                    if (i === 0) {
                        //This is the first element of the version array thus the most current
                        buttons[index].setAttribute('disabled', 'true');
                    }
                }
                dropdown.appendChild(option);
            });
        });
    }

    // Function to generate HTML for installed dependencies
    function generateInstalledHTML(installed) {
        const trash = document.getElementById('trashicon')?.innerHTML
        // Create HTML for installed dependencies
        let installedHtml = '<h2>Installed VendorDeps</h2>';
        installed.forEach((dep, index) => {
            installedHtml += `
                <div class="installed-dependency">
                    <div class="top-line">
                        <span>${dep.name}</span><span>${dep.currentVersion}</span>
                    </div>
                    <div class="update">
                        <select id="version-select-${index}"></select>
                        <button id="version-action-${index}"></button>
                        <button id="uninstall-action-${index}" class="uninstall-button" data-dependency="${dep.name}">
                            <img src=${trash} alt="Uninstall">
                        </button>
                    </div>
                </div>
            `;
        });
        return installedHtml;
    }

    // Function to generate HTML for available dependencies
    function generateAvailableHTML(available) {
        // Create HTML for available dependencies
        let availableHtml = '<h2>Available Dependencies</h2>';
        available.forEach((dep, index) => {
            availableHtml += `
                <div class="available-dependency">
                    <div class="top-line">
                        <span class="name">${dep.name}</span><button id="install-action-${index}">Install</button>
                    </div>
                    <div class="details">${dep.version} - ${dep.description}</div>
                </div>
            `;
        });
        return availableHtml;
    }

    // Add event listeners to the buttons
    function addEventListeners() {
        // Handle messages sent from the extension to the webview
        window.addEventListener('message', event => {
            message = event.data; // The json data that the extension sent
            switch (message.type) {
                case 'updateDependencies':
                    {
                        const installedHTML = generateInstalledHTML(message.installed);
                        const availableHTML = generateAvailableHTML(message.available);

                        const installedContainer = document.getElementById('installed-dependencies');
                        const availableContainer = document.getElementById('available-dependencies');

                        if (installedContainer) {
                            installedContainer.innerHTML = installedHTML;
                        } else {
                            console.error('Element with ID "installed-dependencies" not found.');
                        }

                        if (availableContainer) {
                            availableContainer.innerHTML = availableHTML;
                        } else {
                            console.error('Element with ID "available-dependencies" not found.');
                        }

                        dropdowns = document.querySelectorAll('select[id^="version-select-"]');
                        buttons = document.querySelectorAll('button[id^="version-action-"]');
                        uninstalls = document.querySelectorAll('button[id^="uninstall-action-"]');
                        installs = document.querySelectorAll('button[id^="install-action-"]');
                        addDropdownListeners();
                        populateDropDowns(message.installed);
                        break;
                    }
            }
        });
    
        document.getElementById('updateall-action')?.addEventListener('click', () => {
            vscode.postMessage({ type: 'updateall' })
        });

        document.getElementById('refresh-action')?.addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' })
        });

        // Listen for focus events
        window.addEventListener('blur', () => {
            vscode.postMessage({ type: 'blur' });
        });
    }

    function addDropdownListeners() {
        // Add event listener for the dropdown
        dropdowns.forEach((dropdown, index) =>
            dropdown.addEventListener('change', () => {
                const versions = message.installed[index].versionInfo;
                var selectedText = dropdown.options[dropdown.selectedIndex].text;
                const version = versions.find(versionTuple => versionTuple.version === selectedText);
                // Change button text based on selected dropdown value
                buttons[index].textContent = version.buttonText;

                if (dropdown.selectedIndex === 0 && version.version === message.installed[index].currentVersion) {
                    //This is the first element of the version array thus the most current
                    buttons[index].disabled = true;
                } else {
                    buttons[index].disabled = false;
            }
            })
        );

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('id');
                const index = getStringUntilFirstDashFromRight(action);
                const drop = document.getElementById("version-select-" + index);
                if (drop && drop instanceof HTMLSelectElement) {
                    var selectedText = drop.options[drop.selectedIndex].text;
                    // Handle update logic here
                    vscode.postMessage({ type: 'update', version: selectedText, index: index });
                }
            });
        });

        uninstalls.forEach(uninstall => {
            uninstall.addEventListener('click', () => {
                const action = uninstall.getAttribute('id');
                const index = getStringUntilFirstDashFromRight(action);
                vscode.postMessage({ type: 'uninstall', index: index });
            });
        });

        installs.forEach(install => {
            install.addEventListener('click', () => {
                const action = install.getAttribute('id');
                const index = getStringUntilFirstDashFromRight(action);
                vscode.postMessage({ type: 'install', index: index });
            });
        });
    }

    function getStringUntilFirstDashFromRight(str) {
        const index = str.lastIndexOf("-");
        if (index === -1) {
            return str; // No dash found, return the whole string
        }
        return str.substring(index + 1);
    }

    addEventListeners();
}());