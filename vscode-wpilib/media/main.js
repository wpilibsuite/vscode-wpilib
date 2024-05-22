//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    function populateDropDowns(data) {
        const dropdowns = document.querySelectorAll('select[id^="version-select-"]');
        const versions = data.versions;

        dropdowns.forEach(dropdown => {
            versions.forEach(version => {
                const versions = data.versions;
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                dropdown.appendChild(option);
            });
        });
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'updateDependencies':
                {
                    populateDropDowns(message.data);
                    break;
                }
        }
    });
}());


