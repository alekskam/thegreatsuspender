# <img src="/src/img/icon48.png" align="absmiddle"> The TabFreeze

### Read this if you have lost tabs from your browser

I have written a guide for how to recover your lost tabs here: https://github.com/deanoemcke/thegreatsuspender/issues/526

Please contribute if you have any extra insight on alternative methods for tab recovery.

### Welcome

"TabFreeze" is a free and open-source Google Chrome extension for people who find that chrome is consuming too much system resource or suffer from frequent chrome crashing. Once installed and enabled, this extension will automatically *suspend* tabs that have not been used for a while, freeing up memory and cpu that the tab was consuming.

If you have suggestions or problems using the extension, please [submit a bug or a feature request](https://github.com/deanoemcke/thegreatsuspender/issues/).

### Install as an extension from source

1. Download the **[latest available version](https://github.com/alekskam/thegreatsuspender)** and unarchive to your preferred location (whichever suits you).
2. Using **Google Chrome** browser, navigate to chrome://extensions/ and enable "Developer mode" in the upper right corner.
3. Click on the <kbd>Load unpacked extension...</kbd> button.
4. Browse to the src directory of the downloaded, unarchived release and confirm.

If you have completed the above steps, the "welcome" page will open indicating successful installation of the extension.

### Build from github

Dependencies: openssl, npm.

Clone the repository and run these commands:
```
npm install
npm run generate-key
npm run build
```

It should say:
```
Done, without errors.
```

The extension in crx format will be inside the build/crx/ directory. You can drag it into [extensions] (chrome://extensions) to install locally.

### License

This work is licensed under a GNU GENERAL PUBLIC LICENSE (v2)

