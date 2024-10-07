# Tailwind Based DOM Cloner

## Overview

**Tailwind Based DOM Cloner** is a browser-based tool that allows you to interactively clone and download HTML elements from a webpage styled with Tailwind CSS. This tool is especially useful for web developers and designers looking to capture Tailwind components along with their associated styles for reuse or inspection.

## Features

- **Interactive Highlighting**: Hover over elements to highlight them with a red dashed border.
- **Element Cloning**: Click on an element to create a clone, capturing its HTML structure and inline styles.
- **Style Preservation**: Automatically retrieves and includes Tailwind CSS styles as well as any relevant external stylesheets associated with the element, including those from iframes.
- **Downloadable HTML**: Generates a downloadable HTML file that contains the cloned element, its styles, and linked stylesheets.

## How It Works

When you execute the script in your browser's console, it sets up event listeners to handle hover and click events on the document and any iframes. Here’s how to use it:

1. **Open the Developer Console**: Right-click on the webpage and select "Inspect" or press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac).
2. **Paste the Script**: Copy the provided JavaScript code and paste it into the console.
3. **Interact with the Page**:
   - **Hover** over any element to see it highlighted.
   - **Click** on an element you want to clone.
4. **Download the HTML**: After clicking, a download link will be generated, allowing you to save the cloned element as an HTML file.

## Usage

To use the Tailwind Based DOM Cloner:

1. Open the webpage containing Tailwind components.
2. Paste the JavaScript code into the console and press Enter.
3. Hover over the Tailwind component you wish to clone to highlight it.
4. Click on the highlighted component to download it as an HTML file.

## Code

Here’s the main code you can paste into your browser console:

