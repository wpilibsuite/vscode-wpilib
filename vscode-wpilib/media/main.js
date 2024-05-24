//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    function populateDropDowns(dataList) {
        const dropdowns = document.querySelectorAll('select[id^="version-select-"]');
        const buttons = document.querySelectorAll('select[id^="version-action-"]')

        dropdowns.forEach((dropdown, index) => {
            dataList.forEach(data => {
                const versions = data.versionInfo;
                versions.forEach((versionTuple, i) => {
                    const option = document.createElement('option');
                    option.value = versionTuple.version;
                    option.textContent = versionTuple.version;
                    if (data.currentVersion === versionTuple.version) {
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
        });
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'updateDependencies':
                {
                    populateDropDowns(message.installed);
                    break;
                }
        }
    });
}());


