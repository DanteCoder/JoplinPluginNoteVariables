# Note Variables Plugin
With this plugin you can create string variables that can be used across all your notes.

<p align="center">
  <img style="width:60%;" src="https://user-images.githubusercontent.com/90792603/180668302-44c487ac-a647-4124-9f34-dd0758d9f9c7.png" />
</p>

## Usage
To begin you need to create a new Variables Note, you can do that by clicking on Note > "Create variables note":
<p align="center">
  <img src="https://user-images.githubusercontent.com/90792603/180668392-64da24d1-b952-4a22-8f75-babb0df10577.png" />
</p>

Inside the Variables Note you can add as many string variables as you need inside the created table:
<p align="center">
  <img style="width:60%;" src="https://user-images.githubusercontent.com/90792603/180668652-a1804fff-d493-45f3-b950-543343c5fb38.png" />
</p>

To use the variables in a note you have to write an inline code like `import Variables1 AnotherVariables`. The rendered text will turn green if the import was succesful, and red if the plugin could not find the Variables Note:

<p align="center">
  <img style="width:100%;" src="https://user-images.githubusercontent.com/90792603/180669121-73cb43c0-8a87-427e-9cb5-a08986f5687c.png" />
</p>

## Usage notes
- Every Variables Note must have a different name and without spaces. If two Variable Notes have the same name the plugin will use the first one it finds.
- Every variable in a Variable Note must have a different name, otherwise just the first of the same name will be used.
- You can import multiple Note Variables in a single note, but if they have variables with the same name the variables from the rightmost import will take priority.
- Sometimes after starting Joplin, you have to switch notes to see the variables replaced on the note.


## Download
You can install it directly from Options > Plugins > Search for "Note Variables".

## Bugs, feature requests or contributions
Please report any bugs you find, or any feature request you have on the [GitHub Issues page](https://github.com/DanteCoder/JoplinPluginNoteVariables/issues)
Feel free to contribute to the plugin making a pull request to the [Dev branch](https://github.com/DanteCoder/JoplinPluginNoteVariables/tree/Dev).