```javascript
(function () {
    let lastElement = null;
    let lastOutline = '';

    // Function to capture inline styles of an element and its children
    function getInlineStyles(element) {
        const style = window.getComputedStyle(element);
        let inlineStyles = '';
        for (let i = 0; i < style.length; i++) {
            inlineStyles += `${style[i]}: ${style.getPropertyValue(style[i])}; `;
        }
        return inlineStyles;
    }

    // Function to convert relative URLs to absolute URLs
    function convertRelativePaths(clone) {
        const baseUrl = window.location.origin;

        // Convert relevant attributes to absolute paths
        const attributesToConvert = ['src', 'href', 'data-src', 'data-href']; // Add more as necessary
        attributesToConvert.forEach(attr => {
            if (clone.hasAttribute(attr)) {
                const value = clone.getAttribute(attr);
                if (value.startsWith('/')) {
                    // Convert root-relative paths
                    clone.setAttribute(attr, baseUrl + value);
                } else if (!value.startsWith('http') && !value.startsWith('https')) {
                    // Convert relative paths
                    clone.setAttribute(attr, new URL(value, baseUrl).href);
                }
            }
        });

        // Specifically handle <img> tags to ensure their src attributes are absolute
        if (clone.tagName.toLowerCase() === 'img') {
            const src = clone.getAttribute('src');
            if (src && (src.startsWith('/') || !src.startsWith('http'))) {
                clone.setAttribute('src', new URL(src, baseUrl).href);
            }
        }

        // Recursively check all children for <img> tags
        Array.from(clone.children).forEach(child => convertRelativePaths(child));
    }

    // Function to clone an element
    function cloneElement(element) {
        const clone = element.cloneNode(true); // Deep clone the element
        convertRelativePaths(clone); // Convert relative paths after cloning
        return clone;
    }

    // Function to gather relevant CSS rules that apply to the element
    function getCSSRulesForElement(element) {
        let cssRules = '';
        const selector = element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') + (element.className ? `.${element.className.split(' ').join('.')}` : '');

        for (const sheet of document.styleSheets) {
            try {
                if (!sheet.cssRules) continue; // Some stylesheets might block access

                for (const rule of sheet.cssRules) {
                    if (rule.selectorText.includes(selector)) {
                        cssRules += `${rule.cssText}\n`;
                    }
                }
            } catch (e) {
                console.warn("Cannot access CSS stylesheet:", e);
            }
        }
        return cssRules;
    }

    // Function to gather all linked stylesheets
    function getLinkedStylesheets(doc) {
        const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.href);
        return stylesheets;
    }

    // Function to highlight the element with a red dashed border
    function highlightElement(e) {
        if (lastElement) {
            lastElement.style.outline = lastOutline; // Restore the last element's outline
        }
        lastElement = e.target;
        lastOutline = lastElement.style.outline;
        lastElement.style.outline = '2px dashed red'; // Set red dashed outline
    }

    // Function to handle the click event and download the HTML
    function handleClick(e) {
        e.preventDefault();
        const element = e.target;

        // Remove the red outline before cloning the element for download
        if (lastElement) {
            lastElement.style.outline = lastOutline;
        }

        // Clone the element
        const clonedElement = cloneElement(element);

        // Check if the element is inside an iframe
        const isIframe = element.ownerDocument !== document;

        let externalCSS = '';
        let linkedStylesheets = [];

        // Capture styles based on the context (main document or iframe)
        if (isIframe) {
            const iframeDoc = element.ownerDocument;
            externalCSS = getCSSRulesForElement(element);
            linkedStylesheets = getLinkedStylesheets(iframeDoc);
        } else {
            externalCSS = getCSSRulesForElement(element);
            linkedStylesheets = getLinkedStylesheets(document);
        }

        // Create a blob for the HTML content
        const htmlContent = `<!DOCTYPE html>
            <html>
            <head>
                ${linkedStylesheets.map(url => `<link rel="stylesheet" href="${url}">`).join('\n')}
                <style>${externalCSS}</style>
            </head>
            <body>
                ${clonedElement.outerHTML}
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Create a link element to trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'element.html';
        downloadLink.click();

        // Clean up
        URL.revokeObjectURL(url);
    }

    // Function to handle iframe content
    function setupIframeListeners(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

            // Add event listeners for hover and click within the iframe
            iframeDoc.addEventListener('mouseover', highlightElement);
            iframeDoc.addEventListener('click', handleClick);
        } catch (e) {
            console.warn("Cannot access iframe contents:", e);
        }
    }

    // Function to setup listeners on the main document and any iframes
    function setupListeners() {
        // Add listeners for the main document
        document.addEventListener('mouseover', highlightElement);
        document.addEventListener('click', handleClick);

        // Setup listeners for iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(setupIframeListeners);
    }

    // Run the setup
    setupListeners();

})();
```

## Requirements

- **Browser Compatibility**: This script should be run in modern web browsers, such as Google Chrome, Mozilla Firefox, or Microsoft Edge, with JavaScript enabled.
- **Tailwind CSS**: Ensure the webpage contains Tailwind CSS or relevant stylesheets for effective cloning.
- **Access to Iframes**: The tool may be limited in functionality when dealing with cross-origin iframes due to security restrictions.

## Limitations

- **Cross-Origin Restrictions**: The tool may not be able to access stylesheets from iframes that are hosted on a different domain due to the Same-Origin Policy enforced by web browsers.
- **Dynamic Styles**: The tool captures only inline styles and styles defined in linked stylesheets. It may not capture all styles applied via JavaScript or dynamically added styles.
- **Complex Structures**: For very complex elements or those heavily relying on JavaScript for their layout and styling, the cloned version may not behave identically to the original.

## Contributing

Contributions to the Tailwind Based DOM Cloner are welcome! If you'd like to contribute, please follow these steps:

1. **Fork the Repository**: Click the "Fork" button at the top right of this page.
2. **Clone Your Fork**: Clone your fork to your local machine.
   ```bash
   git clone https://github.com/themrsami/tailwind-dom-cloner.git
   ```
3. **Create a Branch**: Create a new branch for your feature or bug fix.
   ```bash
   git checkout -b my-feature-branch
   ```
4. **Make Your Changes**: Implement your changes in the code, ensuring that they adhere to the project's coding standards and conventions.
5. **Test Your Changes**: Thoroughly test your changes to ensure they work as expected and do not introduce new bugs. You can use the browser console to test the functionality of the cloned elements.
6. **Commit Your Changes**: Once you’re satisfied with your changes, commit them with a descriptive message.
   ```bash
   git commit -m "Add feature: [Description of feature]"
   ```
7. **Push to Your Fork**: Push your changes to your fork on GitHub.
   ```bash
   git push origin my-feature-branch
   ```
8. **Submit a Pull Request**: Navigate to the original repository on GitHub and click on the "Pull Requests" tab. Then, click the "New Pull Request" button. Select your branch and submit your pull request along with a clear description of your changes and why they should be merged.

## Acknowledgments

- Special thanks to the Tailwind CSS community for their amazing utility-first framework that inspired this tool.
- Thanks to the open-source community for their continuous support and contributions that make projects like this possible.

## Contact

For questions, suggestions, or feedback, please feel free to reach out:

- **Email**: usamanazir13@gmail.com
- **GitHub**: [themrsami](https://github.com/themrsami)

Happy Cloning! 🚀

### Instructions for Use

1. **Copy the Markdown**: Select the entire content of the `README.md` file above.
2. **Create the File**: Open your preferred text editor and create a new file named `README.md`.
3. **Paste the Content**: Paste the copied content into the file.
4. **Save the File**: Save the file to complete the process.