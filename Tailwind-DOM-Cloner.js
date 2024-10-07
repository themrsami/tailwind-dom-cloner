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
