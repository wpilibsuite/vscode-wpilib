# VS Code WPILib Translation

We want to be able to support alternate languages in the VS Code WPILib extension, however us at WPILib do not have the resources to do this properly. This is something we want assistance from the community on, and they will likely do a better job as well. So we are asking for your help. This document is a guide on how to setup translations.

## Adding a whole new language
For adding a language, you need to modify the gulpfile.js file in the extension root. There is a variable called languages there, which is an array of object. To add a new language, you need the language code. Once you have that, the following object is used.

```js
{
	id: 'insert-id-here'
}
```

Once you have that, in the `i18n` folder, you need to create a copy of one of the existing languages, with your language id. You'll then need to go through and update all the strings to match your new language.

## Adding commands

TODO

## Adding strings to a class

TODO

## Adding a new class

TODO
