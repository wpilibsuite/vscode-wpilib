const applyVsCodeStyling = () => {
    const styling = document.createElement('style');
    styling.innerHTML = `
    input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
        }

        input[type=number] {
        -moz-appearance: textfield;
        }

        body {
        font-size: var(--vscode-font-size);
        font-weight: var(--vscode-font-weight);
        font-family: var(--vscode-font-family);
        }

        button {
        border: none;
        padding: 6px 4px;
        text-align: center;
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
        }

        button:hover {
        cursor: pointer;
        background: var(--vscode-button-hoverBackground);
        }

        button:focus {
        outline-color: var(--vscode-focusBorder);
        }

        input:not([type="checkbox"]),
        textarea {
        border: none;
        font-family: var(--vscode-font-family);
        padding: var(--input-padding-vertical) var(--input-padding-horizontal);
        color: var(--vscode-input-foreground);
        outline-color: var(--vscode-input-border);
        background-color: var(--vscode-input-background);
        }

        input::placeholder,
        textarea::placeholder {
        color: var(--vscode-input-placeholderForeground);
        }
    `;
    document.body.appendChild(styling);
};

export default applyVsCodeStyling;
