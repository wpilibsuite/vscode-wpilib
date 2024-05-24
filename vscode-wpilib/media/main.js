//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    function populateDropDowns(data) {
        const dropdowns = document.querySelectorAll('select[id^="version-select-"]');
        const buttons = document.querySelectorAll('button[id^="version-action-"]')

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
        // Create HTML for installed dependencies
        let installedHtml = '<h2>Installed VendorDeps</h2>';
        installed.forEach((dep, index) => {
            installedHtml += `
                <div class="installed-dependency">
                    <span>${dep.name}</span>
                    <select id="version-select-${index}">
                    </select>
                    <button id="version-action-${index}"></button>
                </div>
            `;
        });
        return installedHtml;
    }

    // Function to generate HTML for available dependencies
    function generateAvailableHTML(available) {
        // Create HTML for available dependencies
        let availableHtml = '<h2>Available Dependencies</h2>';
        available.forEach(dep => {
            availableHtml += `
                <div class="available-dependency">
                    <div class="top-line">
                        <span class="name">${dep.name}</span>
                    </div>
                    <div class="details">${dep.version} - ${dep.description}</div>
                </div>
            `;
        });
        return availableHtml;
    }

    // Add event listeners to the buttons
    function addEventListeners() {
        document.querySelectorAll('.update-btn').forEach(button => {
            button.addEventListener('click', () => {
                const name = button.getAttribute('data-name');
                // Handle update logic here
                console.log(`Updating ${name}`);
            });
        });
    
        document.querySelectorAll('.install-btn').forEach(button => {
            button.addEventListener('click', () => {
                const name = button.getAttribute('data-name');
                // Handle install logic here
                console.log(`Installing ${name}`);
            });
        });
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
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

                    populateDropDowns(message.installed);
                    break;
                }
        }
    });
}());


